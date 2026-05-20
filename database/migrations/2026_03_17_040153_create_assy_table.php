<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assy', function (Blueprint $table) {
            $table->id();
            $table->foreignId('carline_id')->constrained('carline')->onDelete('restrict');
            $table->string('assy_number', 50)->unique();
            $table->string('assy_code', 20);
            $table->string('level', 20);
            $table->string('type', 10)->nullable();
            $table->decimal('umh', 10, 6);
            $table->integer('std_pack')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index('assy_number');
            $table->index('assy_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assy');
    }
};