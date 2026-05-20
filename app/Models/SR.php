<?php

namespace App\Models;

use App\Services\Variance\AnalyticsCacheService;
use Illuminate\Database\Eloquent\Model;

class SR extends Model
{
    protected $table = 'srs';

    protected $fillable = [
        'customer',
        'sr_number',
        'carline_id',
        'assy_id',
        'upload_batch_id',
        'source_file',
        'upload_batch',
        'sheet_index',
        'sheet_name',
        'assy_number',
        'qty',
        'total',
        'delivery_date',
        'etd',
        'eta',
        'week',
        'month',
        'year',
        'order_type',
        'route',
        'port',
        'model',
        'family',
        'is_mapped',
        'mapping_error',
        'extra',
    ];

    protected $casts = [
        'extra' => 'array',
    ];

    protected static function booted(): void
    {
        static::updated(fn () => app(AnalyticsCacheService::class)->invalidate());
        static::deleted(fn () => app(AnalyticsCacheService::class)->invalidate());
    }

    // Relasi
    public function carline()
    {
        return $this->belongsTo(CarLine::class, 'carline_id', 'id');
    }

    public function assy()
    {
        return $this->belongsTo(Assy::class, 'assy_id', 'id');
    }

    public function uploadBatch()
    {
        return $this->belongsTo(UploadBatch::class, 'upload_batch_id', 'id');
    }

    public function getSummaryData()
    {
        return self::where('source_file', $this->source_file)
            ->orderBy('delivery_date')
            ->get();
    }
}
