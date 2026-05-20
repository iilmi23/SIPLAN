<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\SR;
use App\Models\Summary;
use App\Models\UploadBatch;

class VarianceAnalysisService
{
    public function dashboardChart(): array
    {
        $comparisons = UploadBatch::query()
            ->with('customer')
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->get()
            ->unique('customer_id')
            ->map(fn ($batch) => $this->compareBatch($batch, normalizeWeek: true))
            ->filter()
            ->values();

        $rows = $comparisons
            ->flatMap(fn ($comparison) => collect($comparison['rows'])->map(function ($row) use ($comparison) {
                return array_merge($row, ['customer' => $comparison['customer']]);
            }))
            ->filter(fn ($row) => (int) ($row['variance_qty'] ?? 0) !== 0)
            ->values();

        return [
            'summary' => $this->totals($comparisons, $rows),
            'by_customer' => $comparisons
                ->map(fn ($comparison) => [
                    'customer' => $comparison['customer'],
                    'current_qty' => $comparison['totals']['current_qty'] ?? 0,
                    'previous_qty' => $comparison['totals']['previous_qty'] ?? 0,
                    'variance_qty' => $comparison['totals']['variance_qty'] ?? 0,
                    'current_file' => $comparison['current_batch']['source_file'] ?? null,
                    'previous_file' => $comparison['previous_batch']['source_file'] ?? null,
                ])
                ->sortByDesc(fn ($row) => abs((int) $row['variance_qty']))
                ->take(8)
                ->values(),
            'top_assy_numbers' => $rows
                ->sortByDesc(fn ($row) => abs((int) ($row['variance_qty'] ?? 0)))
                ->take(5)
                ->values(),
        ];
    }

    public function variancePage(?Customer $customer, ?int $selectedBatchId): array
    {
        $comparisons = $this->currentBatches($customer, $selectedBatchId)
            ->map(fn ($batch) => $this->compareBatch($batch, includePercent: true))
            ->filter()
            ->values();

        $rows = $comparisons
            ->flatMap(fn ($comparison) => collect($comparison['rows'])->map(function ($row) use ($comparison) {
                return array_merge($row, [
                    'customer' => $comparison['customer'],
                    'current_file' => $comparison['current_batch']['source_file'] ?? null,
                    'previous_file' => $comparison['previous_batch']['source_file'] ?? null,
                ]);
            }))
            ->filter(fn ($row) => (int) ($row['variance_qty'] ?? 0) !== 0)
            ->sortByDesc(fn ($row) => abs((int) ($row['variance_qty'] ?? 0)))
            ->values();

        return [
            'comparisons' => $comparisons,
            'rows' => $rows,
            'summary' => $this->totals($comparisons, $rows),
        ];
    }

    public function batchOptions(Customer $customer)
    {
        return UploadBatch::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->get(['id', 'batch_uuid', 'source_file', 'sheet_name', 'created_at'])
            ->map(fn ($batch) => $this->batchMeta($batch))
            ->values();
    }

    private function currentBatches(?Customer $customer, ?int $selectedBatchId)
    {
        if ($selectedBatchId) {
            return UploadBatch::query()
                ->whereKey($selectedBatchId)
                ->where('status', 'completed')
                ->get();
        }

        if ($customer) {
            return UploadBatch::query()
                ->where('customer_id', $customer->id)
                ->where('status', 'completed')
                ->orderByDesc('created_at')
                ->limit(1)
                ->get();
        }

        return UploadBatch::query()
            ->with('customer')
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->get()
            ->unique('customer_id')
            ->values();
    }

    public function compareBatch(UploadBatch $currentBatch, bool $includePercent = false, bool $normalizeWeek = false): ?array
    {
        $previousBatch = UploadBatch::query()
            ->where('customer_id', $currentBatch->customer_id)
            ->where('id', '<>', $currentBatch->id)
            ->where('created_at', '<', $currentBatch->created_at)
            ->where('status', 'completed')
            ->orderByDesc('created_at')
            ->first();

        if (!$previousBatch) {
            return [
                'customer' => $currentBatch->customer?->code ?? '-',
                'current_batch' => $this->batchMeta($currentBatch),
                'previous_batch' => null,
                'totals' => $this->emptyTotals(),
                'rows' => [],
            ];
        }

        $currentRows = $this->rowsForBatch($currentBatch, $normalizeWeek);
        $previousRows = $this->rowsForBatch($previousBatch, $normalizeWeek);
        $keys = $currentRows->keys()->merge($previousRows->keys())->unique()->values();

        $rows = $keys->map(function ($key) use ($currentRows, $previousRows, $includePercent) {
            $current = $currentRows->get($key);
            $previous = $previousRows->get($key);
            $base = $current ?: $previous;
            $currentQty = (int) ($current['qty'] ?? 0);
            $previousQty = (int) ($previous['qty'] ?? 0);
            $delta = $currentQty - $previousQty;
            $row = [
                'assy_number' => $base['assy_number'] ?? '-',
                'order_type' => $base['order_type'] ?? null,
                'month' => $base['month'] ?? null,
                'week' => $base['week'] ?? null,
                'etd' => $base['etd'] ?? null,
                'eta' => $base['eta'] ?? null,
                'port' => $base['port'] ?? null,
                'current_qty' => $currentQty,
                'previous_qty' => $previousQty,
                'variance_qty' => $delta,
            ];

            if ($includePercent) {
                $row['variance_percent'] = $previousQty === 0 ? null : round(($delta / $previousQty) * 100, 2);
            }

            return $row;
        })->values();

        return [
            'customer' => $currentBatch->customer?->code ?? '-',
            'current_batch' => $this->batchMeta($currentBatch),
            'previous_batch' => $this->batchMeta($previousBatch),
            'totals' => [
                'current_qty' => $rows->sum('current_qty'),
                'previous_qty' => $rows->sum('previous_qty'),
                'variance_qty' => $rows->sum('variance_qty'),
            ],
            'rows' => $rows,
        ];
    }

    private function rowsForBatch(UploadBatch $batch, bool $normalizeWeek)
    {
        $summaryRows = Summary::query()
            ->where('upload_batch_id', $batch->id)
            ->whereRaw('UPPER(order_type) = ?', ['FIRM'])
            ->get();

        if ($summaryRows->isNotEmpty()) {
            return $summaryRows
                ->map(fn ($row) => [
                    'assy_number' => $row->assy_number,
                    'order_type' => $row->order_type,
                    'month' => $row->month,
                    'week' => $normalizeWeek ? $this->normalizeWeek($row->week) : $row->week,
                    'etd' => optional($row->etd)->toDateString(),
                    'eta' => optional($row->eta)->toDateString(),
                    'port' => $row->port,
                    'qty' => $row->total_qty,
                ])
                ->keyBy(fn ($row) => $this->varianceKey($row));
        }

        return SR::query()
            ->where(function ($query) use ($batch) {
                $query->where('upload_batch_id', $batch->id)
                    ->orWhere('upload_batch', $batch->batch_uuid);
            })
            ->whereRaw('UPPER(order_type) = ?', ['FIRM'])
            ->get()
            ->groupBy(fn ($row) => $this->varianceKey([
                'assy_number' => $row->assy_number,
                'order_type' => $row->order_type,
                'month' => $row->month,
                'week' => $normalizeWeek ? $this->normalizeWeek($row->week) : $row->week,
                'etd' => $row->etd,
                'eta' => $row->eta,
                'port' => $row->port,
            ]))
            ->map(function ($rows) use ($normalizeWeek) {
                $first = $rows->first();

                return [
                    'assy_number' => $first->assy_number,
                    'order_type' => $first->order_type,
                    'month' => $first->month,
                    'week' => $normalizeWeek ? $this->normalizeWeek($first->week) : $first->week,
                    'etd' => $first->etd,
                    'eta' => $first->eta,
                    'port' => $first->port,
                    'qty' => $rows->sum('qty'),
                ];
            });
    }

    private function totals($comparisons, $rows): array
    {
        return [
            'current_qty' => $comparisons->sum(fn ($item) => $item['totals']['current_qty'] ?? 0),
            'previous_qty' => $comparisons->sum(fn ($item) => $item['totals']['previous_qty'] ?? 0),
            'variance_qty' => $comparisons->sum(fn ($item) => $item['totals']['variance_qty'] ?? 0),
            'increase_count' => $rows->where('variance_qty', '>', 0)->count(),
            'decrease_count' => $rows->where('variance_qty', '<', 0)->count(),
            'changed_assy_numbers' => $rows->pluck('assy_number')->unique()->count(),
        ];
    }

    private function varianceKey(array $row): string
    {
        return implode('|', [
            $row['assy_number'] ?? '',
            $row['order_type'] ?? '',
            $row['month'] ?? '',
            $row['week'] ?? '',
            $row['etd'] ?? '',
            $row['eta'] ?? '',
            $row['port'] ?? '',
        ]);
    }

    public function normalizeWeek($week)
    {
        if ($week === null || $week === '') {
            return '';
        }

        if (is_numeric($week)) {
            return (int) $week;
        }

        $normalized = strtoupper(trim((string) $week));
        $normalized = preg_replace('/\s+/', ' ', $normalized);

        if (preg_match('/^(?:W|WK|WEEK)\s*[-:]?\s*(\d+)$/', $normalized, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/\d+/', $normalized, $matches)) {
            return (int) $matches[0];
        }

        return $week;
    }

    private function batchMeta(UploadBatch $batch): array
    {
        return [
            'id' => $batch->id,
            'batch_uuid' => $batch->batch_uuid,
            'source_file' => $batch->source_file,
            'sheet_name' => $batch->sheet_name,
            'uploaded_at' => optional($batch->created_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function emptyTotals(): array
    {
        return [
            'current_qty' => 0,
            'previous_qty' => 0,
            'variance_qty' => 0,
        ];
    }
}
