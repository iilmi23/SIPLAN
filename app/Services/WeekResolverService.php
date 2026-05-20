<?php

namespace App\Services;

use App\Models\ProductionWeek;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class WeekResolverService
{
    public function applyProductionWeeks(array $mapped, int $customerId): array
    {
        foreach ($mapped as &$item) {
            if (empty($item['etd'])) {
                continue;
            }

            $weekId = WeekGenerator::resolveEtdMapping($customerId, $item['etd']);

            if ($weekId) {
                $week = ProductionWeek::find($weekId);

                if ($week) {
                    $item['week'] = $week->week_no;
                    $item['month'] = $week->month_name;
                    $item['year'] = $week->year;
                }

                continue;
            }

            $date = Carbon::parse($item['etd']);
            $item['week'] = empty($item['week']) ? ceil($date->day / 7) : $item['week'];
            $item['month'] = empty($item['month']) ? strtoupper($date->shortMonthName) : $item['month'];
            $item['year'] = empty($item['year']) ? $date->year : $item['year'];

            Log::warning('Production week fallback used', [
                'etd' => $item['etd'],
                'week' => $item['week'],
                'month' => $item['month'],
            ]);
        }
        unset($item);

        return $mapped;
    }
}
