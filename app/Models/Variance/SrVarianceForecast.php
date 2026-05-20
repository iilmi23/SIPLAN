<?php

namespace App\Models\Variance;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Model;

class SrVarianceForecast extends Model
{
    protected $fillable = [
        'customer_id',
        'customer_code',
        'assy_number',
        'forecast_type',
        'target_period',
        'moving_average_qty',
        'projected_qty',
        'confidence_score',
        'source_periods',
        'generated_at',
    ];

    protected $casts = [
        'source_periods' => 'array',
        'confidence_score' => 'decimal:2',
        'generated_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
