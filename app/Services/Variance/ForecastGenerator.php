<?php

namespace App\Services\Variance;

use App\Models\Variance\SrVarianceAnalytic;
use App\Models\Variance\SrVarianceForecast;
use Carbon\Carbon;

class ForecastGenerator
{
    public function rebuild(?int $customerId = null): void
    {
        SrVarianceForecast::query()
            ->when($customerId, fn ($query) => $query->where('customer_id', $customerId))
            ->delete();

        $monthlyRows = SrVarianceAnalytic::query()
            ->selectRaw('customer_id, customer_code, assy_number, year, month_number, SUM(current_qty) as qty')
            ->when($customerId, fn ($query) => $query->where('customer_id', $customerId))
            ->whereNotNull('year')
            ->whereNotNull('month_number')
            ->groupBy('customer_id', 'customer_code', 'assy_number', 'year', 'month_number')
            ->orderBy('customer_id')
            ->orderBy('assy_number')
            ->orderBy('year')
            ->orderBy('month_number')
            ->get()
            ->groupBy(fn ($row) => ($row->customer_id ?? 'global').'|'.($row->assy_number ?? '-'));

        $payload = [];

        foreach ($monthlyRows as $group) {
            if ($group->count() < 2) {
                continue;
            }

            $periods = $group->map(fn ($row) => [
                'period' => sprintf('%s-%02d', $row->year, $row->month_number),
                'qty' => (int) $row->qty,
            ])->values();
            $latest = $periods->last();
            $previous = $periods->get(max($periods->count() - 2, 0));
            $lastThree = $periods->take(-3);
            $movingAverage = (int) round($lastThree->avg('qty'));
            $projected = max(0, (int) round($latest['qty'] + ($latest['qty'] - $previous['qty'])));
            $first = $group->first();

            $payload[] = [
                'customer_id' => $first->customer_id,
                'customer_code' => $first->customer_code,
                'assy_number' => $first->assy_number,
                'forecast_type' => 'month',
                'target_period' => $this->nextMonth($latest['period']),
                'moving_average_qty' => $movingAverage,
                'projected_qty' => $projected,
                'confidence_score' => min(95, 45 + ($periods->count() * 10)),
                'source_periods' => json_encode($lastThree->values()->all()),
                'generated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        foreach (array_chunk($payload, 500) as $chunk) {
            SrVarianceForecast::insert($chunk);
        }
    }

    private function nextMonth(string $period): string
    {
        [$year, $month] = array_pad(explode('-', $period), 2, 1);

        return Carbon::createFromDate((int) $year, (int) $month, 1)->addMonth()->format('Y-m');
    }
}
