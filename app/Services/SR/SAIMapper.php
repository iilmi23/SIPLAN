<?php

namespace App\Services\SR;

use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Mapper SAI untuk format "List Order".
 *
 * Struktur utama:
 * - Row 4: label FIRM/FORECAST per kolom.
 * - Row 6-8: PO utama dan PO tambahan.
 * - Row 9-10: ETD JAI dan ETA SAI.
 * - Row 11: header, dengan assy number di kolom B.
 * - Row 13+: baris qty; baris CUM dilewati.
 *
 * Catatan:
 * - Kolom E selalu dilewati.
 * - Kolom TOTAL FORECAST bukan order detail dan menghentikan scan.
 * - Kolom tanpa label mewarisi label/type dari kolom sebelumnya.
 */
class SAIMapper implements SRMapperInterface
{
    // Row indices (0-based dari array $sheet)
    private const SEND_DATE_ROW      = 0;  // Row 1  Excel
    private const FIRM_FORECAST_ROW  = 3;  // Row 4  Excel - label FIRM/FORECAST
    private const SHIP_BY_ROW        = 4;  // Row 5  Excel
    private const PO_ROW             = 5;  // Row 6  Excel - PO# utama
    private const PO_EXTRA_A_ROW     = 6;  // Row 7  Excel - PO# tambahan A
    private const PO_EXTRA_B_ROW     = 7;  // Row 8  Excel - PO# tambahan B
    private const ETD_JAI_ROW        = 8;  // Row 9  Excel - ETD dari JAI
    private const ETA_SAI_ROW        = 9;  // Row 10 Excel - ETA tiba SAI
    private const HEADER_ROW         = 10; // Row 11 Excel - No./ASSY NUMBER/BUPPIN/QTY
    private const DATA_START_ROW     = 12; // Row 13 Excel - baris data pertama

    // Kolom indices (0-based)
    private const COL_NO         = 0; // A
    private const COL_PART       = 1; // B - ASSY NUMBER
    private const COL_BUPPIN     = 2; // C
    private const COL_LAST_CUM   = 3; // D
    private const COL_HIDDEN_E   = 4; // E - selalu hidden di SAI
    private const COL_DATA_START = 5; // F - kolom QTY pertama (visible)

    // Kata yang menandakan baris summary untuk dilewati.
    private const SKIP_PART_WORDS = ['total', 'subtotal', 'grand total', 'balance'];

    // Kolom row-4 yang menandakan TOTAL summary dan menghentikan scan.
    private const TOTAL_COL_PATTERN = '/^TOTAL\s+FORECAST/i';

    public function map(array $sheet, ?Carbon $referenceDate = null, array $options = []): array
    {
        $result = [];

        if (empty($sheet) || !is_array($sheet)) {
            throw new \Exception("Sheet kosong atau tidak valid");
        }

        Log::info('=== MAPPING SAI START ===');

        // 1. Deteksi baris-baris kunci.

        [$firmForecastRow, $firmForecastIdx] = $this->detectFirmForecastRow($sheet)
            ?? [$sheet[self::FIRM_FORECAST_ROW] ?? [], self::FIRM_FORECAST_ROW];

        [$poRow, $poIdx] = $this->detectPoRow($sheet, 0, $firmForecastIdx + 3)
            ?? [$sheet[self::PO_ROW] ?? [], self::PO_ROW];

        [$etdRow, $etdIdx] = $this->detectEtdJaiRow($sheet, $poIdx, $poIdx + 6)
            ?? [$sheet[self::ETD_JAI_ROW] ?? [], self::ETD_JAI_ROW];

        [$etaRow, $etaIdx] = $this->detectEtaSaiRow($sheet, $etdIdx, $etdIdx + 4)
            ?? [$sheet[self::ETA_SAI_ROW] ?? [], self::ETA_SAI_ROW];

        [$headerRow, $headerIdx] = $this->detectHeaderRow($sheet, $etaIdx + 1)
            ?? [$sheet[self::HEADER_ROW] ?? [], self::HEADER_ROW];

        // Row PO tambahan (A dan B) — optional, tepat di bawah poRow
        $poExtraARow = $sheet[$poIdx + 1] ?? [];
        $poExtraBRow = $sheet[$poIdx + 2] ?? [];

        // ── 2. Reference date & window ───────────────────────────────────────

        $sheetReference = $referenceDate
            ?? $this->guessReferenceDate($sheet, $poIdx, $firmForecastRow, $etaRow)
            ?? Carbon::now();

        $ref           = $sheetReference;
        $firmStart     = $ref->copy()->subMonth()->startOfMonth();
        $firmEnd       = $ref->copy()->endOfMonth();
        $forecastStart = $ref->copy()->startOfMonth();
        $forecastEnd   = $ref->copy()->addMonths(4)->endOfMonth();

        Log::info("Detected rows: FIRM_FORECAST={$firmForecastIdx}, PO={$poIdx}, ETD_JAI={$etdIdx}, ETA_SAI={$etaIdx}, HEADER={$headerIdx}");
        Log::info("Reference date: {$ref->toDateString()}");
        Log::info("FIRM window   : {$firmStart->format('Y-m')} ~ {$firmEnd->format('Y-m')}");
        Log::info("FORECAST window: {$forecastStart->format('Y-m')} ~ {$forecastEnd->format('Y-m')}");

        // ── 3. Hidden rows & columns ──────────────────────────────────────────

        $hiddenColumns = array_flip($options['hidden_columns'] ?? [self::COL_HIDDEN_E]);
        $hiddenRows    = array_flip($options['hidden_rows'] ?? []);

        // ── 4. Bangun peta kolom aktif ────────────────────────────────────────

        $dateColumns = $this->buildDateColumns(
            $firmForecastRow,
            $poRow,
            $poExtraARow,
            $poExtraBRow,
            $etdRow,
            $etaRow,
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

        // ── 5. Loop baris data ────────────────────────────────────────────────

        $skipWords     = self::SKIP_PART_WORDS;
        $processedRows = 0;

        for ($i = self::DATA_START_ROW; $i < count($sheet); $i++) {
            if (isset($hiddenRows[$i])) {
                continue;
            }

            $row = $sheet[$i];
            if (!is_array($row)) {
                continue;
            }

            // ── Skip baris CUM ────────────────────────────────────────────────
            // Baris CUM: kolom A kosong, kolom C = 'CUM'
            $cumLabel = strtoupper(trim((string)($row[self::COL_BUPPIN] ?? '')));
            if ($cumLabel === 'CUM') {
                continue;
            }

            // ── Validasi assy number ──────────────────────────────────────────
            $assyNumber = trim((string)($row[self::COL_PART] ?? ''));
            if ($assyNumber === '') {
                continue;
            }
            if (in_array(strtolower($assyNumber), $skipWords, true)) {
                continue;
            }

            $processedRows++;

            $no      = $row[self::COL_NO] ?? null;
            $buppin  = trim((string)($row[self::COL_BUPPIN] ?? '')) ?: null;

            // ── Ambil QTY per kolom aktif ─────────────────────────────────────
            foreach ($dateColumns as $colIndex => $info) {
                $qty = $row[$colIndex] ?? null;

                if ($qty === null || $qty === '') {
                    continue;
                }

                // Lewati formula Excel
                if (is_string($qty) && str_starts_with($qty, '=')) {
                    continue;
                }

                // Normalisasi ke integer
                if (is_string($qty)) {
                    $qty = (int) preg_replace('/[^0-9\-]/', '', $qty);
                } else {
                    $qty = (int) $qty;
                }

                if ($qty <= 0) {
                    continue;
                }

                $result[] = [
                    'customer'      => 'SAI',
                    'source_file'   => null,
                    'assy_number'   => $assyNumber,
                    'qty'           => $qty,
                    'delivery_date' => $info['eta']->toDateString(),
                    'eta'           => $info['eta']->toDateString(),
                    'etd'           => $info['etd']->toDateString(),
                    'week'          => $info['week_label'],
                    'month'         => $info['month'],
                    'order_type'    => $info['type'],
                    'model'         => null, // SAI tidak menyediakan model/family
                    'family'        => null,
                    'route'         => $info['ship_by'],
                    'port'          => 'SAI',
                    'extra'         => json_encode([
                        'row'        => $i + 1,
                        'no'         => $no,
                        'buppin'     => $buppin,
                        'po_number'  => $info['po_number'],
                        'po_extra_a' => $info['po_extra_a'],
                        'po_extra_b' => $info['po_extra_b'],
                        'week_label' => $info['week_label'],
                        'col'        => $colIndex + 1,
                    ]),
                ];
            }
        }

        Log::info("Processed rows: {$processedRows} | Records: " . count($result));

        if (empty($result)) {
            throw new \Exception(
                "Tidak ada data QTY > 0 dalam window. " .
                "Processed rows: {$processedRows}"
            );
        }

        return $result;
    }

    // =========================================================================
    // PRIVATE — Row Detection
    // =========================================================================

    /**
     * Deteksi baris FIRM/FORECAST (row 4).
     * Ciri: mengandung kata "FIRM" atau "FORECAST" di minimal 1 sel.
     */
    private function detectFirmForecastRow(array $sheet, int $start = 0, int $maxRows = 15): ?array
    {
        $limit = min(count($sheet), $start + $maxRows);
        for ($idx = $start; $idx < $limit; $idx++) {
            $row = $sheet[$idx];
            if (!is_array($row)) {
                continue;
            }
            foreach ($row as $cell) {
                $text = strtoupper(trim((string) $cell));
                if (str_contains($text, 'FIRM') || str_contains($text, 'FORECAST')) {
                    return [$row, $idx];
                }
            }
        }
        return null;
    }

    /**
     * Deteksi baris P/O # (row 6).
     * Ciri: mengandung teks "P/O" atau "PO" di kolom A (col 0).
     */
    private function detectPoRow(array $sheet, int $start = 0, int $end = 15): ?array
    {
        $limit = min(count($sheet), $end);
        for ($idx = $start; $idx < $limit; $idx++) {
            $row = $sheet[$idx];
            if (!is_array($row)) {
                continue;
            }
            $labelA = strtoupper(trim((string) ($row[0] ?? '')));
            if (str_contains($labelA, 'P/O') || str_contains($labelA, 'P.O')) {
                // Konfirmasi: ada minimal 3 nilai PO# di kolom data
                $poCount = 0;
                foreach (array_slice($row, self::COL_DATA_START) as $cell) {
                    if ($cell !== null && $cell !== '' && preg_match('/^[A-Z]{2}\d+/i', trim((string) $cell))) {
                        $poCount++;
                    }
                }
                if ($poCount >= 3) {
                    return [$row, $idx];
                }
            }
        }
        return null;
    }

    /**
     * Deteksi baris ETD JAI (row 9).
     * Ciri: kolom A mengandung "ETD" dan "JAI", baris berisi tanggal.
     */
    private function detectEtdJaiRow(array $sheet, int $start, int $end): ?array
    {
        return $this->detectLabeledDateRow($sheet, ['ETD', 'JAI'], $start, $end);
    }

    /**
     * Deteksi baris ETA SAI (row 10).
     * Ciri: kolom A mengandung "ETA" dan "SAI", baris berisi tanggal.
     */
    private function detectEtaSaiRow(array $sheet, int $start, int $end): ?array
    {
        return $this->detectLabeledDateRow($sheet, ['ETA', 'SAI'], $start, $end);
    }

    /**
     * Deteksi baris header (row 11).
     * Ciri: mengandung kata "ASSY NUMBER", "PART NUMBER", atau "PART NO".
     */
    private function detectHeaderRow(array $sheet, int $start = 0, int $maxRows = 10): ?array
    {
        $limit = min(count($sheet), $start + $maxRows);
        for ($idx = $start; $idx < $limit; $idx++) {
            $row = $sheet[$idx];
            if (!is_array($row)) {
                continue;
            }
            foreach ($row as $cell) {
                $text = strtoupper(trim((string) $cell));
                if (in_array($text, ['ASSY NUMBER', 'PART NUMBER', 'PART NO', 'PART NO.'], true)) {
                    return [$row, $idx];
                }
            }
        }
        return null;
    }

    /**
     * Cari baris dengan label di kolom A yang mengandung semua keyword,
     * dan baris tersebut memiliki minimal 5 nilai tanggal.
     */
    private function detectLabeledDateRow(array $sheet, array $keywords, int $start, int $end): ?array
    {
        $limit = min(count($sheet), $end);
        for ($idx = max($start, 0); $idx < $limit; $idx++) {
            $row = $sheet[$idx];
            if (!is_array($row)) {
                continue;
            }

            // Periksa label di kolom A
            $labelA = strtoupper(trim((string) ($row[0] ?? '')));
            $allFound = true;
            foreach ($keywords as $kw) {
                if (!str_contains($labelA, strtoupper($kw))) {
                    $allFound = false;
                    break;
                }
            }
            if (!$allFound) {
                continue;
            }

            if ($this->countDateValues($row) >= 5) {
                return [$row, $idx];
            }
        }
        return null;
    }

    // =========================================================================
    // PRIVATE — Column Map Builder
    // =========================================================================

    /**
     * Bangun peta kolom aktif berdasarkan window FIRM/FORECAST.
     *
     * LOGIKA SAI yang berbeda dari TYC:
     *
     *  1. Tidak ada TIME CHART row → type (FIRM/FORECAST) dibaca langsung dari
     *     row 4 per kolom. Kolom yang row-4-nya null MEWARISI type dari kolom
     *     sebelumnya (karena setiap "week" di SAI terdiri dari 2 kolom PO:
     *     kolom W1-odd = label eksplisit, kolom W1-even = sub-PO tanpa label).
     *
     *  2. Kolom TOTAL FORECAST (row 4 = "TOTAL FORECAST …") bukan kolom order
     *     per-PO → hentikan scan saat pertama kali menemukannya.
     *
     *  3. Tanggal ETD & ETA langsung tersedia per kolom di row 9 & 10 (objek
     *     DateTime, tidak perlu rekonstruksi tahun seperti TYC).
     *
     *  4. Week label diambil dari row 4 (mis. "FIRM APRIL W2" → week = "W2")
     *     atau dari PO# (mis. "JL60421" → dipakai sebagai label tambahan).
     *
     *  5. Kolom E (index 4) selalu hidden di SAI → dilewati via $hiddenColumns.
     *
     *  MEMORY OPTIMIZATION:
     *  - Batasi scan kolom max 200 untuk mencegah infinite loop atau memory exhaustion
     *  - Early termination jika menemukan banyak kolom kosong berturut-turut
     */
    private function buildDateColumns(
        array  $firmForecastRow,
        array  $poRow,
        array  $poExtraARow,
        array  $poExtraBRow,
        array  $etdRow,
        array  $etaRow,
        Carbon $firmStart,
        Carbon $firmEnd,
        Carbon $forecastStart,
        Carbon $forecastEnd,
        array  $hiddenColumns = []
    ): array {
        $columns      = [];
        $skipped      = [];
        $lastType     = null;
        $lastLabel    = null;
        $emptyCounter = 0;
        $maxEmptyTolerance = 10;  // Jika 10 kolom kosong berturut-turut, berhenti

        // Tentukan batas kolom maksimal yang akan di-scan
        // Ambil max dari baris yang punya data signifikan, cap di 200 untuk safety
        $maxCol = min(200, max(
            count($firmForecastRow),
            count($poRow),
            count($etdRow),
            count($etaRow)
        ));

        for ($i = self::COL_DATA_START; $i < $maxCol; $i++) {
            if (isset($hiddenColumns[$i])) {
                continue;
            }

            // ── Stop di kolom TOTAL FORECAST ──────────────────────────────────
            $labelRow4 = trim((string) ($firmForecastRow[$i] ?? ''));
            if ($labelRow4 !== '' && preg_match(self::TOTAL_COL_PATTERN, $labelRow4)) {
                Log::info("Kolom {$i}: TOTAL FORECAST ditemukan → scan dihentikan");
                break;
            }

            // ── Ambil/inherit type dan label ───────────────────────────────────
            if ($labelRow4 !== '') {
                // Kolom ini punya label eksplisit
                if (str_contains(strtoupper($labelRow4), 'FORECAST')) {
                    $lastType  = 'FORECAST';
                } elseif (str_contains(strtoupper($labelRow4), 'FIRM')) {
                    $lastType  = 'FIRM';
                }
                $lastLabel = $labelRow4;
                $emptyCounter = 0;  // Reset counter saat menemukan label
            }
            // Kolom tanpa label (sub-PO) mewarisi $lastType dan $lastLabel

            if ($lastType === null) {
                // Belum ada konteks type sama sekali → skip
                continue;
            }

            // ── Tanggal ETD (row 9) dan ETA (row 10) ─────────────────────────
            $etaDate = $this->parseDateValue($etaRow[$i] ?? null);
            if ($etaDate === null) {
                // Kolom tanpa tanggal ETA → bukan kolom data
                $emptyCounter++;
                if ($emptyCounter > $maxEmptyTolerance) {
                    // Terlalu banyak kolom kosong berturut-turut → hentikan scan
                    Log::info("Kolom {$i}: Terlalu banyak kolom kosong ({$emptyCounter}), scan dihentikan");
                    break;
                }
                continue;
            }

            $emptyCounter = 0;  // Reset counter saat menemukan data tanggal

            $etdDate = $this->parseDateValue($etdRow[$i] ?? null);
            if ($etdDate === null) {
                // Fallback ETD = ETA (SAI sering ETD = ETA untuk pengiriman lokal)
                $etdDate = $etaDate->copy();
            }

            // ── PO number ────────────────────────────────────────────────────
            $poNumber  = trim((string) ($poRow[$i] ?? ''));
            $poExtraA  = trim((string) ($poExtraARow[$i] ?? '')) ?: null;
            $poExtraB  = trim((string) ($poExtraBRow[$i] ?? '')) ?: null;
            // SAI selalu menggunakan TRUCK untuk shipment
            $shipBy    = 'TRUCK';

            // ── Week label: ekstrak "W1"~"W5" dari label row 4 ────────────────
            $weekLabel = $this->extractWeekLabel($lastLabel, $poNumber);

            // ── Month untuk filter window ─────────────────────────────────────
            $colMonth      = $etaDate->copy()->startOfMonth();
            $colMonthStr   = $colMonth->format('Y-m');

            // ── Filter window ─────────────────────────────────────────────────
            $inWindow = match ($lastType) {
                'FIRM'     => $colMonth->between($firmStart,     $firmEnd),
                'FORECAST' => $colMonth->between($forecastStart, $forecastEnd),
                default    => false,
            };

            $entry = [
                'po_number'  => $poNumber,
                'po_extra_a' => $poExtraA,
                'po_extra_b' => $poExtraB,
                'etd'        => $etdDate,
                'eta'        => $etaDate,
                'type'       => $lastType,
                'week_label' => $weekLabel,
                'month'      => $colMonthStr,
                'ship_by'    => $shipBy,
                'label'      => $lastLabel,
            ];

            if ($inWindow) {
                $columns[$i] = $entry;
            } else {
                $skipped[$i] = $entry;
            }
        }

        // Fallback: jika window kosong, pakai semua kolom yang berhasil di-parse
        if (empty($columns) && !empty($skipped)) {
            Log::warning('SAIMapper: tidak ada kolom dalam window; fallback ke semua kolom tersedia.');
            return $skipped;
        }

        return $columns;
    }

    // =========================================================================
    // PRIVATE — Helpers
    // =========================================================================

    /**
     * Ekstrak label minggu dari label FIRM/FORECAST row 4.
     * Contoh: "FIRM APRIL W2" → "W2"
     *         "FORECAST MAY W1" → "W1"
     *         jika tidak ada → gunakan PO# sebagai label
     */
    private function extractWeekLabel(?string $label, string $poNumber): string
    {
        if ($label !== null && preg_match('/\b(W[1-5])\b/i', $label, $m)) {
            return strtoupper($m[1]);
        }
        // Fallback ke PO number
        return $poNumber ?: '—';
    }

    /**
     * Tebak reference date dari PO# row dan ETD row.
     *
     * Strategi SAI:
     *  1. Ambil semua tanggal dari row ETD JAI → ambil tanggal terkecil yang
     *     >= hari ini (menghindari kolom historis lama).
     *  2. Jika tidak ada → ambil tanggal pertama dari ETD row.
     *  3. Jika tidak ada → pakai Carbon::now().
     */
    private function guessReferenceDate(array $sheet, int $poRowIdx, array $firmForecastRow = [], array $etaRow = []): ?Carbon
    {
        $firmMonth = $this->latestFirmMonth($firmForecastRow, $etaRow);
        if ($firmMonth !== null) {
            return $firmMonth;
        }

        $etdRow = $sheet[$poRowIdx + 3] ?? []; // row ETD = po+3 biasanya
        $all    = [];

        foreach ($etdRow as $val) {
            $date = $this->parseDateValue($val);
            if ($date === null) {
                continue;
            }
            $all[] = $date;
        }

        if (!empty($all)) {
            usort($all, fn($a, $b) => $a->timestamp <=> $b->timestamp);
            return $all[0];
        }

        return null;
    }

    private function latestFirmMonth(array $firmForecastRow, array $etaRow): ?Carbon
    {
        $currentType = null;
        $latestFirmDate = null;

        foreach ($firmForecastRow as $index => $label) {
            $text = strtoupper(trim((string) $label));

            if ($text !== '' && preg_match(self::TOTAL_COL_PATTERN, $text)) {
                break;
            }

            if (str_contains($text, 'FORECAST')) {
                $currentType = 'FORECAST';
            } elseif (str_contains($text, 'FIRM')) {
                $currentType = 'FIRM';
            }

            if ($currentType !== 'FIRM') {
                continue;
            }

            $date = $this->parseDateValue($etaRow[$index] ?? null);
            if ($date === null) {
                continue;
            }

            if ($latestFirmDate === null || $date->gt($latestFirmDate)) {
                $latestFirmDate = $date;
            }
        }

        return $latestFirmDate?->copy()->startOfMonth();
    }

    /**
     * Parse berbagai format nilai tanggal dari sel Excel.
     *
     * SAI menggunakan objek DateTime langsung (PhpSpreadsheet sudah parsing),
     * sehingga mayoritas nilai sudah berupa \DateTime. Fungsi ini tetap
     * menangani fallback untuk string dan Excel serial number.
     */
    private function parseDateValue(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        // PhpSpreadsheet sudah konversi → objek DateTime
        if ($value instanceof \DateTime || $value instanceof \DateTimeImmutable) {
            return Carbon::instance($value)->startOfDay();
        }

        // Excel serial number (float/int besar)
        if (is_float($value) || (is_int($value) && $value > 40000)) {
            try {
                $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value);
                return Carbon::instance($dt)->startOfDay();
            } catch (\Throwable $e) {
                Log::warning("SAIMapper: gagal parse Excel serial: {$value}");
            }
        }

        // String
        if (is_string($value)) {
            return $this->parseDateString($value);
        }

        return null;
    }

    /**
     * Parse tanggal dari string dengan berbagai format.
     */
    private function parseDateString(string $str): ?Carbon
    {
        $str = trim($str);
        if ($str === '' || str_starts_with($str, '=')) {
            return null;
        }

        // YYYY-MM-DD atau YYYY/MM/DD
        if (preg_match('/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/', $str, $m)) {
            if (checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
                return Carbon::create((int) $m[1], (int) $m[2], (int) $m[3])->startOfDay();
            }
        }

        // DD/MM/YYYY atau MM/DD/YYYY
        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/', $str, $m)) {
            $a = (int) $m[1];
            $b = (int) $m[2];
            $y = (int) $m[3];
            if ($a > 12 && checkdate($b, $a, $y)) {
                return Carbon::create($y, $b, $a)->startOfDay();
            }
            if ($b > 12 && checkdate($a, $b, $y)) {
                return Carbon::create($y, $a, $b)->startOfDay();
            }
            if (checkdate($b, $a, $y)) {
                return Carbon::create($y, $b, $a)->startOfDay();
            }
        }

        try {
            return Carbon::parse($str)->startOfDay();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Hitung jumlah sel dalam satu baris yang berisi nilai tanggal valid.
     */
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
}
