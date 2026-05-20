<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('spp', function (Blueprint $table) {
            $table->id();
            $table->foreignId('upload_batch_id')->nullable()->constrained('upload_batches')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('assy_id')->nullable()->constrained('assy')->nullOnDelete();

            $table->string('customer');
            $table->string('source_file')->nullable();
            $table->string('sheet_name')->nullable();
            $table->string('upload_batch')->nullable();
            $table->string('port')->nullable();

            $table->string('type')->nullable();
            $table->string('carline')->nullable();
            $table->string('assy_number', 50);
            $table->string('level', 20)->nullable();
            $table->string('assy_code', 20)->nullable();
            $table->string('cct', 20)->nullable();
            $table->integer('std_pack')->nullable();
            $table->decimal('umh', 10, 6)->nullable();

            $table->string('period', 7);
            $table->string('month_label', 12)->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->string('order_type', 20)->nullable();

            $table->integer('bal_qty')->default(0);
            $table->integer('del_qty')->default(0);
            $table->integer('prod_qty')->default(0);
            $table->integer('total_qty')->default(0);

            $table->json('extra')->nullable();
            $table->timestamps();

            $table->unique(['upload_batch_id', 'assy_number', 'period'], 'spp_batch_assy_period_unique');
            $table->index(['customer', 'period']);
            $table->index(['assy_number', 'period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('spp');
    }
};
