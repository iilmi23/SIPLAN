<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    //
    protected $fillable = ['name', 'code'];

    public function ports()
    {
        return $this->hasMany(Port::class);
    }

    public function uploadBatches()
    {
        return $this->hasMany(UploadBatch::class);
    }

    public function sppRecords()
    {
        return $this->hasMany(SPP::class, 'customer_id');
    }

    public function srMappingTemplates()
    {
        return $this->hasMany(SRMappingTemplate::class);
    }

    public function activeSrMappingTemplate()
    {
        return $this->hasOne(SRMappingTemplate::class)->where('is_active', true)->latestOfMany();
    }
}
