<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->safeTable('srs', function (Blueprint $table) {
            $table->index(['upload_batch_id', 'created_at'], 'srs_batch_created_siplan_idx');
            $table->index(['customer', 'created_at'], 'srs_customer_created_siplan_idx');
            $table->index(['assy_number'], 'srs_assy_number_siplan_idx');
            $table->index(['etd', 'eta'], 'srs_etd_eta_siplan_idx');
            $table->index(['month', 'week', 'year'], 'srs_period_siplan_idx');
            $table->index(['order_type', 'port'], 'srs_order_port_siplan_idx');
        });

        $this->safeTable('summaries', function (Blueprint $table) {
            $table->index(['upload_batch_id'], 'summaries_batch_siplan_idx');
            $table->index(['customer_id', 'assy_number'], 'summaries_customer_assy_siplan_idx');
            $table->index(['month', 'week'], 'summaries_period_siplan_idx');
            $table->index(['etd', 'eta', 'port'], 'summaries_logistics_siplan_idx');
        });

        $this->safeTable('upload_batches', function (Blueprint $table) {
            $table->index(['customer_id', 'status', 'created_at'], 'upload_batches_customer_status_siplan_idx');
        });

        $this->safeTable('sr_variance_analytics', function (Blueprint $table) {
            $table->index(['customer_id', 'assy_number', 'classification'], 'sr_variance_customer_assy_status_idx');
            $table->index(['month_number', 'production_week', 'year'], 'sr_variance_period_week_year_idx');
        });
    }

    public function down(): void
    {
        $this->safeDrop('srs', [
            'srs_batch_created_siplan_idx',
            'srs_customer_created_siplan_idx',
            'srs_assy_number_siplan_idx',
            'srs_etd_eta_siplan_idx',
            'srs_period_siplan_idx',
            'srs_order_port_siplan_idx',
        ]);

        $this->safeDrop('summaries', [
            'summaries_batch_siplan_idx',
            'summaries_customer_assy_siplan_idx',
            'summaries_period_siplan_idx',
            'summaries_logistics_siplan_idx',
        ]);

        $this->safeDrop('upload_batches', [
            'upload_batches_customer_status_siplan_idx',
        ]);

        $this->safeDrop('sr_variance_analytics', [
            'sr_variance_customer_assy_status_idx',
            'sr_variance_period_week_year_idx',
        ]);
    }

    private function safeTable(string $table, callable $callback): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        try {
            Schema::table($table, $callback);
        } catch (\Throwable) {
            // Keep migration backward-compatible for databases that already have equivalent indexes.
        }
    }

    private function safeDrop(string $table, array $indexes): void
    {
        if (! Schema::hasTable($table)) {
            return;
        }

        foreach ($indexes as $index) {
            try {
                Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropIndex($index));
            } catch (\Throwable) {
                // Index may not exist if the guarded up() skipped it.
            }
        }
    }
};
