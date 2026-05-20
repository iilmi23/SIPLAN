<?php

namespace App\Services\Variance;

use App\Models\UploadBatch;
use App\Models\Variance\SrVarianceAnalytic;
use App\Models\Variance\SrVarianceDashboardSummary;
use App\Services\VarianceAnalysisService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class VarianceGenerator
{
    private const MONTHS = [
        'JAN' => 1,
        'FEB' => 2,
        'MAR' => 3,
        'APR' => 4,
        'MAY' => 5,
        'JUN' => 6,
        'JUL' => 7,
        'AUG' => 8,
        'SEP' => 9,
        'OCT' => 10,
        'NOV' => 11,
        'DEC' => 12,
    ];

    public function __construct(
        private readonly VarianceAnalysisService $legacyVariance,
        private readonly AnalyticsCacheService $cache
    ) {
    }

    public function refreshForBatch(UploadBatch $batch, bool $rebuildDerived = false): void
    {
        if ($batch->status !== 'completed') {
            return;
        }

        $comparison = $this->legacyVariance->compareBatch($batch, includePercent: true, normalizeWeek: true);

        if (! $comparison || empty($comparison['rows'])) {
            return;
        }

        DB::transaction(function () use ($batch, $comparison) {
            SrVarianceAnalytic::where('current_batch_id', $batch->id)->delete();
            SrVarianceDashboardSummary::where('current_batch_id', $batch->id)->delete();

            $rows = collect($comparison['rows']);

            $rows
                ->chunk(500)
                ->each(function ($chunk) use ($batch, $comparison) {
                    SrVarianceAnalytic::insert($chunk->map(fn ($row) => $this->payload($row, $batch, $comparison))->all());
                });

            $this->storeDashboardSummary($rows, $batch, $comparison);
        });

        if ($rebuildDerived) {
            $this->rebuildDerived($batch->customer_id);
            return;
        }

        $this->cache->invalidate();
    }

    public function rebuildDerived(?int $customerId = null): void
    {
        // Heavy BI-style derived tables are intentionally no longer rebuilt in
        // the operational variance flow. The dashboard reads the lightweight
        // per-batch summary plus variance detail rows.
        $this->cache->invalidate();
    }

    private function storeDashboardSummary($rows, UploadBatch $batch, array $comparison): void
    {
        $changedRows = $rows->filter(fn ($row) => (int) ($row['variance_qty'] ?? 0) !== 0);
        $period = $this->periodMeta($rows, $batch);

        SrVarianceDashboardSummary::create([
            'customer_id' => $batch->customer_id,
            'current_batch_id' => $batch->id,
            'customer_code' => $comparison['customer'] ?? $batch->customer?->code,
            'period_key' => $period['key'],
            'period_label' => $period['label'],
            'year' => $period['year'],
            'month_number' => $period['month_number'],
            'production_week' => $period['production_week'],
            'total_variance_qty' => (int) $changedRows->sum('variance_qty'),
            'changed_assy_count' => $changedRows->pluck('assy_number')->filter()->unique()->count(),
            'increase_count' => $changedRows->where('variance_qty', '>', 0)->count(),
            'decrease_count' => $changedRows->where('variance_qty', '<', 0)->count(),
            'critical_count' => $changedRows->filter(fn ($row) => $this->classify($row['variance_percent'] ?? null, (int) ($row['variance_qty'] ?? 0)) === 'critical')->count(),
            'analyzed_at' => now(),
        ]);
    }

    private function payload(array $row, UploadBatch $batch, array $comparison): array
    {
        $percent = $row['variance_percent'] ?? null;
        $week = $this->legacyVariance->normalizeWeek($row['week'] ?? null);
        $monthNumber = $this->monthNumber($row['month'] ?? null, $row['etd'] ?? null);
        $year = $this->yearValue($row['etd'] ?? null, $batch->created_at);
        $previousQty = (int) ($row['previous_qty'] ?? 0);
        $currentQty = (int) ($row['current_qty'] ?? 0);
        $varianceQty = (int) ($row['variance_qty'] ?? 0);

        return [
            'customer_id' => $batch->customer_id,
            'current_batch_id' => $batch->id,
            'previous_batch_id' => $comparison['previous_batch']['id'] ?? null,
            'customer_code' => $comparison['customer'] ?? $batch->customer?->code,
            'assy_number' => $row['assy_number'] ?? null,
            'order_type' => $row['order_type'] ?? null,
            'month' => $row['month'] ?? null,
            'month_number' => $monthNumber,
            'year' => $year,
            'week' => $row['week'] ?? null,
            'production_week' => is_numeric($week) ? (int) $week : null,
            'etd' => $this->dateValue($row['etd'] ?? null),
            'eta' => $this->dateValue($row['eta'] ?? null),
            'port' => $row['port'] ?? null,
            'previous_qty' => $previousQty,
            'current_qty' => $currentQty,
            'variance_qty' => $varianceQty,
            'variance_percent' => $percent,
            'classification' => $this->classify($percent, $varianceQty),
            'is_new' => $previousQty === 0 && $currentQty > 0,
            'is_disappeared' => $previousQty > 0 && $currentQty === 0,
            'variance_key_hash' => hash('sha256', implode('|', [
                $row['assy_number'] ?? '',
                $row['order_type'] ?? '',
                $row['month'] ?? '',
                $row['week'] ?? '',
                $row['etd'] ?? '',
                $row['eta'] ?? '',
                $row['port'] ?? '',
            ])),
            'analyzed_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    private function classify(?float $percent, int $delta): string
    {
        $value = abs((float) ($percent ?? $delta));

        return $value > 25 ? 'critical' : ($value > 10 ? 'moderate' : 'normal');
    }

    private function periodMeta($rows, UploadBatch $batch): array
    {
        $firstPeriodRow = $rows->first(fn ($row) => ! empty($row['month']) || ! empty($row['week']) || ! empty($row['etd']));
        $monthNumber = $this->monthNumber($firstPeriodRow['month'] ?? null, $firstPeriodRow['etd'] ?? $batch->created_at);
        $year = $this->yearValue($firstPeriodRow['etd'] ?? null, $batch->created_at);
        $week = $this->legacyVariance->normalizeWeek($firstPeriodRow['week'] ?? null);
        $productionWeek = is_numeric($week) ? (int) $week : null;
        $periodKey = sprintf('%04d-%02d-B%s', $year ?: 0, $monthNumber ?: 0, $batch->id);
        $periodLabel = $monthNumber
            ? sprintf('%04d-%02d', $year ?: 0, $monthNumber)
            : 'Batch '.$batch->id;

        if ($productionWeek) {
            $periodLabel .= ' W'.$productionWeek;
        }

        return [
            'key' => $periodKey,
            'label' => $periodLabel,
            'year' => $year,
            'month_number' => $monthNumber,
            'production_week' => $productionWeek,
        ];
    }

    private function monthNumber(?string $month, mixed $fallbackDate): ?int
    {
        $month = strtoupper(trim((string) $month));

        if (isset(self::MONTHS[$month])) {
            return self::MONTHS[$month];
        }

        if (is_numeric($month) && (int) $month >= 1 && (int) $month <= 12) {
            return (int) $month;
        }

        return $fallbackDate ? Carbon::parse($fallbackDate)->month : null;
    }

    private function yearValue(mixed $date, mixed $fallback): ?int
    {
        return $date ? Carbon::parse($date)->year : ($fallback ? Carbon::parse($fallback)->year : null);
    }

    private function dateValue(mixed $date): ?string
    {
        return $date ? Carbon::parse($date)->toDateString() : null;
    }
}
