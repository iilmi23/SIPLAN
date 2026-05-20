<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Port;
use App\Models\Customer;

class PortSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ambil customer berdasarkan code
        $yna = Customer::where('code', 'YNA')->first();
        $tyc = Customer::where('code', 'TYC')->first();
        $yc = Customer::where('code', 'YC')->first();

        // Seeder port untuk YNA
        Port::updateOrCreate(
            [
                'name' => 'MEMPHIS',
                'customer_id' => $yna->id,
            ]
        );

        Port::updateOrCreate(
            [
                'name' => 'KITCHENER',
                'customer_id' => $yna->id,
            ]
        );

        // Seeder port untuk TYC
        Port::updateOrCreate(
            [
                'name' => 'KAO',
                'customer_id' => $tyc->id,
            ]
        );

        // Seeder port untuk YC
        Port::updateOrCreate(
            [
                'name' => 'HAKATA BA',
                'customer_id' => $yc->id,
            ]
        );

        Port::updateOrCreate(
            [
                'name' => 'MOJI',
                'customer_id' => $yc->id,
            ]
        );

        Port::updateOrCreate(
            [
                'name' => 'HIROSHIMA',
                'customer_id' => $yc->id,
            ]
        );

        Port::updateOrCreate(
            [
                'name' => 'SENDAI',
                'customer_id' => $yc->id,
            ]
        );

        Port::updateOrCreate(
            [
                'name' => 'NAGOYA',
                'customer_id' => $yc->id,
            ]
        );
    }
}