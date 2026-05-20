<?php

namespace App\Exports;

/**
 * SAIExport — Export untuk customer SAI
 * Menggunakan 15 slot kolom per bulan dengan warna kuning (FIRM) dan orange (FORECAST)
 */
class SAIExport extends YCExport
{
    protected function periodsPerMonth(): int
    {
        return 15;
    }
}
