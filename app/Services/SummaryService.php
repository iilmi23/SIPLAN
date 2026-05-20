<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\ProductionWeek;
use App\Models\SR;
use App\Models\Summary;
use App\Models\UploadBatch;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SummaryService
{
    public function __construct(private readonly PlanningCacheService $cache)
    {
    }

    public function filterKeys(): array
    {
        return [
            'customer',
            'month',
            'search',
            'assy_number',
            'order_type',
            'etd_start',
            'etd_end',
            'eta_start',
            'eta_end',
        ];
    }

    public function batchSummaries(array $filters, ?int $perPage = 25)
    {
        $page = request()->integer('page') ?: 1;

        return $this->cache->remember('summary', [
            'filters' => $filters,
            'per_page' => $perPage,
            'page' => $perPage ? $page : null,
        ], function () use ($filters, $perPage) {
            if ($this->hasCompleteMaterializedSummaries()) {
                return $this->materializedBatchSummaries($filters, $perPage);
            }

            return $this->rawBatchSummaries($filters, $perPage);
        }, 5);
    }

    public function rawBatchSummaries(array $filters, ?int $perPage = 25)
    {
        $orderTypeSummary = $this->srHasColumn('order_type')
            ? '
                SUM(CASE WHEN srs.order_type = \'FIRM\' THEN srs.qty ELSE 0 END) as firm_qty,
                SUM(CASE WHEN srs.order_type = \'FORECAST\' THEN srs.qty ELSE 0 END) as forecast_qty,
                COUNT(CASE WHEN srs.order_type = \'FIRM\' THEN 1 END) as firm_count,
                COUNT(CASE WHEN srs.order_type = \'FORECAST\' THEN 1 END) as forecast_count,
            '
            : '
                0 as firm_qty,
                0 as forecast_qty,
                0 as firm_count,
                0 as forecast_count,
            ';

        $query = $this->applyFilters(SR::query(), $filters)
            ->leftJoin('upload_batches', 'srs.upload_batch_id', '=', 'upload_batches.id')
            ->selectRaw("
                MIN(srs.id) as id,
                srs.upload_batch_id,
                srs.customer,
                srs.port,
                COALESCE(upload_batches.source_file, srs.source_file) as source_file,
                upload_batches.batch_uuid as upload_batch,
                upload_batches.sheet_name,
                COALESCE(MIN(upload_batches.created_at), MIN(srs.created_at)) as upload_date,
                COUNT(*) as total_items,
                SUM(srs.qty) as total_qty,
                {$orderTypeSummary}
                COUNT(DISTINCT srs.assy_number) as unique_assy_numbers,
                MIN(srs.etd) as earliest_etd,
                MAX(srs.etd) as latest_etd
            ")
            ->groupBy(
                'srs.upload_batch_id',
                'srs.customer',
                'srs.port',
                'srs.source_file',
                'upload_batches.source_file',
                'upload_batches.batch_uuid',
                'upload_batches.sheet_name'
            )
            ->orderByRaw('COALESCE(MIN(upload_batches.created_at), MIN(srs.created_at)) desc');

        return $perPage ? $query->paginate($perPage)->withQueryString() : $query->get();
    }

    private function materializedBatchSummaries(array $filters, ?int $perPage = 25)
    {
        $representativeSr = SR::query()
            ->selectRaw('MIN(id) as id, upload_batch_id')
            ->whereNotNull('upload_batch_id')
            ->groupBy('upload_batch_id');

        $query = $this->applySummaryFilters(Summary::query(), $filters)
            ->join('upload_batches', 'summaries.upload_batch_id', '=', 'upload_batches.id')
            ->leftJoinSub($representativeSr, 'representative_srs', function ($join) {
                $join->on('summaries.upload_batch_id', '=', 'representative_srs.upload_batch_id');
            })
            ->selectRaw("
                representative_srs.id as id,
                summaries.upload_batch_id,
                summaries.customer,
                summaries.port,
                upload_batches.source_file,
                upload_batches.batch_uuid as upload_batch,
                upload_batches.sheet_name,
                upload_batches.created_at as upload_date,
                SUM(summaries.line_count) as total_items,
                SUM(summaries.total_qty) as total_qty,
                SUM(CASE WHEN summaries.order_type = 'FIRM' THEN summaries.total_qty ELSE 0 END) as firm_qty,
                SUM(CASE WHEN summaries.order_type = 'FORECAST' THEN summaries.total_qty ELSE 0 END) as forecast_qty,
                SUM(CASE WHEN summaries.order_type = 'FIRM' THEN summaries.line_count ELSE 0 END) as firm_count,
                SUM(CASE WHEN summaries.order_type = 'FORECAST' THEN summaries.line_count ELSE 0 END) as forecast_count,
                COUNT(DISTINCT summaries.assy_number) as unique_assy_numbers,
                MIN(summaries.etd) as earliest_etd,
                MAX(summaries.etd) as latest_etd
            ")
            ->groupBy(
                'representative_srs.id',
                'summaries.upload_batch_id',
                'summaries.customer',
                'summaries.port',
                'upload_batches.source_file',
                'upload_batches.batch_uuid',
                'upload_batches.sheet_name',
                'upload_batches.created_at'
            )
            ->orderByDesc('upload_batches.created_at');

        return $perPage ? $query->paginate($perPage)->withQueryString() : $query->get();
    }

    private function hasCompleteMaterializedSummaries(): bool
    {
        $summaryBatchCount = Summary::query()
            ->whereNotNull('upload_batch_id')
            ->distinct('upload_batch_id')
            ->count('upload_batch_id');

        if ($summaryBatchCount === 0) {
            return false;
        }

        $srBatchCount = SR::query()
            ->whereNotNull('upload_batch_id')
            ->distinct('upload_batch_id')
            ->count('upload_batch_id');

        return $srBatchCount === 0 || $summaryBatchCount >= $srBatchCount;
    }

    public function detail(SR $sr)
    {
        return $this->enrichRows($this->batchRows($sr)->get());
    }

    public function srPayload(SR $sr, bool $includeMonth = false): array
    {
        $payload = [
            'id' => $sr->id,
            'source_file' => $sr->source_file,
            'customer' => $sr->customer,
            'port' => $sr->port,
            'sheet_name' => $sr->sheet_name,
            'upload_date' => optional($sr->created_at)->format('Y-m-d H:i:s'),
        ];

        if ($includeMonth) {
            $payload['month'] = $sr->month;
        }

        return $payload;
    }

    public function apiPayload(SR $sr): array
    {
        $summaryData = $this->detail($sr);
        $firmQty = $summaryData->where('order_type', 'FIRM')->sum('qty');
        $forecastQty = $summaryData->where('order_type', 'FORECAST')->sum('qty');

        return [
            'success' => true,
            'sr' => $this->srPayload($sr),
            'summary' => [
                'total_records' => $summaryData->count(),
                'unique_assy_numbers' => $summaryData->pluck('assy_number')->unique()->count(),
                'firm_qty' => $firmQty,
                'forecast_qty' => $forecastQty,
                'total_qty' => $firmQty + $forecastQty,
                'months_covered' => $summaryData->pluck('month')->filter()->unique()->sort()->values(),
            ],
            'data' => $summaryData,
        ];
    }

    public function deleteUpload(SR $sr): array
    {
        $deleted = DB::transaction(function () use ($sr) {
            $sourceFile = $sr->source_file;

            if ($sr->upload_batch_id) {
                $deletedCount = SR::where('upload_batch_id', $sr->upload_batch_id)->delete();
                UploadBatch::whereKey($sr->upload_batch_id)->delete();
            } else {
                $deletedCount = $sr->delete() ? 1 : 0;
            }

            return [
                'source_file' => $sourceFile,
                'deleted_count' => $deletedCount,
            ];
        });

        $this->cache->invalidate();

        return $deleted;
    }

    private function batchRows(SR $sr)
    {
        return SR::query()
            ->with('assy.carline')
            ->when(
                $sr->upload_batch_id,
                fn ($query) => $query->where('upload_batch_id', $sr->upload_batch_id),
                fn ($query) => $query->whereKey($sr->id)
            )
            ->orderBy('etd')
            ->orderBy('assy_number');
    }

    private function enrichRows($rows)
    {
        $customerIds = Customer::whereIn('code', $rows->pluck('customer')->filter()->unique())
            ->pluck('id', 'code');
        $weekCache = [];

        return $rows->map(function ($row) use ($customerIds, &$weekCache) {
            $carline = $row->assy?->carline;

            if (empty($row->model) && $carline) {
                $row->model = $carline->code;
            }

            if (empty($row->family) && $carline) {
                $row->family = $carline->description;
            }

            if (empty($row->week) && !empty($row->etd)) {
                $customerId = $customerIds[$row->customer] ?? null;
                $cacheKey = ($customerId ?: 'global') . '|' . $row->etd;

                if (!array_key_exists($cacheKey, $weekCache)) {
                    $weekCache[$cacheKey] = ProductionWeek::findByDate($customerId, Carbon::parse($row->etd));
                }

                $week = $weekCache[$cacheKey];

                if ($week) {
                    $row->week = $week->week_no;
                    $row->month = $row->month ?: $week->month_name;
                    $row->year = $row->year ?: $week->year;
                }
            }

            return $row;
        });
    }

    private function applyFilters($query, array $filters)
    {
        return $query
            ->when(!empty($filters['customer']), fn ($query) => $query->where('srs.customer', $filters['customer']))
            ->when(!empty($filters['search']), fn ($query) => $query->where('srs.source_file', 'like', '%' . $filters['search'] . '%'))
            ->when(!empty($filters['assy_number']), fn ($query) => $query->where('srs.assy_number', 'like', '%' . $filters['assy_number'] . '%'))
            ->when(!empty($filters['order_type']) && $this->srHasColumn('order_type'), fn ($query) => $query->where('srs.order_type', $filters['order_type']))
            ->when(!empty($filters['etd_start']), fn ($query) => $query->where('srs.etd', '>=', $filters['etd_start']))
            ->when(!empty($filters['etd_end']), fn ($query) => $query->where('srs.etd', '<=', $filters['etd_end']))
            ->when(!empty($filters['eta_start']), fn ($query) => $query->where('srs.eta', '>=', $filters['eta_start']))
            ->when(!empty($filters['eta_end']), fn ($query) => $query->where('srs.eta', '<=', $filters['eta_end']))
            ->when(!empty($filters['month']), fn ($query) => $query->where('srs.month', $filters['month']));
    }

    private function applySummaryFilters($query, array $filters)
    {
        return $query
            ->when(!empty($filters['customer']), fn ($query) => $query->where('summaries.customer', $filters['customer']))
            ->when(!empty($filters['search']), function ($query) use ($filters) {
                $query->where(function ($subQuery) use ($filters) {
                    $subQuery
                        ->where('upload_batches.source_file', 'like', '%' . $filters['search'] . '%')
                        ->orWhere('summaries.source_file', 'like', '%' . $filters['search'] . '%');
                });
            })
            ->when(!empty($filters['assy_number']), fn ($query) => $query->where('summaries.assy_number', 'like', '%' . $filters['assy_number'] . '%'))
            ->when(!empty($filters['order_type']), fn ($query) => $query->where('summaries.order_type', $filters['order_type']))
            ->when(!empty($filters['etd_start']), fn ($query) => $query->where('summaries.etd', '>=', $filters['etd_start']))
            ->when(!empty($filters['etd_end']), fn ($query) => $query->where('summaries.etd', '<=', $filters['etd_end']))
            ->when(!empty($filters['eta_start']), fn ($query) => $query->where('summaries.eta', '>=', $filters['eta_start']))
            ->when(!empty($filters['eta_end']), fn ($query) => $query->where('summaries.eta', '<=', $filters['eta_end']))
            ->when(!empty($filters['month']), fn ($query) => $query->where('summaries.month', $filters['month']));
    }

    private function srHasColumn(string $column): bool
    {
        static $columns = null;

        $columns ??= array_flip(Schema::getColumnListing('srs'));

        return isset($columns[$column]);
    }
}
