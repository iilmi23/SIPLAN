<?php

namespace App\Models\Variance;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Model;

class SrVarianceInsight extends Model
{
    protected $fillable = [
        'customer_id',
        'customer_code',
        'assy_number',
        'insight_type',
        'severity',
        'title',
        'message',
        'payload',
        'generated_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'generated_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
