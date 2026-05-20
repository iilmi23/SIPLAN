<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SPP extends Model
{
    protected $table = 'spp';

    protected $fillable = [
        'upload_batch_id',
        'customer_id',
        'assy_id',
        'customer',
        'source_file',
        'sheet_name',
        'upload_batch',
        'port',
        'type',
        'carline',
        'assy_number',
        'level',
        'assy_code',
        'cct',
        'std_pack',
        'umh',
        'period',
        'month_label',
        'year',
        'period_start',
        'period_end',
        'order_type',
        'bal_qty',
        'del_qty',
        'prod_qty',
        'total_qty',
        'extra',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'std_pack' => 'integer',
        'umh' => 'decimal:6',
        'bal_qty' => 'integer',
        'del_qty' => 'integer',
        'prod_qty' => 'integer',
        'total_qty' => 'integer',
        'extra' => 'array',
    ];

    public function uploadBatch()
    {
        return $this->belongsTo(UploadBatch::class, 'upload_batch_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function assy()
    {
        return $this->belongsTo(Assy::class, 'assy_id');
    }
}
