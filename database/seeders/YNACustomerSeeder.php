<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;

class YNACustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Customer::updateOrCreate(
            ['code' => 'YNA'],
            [
                'name' => 'Yazaki North America',
            ]
        );

        Customer::updateOrCreate(
            ['code' => 'TYC'],
            [
                'name' => 'Taiwan Yazaki Corporation',
            ]
        );

        Customer::updateOrCreate(
            ['code' => 'YC'],
            [
                'name' => 'Yazaki Corporation',
            ]
        );

        Customer::updateOrCreate(
            ['code' => 'SAI'],
            [
                'name' => 'PT Surabaya Autocomp Indonesia',
            ]
        );
    }
}