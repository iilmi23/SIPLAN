<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class TimeChart extends Model
{
    protected $fillable = [
        'year',
        'month',
        'week_number',
        'start_date',
        'end_date',
        'working_days',
        'total_working_days',
        'source_file',
        'file_hash',
        'last_upload_at',
        'upload_batch',
    ];

    protected $casts = [
        'working_days' => 'array',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    /**
     * Get time chart data for a specific month
     */
    public static function getForMonth($year, $month)
    {
        return self::where('year', $year)
            ->where('month', $month)
            ->orderBy('week_number')
            ->get();
    }

    /**
     * Get week number for a given date
     */
    public static function getWeekForDate($date)
    {
        $carbonDate = Carbon::parse($date);
        
        $chart = self::where('year', $carbonDate->year)
            ->where('month', $carbonDate->month)
            ->whereJsonContains('working_days', $carbonDate->format('Y-m-d'))
            ->first();

        return $chart ? $chart->week_number : null;
    }

    /**
     * Check if date is a working day
     */
    public static function isWorkingDay($date)
    {
        $carbonDate = Carbon::parse($date);
        
        return self::where('year', $carbonDate->year)
            ->where('month', $carbonDate->month)
            ->whereJsonContains('working_days', $carbonDate->format('Y-m-d'))
            ->exists();
    }

    /**
     * Get latest upload batch
     */
    public static function getLatestBatch()
    {
        return self::latest('created_at')->value('upload_batch');
    }
}
