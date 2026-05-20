<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('srs', function (Blueprint $table) {
            if (!Schema::hasColumn('srs', 'upload_batch')) {
                $table->string('upload_batch')->nullable();
            }

            if (!Schema::hasColumn('srs', 'sheet_index')) {
                $table->unsignedInteger('sheet_index')->nullable();
            }

            if (!Schema::hasColumn('srs', 'sheet_name')) {
                $table->string('sheet_name')->nullable();
            }

            if (!Schema::hasColumn('srs', 'order_type')) {
                $table->string('order_type', 20)->nullable();
            }
        });

        $this->backfillBatchColumns();
    }

    public function down(): void
    {
        Schema::table('srs', function (Blueprint $table) {
            if (Schema::hasColumn('srs', 'order_type')) {
                $table->dropColumn('order_type');
            }

            if (Schema::hasColumn('srs', 'sheet_name')) {
                $table->dropColumn('sheet_name');
            }

            if (Schema::hasColumn('srs', 'sheet_index')) {
                $table->dropColumn('sheet_index');
            }

            if (Schema::hasColumn('srs', 'upload_batch')) {
                $table->dropColumn('upload_batch');
            }
        });
    }

    private function backfillBatchColumns(): void
    {
        if (!Schema::hasTable('upload_batches') || !Schema::hasColumn('srs', 'upload_batch_id')) {
            return;
        }

        DB::statement(<<<'SQL'
            UPDATE srs
            SET
                upload_batch = COALESCE(srs.upload_batch, upload_batches.batch_uuid),
                sheet_index = COALESCE(srs.sheet_index, upload_batches.sheet_index),
                sheet_name = COALESCE(srs.sheet_name, upload_batches.sheet_name)
            FROM upload_batches
            WHERE srs.upload_batch_id = upload_batches.id
        SQL);
    }
};
