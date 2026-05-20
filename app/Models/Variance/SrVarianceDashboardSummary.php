<?php

namespace App\Models\Variance;

use App\Models\Customer;
use App\Models\UploadBatch;
use Illuminate\Database\Eloquent\Model;

class SrVarianceDashboardSummary extends Model
{
    protected $fillable = [
        'customer_id',
        'current_batch_id',
        'customer_code',
        'period_key',
        'period_label',
        'year',
        'month_number',
        'production_week',
        'total_variance_qty',
        'changed_assy_count',
        'increase_count',
        'decrease_count',
        'critical_count',
        'analyzed_at',
    ];

    protected $casts = [
        'year' => 'integer',
        'month_number' => 'integer',
        'production_week' => 'integer',
        'total_variance_qty' => 'integer',
        'changed_assy_count' => 'integer',
        'increase_count' => 'integer',
        'decrease_count' => 'integer',
        'critical_count' => 'integer',
        'analyzed_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function currentBatch()
    {
        return $this->belongsTo(UploadBatch::class, 'current_batch_id');
    }
}
