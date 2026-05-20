<?php

namespace App\Services\SR;

use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Mapper TYC/JAI horizontal.
 *
 * Ringkas:
 * - Mendeteksi baris FIRM/FORECAST, time chart, ETA, ETD, dan header.
 * - Memfilter kolom aktif dengan window FIRM dan FORECAST.
 * - Kolom 2W/3W/4W/5W mewarisi bulan dan type dari anchor 1W.
 * - Mengambil ETD/ETA dari baris tanggal, lalu qty dari baris assy.
 */
class TYCMapper implements SRMapperInterface
{
    private const FIRM_FORECAST_ROW = 12; // row 13 Excel = index 12
    private const TIME_CHART_ROW    = 13; // row 14 Excel = index 13
    private const ETA_TYC_ROW       = 17; // row 18 Excel = index 17
    private const HEADER_ROW        = 18; // row 19 Excel = index 18

    public function map(array $sheet, ?Carbon $referenceDate = null, array $options = []): array
    {
        $result = [];

        if (empty($sheet) || !is_array($sheet)) {
            throw new \Exception("Sheet kosong atau tidak valid");
        }

        // Safety check: limit sheet size to prevent memory issues
        if (count($sheet) > 10000) {
            throw new \Exception("Sheet terlalu besar (max 10,000 rows)");
        }

        Log::info('=== MAPPING TYC START ===');

        [$headerRow, $headerRowIndex] = $this->detectHeaderRow($sheet) ?? [$sheet[self::HEADER_ROW] ?? [], self::HEADER_ROW];
        [$firmForecastRow, $firmForecastRowIndex] = $this->detectFirmForecastRow($sheet, 0, $headerRowIndex) ?? [$sheet[self::FIRM_FORECAST_ROW] ?? [], self::FIRM_FORECAST_ROW];
        [$timeChartRow, $timeChartRowIndex] = $this->detectTimeChartRow($sheet, 0, $headerRowIndex) ?? [$sheet[self::TIME_CHART_ROW] ?? [], self::TIME_CHART_ROW];
        [$etaRow, $etaRowIndex] = $this->detectEtaPortKaoRow($sheet, $timeChartRowIndex + 1, $headerRowIndex)
            ?? $this->detectEtaTycRow($sheet, $timeChartRowIndex + 1, $headerRowIndex)
            ?? [$sheet[self::ETA_TYC_ROW] ?? [], self::ETA_TYC_ROW];

        [$etdRow, $etdRowIndex] = $this->detectEtdPortSurRow($sheet, $timeChartRowIndex + 1, $headerRowIndex)
            ?? $this->detectDateRowBefore($sheet, $etaRowIndex - 1, $timeChartRowIndex + 1)
            ?? [[], -1];

        $sheetReference = $referenceDate ?? $this->guessReferenceDate($etaRow, $timeChartRow) ?? Carbon::now();

        Log::info("Detected rows: HEADER={$headerRowIndex}, FIRM_FORECAST={$firmForecastRowIndex}, TIME_CHART={$timeChartRowIndex}, ETA={$etaRowIndex}, ETD={$etdRowIndex}");
        Log::info("Reference date used for window: {$sheetReference->toDateString()}");

        $ref = $sheetReference;
        $firmStart     = $ref->copy()->subMonth()->startOfMonth();
        $firmEnd       = $ref->copy()->endOfMonth();
        $forecastStart = $ref->copy()->startOfMonth();
        $forecastEnd   = $ref->copy()->addMonths(4)->endOfMonth();

        Log::info("Reference   : {$ref->toDateString()}");
        Log::info("FIRM window : {$firmStart->format('Y-m')} ~ {$firmEnd->format('Y-m')}");
        Log::info("FORECAST win: {$forecastStart->format('Y-m')} ~ {$forecastEnd->format('Y-m')}");

        $headerColumns = $this->detectHeaderColumns($headerRow);

        $assyCol = $headerColumns['assy_number'] ?? null;
        $modelCol = $headerColumns['model'] ?? 0;
        $familyCol = $headerColumns['family'] ?? 1;
        $noCol = $headerColumns['no'] ?? 2;
        $sfxCol = $headerColumns['sfx'] ?? 5;
        $qtyLabelCol = $headerColumns['qty_label'] ?? 6;

        if ($assyCol === null) {
            throw new \Exception("Kolom 'PRODUCT NO' tidak ditemukan");
        }

        $hiddenColumns = array_flip($options['hidden_columns'] ?? []);
        $hiddenRows = array_flip($options['hidden_rows'] ?? []);

        // Cari DATA_COL_START dari anchor tahun eksplisit
        $dataColStart = $this->findDataColStart($timeChartRow, $etaRow, $etdRow, $hiddenColumns);
        Log::info("DATA_COL_START: {$dataColStart}");

        // Bangun peta kolom (semua minggu 1W~5W)
        $dateColumns = $this->buildDateColumns(
            $firmForecastRow,
            $timeChartRow,
            $etaRow,
            $etdRow,
            $headerRow,
            $dataColStart,
            $firmStart,
            $firmEnd,
            $forecastStart,
            $forecastEnd,
            $hiddenColumns
        );

        if (empty($dateColumns)) {
            throw new \Exception(
                "Tidak ada kolom tanggal dalam window. " .
                "FIRM: {$firmStart->format('Y-m')} ~ {$firmEnd->format('Y-m')}, " .
                "FORECAST: {$forecastStart->format('Y-m')} ~ {$forecastEnd->format('Y-m')}."
            );
        }

        $firmCols     = array_filter($dateColumns, fn($d) => $d['type'] === 'FIRM');
        $forecastCols = array_filter($dateColumns, fn($d) => $d['type'] === 'FORECAST');
        Log::info("Kolom aktif: " . count($dateColumns) .
            " (FIRM=" . count($firmCols) . ", FORECAST=" . count($forecastCols) . ")");

        // Cari baris data pertama
        $dataStartRow = $this->findDataStartRow($sheet, $headerRowIndex, $assyCol, $qtyLabelCol, $dateColumns, $hiddenRows);
        if ($dataStartRow === null) {
            throw new \Exception("Baris data tidak ditemukan setelah header");
        }

        // Loop data rows
        $skipWords     = ['total', 'subtotal', 'grand total', 'balance'];
        $processedRows = 0;
        $lastModel     = null;
        $lastFamily    = null;

        for ($i = $dataStartRow; $i < count($sheet); $i++) {
            if (isset($hiddenRows[$i])) {
                continue;
            }

            $row = $sheet[$i];
            if (!is_array($row)) continue;

            $assyNumber = trim((string)($row[$assyCol] ?? ''));
            if (empty($assyNumber)) continue;
            if (in_array(strtolower($assyNumber), $skipWords)) continue;

            $processedRows++;

            $model  = trim((string)($row[$modelCol] ?? '')) ?: null;
            $family = trim((string)($row[$familyCol] ?? '')) ?: null;
            if ($model === null) {
                $model = $lastModel;
            }
            if ($family === null) {
                $family = $lastFamily;
            }
            if ($model !== null) {
                $lastModel = $model;
            }
            if ($family !== null) {
                $lastFamily = $family;
            }

            $no     = $row[$noCol] ?? null;
            $sfx    = trim((string)($row[$sfxCol] ?? '')) ?: null;

            foreach ($dateColumns as $colIndex => $info) {
                $qty = $row[$colIndex] ?? null;
                if ($qty === null || $qty === '') continue;

                if (is_string($qty)) {
                    if (str_starts_with($qty, '=')) continue;
                    $qty = (int) preg_replace('/[^0-9-]/', '', $qty);
                } else {
                    $qty = (int) $qty;
                }

                if ($qty < 0) continue;

                $result[] = [
                    'customer'      => 'TYC',
                    'source_file'   => null,
                    'assy_number'   => $assyNumber,
                    'qty'           => $qty,
                    'delivery_date' => $info['eta']->toDateString(),
                    'eta'           => $info['eta']->toDateString(),
                    'etd'           => $info['etd']->toDateString(),
                    'week'          => trim((string)($info['label'] ?? $info['eta']->format('W'))),
                    'month'         => $info['month'],
                    'order_type'    => $info['type'],
                    'model'         => $model,
                    'family'        => $family,
                    'route'         => null,
                    'port'          => 'KAO',
                    'extra'         => json_encode([
                        'row'        => $i + 1,
                        'no'         => $no,
                        'sfx'        => $sfx,
                        'week_label' => $info['label'],
                        'col'        => $colIndex + 1,
                    ]),
                ];
            }
            // Safety check: prevent too many records
            if (count($result) > 50000) {
                throw new \Exception("Terlalu banyak records (max 50,000). Sheet mungkin tidak valid.");
            }
        }

        Log::info("Processed rows: {$processedRows} | Records: " . count($result));

        if (empty($result)) {
            throw new \Exception(
                "Tidak ada data QTY > 0 dalam window. Processed rows: {$processedRows}"
            );
        }

        return $result;
    }
    // Helpers

    /**
     * Cari kolom start: kolom pertama di TIME CHART row dengan format 'YYYY/M'.
     * Kolom sebelumnya = data historis lama → di-skip.
     * Fallback = 7 jika tidak ada anchor.
     */
    private function findDataColStart(array $timeChartRow, array $etaRow, array $etdRow, array $hiddenColumns = []): int
    {
        foreach ($timeChartRow as $i => $val) {
            if ($i < 7 || isset($hiddenColumns[$i])) continue;
            if (preg_match('/^\d{4}[\/\-]\d{1,2}$/', trim((string)$val))) {
                return $i;
            }
        }

        foreach ($etaRow as $i => $val) {
            if ($i < 7 || isset($hiddenColumns[$i])) continue;
            if ($this->parseDateValue($val) !== null) {
                return $i;
            }
        }

        foreach ($etdRow as $i => $val) {
            if ($i < 7 || isset($hiddenColumns[$i])) continue;
            if ($this->parseDateValue($val) !== null) {
                return $i;
            }
        }

        return 7;
    }

    private function findDataStartRow(array $sheet, int $headerRowIndex, int $assyCol, int $qtyLabelCol, array $dateColumns, array $hiddenRows = []): ?int
    {
        for ($i = $headerRowIndex + 1; $i < count($sheet); $i++) {
            if (isset($hiddenRows[$i])) {
                continue;
            }

            $row = $sheet[$i];
            if (!is_array($row)) {
                continue;
            }

            $assyNumber = trim((string)($row[$assyCol] ?? ''));
            if ($assyNumber === '') {
                continue;
            }

            $qtyLabel = strtoupper(trim((string)($row[$qtyLabelCol] ?? '')));
            if (str_starts_with($qtyLabel, 'QTY')) {
                if ($this->rowHasQtyValues($row, $dateColumns)) {
                    return $i;
                }
                return $i + 1;
            }

            if ($this->rowHasQtyValues($row, $dateColumns)) {
                return $i;
            }
        }

        return null;
    }

    private function rowHasQtyValues(array $row, array $dateColumns): bool
    {
        foreach ($dateColumns as $colIndex => $_info) {
            if (!array_key_exists($colIndex, $row)) {
                continue;
            }

            $qty = $row[$colIndex];
            if ($qty === null || $qty === '') {
                continue;
            }

            if (is_string($qty) && str_starts_with($qty, '=')) {
                continue;
            }

            $qtyValue = is_string($qty)
                ? preg_replace('/[^0-9-]/', '', $qty)
                : $qty;

            if ((int) $qtyValue > 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * Bangun peta kolom tanggal yang aktif dalam window.
     *
     * Untuk setiap kolom >= $dataColStart yang punya ETA PORT KAO:
     * 1. Jika kolom punya label bulan di TIME CHART row → update anchor state
     * 2. Kolom 2W/3W/4W/5W mewarisi state (bulan + type) dari anchor sebelumnya
     * 3. Rekonstruksi tahun dari urutan increment bulan
     * 4. Koreksi tahun ETA PORT KAO / ETD PORT SUR
     * 5. Filter window per type
     */
    private function buildDateColumns(
        array  $firmForecastRow,
        array  $timeChartRow,
        array  $etaRow,
        array  $etdRow,
        array  $headerRow,
        int    $dataColStart,
        Carbon $firmStart,
        Carbon $firmEnd,
        Carbon $forecastStart,
        Carbon $forecastEnd,
        array  $hiddenColumns = []
    ): array {
        $columns      = [];
        $skipped      = [];
        $currentYear  = null;
        $lastMonth    = null;
        $currentMonth = null;
        $currentType  = null;

        $maxCol = max(count($timeChartRow), count($etaRow), count($etdRow));

        for ($i = $dataColStart; $i < $maxCol; $i++) {
            if (isset($hiddenColumns[$i])) {
                continue;
            }

            $etaRaw  = $etaRow[$i] ?? null;
            if (empty($etaRaw)) continue;

            $etaBase = $this->parseDateValue($etaRaw);
            if (!$etaBase) continue;

            // Parse label bulan jika ada di kolom ini (kolom anchor 1W)
            $parsed = $this->parseMonthLabel($timeChartRow[$i] ?? null);
            if ($parsed !== null) {
                [$yearHint, $month] = $parsed;

                if ($yearHint !== null) {
                    $currentYear = $yearHint;
                } else {
                    if ($lastMonth === null) {
                        $currentYear = $currentYear ?? Carbon::now()->year;
                    } elseif ($month <= $lastMonth) {
                        $currentYear = ($currentYear ?? Carbon::now()->year) + 1;
                    }
                }

                $lastMonth    = $month;
                $currentMonth = $month;

                // Update type hanya di kolom anchor
                $marker = strtoupper(trim((string)($firmForecastRow[$i] ?? '')));
                if (str_contains($marker, 'FIRM')) {
                    $currentType = 'FIRM';
                } elseif (str_contains($marker, 'FORECAST')) {
                    $currentType = 'FORECAST';
                }
            }

            // Kolom 2W/3W/4W/5W warisi state dari anchor → lanjut tanpa update
            if ($currentYear === null || $currentMonth === null || $currentType === null) {
                continue;
            }

            $colMonthStart = Carbon::create($currentYear, $currentMonth, 1)->startOfMonth();

            $info = [
                'eta'   => null,
                'etd'   => null,
                'type'  => $currentType,
                'label' => trim((string)($headerRow[$i] ?? '')),
                'month' => $colMonthStart->format('Y-m'),
            ];

            $eta = $this->normalizeDateValueWithYear($etaBase, $etaRaw, $currentYear);
            $info['eta'] = $eta;

            $etdRaw  = $etdRow[$i] ?? null;
            $etdBase = $this->parseDateValue($etdRaw);
            if ($etdBase !== null) {
                $info['etd'] = $this->normalizeDateValueWithYear($etdBase, $etdRaw, $currentYear);
            } else {
                $info['etd'] = $eta->copy()->subDays(5);
            }

            $inWindow = match ($currentType) {
                'FIRM'     => $colMonthStart->between($firmStart,     $firmEnd),
                'FORECAST' => $colMonthStart->between($forecastStart, $forecastEnd),
                default    => false,
            };

            if ($inWindow) {
                $columns[$i] = $info;
            } else {
                $skipped[$i] = $info;
            }
        }

        if (empty($columns) && !empty($skipped)) {
            Log::warning('No date columns detected inside window; using all parsed columns instead.');
            return $skipped;
        }

        return $columns;
    }

    // ── Parse helpers ──────────────────────────────────────────────────

    /** Return [year_hint|null, month] atau null */
    private function parseMonthLabel($value): ?array
    {
        if ($value === null || $value === '') return null;
        $s = trim((string) $value);

        if (preg_match('/^(\d{4})[\/\-](\d{1,2})$/', $s, $m)) {
            $month = (int) $m[2];
            if ($month >= 1 && $month <= 12) return [(int) $m[1], $month];
        }

        if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})$/', $s, $m)) {
            $month = (int) $m[1];
            if ($month >= 1 && $month <= 12) return [null, $month];
        }

        if (preg_match('/^\d{1,2}$/', $s)) {
            $month = (int) $s;
            if ($month >= 1 && $month <= 12) return [null, $month];
        }

        return null;
    }

    private function parseDateValue($value): ?Carbon
    {
        if ($value === null || $value === '') return null;

        if ($value instanceof \DateTime || $value instanceof \DateTimeImmutable) {
            return Carbon::instance($value);
        }

        if (is_float($value) || (is_int($value) && $value > 40000)) {
            try {
                $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value);
                $dt->setTime(0, 0, 0);
                return Carbon::instance($dt);
            } catch (\Throwable $e) {
                Log::warning("Gagal parse Excel serial: {$value}");
            }
        }

        return $this->parseDateString((string) $value);
    }

    private function guessReferenceDate(array $etaTycRow, array $timeChartRow = []): ?Carbon
    {
        $dates = [];

        foreach ($etaTycRow as $value) {
            $date = $this->parseDateValue($value);
            if ($date !== null) {
                $dates[] = $date;
            }
        }

        if (!empty($dates)) {
            usort($dates, fn($a, $b) => $a->timestamp <=> $b->timestamp);
            return $dates[0];
        }

        foreach ($timeChartRow as $value) {
            $parsed = $this->parseMonthLabel($value);
            if ($parsed !== null && $parsed[0] !== null) {
                return Carbon::create($parsed[0], $parsed[1], 1);
            }
        }

        return null;
    }

    private function parseDateString(string $str): ?Carbon
    {
        $str = trim($str);
        if (empty($str) || str_starts_with($str, '=')) return null;

        if (preg_match('/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/', $str, $m)) {
            if (checkdate((int)$m[2], (int)$m[3], (int)$m[1])) {
                return Carbon::create((int)$m[1], (int)$m[2], (int)$m[3]);
            }
        }

        if (preg_match('/^(\d{4})[-\/](\d{1,2})$/', $str, $m)) {
            if (checkdate((int)$m[2], 1, (int)$m[1])) {
                return Carbon::create((int)$m[1], (int)$m[2], 1);
            }
        }

        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $str, $m)) {
            $a = (int)$m[1];
            $b = (int)$m[2];
            $y = (int)$m[3];

            if ($a > 12 && checkdate($b, $a, $y)) {
                return Carbon::create($y, $b, $a);
            }
            if ($b > 12 && checkdate($a, $b, $y)) {
                return Carbon::create($y, $a, $b);
            }
            if (checkdate($b, $a, $y)) {
                return Carbon::create($y, $b, $a);
            }
        }

        if (preg_match('/^(\d{1,2})[-\/](\d{1,2})$/', $str, $m)) {
            $a = (int)$m[1];
            $b = (int)$m[2];
            $year = Carbon::now()->year;

            if ($a > 12 && checkdate($b, $a, $year)) {
                return Carbon::create($year, $b, $a);
            }
            if ($b > 12 && checkdate($a, $b, $year)) {
                return Carbon::create($year, $a, $b);
            }
            if (checkdate($b, $a, $year)) {
                return Carbon::create($year, $b, $a);
            }
        }

        try {
            return Carbon::parse($str);
        } catch (\Throwable $e) {
            Log::warning("Unrecognized date format: {$str}");
            return null;
        }
    }

    private function detectHeaderRow(array $sheet): ?array
    {
        foreach ($sheet as $idx => $row) {
            if (!is_array($row)) {
                continue;
            }
            foreach ($row as $cell) {
                if (strtolower(trim((string)$cell)) === 'product no') {
                    return [$row, $idx];
                }
            }
        }

        return null;
    }

    private function detectHeaderColumns(array $headerRow): array
    {
        $columns = [
            'assy_number' => null,
            'model' => null,
            'family' => null,
            'no' => null,
            'sfx' => null,
            'qty_label' => null,
        ];

        foreach ($headerRow as $idx => $value) {
            $text = strtoupper(trim((string)$value));
            if ($text === '') {
                continue;
            }

            if (str_contains($text, 'PRODUCT')) {
                $columns['assy_number'] = $idx;
            }
            if ($text === 'MODEL') {
                $columns['model'] = $idx;
            }
            if ($text === 'FAMILY') {
                $columns['family'] = $idx;
            }
            if ($text === 'NO' || $text === 'NO.' || $text === 'NO.') {
                $columns['no'] = $idx;
            }
            if ($text === 'SFX') {
                $columns['sfx'] = $idx;
            }
            if (stripos($text, 'QTY') !== false) {
                $columns['qty_label'] = $idx;
            }
        }

        return $columns;
    }

    private function findQtyLabelColumn(array $headerRow): ?int
    {
        foreach ($headerRow as $idx => $val) {
            $text = trim((string)$val);
            if ($text === '') {
                continue;
            }
            if (stripos($text, 'QTY') !== false) {
                return $idx;
            }
        }

        return null;
    }

    private function detectFirmForecastRow(array $sheet, int $start = 0, int $end = 30): ?array
    {
        $max = min(count($sheet), $end);
        for ($idx = $start; $idx < $max; $idx++) {
            $row = $sheet[$idx];
            if (!is_array($row)) {
                continue;
            }

            $found = 0;
            foreach ($row as $cell) {
                $text = strtoupper(trim((string)$cell));
                if (str_contains($text, 'FIRM') || str_contains($text, 'FORECAST')) {
                    $found++;
                }
            }

            if ($found >= 1) {
                return [$row, $idx];
            }
        }

        return null;
    }

    private function detectTimeChartRow(array $sheet, int $start = 0, int $end = 30): ?array
    {
        $pattern = '/^(?:\d{4}[\/\-]\d{1,2}|\d{1,2}W|\d{1,2})$/i';
        $max = min(count($sheet), $end);

        for ($idx = $start; $idx < $max; $idx++) {
            $row = $sheet[$idx];
            if (!is_array($row)) {
                continue;
            }

            $valid = 0;
            foreach ($row as $cell) {
                if (preg_match($pattern, trim((string)$cell))) {
                    $valid++;
                }
            }

            if ($valid >= 3) {
                return [$row, $idx];
            }
        }

        return null;
    }

    private function detectEtaPortKaoRow(array $sheet, int $start = 0, int $end = 30): ?array
    {
        return $this->detectLabeledDateRow($sheet, ['ETA', 'KAO'], $start, $end);
    }

    private function detectEtdPortSurRow(array $sheet, int $start = 0, int $end = 30): ?array
    {
        return $this->detectLabeledDateRow($sheet, ['ETD', 'SUR'], $start, $end);
    }

    private function detectDateRowBefore(array $sheet, int $index, int $start = 0): ?array
    {
        for ($idx = $index; $idx >= max($start, 0); $idx--) {
            $row = $sheet[$idx] ?? null;
            if (!is_array($row)) {
                continue;
            }

            if ($this->countDateValues($row) >= 5) {
                return [$row, $idx];
            }
        }

        return null;
    }

    private function detectLabeledDateRow(array $sheet, array $mustContain, int $start = 0, int $end = 30): ?array
    {
        $max = min(count($sheet), $end);
        $mustContain = array_map(fn($word) => strtoupper($word), $mustContain);

        for ($idx = max($start, 0); $idx < $max; $idx++) {
            $row = $sheet[$idx];
            if (!is_array($row)) {
                continue;
            }

            $text = strtoupper(implode(' ', array_map(fn($cell) => trim((string)$cell), $row)));
            $found = true;
            foreach ($mustContain as $word) {
                if ($word === '' || str_contains($word, ' ')) {
                    if (stripos($text, $word) === false) {
                        $found = false;
                        break;
                    }
                } else {
                    if (strpos($text, $word) === false) {
                        $found = false;
                        break;
                    }
                }
            }

            if (!$found) {
                continue;
            }

            if ($this->countDateValues($row) >= 5) {
                return [$row, $idx];
            }
        }

        return null;
    }

    private function countDateValues(array $row): int
    {
        $count = 0;
        foreach ($row as $cell) {
            if ($this->parseDateValue($cell) !== null) {
                $count++;
            }
        }

        return $count;
    }

    private function normalizeDateValueWithYear(Carbon $date, $rawValue, ?int $year): Carbon
    {
        if ($year === null || $this->valueContainsYear($rawValue)) {
            return $date->copy();
        }

        try {
            return $date->copy()->year($year);
        } catch (\Throwable $e) {
            return $date->copy();
        }
    }

    private function valueContainsYear($value): bool
    {
        if ($value instanceof \DateTimeInterface) {
            return true;
        }

        if (is_numeric($value)) {
            return true;
        }

        $text = trim((string)$value);
        if (preg_match('/^(\d{4})[\/\-]/', $text)) {
            return true;
        }
        if (preg_match('/\d{4}$/', $text)) {
            return true;
        }

        return false;
    }

    private function detectEtaTycRow(array $sheet, int $start = 0, int $end = 30): ?array
    {
        $max = min(count($sheet), $end);

        for ($idx = max($start, 0); $idx < $max; $idx++) {
            $row = $sheet[$idx];
            if (!is_array($row)) {
                continue;
            }

            $valid = 0;
            foreach ($row as $cell) {
                if ($this->parseDateValue($cell) !== null) {
                    $valid++;
                }
            }

            if ($valid >= 5) {
                return [$row, $idx];
            }
        }

        return null;
    }
}
