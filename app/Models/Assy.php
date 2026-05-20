<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Assy extends Model
{
    protected $table = 'assy';

    protected $fillable = [
        'carline_id',
        'assy_number',
        'assy_code',
        'level',
        'type',
        'umh',
        'std_pack',
        'is_active',
    ];

    protected $casts = [
        'umh' => 'decimal:6',
        'is_active' => 'boolean',
    ];

    // Relasi
    public function carline()
    {
        return $this->belongsTo(CarLine::class, 'carline_id', 'id');
    }

    public function spp()
    {
        return $this->hasMany(SPP::class, 'assy_id');
    }

    // Helper: full identifier
    public function getFullNameAttribute()
    {
        return $this->assy_number . ' - ' . $this->assy_code;
    }
}
