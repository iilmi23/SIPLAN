 <?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('production_weeks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->integer('year');
            $table->integer('month_number');
            $table->string('month_name');
            $table->integer('week_no');
            $table->date('week_start');
            $table->date('end_date');
            $table->integer('num_weeks');
            $table->timestamps();
            
            $table->unique(['customer_id', 'year', 'month_number', 'week_no'], 'weeks_unique');
            $table->index(['customer_id', 'week_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_weeks');
    }
};