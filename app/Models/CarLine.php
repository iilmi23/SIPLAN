<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CarLine extends Model
{
    protected $table = 'carline';

    protected $fillable = [
        'code',
    ];

    // Relasi
    public function assy()
    {
        return $this->hasMany(Assy::class, 'carline_id', 'id');
    }
}