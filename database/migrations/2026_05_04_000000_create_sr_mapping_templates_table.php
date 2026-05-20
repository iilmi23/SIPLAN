<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sr_mapping_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->string('name')->default('Default SR Template');
            $table->string('orientation')->default('vertical');
            $table->unsignedInteger('sheet_index')->nullable();
            $table->unsignedInteger('header_row')->nullable();
            $table->unsignedInteger('data_start_row');
            $table->string('assy_number_column', 8);
            $table->string('qty_column', 8)->nullable();
            $table->string('qty_start_column', 8)->nullable();
            $table->string('qty_end_column', 8)->nullable();
            $table->unsignedInteger('date_header_row')->nullable();
            $table->string('etd_column', 8)->nullable();
            $table->string('eta_column', 8)->nullable();
            $table->string('order_type_column', 8)->nullable();
            $table->string('default_order_type')->nullable();
            $table->string('model_column', 8)->nullable();
            $table->string('family_column', 8)->nullable();
            $table->string('port_column', 8)->nullable();
            $table->string('month_column', 8)->nullable();
            $table->string('week_column', 8)->nullable();
            $table->string('year_column', 8)->nullable();
            $table->string('date_format')->nullable();
            $table->json('skip_keywords')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['customer_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sr_mapping_templates');
    }
};
