<?php

namespace App\Services\Variance;

use App\Models\Variance\SrVarianceAnalytic;
use App\Models\Variance\SrVarianceTrend;
use Illuminate\Support\Facades\DB;

class TrendGenerator
{
    public function rebuild(?int $customerId = null): void
    {
        SrVarianceTrend::query()
            ->when($customerId, fn ($query) => $query->where('customer_id', $customerId))
            ->delete();

        $rows = SrVarianceAnalytic::query()
            ->selectRaw(
                'customer_id, customer_code, assy_number, year, month_number, '.
                'SUM(previous_qty) as total_previous_qty, SUM(current_qty) as total_current_qty, '.
                'SUM(variance_qty) as total_variance_qty, AVG(variance_percent) as average_growth, '.
                'STDDEV_POP(variance_qty) as variance_volatility, COUNT(*) as points'
            )
            ->when($customerId, fn ($query) => $query->where('customer_id', $customerId))
            ->groupBy('customer_id', 'customer_code', 'assy_number', 'year', 'month_number')
            ->orderBy('customer_id')
            ->orderBy('assy_number')
            ->orderBy('year')
            ->orderBy('month_number')
            ->get();

        $durationByAssy = [];
        $payload = [];

        foreach ($rows as $row) {
            $trendKey = ($row->customer_id ?? 'global').'|'.($row->assy_number ?? '-');
            $direction = $this->direction((int) $row->total_variance_qty);
            $previous = $durationByAssy[$trendKey] ?? ['direction' => null, 'duration' => 0];
            $duration = $direction !== 'stable' && $direction === $previous['direction']
                ? $previous['duration'] + 1
                : ($direction === 'stable' ? 0 : 1);
            $durationByAssy[$trendKey] = ['direction' => $direction, 'duration' => $duration];

            $payload[] = [
                'customer_id' => $row->customer_id,
                'customer_code' => $row->customer_code,
                'assy_number' => $row->assy_number,
                'period_type' => 'month',
                'period_key' => sprintf('%s-%02d', $row->year ?: 0, $row->month_number ?: 0),
                'year' => $row->year,
                'month_number' => $row->month_number,
                'production_week' => null,
                'total_previous_qty' => (int) $row->total_previous_qty,
                'total_current_qty' => (int) $row->total_current_qty,
                'total_variance_qty' => (int) $row->total_variance_qty,
                'average_growth' => round((float) $row->average_growth, 2),
                'variance_volatility' => round((float) $row->variance_volatility, 2),
                'trend_duration' => $duration,
                'trend_direction' => $direction,
                'calculated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        foreach (array_chunk($payload, 500) as $chunk) {
            SrVarianceTrend::insert($chunk);
        }
    }

    private function direction(int $variance): string
    {
        if ($variance > 0) {
            return 'increasing';
        }

        if ($variance < 0) {
            return 'decreasing';
        }

        return 'stable';
    }
}
