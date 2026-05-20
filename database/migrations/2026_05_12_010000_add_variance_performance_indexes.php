<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('upload_batches', function (Blueprint $table) {
            $table->index(['status', 'customer_id', 'created_at'], 'upload_batches_variance_status_index');
        });

        Schema::table('summaries', function (Blueprint $table) {
            $table->index(['upload_batch_id', 'order_type'], 'summaries_variance_batch_order_index');
            $table->index(['assy_number'], 'summaries_variance_assy_index');
            $table->index(['month', 'week'], 'summaries_variance_period_index');
            $table->index(['etd', 'eta'], 'summaries_variance_dates_index');
        });

        Schema::table('srs', function (Blueprint $table) {
            $table->index(['upload_batch_id', 'order_type'], 'srs_variance_batch_order_index');
            $table->index(['upload_batch', 'order_type'], 'srs_variance_uuid_order_index');
            $table->index(['assy_number'], 'srs_variance_assy_index');
            $table->index(['month', 'week'], 'srs_variance_period_index');
            $table->index(['etd', 'eta'], 'srs_variance_dates_index');
        });
    }

    public function down(): void
    {
        Schema::table('srs', function (Blueprint $table) {
            $table->dropIndex('srs_variance_dates_index');
            $table->dropIndex('srs_variance_period_index');
            $table->dropIndex('srs_variance_assy_index');
            $table->dropIndex('srs_variance_uuid_order_index');
            $table->dropIndex('srs_variance_batch_order_index');
        });

        Schema::table('summaries', function (Blueprint $table) {
            $table->dropIndex('summaries_variance_dates_index');
            $table->dropIndex('summaries_variance_period_index');
            $table->dropIndex('summaries_variance_assy_index');
            $table->dropIndex('summaries_variance_batch_order_index');
        });

        Schema::table('upload_batches', function (Blueprint $table) {
            $table->dropIndex('upload_batches_variance_status_index');
        });
    }
};
