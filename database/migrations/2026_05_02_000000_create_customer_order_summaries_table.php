<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('summaries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('upload_batch_id')->constrained('upload_batches')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->foreignId('port_id')->nullable()->constrained('ports')->nullOnDelete();
            $table->foreignId('assy_id')->nullable()->constrained('assy')->nullOnDelete();
            $table->string('upload_batch');
            $table->string('customer');
            $table->string('source_file')->nullable();
            $table->string('sheet_name')->nullable();
            $table->string('assy_number');
            $table->string('model')->nullable();
            $table->string('family')->nullable();
            $table->string('order_type')->nullable();
            $table->string('month')->nullable();
            $table->string('week')->nullable();
            $table->date('etd')->nullable();
            $table->date('eta')->nullable();
            $table->string('port')->nullable();
            $table->unsignedInteger('line_count')->default(0);
            $table->integer('total_qty')->default(0);
            $table->timestamps();

            $table->index(['customer', 'month', 'week']);
            $table->index(['customer', 'assy_number']);
            $table->index(['customer_id', 'month', 'week']);
            $table->index(['upload_batch_id', 'assy_number'], 'summaries_batch_assy_index');
            $table->index(['assy_id', 'month', 'week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('summaries');
    }
};
