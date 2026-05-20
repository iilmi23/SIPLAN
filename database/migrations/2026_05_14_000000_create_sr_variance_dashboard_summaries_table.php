<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sr_variance_dashboard_summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('current_batch_id')->constrained('upload_batches')->cascadeOnDelete();
            $table->string('customer_code')->nullable();
            $table->string('period_key');
            $table->string('period_label');
            $table->unsignedSmallInteger('year')->nullable();
            $table->unsignedSmallInteger('month_number')->nullable();
            $table->unsignedSmallInteger('production_week')->nullable();
            $table->integer('total_variance_qty')->default(0);
            $table->unsignedInteger('changed_assy_count')->default(0);
            $table->unsignedInteger('increase_count')->default(0);
            $table->unsignedInteger('decrease_count')->default(0);
            $table->unsignedInteger('critical_count')->default(0);
            $table->timestamp('analyzed_at')->nullable();
            $table->timestamps();

            $table->unique('current_batch_id', 'sr_variance_dashboard_batch_unique');
            $table->index(['customer_id', 'current_batch_id'], 'sr_variance_dashboard_customer_batch_index');
            $table->index(['period_key'], 'sr_variance_dashboard_period_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sr_variance_dashboard_summaries');
    }
};
