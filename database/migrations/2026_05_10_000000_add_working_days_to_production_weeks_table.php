<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_weeks', function (Blueprint $table) {
            $table->json('working_days')->nullable()->after('end_date');
            $table->integer('total_working_days')->default(0)->after('working_days');
        });

        DB::table('production_weeks')
            ->select(['id', 'week_start', 'end_date'])
            ->orderBy('id')
            ->get()
            ->each(function ($week) {
                $workingDays = [];
                $date = Carbon::parse($week->week_start)->startOfDay();
                $end = Carbon::parse($week->end_date)->startOfDay();

                while ($date->lte($end)) {
                    if ($date->isWeekday()) {
                        $workingDays[] = $date->toDateString();
                    }

                    $date->addDay();
                }

                DB::table('production_weeks')
                    ->where('id', $week->id)
                    ->update([
                        'working_days' => json_encode($workingDays),
                        'total_working_days' => count($workingDays),
                    ]);
            });
    }

    public function down(): void
    {
        Schema::table('production_weeks', function (Blueprint $table) {
            $table->dropColumn(['working_days', 'total_working_days']);
        });
    }
};
