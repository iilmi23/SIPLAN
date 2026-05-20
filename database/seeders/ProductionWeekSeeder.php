<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use App\Models\ProductionWeek;

class ProductionWeekSeeder extends Seeder
{
    /**
     * Seed global production weeks untuk tahun 2026.
     */
    public function run(): void
    {
        $monthData = [
            ['month' => 'JAN', 'start' => '2026-01-05', 'end' => '2026-01-30', 'weeks' => 4],
            ['month' => 'FEB', 'start' => '2026-02-02', 'end' => '2026-02-27', 'weeks' => 4],
            ['month' => 'MAR', 'start' => '2026-03-02', 'end' => '2026-03-31', 'weeks' => 4],
            ['month' => 'APR', 'start' => '2026-04-01', 'end' => '2026-04-30', 'weeks' => 5],
            ['month' => 'MAY', 'start' => '2026-05-02', 'end' => '2026-05-30', 'weeks' => 4],
            ['month' => 'JUN', 'start' => '2026-06-02', 'end' => '2026-06-30', 'weeks' => 4],
            ['month' => 'JUL', 'start' => '2026-07-01', 'end' => '2026-07-31', 'weeks' => 5],
            ['month' => 'AUG', 'start' => '2026-08-03', 'end' => '2026-08-31', 'weeks' => 4],
            ['month' => 'SEP', 'start' => '2026-09-01', 'end' => '2026-09-30', 'weeks' => 5],
            ['month' => 'OCT', 'start' => '2026-10-01', 'end' => '2026-10-30', 'weeks' => 4],
            ['month' => 'NOV', 'start' => '2026-11-02', 'end' => '2026-11-30', 'weeks' => 4],
            ['month' => 'DEC', 'start' => '2026-12-01', 'end' => '2026-12-31', 'weeks' => 5],
        ];

        foreach ($monthData as $data) {
            $monthNumber = $this->getMonthNumber($data['month']);
            $monthStart = Carbon::parse($data['start']);
            $monthEnd = Carbon::parse($data['end']);

            for ($weekNo = 1; $weekNo <= $data['weeks']; $weekNo++) {
                $weekStart = $monthStart->copy()->addWeeks($weekNo - 1);
                $weekEnd = $weekNo === $data['weeks']
                    ? $monthEnd->copy()
                    : $weekStart->copy()->addDays(6);
                $workingDays = $this->workingDaysBetween($weekStart, $weekEnd);

                ProductionWeek::updateOrCreate(
                    [
                        'customer_id' => null,
                        'year' => 2026,
                        'month_number' => $monthNumber,
                        'week_no' => $weekNo,
                    ],
                    [
                        'month_name' => $data['month'],
                        'week_start' => $weekStart->toDateString(),
                        'end_date' => $weekEnd->toDateString(),
                        'working_days' => $workingDays,
                        'total_working_days' => count($workingDays),
                        'num_weeks' => $data['weeks'],
                    ]
                );
            }
        }
    }

    /**
     * Convert month name (JAN, FEB, dst) ke month number (1-12)
     */
    private function getMonthNumber($month): int
    {
        $months = [
            'JAN' => 1, 'FEB' => 2, 'MAR' => 3, 'APR' => 4,
            'MAY' => 5, 'JUN' => 6, 'JUL' => 7, 'AUG' => 8,
            'SEP' => 9, 'OCT' => 10, 'NOV' => 11, 'DEC' => 12
        ];
        return $months[$month] ?? 1;
    }

    private function workingDaysBetween(Carbon $start, Carbon $end): array
    {
        $workingDays = [];
        $date = $start->copy()->startOfDay();
        $endDate = $end->copy()->startOfDay();

        while ($date->lte($endDate)) {
            if ($date->isWeekday()) {
                $workingDays[] = $date->toDateString();
            }

            $date->addDay();
        }

        return $workingDays;
    }
}
