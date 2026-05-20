<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const INDEX_NAME = 'production_weeks_scope_unique';
    private const SCOPE_COLUMN = 'customer_scope_id';

    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            Schema::table('production_weeks', function (Blueprint $table) {
                if (! Schema::hasColumn('production_weeks', self::SCOPE_COLUMN)) {
                    $table->unsignedBigInteger(self::SCOPE_COLUMN)
                        ->virtualAs('COALESCE(customer_id, 0)')
                        ->after('customer_id');
                }
            });

            Schema::table('production_weeks', function (Blueprint $table) {
                $table->unique([self::SCOPE_COLUMN, 'year', 'month_number', 'week_no'], self::INDEX_NAME);
            });

            return;
        }

        if ($driver === 'pgsql') {
            DB::statement(
                'CREATE UNIQUE INDEX '.self::INDEX_NAME.
                ' ON production_weeks ((COALESCE(customer_id, 0)), year, month_number, week_no)'
            );

            return;
        }

        if ($driver === 'sqlite') {
            DB::statement(
                'CREATE UNIQUE INDEX '.self::INDEX_NAME.
                ' ON production_weeks (COALESCE(customer_id, 0), year, month_number, week_no)'
            );

            return;
        }

        if ($driver === 'sqlsrv') {
            DB::statement(
                'ALTER TABLE production_weeks ADD '.self::SCOPE_COLUMN.
                ' AS ISNULL(customer_id, 0) PERSISTED'
            );
            DB::statement(
                'CREATE UNIQUE INDEX '.self::INDEX_NAME.
                ' ON production_weeks ('.self::SCOPE_COLUMN.', year, month_number, week_no)'
            );
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            Schema::table('production_weeks', function (Blueprint $table) {
                $table->dropUnique(self::INDEX_NAME);
            });

            if (Schema::hasColumn('production_weeks', self::SCOPE_COLUMN)) {
                Schema::table('production_weeks', function (Blueprint $table) {
                    $table->dropColumn(self::SCOPE_COLUMN);
                });
            }

            return;
        }

        if ($driver === 'pgsql' || $driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS '.self::INDEX_NAME);

            return;
        }

        if ($driver === 'sqlsrv') {
            DB::statement('DROP INDEX '.self::INDEX_NAME.' ON production_weeks');
            DB::statement('ALTER TABLE production_weeks DROP COLUMN '.self::SCOPE_COLUMN);
        }
    }
};
