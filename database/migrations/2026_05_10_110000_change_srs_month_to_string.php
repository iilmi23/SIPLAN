<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('srs', 'month')) {
            return;
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE srs ALTER COLUMN month TYPE VARCHAR(12) USING month::VARCHAR');
            return;
        }

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE srs MODIFY month VARCHAR(12) NULL');
            return;
        }

        if ($driver === 'sqlite') {
            return;
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('srs', 'month')) {
            return;
        }

        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("ALTER TABLE srs ALTER COLUMN month TYPE INTEGER USING NULLIF(regexp_replace(month, '^.*-', ''), '')::INTEGER");
            return;
        }

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE srs MODIFY month INT NULL');
            return;
        }

        if ($driver === 'sqlite') {
            return;
        }
    }
};
