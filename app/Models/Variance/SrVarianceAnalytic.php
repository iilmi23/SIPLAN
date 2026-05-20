<?php

namespace App\Models\Variance;

use App\Models\Customer;
use App\Models\UploadBatch;
use Illuminate\Database\Eloquent\Model;

class SrVarianceAnalytic extends Model
{
    protected $fillable = [
        'customer_id',
        'current_batch_id',
        'previous_batch_id',
        'customer_code',
        'assy_number',
        'order_type',
        'month',
        'month_number',
        'year',
        'week',
        'production_week',
        'etd',
        'eta',
        'port',
        'previous_qty',
        'current_qty',
        'variance_qty',
        'variance_percent',
        'classification',
        'is_new',
        'is_disappeared',
        'variance_key_hash',
        'analyzed_at',
    ];

    protected $casts = [
        'etd' => 'date',
        'eta' => 'date',
        'previous_qty' => 'integer',
        'current_qty' => 'integer',
        'variance_qty' => 'integer',
        'variance_percent' => 'decimal:2',
        'is_new' => 'boolean',
        'is_disappeared' => 'boolean',
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

    public function previousBatch()
    {
        return $this->belongsTo(UploadBatch::class, 'previous_batch_id');
    }
}
