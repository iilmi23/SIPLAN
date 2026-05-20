<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class ProductionWeek extends Model
{
    protected $table = 'production_weeks';

    protected $fillable = [
        'customer_id',
        'year',
        'month_number',
        'month_name',
        'week_no',
        'week_start',
        'end_date',
        'working_days',
        'total_working_days',
        'num_weeks',
    ];

    protected $casts = [
        'week_start' => 'date',
        'end_date' => 'date',
        'working_days' => 'array',
    ];

    // ─── Relasi ───────────────────────────────────────────────
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function sppRecords()
    {
        $relation = $this->hasMany(SPP::class, 'year', 'year')
            ->where('month_label', strtoupper(substr((string) $this->month_name, 0, 3)));

        if ($this->customer_id) {
            $relation->where('customer_id', $this->customer_id);
        }

        return $relation;
    }

    public function etdMappings()
    {
        return $this->hasMany(EtdMapping::class);
    }

    // ─── Helper ───────────────────────────────────────────────
    /**
     * Cek apakah tanggal ETD masuk ke week ini.
     * Patokan: ETD >= week_start minggu ini DAN < week_start minggu berikutnya.
     */
    public function containsDate($date)
    {
        $date = Carbon::parse($date)->startOfDay();
        $weekStart = $this->week_start->copy()->startOfDay();

        $nextWeek = ProductionWeek::where('year', $this->year)
            ->where('week_start', '>', $this->week_start)
            ->when(
                $this->customer_id !== null,
                fn ($query) => $query->where('customer_id', $this->customer_id),
                fn ($query) => $query->whereNull('customer_id')
            )
            ->orderBy('week_start')
            ->first();

        $endBoundary = $nextWeek
            ? $nextWeek->week_start->copy()->startOfDay()
            : $this->end_date->copy()->addDay()->startOfDay();

        return $date->gte($weekStart) && $date->lt($endBoundary);
    }

    /**
     * Scope filter by customer
     */
    public function scopeForCustomer($query, $customerId)
    {
        return $customerId ? $query->where('customer_id', $customerId) : $query;
    }

    /**
     * Scope filter by year
     */
    public function scopeForYear($query, $year)
    {
        return $query->where('year', $year);
    }

    /**
     * Find the production week that contains the given ETD date.
     * The week is determined by the latest week_start less than or equal to the date.
     */
    public static function findByDate($customerId, $date): ?self
    {
        if (empty($date)) {
            return null;
        }

        $date = Carbon::parse($date)->startOfDay();

        $queries = [];

        if (!empty($customerId)) {
            $queries[] = self::where('customer_id', $customerId);
        }

        $queries[] = self::whereNull('customer_id');

        foreach ($queries as $query) {
            $week = $query
                ->where('week_start', '<=', $date)
                ->where(function ($q) use ($date) {
                    $q->whereNull('end_date')
                        ->orWhere('end_date', '>=', $date);
                })
                ->orderBy('week_start', 'desc')
                ->first();

            if ($week) {
                return $week;
            }
        }

        return null;
    }
}
