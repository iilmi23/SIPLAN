<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sr_variance_analytics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('current_batch_id')->constrained('upload_batches')->cascadeOnDelete();
            $table->foreignId('previous_batch_id')->nullable()->constrained('upload_batches')->nullOnDelete();
            $table->string('customer_code')->nullable();
            $table->string('assy_number')->nullable();
            $table->string('order_type')->nullable();
            $table->string('month')->nullable();
            $table->unsignedSmallInteger('month_number')->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('week')->nullable();
            $table->unsignedSmallInteger('production_week')->nullable();
            $table->date('etd')->nullable();
            $table->date('eta')->nullable();
            $table->string('port')->nullable();
            $table->integer('previous_qty')->default(0);
            $table->integer('current_qty')->default(0);
            $table->integer('variance_qty')->default(0);
            $table->decimal('variance_percent', 12, 2)->nullable();
            $table->string('classification')->default('normal');
            $table->boolean('is_new')->default(false);
            $table->boolean('is_disappeared')->default(false);
            $table->string('variance_key_hash', 64);
            $table->timestamp('analyzed_at')->nullable();
            $table->timestamps();

            $table->unique(['current_batch_id', 'variance_key_hash'], 'sr_variance_current_key_unique');
            $table->index(['current_batch_id'], 'sr_variance_current_batch_index');
            $table->index(['previous_batch_id'], 'sr_variance_previous_batch_index');
            $table->index(['customer_id', 'year', 'month_number', 'production_week'], 'sr_variance_period_index');
            $table->index(['assy_number', 'year', 'month_number'], 'sr_variance_assy_period_index');
            $table->index(['classification', 'variance_qty'], 'sr_variance_classification_index');
            $table->index(['port', 'etd', 'eta'], 'sr_variance_logistics_index');
            $table->index(['customer_id', 'classification', 'created_at'], 'sr_variance_status_created_index');
            $table->index(['month_number', 'production_week'], 'sr_variance_month_week_index');
            $table->index(['etd'], 'sr_variance_etd_index');
            $table->index(['eta'], 'sr_variance_eta_index');
            $table->index(['port'], 'sr_variance_port_index');
        });

        Schema::create('sr_variance_trends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('customer_code')->nullable();
            $table->string('assy_number')->nullable();
            $table->string('period_type')->default('month');
            $table->string('period_key');
            $table->unsignedSmallInteger('year')->nullable();
            $table->unsignedSmallInteger('month_number')->nullable();
            $table->unsignedSmallInteger('production_week')->nullable();
            $table->integer('total_previous_qty')->default(0);
            $table->integer('total_current_qty')->default(0);
            $table->integer('total_variance_qty')->default(0);
            $table->decimal('average_growth', 12, 2)->default(0);
            $table->decimal('variance_volatility', 12, 2)->default(0);
            $table->unsignedInteger('trend_duration')->default(0);
            $table->string('trend_direction')->default('stable');
            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'assy_number', 'period_type', 'period_key'], 'sr_variance_trend_unique');
            $table->index(['period_type', 'period_key', 'trend_direction'], 'sr_variance_trend_period_index');
        });

        Schema::create('sr_variance_forecasts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('customer_code')->nullable();
            $table->string('assy_number')->nullable();
            $table->string('forecast_type')->default('month');
            $table->string('target_period');
            $table->integer('moving_average_qty')->default(0);
            $table->integer('projected_qty')->default(0);
            $table->decimal('confidence_score', 5, 2)->default(0);
            $table->json('source_periods')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'assy_number', 'forecast_type', 'target_period'], 'sr_variance_forecast_unique');
            $table->index(['forecast_type', 'target_period'], 'sr_variance_forecast_period_index');
        });

        Schema::create('sr_variance_insights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('customer_code')->nullable();
            $table->string('assy_number')->nullable();
            $table->string('insight_type')->default('info');
            $table->string('severity')->default('normal');
            $table->string('title');
            $table->text('message');
            $table->json('payload')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();

            $table->index(['severity', 'insight_type'], 'sr_variance_insight_severity_index');
            $table->index(['customer_id', 'assy_number'], 'sr_variance_insight_entity_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sr_variance_insights');
        Schema::dropIfExists('sr_variance_forecasts');
        Schema::dropIfExists('sr_variance_trends');
        Schema::dropIfExists('sr_variance_analytics');
    }
};
