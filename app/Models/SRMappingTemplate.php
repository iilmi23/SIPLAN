<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SRMappingTemplate extends Model
{
    protected $table = 'sr_mapping_templates';

    protected $fillable = [
        'customer_id',
        'name',
        'orientation',
        'sheet_index',
        'header_row',
        'data_start_row',
        'assy_number_column',
        'qty_column',
        'qty_start_column',
        'qty_end_column',
        'date_header_row',
        'etd_column',
        'eta_column',
        'order_type_column',
        'default_order_type',
        'model_column',
        'family_column',
        'port_column',
        'month_column',
        'week_column',
        'year_column',
        'date_format',
        'skip_keywords',
        'is_active',
    ];

    protected $casts = [
        'skip_keywords' => 'array',
        'is_active' => 'boolean',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
