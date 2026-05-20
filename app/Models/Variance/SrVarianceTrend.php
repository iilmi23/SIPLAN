<?php

namespace App\Models\Variance;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Model;

class SrVarianceTrend extends Model
{
    protected $fillable = [
        'customer_id',
        'customer_code',
        'assy_number',
        'period_type',
        'period_key',
        'year',
        'month_number',
        'production_week',
        'total_previous_qty',
        'total_current_qty',
        'total_variance_qty',
        'average_growth',
        'variance_volatility',
        'trend_duration',
        'trend_direction',
        'calculated_at',
    ];

    protected $casts = [
        'average_growth' => 'decimal:2',
        'variance_volatility' => 'decimal:2',
        'calculated_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
