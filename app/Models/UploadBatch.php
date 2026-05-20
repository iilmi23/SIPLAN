<?php

namespace App\Models;

use App\Services\Variance\AnalyticsCacheService;
use Illuminate\Database\Eloquent\Model;
use App\Models\Customer;
use App\Models\Port;
use App\Models\SR;
use App\Models\Summary;
use App\Models\User;

class UploadBatch extends Model
{
    protected $table = 'upload_batches';

    protected $fillable = [
        'batch_uuid',
        'customer_id',
        'port_id',
        'uploaded_by',
        'source_file',
        'sheet_index',
        'sheet_name',
        'status',
        'record_count',
        'mapped_count',
        'unmapped_count',
        'total_qty',
        'notes',
    ];

    protected $casts = [
        'record_count' => 'integer',
        'mapped_count' => 'integer',
        'unmapped_count' => 'integer',
        'total_qty' => 'integer',
    ];

    protected static function booted(): void
    {
        static::updated(fn () => app(AnalyticsCacheService::class)->invalidate());
        static::deleted(fn () => app(AnalyticsCacheService::class)->invalidate());
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function port()
    {
        return $this->belongsTo(Port::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function srs()
    {
        return $this->hasMany(SR::class, 'upload_batch_id');
    }

    public function orderSummaries()
    {
        return $this->hasMany(Summary::class, 'upload_batch_id');
    }

    public function sppRecords()
    {
        return $this->hasMany(SPP::class, 'upload_batch_id');
    }
}
