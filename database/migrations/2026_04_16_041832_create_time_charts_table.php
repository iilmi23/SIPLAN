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
        Schema::create('time_charts', function (Blueprint $table) {
            $table->id();
            
            $table->year('year');
            $table->tinyInteger('month');
            
            $table->tinyInteger('week_number'); // 1-5
            $table->date('start_date');
            $table->date('end_date');
            
            $table->json('working_days'); // Array of dates
            $table->integer('total_working_days')->default(0);
            
            $table->string('source_file')->nullable();
            $table->string('file_hash')->nullable();
            $table->timestamp('last_upload_at')->nullable();
            $table->string('upload_batch')->nullable();
            
            $table->timestamps();
            
            // Indexes
            $table->unique(['year', 'month', 'week_number'], 'unique_year_month_week');
            $table->index('upload_batch');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('time_charts');
    }
};
