<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('spp_records')) {
            return;
        }

        Schema::table('spp_records', function (Blueprint $table) {
            if (!Schema::hasColumn('spp_records', 'upload_batch_id')) {
                $table->foreignId('upload_batch_id')->nullable()->after('id')->constrained('upload_batches')->nullOnDelete();
            }
            if (!Schema::hasColumn('spp_records', 'customer_id')) {
                $table->foreignId('customer_id')->nullable()->after('upload_batch_id')->constrained('customers')->nullOnDelete();
            }
            if (!Schema::hasColumn('spp_records', 'assy_id')) {
                $table->foreignId('assy_id')->nullable()->after('customer_id')->constrained('assy')->nullOnDelete();
            }
            if (!Schema::hasColumn('spp_records', 'source_file')) {
                $table->string('source_file')->nullable()->after('customer');
            }
            if (!Schema::hasColumn('spp_records', 'sheet_name')) {
                $table->string('sheet_name')->nullable()->after('source_file');
            }
            if (!Schema::hasColumn('spp_records', 'upload_batch')) {
                $table->string('upload_batch')->nullable()->after('sheet_name');
            }
            if (!Schema::hasColumn('spp_records', 'type')) {
                $table->string('type')->nullable()->after('port');
            }
            if (!Schema::hasColumn('spp_records', 'carline')) {
                $table->string('carline')->nullable()->after('type');
            }
            if (!Schema::hasColumn('spp_records', 'level')) {
                $table->string('level', 20)->nullable()->after('assy_number');
            }
            if (!Schema::hasColumn('spp_records', 'assy_code')) {
                $table->string('assy_code', 20)->nullable()->after('level');
            }
            if (!Schema::hasColumn('spp_records', 'cct')) {
                $table->string('cct', 20)->nullable()->after('assy_code');
            }
            if (!Schema::hasColumn('spp_records', 'std_pack')) {
                $table->integer('std_pack')->nullable()->after('cct');
            }
            if (!Schema::hasColumn('spp_records', 'umh')) {
                $table->decimal('umh', 10, 6)->nullable()->after('std_pack');
            }
            if (!Schema::hasColumn('spp_records', 'period')) {
                $table->string('period', 7)->nullable()->after('umh');
            }
            if (!Schema::hasColumn('spp_records', 'month_label')) {
                $table->string('month_label', 12)->nullable()->after('period');
            }
            if (!Schema::hasColumn('spp_records', 'year')) {
                $table->unsignedSmallInteger('year')->nullable()->after('month_label');
            }
            if (!Schema::hasColumn('spp_records', 'period_start')) {
                $table->date('period_start')->nullable()->after('year');
            }
            if (!Schema::hasColumn('spp_records', 'period_end')) {
                $table->date('period_end')->nullable()->after('period_start');
            }
            if (!Schema::hasColumn('spp_records', 'bal_qty')) {
                $table->integer('bal_qty')->default(0)->after('order_type');
            }
            if (!Schema::hasColumn('spp_records', 'del_qty')) {
                $table->integer('del_qty')->default(0)->after('bal_qty');
            }
            if (!Schema::hasColumn('spp_records', 'prod_qty')) {
                $table->integer('prod_qty')->default(0)->after('del_qty');
            }
            if (!Schema::hasColumn('spp_records', 'total_qty')) {
                $table->integer('total_qty')->default(0)->after('prod_qty');
            }
            if (!Schema::hasColumn('spp_records', 'extra')) {
                $table->json('extra')->nullable()->after('total_qty');
            }
        });
    }

    public function down(): void
    {
        //
    }
};
