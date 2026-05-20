<?php

namespace Tests\Unit;

use App\Models\Customer;
use App\Models\EtdMapping;
use App\Models\ProductionWeek;
use App\Services\WeekResolverService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WeekResolverServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_etd_mapping_overrides_month_and_week_from_mapper(): void
    {
        $customer = Customer::create([
            'name' => 'YC',
            'code' => 'YC',
        ]);

        $productionWeek = ProductionWeek::create([
            'customer_id' => $customer->id,
            'year' => 2026,
            'month_number' => 4,
            'month_name' => 'APR',
            'week_no' => 5,
            'week_start' => '2026-04-27',
            'end_date' => '2026-05-02',
            'working_days' => [
                '2026-04-27',
                '2026-04-28',
                '2026-04-29',
                '2026-04-30',
                '2026-05-01',
            ],
            'total_working_days' => 5,
            'num_weeks' => 5,
        ]);

        EtdMapping::create([
            'customer_id' => $customer->id,
            'etd_date' => '2026-05-06',
            'production_week_id' => $productionWeek->id,
            'is_edited' => true,
        ]);

        $resolved = app(WeekResolverService::class)->applyProductionWeeks([
            [
                'etd' => '2026-05-06',
                'week' => '1W',
                'month' => '2026-05',
                'year' => 2026,
            ],
        ], $customer->id);

        $this->assertSame(5, $resolved[0]['week']);
        $this->assertSame('APR', $resolved[0]['month']);
        $this->assertSame(2026, $resolved[0]['year']);
    }
}
