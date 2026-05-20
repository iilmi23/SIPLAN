<?php

namespace App\Services;

use App\Models\Assy;
use App\Models\Customer;
use App\Models\ProductionWeek;
use App\Models\SPP;
use App\Models\SR;
use App\Models\Summary;
use App\Models\UploadBatch;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SPPService
{
    public function batchSummary(array $filters): Collection
    {
        return $this->applyFilters(SR::query(), $filters)
            ->selectRaw('
                MIN(id) as id,
                upload_batch_id,
                customer,
                port,
                source_file,
                upload_batch,
                MIN(sheet_name) as sheet_name,
                MIN(created_at) as upload_date,
                COUNT(*) as total_items,
                SUM(qty) as total_qty,
                SUM(CASE WHEN order_type = \'FIRM\' THEN qty ELSE 0 END) as firm_qty,
                SUM(CASE WHEN order_type = \'FORECAST\' THEN qty ELSE 0 END) as forecast_qty,
                COUNT(DISTINCT assy_number) as unique_assy_numbers,
                MIN(eta) as earliest_eta,
                MAX(eta) as latest_eta
            ')
            ->groupBy('upload_batch_id', 'customer', 'port', 'source_file', 'upload_batch')
            ->orderByRaw('MIN(created_at) desc')
            ->get();
    }

    public function previewData(SR $sr): array
    {
        $records = $this->batchRows($sr)
            ->with(['assy.carline'])
            ->whereNotNull('eta')
            ->get();

        return $this->previewPayload($this->srPayload($sr), $records, $this->customerIdForSr($sr));
    }

    public function previewCombinedData(array $batchIds): array
    {
        $batches = $this->sourceBatches($batchIds);
        $customerIds = $batches->pluck('customer_id')->filter()->unique();

        if ($customerIds->count() > 1) {
            throw new \InvalidArgumentException('Combined SPP hanya bisa dibuat dari SR upload dengan customer yang sama.');
        }

        $records = SR::query()
            ->with(['assy.carline', 'uploadBatch'])
            ->whereIn('upload_batch_id', $batches->pluck('id'))
            ->whereNotNull('eta')
            ->orderBy('eta')
            ->orderBy('assy_number')
            ->get();

        $payload = $this->previewPayload(
            $this->combinedSrPayload($batches),
            $records,
            $customerIds->first()
        );
        $payload['source_batch_ids'] = $batches->pluck('id')->values()->all();

        return $payload;
    }

    private function previewPayload(array $srPayload, Collection $records, ?int $customerId): array
    {
        $firstEta = $records->pluck('eta')->filter()->sort()->first();
        $start = $firstEta
            ? Carbon::parse($firstEta)->startOfMonth()
            : Carbon::now()->subMonth()->startOfMonth();
        $months = $this->sppMonths($start, Carbon::now()->startOfMonth(), $customerId);
        $rows = $this->sppRows($records, $months, 'qty');

        return [
            'sr' => $srPayload,
            'summary' => [
                'total_records' => $records->count(),
                'total_qty' => $records->sum('qty'),
                'unique_assy_numbers' => $records->pluck('assy_number')->filter()->unique()->count(),
                'period_range' => sprintf(
                    '%s - %s',
                    $months->first()['period_label'] ?? '-',
                    $months->last()['period_label'] ?? '-'
                ),
            ],
            'months' => $months->values(),
            'rows' => $rows->values(),
            'monthTotals' => $this->monthTotals($rows, $months),
        ];
    }

    public function showData(string $period, array $filters): array
    {
        $query = $this->resolvedSourceQuery($filters);
        $source = $query['source'];
        $date = Carbon::createFromFormat('Y-m', $period);
        $start = $date->copy()->startOfMonth();
        $end = $date->copy()->endOfMonth();

        $records = $source === 'spp'
            ? $query['query']->where('period', $period)->get()
            : $query['query']->whereBetween('eta', [$start->toDateString(), $end->toDateString()])->get();

        $qtyColumn = $source === 'sr' ? 'qty' : 'total_qty';

        return [
            'records' => $records,
            'summary' => [
                'period' => $date->format('F Y'),
                'total_records' => $records->count(),
                'total_qty' => $records->sum($qtyColumn),
                'unique_assy_numbers' => $records->pluck('assy_number')->unique()->count(),
                'source' => $source,
                'selected_sr' => $this->selectedBatch($filters),
            ],
        ];
    }

    public function srBatchOptions(array $filters): Collection
    {
        return UploadBatch::query()
            ->with(['customer:id,code,name'])
            ->when(!empty($filters['customer']), function ($query) use ($filters) {
                $query->whereHas('customer', fn ($customerQuery) => $customerQuery->where('code', $filters['customer']));
            })
            ->where(function ($query) {
                $query->whereHas('orderSummaries')
                    ->orWhereHas('srs');
            })
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn (UploadBatch $batch) => [
                'id' => $batch->id,
                'customer' => $batch->customer?->code,
                'customer_name' => $batch->customer?->name,
                'source_file' => $batch->source_file,
                'sheet_name' => $batch->sheet_name,
                'record_count' => $batch->record_count,
                'total_qty' => $batch->total_qty,
                'uploaded_at' => $batch->created_at?->format('Y-m-d H:i'),
                'label' => trim(sprintf(
                    '%s - %s%s',
                    $batch->customer?->code ?: 'SR',
                    $batch->source_file,
                    $batch->sheet_name ? ' / ' . $batch->sheet_name : ''
                )),
            ]);
    }

    public function storeFixed(SR $sr, array $validated): int
    {
        $batch = $sr->uploadBatch;
        $records = $this->buildFixedRecords($sr, $validated);

        DB::transaction(function () use ($batch, $sr, $records) {
            $deleteQuery = SPP::query();

            if ($batch) {
                $deleteQuery->where('upload_batch_id', $batch->id);
            } else {
                $deleteQuery
                    ->where('customer', $sr->customer)
                    ->where('source_file', $sr->source_file)
                    ->where('sheet_name', $sr->sheet_name);
            }

            $deleteQuery->delete();

            foreach (array_chunk($records, 500) as $chunk) {
                SPP::insert($chunk);
            }
        });

        return count($records);
    }

    public function storeCombinedFixed(array $batchIds, array $validated): int
    {
        $batches = $this->sourceBatches($batchIds);
        $customerIds = $batches->pluck('customer_id')->filter()->unique();

        if ($customerIds->count() > 1) {
            throw new \InvalidArgumentException('Combined SPP hanya bisa disimpan dari SR upload dengan customer yang sama.');
        }

        $plan = $this->combinedPlan($batches);
        $records = $this->buildFixedRecordsForPlan($plan, $validated);

        DB::transaction(function () use ($plan, $records) {
            SPP::query()
                ->whereNull('upload_batch_id')
                ->where('upload_batch', $plan['upload_batch'])
                ->delete();

            foreach (array_chunk($records, 500) as $chunk) {
                SPP::insert($chunk);
            }
        });

        return count($records);
    }

    private function resolvedSourceQuery(array $filters): array
    {
        $sppQuery = $this->filteredQuery(SPP::query(), $filters);

        if ((clone $sppQuery)->exists()) {
            return ['source' => 'spp', 'query' => $sppQuery];
        }

        $summaryQuery = $this->filteredQuery(Summary::query(), $filters);

        if ((clone $summaryQuery)->exists()) {
            return ['source' => 'summary', 'query' => $summaryQuery];
        }

        return ['source' => 'sr', 'query' => $this->filteredQuery(SR::query(), $filters)];
    }

    private function filteredQuery($query, array $filters)
    {
        return $query
            ->when(!empty($filters['customer']), fn ($query) => $query->where('customer', $filters['customer']))
            ->when(!empty($filters['sr_batch']), fn ($query) => $query->where('upload_batch_id', (int) $filters['sr_batch']));
    }

    private function batchRows(SR $sr)
    {
        return SR::query()
            ->when(
                $sr->upload_batch,
                fn ($query) => $query->where('upload_batch', $sr->upload_batch),
                fn ($query) => $query->whereKey($sr->id)
            )
            ->orderBy('eta')
            ->orderBy('assy_number');
    }

    private function applyFilters($query, array $filters)
    {
        return $query
            ->when(!empty($filters['customer']), fn ($query) => $query->where('customer', $filters['customer']))
            ->when(!empty($filters['search']), fn ($query) => $query->where('source_file', 'like', '%' . $filters['search'] . '%'));
    }

    private function buildFixedRecords(SR $sr, array $validated): array
    {
        $batch = $sr->uploadBatch;
        $plan = [
            'upload_batch_id' => $batch?->id,
            'customer_id' => $batch?->customer_id,
            'customer' => $sr->customer,
            'source_file' => $sr->source_file,
            'sheet_name' => $sr->sheet_name,
            'upload_batch' => $sr->upload_batch,
            'port' => $sr->port,
            'source_sr_id' => $sr->id,
            'source_batch_ids' => $batch ? [$batch->id] : [],
        ];

        return $this->buildFixedRecordsForPlan($plan, $validated);
    }

    private function buildFixedRecordsForPlan(array $plan, array $validated): array
    {
        $monthMap = collect($validated['months'])->keyBy('period');
        $assyMap = Assy::query()
            ->with('carline')
            ->whereIn('assy_number', collect($validated['rows'])->pluck('assy_number')->filter()->unique())
            ->get()
            ->keyBy('assy_number');
        $records = [];
        $now = now();

        foreach ($validated['rows'] as $row) {
            $assyNumber = $row['assy_number'];
            $assy = $assyMap->get($assyNumber);

            foreach ($monthMap as $period => $month) {
                $cell = $row['months'][$period] ?? [];
                $delQty = $this->integerValue($cell['del'] ?? 0);
                $records[] = [
                    'upload_batch_id' => $plan['upload_batch_id'],
                    'customer_id' => $plan['customer_id'],
                    'assy_id' => $assy?->id,
                    'customer' => $plan['customer'],
                    'source_file' => $plan['source_file'],
                    'sheet_name' => $plan['sheet_name'],
                    'upload_batch' => $plan['upload_batch'],
                    'port' => $plan['port'],
                    'type' => $row['type'] ?? null,
                    'carline' => $row['carline'] ?? $assy?->carline?->code,
                    'assy_number' => $assyNumber,
                    'level' => $row['level'] ?? $assy?->level,
                    'assy_code' => $row['assy_code'] ?? $assy?->assy_code,
                    'cct' => $row['cct'] ?? null,
                    'std_pack' => $this->nullableInteger($row['std_pack'] ?? $assy?->std_pack),
                    'umh' => $this->nullableDecimal($row['umh'] ?? $assy?->umh),
                    'period' => $period,
                    'month_label' => $month['label'] ?? null,
                    'year' => $month['year'] ?? null,
                    'period_start' => $month['period_start'] ?? null,
                    'period_end' => $month['period_end'] ?? null,
                    'order_type' => strtoupper($month['bucket'] ?? '') === 'FIRM' ? 'FIRM' : 'FORECAST',
                    'bal_qty' => $this->integerValue($cell['bal'] ?? 0),
                    'del_qty' => $delQty,
                    'prod_qty' => $this->integerValue($cell['prod'] ?? $delQty),
                    'total_qty' => $delQty,
                    'extra' => json_encode([
                        'source_sr_id' => $plan['source_sr_id'],
                        'source_batch_ids' => $plan['source_batch_ids'],
                        'is_mapped' => $assy !== null,
                    ]),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        return $records;
    }

    private function srPayload(SR $sr): array
    {
        return [
            'id' => $sr->id,
            'customer' => $sr->customer,
            'port' => $sr->port,
            'source_file' => $sr->source_file,
            'sheet_name' => $sr->sheet_name,
            'upload_batch' => $sr->upload_batch,
            'upload_date' => optional($sr->created_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function sourceBatches(array $batchIds): Collection
    {
        $ids = collect($batchIds)
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values();

        $batches = UploadBatch::query()
            ->with(['customer:id,code,name', 'port:id,name'])
            ->whereIn('id', $ids)
            ->orderBy('created_at')
            ->get();

        if ($batches->count() !== $ids->count()) {
            throw new \InvalidArgumentException('Ada SR upload yang tidak ditemukan atau sudah dihapus.');
        }

        return $batches;
    }

    private function combinedSrPayload(Collection $batches): array
    {
        $plan = $this->combinedPlan($batches);
        $first = $batches->first();

        return [
            'id' => null,
            'is_combined' => true,
            'customer' => $plan['customer'],
            'port' => $plan['port'],
            'source_file' => $plan['source_file'],
            'sheet_name' => $plan['sheet_name'],
            'upload_batch' => $plan['upload_batch'],
            'upload_date' => optional($first?->created_at)->format('Y-m-d H:i:s'),
            'source_batch_ids' => $plan['source_batch_ids'],
            'source_batches' => $batches->map(fn (UploadBatch $batch) => [
                'id' => $batch->id,
                'source_file' => $batch->source_file,
                'sheet_name' => $batch->sheet_name,
                'uploaded_at' => $batch->created_at?->format('Y-m-d H:i'),
                'total_qty' => $batch->total_qty,
            ])->values()->all(),
        ];
    }

    private function combinedPlan(Collection $batches): array
    {
        $ids = $batches->pluck('id')->sort()->values()->all();
        $first = $batches->first();
        $customer = $first?->customer?->code;
        $sourceNames = $batches
            ->map(fn (UploadBatch $batch) => trim($batch->source_file . ($batch->sheet_name ? ' / ' . $batch->sheet_name : '')))
            ->filter()
            ->values();
        $portNames = $batches->pluck('port.name')->filter()->unique()->values();
        $planKey = sprintf('SPP-COMBINED-%s-%s', $customer ?: 'SR', substr(md5(implode('|', $ids)), 0, 12));

        return [
            'upload_batch_id' => null,
            'customer_id' => $first?->customer_id,
            'customer' => $customer,
            'source_file' => substr('Combined: ' . $sourceNames->implode(' + '), 0, 255),
            'sheet_name' => $batches->count() . ' SR uploads',
            'upload_batch' => $planKey,
            'port' => $portNames->count() === 1 ? $portNames->first() : null,
            'source_sr_id' => null,
            'source_batch_ids' => $ids,
        ];
    }

    private function selectedBatch(array $filters): ?array
    {
        if (empty($filters['sr_batch'])) {
            return null;
        }

        $batch = UploadBatch::query()
            ->with(['customer:id,code,name'])
            ->find((int) $filters['sr_batch']);

        if (!$batch) {
            return null;
        }

        return [
            'id' => $batch->id,
            'customer' => $batch->customer?->code,
            'source_file' => $batch->source_file,
            'sheet_name' => $batch->sheet_name,
            'record_count' => $batch->record_count,
            'total_qty' => $batch->total_qty,
            'uploaded_at' => $batch->created_at?->format('Y-m-d H:i'),
        ];
    }

    private function sppMonths(Carbon $start, Carbon $currentMonth, ?int $customerId): Collection
    {
        return collect(range(0, 5))->map(function ($offset) use ($start, $currentMonth, $customerId) {
            $date = $start->copy()->addMonths($offset);
            $productionRange = $this->productionMonthRange($date, $customerId);

            return [
                'period' => $date->format('Y-m'),
                'label' => $productionRange['month_label'],
                'label_full' => $date->format('F Y'),
                'period_label' => $date->format('M Y'),
                'range_label' => $productionRange['range_label'],
                'year' => $date->format('Y'),
                'period_start' => $productionRange['start_date'],
                'period_end' => $productionRange['end_date'],
                'bucket' => $date->lessThanOrEqualTo($currentMonth) ? 'firm' : 'forecast',
            ];
        });
    }

    private function sppRows(Collection $items, Collection $months, string $qtyColumn): Collection
    {
        $periods = $months->pluck('period')->all();

        return $items
            ->groupBy(fn ($item) => $item->assy_number ?: '-')
            ->map(function ($assyRows, $assyNumber) use ($months, $periods, $qtyColumn) {
                $first = $assyRows->first();
                $assy = $first->assy;
                $monthly = [];

                foreach ($months as $month) {
                    $period = $month['period'];
                    $qty = (int) $assyRows
                        ->filter(fn ($item) => $this->itemPeriod($item) === $period)
                        ->sum($qtyColumn);

                    $monthly[$period] = [
                        'bal' => 0,
                        'del' => $qty,
                        'prod' => $qty,
                        'order_type' => $month['bucket'] === 'firm' ? 'FIRM' : 'FORECAST',
                    ];
                }

                return [
                    'customer' => $first->customer,
                    'type' => $first->model ?: $first->family ?: $assy?->type ?: '',
                    'carline' => $assy?->carline?->code,
                    'assy_number' => $assyNumber,
                    'level' => $assy?->level ?: '',
                    'assy_code' => $assy?->assy_code ?: '',
                    'cct' => $assy?->cct ?: '',
                    'std_pack' => $assy?->std_pack ?: '',
                    'umh' => $assy?->umh ?: '',
                    'months' => $monthly,
                    'total_qty' => collect($periods)->sum(fn ($period) => $monthly[$period]['del'] ?? 0),
                ];
            })
            ->sortBy([
                ['type', 'asc'],
                ['assy_number', 'asc'],
            ])
            ->values();
    }

    private function itemPeriod($item): ?string
    {
        if ($item->eta) {
            return Carbon::parse($item->eta)->format('Y-m');
        }

        if ($item->month && preg_match('/^\d{4}-\d{2}$/', (string) $item->month)) {
            return $item->month;
        }

        return null;
    }

    private function monthTotals(Collection $rows, Collection $months): array
    {
        return $months
            ->mapWithKeys(function ($month) use ($rows) {
                $period = $month['period'];

                return [
                    $period => [
                        'bal' => $rows->sum(fn ($row) => $row['months'][$period]['bal'] ?? 0),
                        'del' => $rows->sum(fn ($row) => $row['months'][$period]['del'] ?? 0),
                        'prod' => $rows->sum(fn ($row) => $row['months'][$period]['prod'] ?? 0),
                    ],
                ];
            })
            ->all();
    }

    private function productionMonthRange(Carbon $date, ?int $customerId): array
    {
        $weeks = $this->productionWeeksForMonth($date, $customerId);
        $monthLabel = strtoupper($date->format('M'));

        if ($weeks->isEmpty()) {
            $start = $date->copy()->startOfMonth();
            $end = $date->copy()->endOfMonth();

            return [
                'month_label' => $monthLabel,
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'range_label' => $this->formatSppDateRange($start, $end),
            ];
        }

        $first = $weeks->sortBy('week_start')->first();
        $last = $weeks->sortBy('end_date')->last();
        $start = Carbon::parse($first->week_start);
        $end = Carbon::parse($last->end_date);

        return [
            'month_label' => strtoupper($first->month_name ?: $monthLabel),
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'range_label' => $this->formatSppDateRange($start, $end),
        ];
    }

    private function productionWeeksForMonth(Carbon $date, ?int $customerId): Collection
    {
        if ($customerId) {
            $customerWeeks = ProductionWeek::query()
                ->where('customer_id', $customerId)
                ->where('year', $date->year)
                ->where('month_number', $date->month)
                ->orderBy('week_no')
                ->get();

            if ($customerWeeks->isNotEmpty()) {
                return $customerWeeks;
            }
        }

        return ProductionWeek::query()
            ->whereNull('customer_id')
            ->where('year', $date->year)
            ->where('month_number', $date->month)
            ->orderBy('week_no')
            ->get();
    }

    private function formatSppDateRange(Carbon $start, Carbon $end): string
    {
        return strtoupper($start->format('d/M') . ' ~ ' . $end->format('d/M'));
    }

    private function customerIdForSr(SR $sr): ?int
    {
        if ($sr->upload_batch_id) {
            return $sr->uploadBatch?->customer_id;
        }

        return Customer::query()
            ->where('code', $sr->customer)
            ->value('id');
    }

    private function integerValue($value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        return (int) round((float) $value);
    }

    private function nullableInteger($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        return (int) round((float) $value);
    }

    private function nullableDecimal($value): ?float
    {
        if ($value === null || $value === '' || !is_numeric($value)) {
            return null;
        }

        return (float) $value;
    }
}
