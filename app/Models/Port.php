<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Port extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'name',
        'is_active'
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}