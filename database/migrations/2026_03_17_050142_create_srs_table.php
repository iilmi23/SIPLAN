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
        Schema::create('srs', function (Blueprint $table) {
            $table->id();

            $table->string('customer');
            $table->foreignId('carline_id')->nullable()->constrained('carline')->onDelete('restrict');
            $table->string('sr_number')->nullable();
            $table->string('source_file')->nullable();

            $table->string('assy_number')->nullable();
            $table->integer('qty')->nullable();
            $table->integer('total')->nullable();
            $table->date('delivery_date')->nullable();

            $table->date('etd')->nullable();
            $table->date('eta')->nullable();

            $table->string('week')->nullable();
            $table->integer('month')->nullable();
            $table->integer('year')->nullable();
            $table->string('route')->nullable();
            $table->string('port')->nullable();
            $table->string('model')->nullable();
            $table->string('family')->nullable();

            $table->foreignId('assy_id')->nullable()->constrained('assy')->onDelete('restrict');
            $table->foreignId('upload_batch_id')->nullable()->constrained('upload_batches')->nullOnDelete();
            $table->boolean('is_mapped')->default(false);
            $table->text('mapping_error')->nullable();

            $table->json('extra')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('srs');
    }
};
