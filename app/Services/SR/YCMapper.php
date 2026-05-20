<?php

namespace App\Services\SR;

use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

/**
 * Mapper YC.
 *
 * Catatan format:
 * - Week label diambil dari HEADER_ROW, bukan TIME_CHART_ROW.
 * - TIME_CHART_ROW dipakai sebagai anchor bulan.
 * - Label TIME CHART, ETA, dan ETD berada di kolom F.
 */
class YCMapper implements SRMapperInterface
{
    // Row indices (0-based) - default fallback
    private const SR_NO_ROW         = 6;
    private const JPN_FACT_ROW      = 8;
    private const OVERSEAS_ROW      = 9;
    private const PORT_ROW          = 10;
    private const CUST_GROUP_ROW    = 11;
    private const CUST_ROW          = 12;
    private const TIME_CHART_ROW    = 14;  // Row 15 Excel - anchor bulan
    private const CUST_ETA_FROM_ROW = 15;  // Row 16 Excel
    private const ETA_ROW           = 16;  // Row 17 Excel
    private const ETD_ROW           = 17;  // Row 18 Excel
    private const HEADER_ROW        = 19;  // Row 20 Excel - kolom header + week numbers
    private const DATA_START_ROW    = 20;  // Row 21 Excel

    // Kolom indices (0-based)
    private const COL_MODEL      = 0;
    private const COL_FAMILY     = 1;
    private const COL_JIG        = 2;
    private const COL_NO         = 3;
    private const COL_PART       = 4;
    private const COL_HIST_START = 5;   // F - awal kolom historis (week 4 prev month)
    private const COL_HIST_END   = 9;   // J - akhir kolom historis (week 8 prev month)
    private const COL_LIVE_START = 10;  // K - awal kolom live (week 1 bulan TIME CHART pertama)
    private const COL_ROUTE      = 34;

    // Label row YC berada di Col F (index 5).
    private const LABEL_COL      = 5;

    private const SKIP_WORDS = ['total', 'subtotal', 'grand total'];

    public function map(array $sheet, ?Carbon $referenceDate = null, array $options = []): array
    {
        throw new \Exception(
            "YCMapper::map() tidak boleh dipanggil langsung. " .
            "Gunakan YCMapper::mapAllSheets() atau integrasikan via SRController."
        );
    }

    public function mapAllSheets(
        array   $allSheets,
        array   $sheetNames,
        array   $hiddenSheets = [],
        ?Carbon $referenceDate = null,
        array   $options = []
    ): array {
        $result = [];

        foreach ($allSheets as $sheetIndex => $sheetData) {
            if (!empty($hiddenSheets[$sheetIndex])) {
                Log::info("YCMapper: skip hidden sheet index={$sheetIndex}");
                continue;
            }

            $sheetName    = $sheetNames[$sheetIndex] ?? "Sheet{$sheetIndex}";
            $sheetOptions = $options[$sheetIndex] ?? $options;

            Log::info("YCMapper: mapping sheet [{$sheetIndex}] '{$sheetName}'");

            try {
                $sheetResult = $this->mapSingleSheet($sheetData, $sheetName, $referenceDate, $sheetOptions);

                foreach ($sheetResult as &$record) {
                    $record['sheet_index'] = $sheetIndex;
                    $record['sheet_name']  = $sheetName;
                }
                unset($record);

                $result[$sheetIndex] = $sheetResult;
                Log::info("YCMapper: sheet '{$sheetName}' → " . count($sheetResult) . " records");
            } catch (\Exception $e) {
                Log::warning("YCMapper: sheet '{$sheetName}' gagal — " . $e->getMessage());
                $result[$sheetIndex] = [];
            }
        }

        Log::info("YCMapper: total sheets processed = " . count($result));
        return $result;
    }

    public function mapSingleSheet(
        array   $sheet,
        string  $sheetName,
        ?Carbon $referenceDate = null,
        array   $options = []
    ): array {
        $result = [];

        if (empty($sheet) || !is_array($sheet)) {
            throw new \Exception("Sheet '{$sheetName}' kosong");
        }

        // ── 1. Metadata ───────────────────────────────────────────────────────
        $srNo    = trim((string) ($sheet[self::SR_NO_ROW][1]      ?? ''));
        $jpnFact = trim((string) ($sheet[self::JPN_FACT_ROW][1]   ?? ''));
        $overseas= trim((string) ($sheet[self::OVERSEAS_ROW][1]   ?? ''));
        $port    = trim((string) ($sheet[self::PORT_ROW][1]       ?? ''));
        $custGrp = trim((string) ($sheet[self::CUST_GROUP_ROW][1] ?? ''));
        $custRaw = trim((string) ($sheet[self::CUST_ROW][1]       ?? ''));

        Log::info("YCMapper [{$sheetName}]: SR={$srNo}, PORT={$port}, CUST={$custRaw}");

        // ── 2. Deteksi baris kunci ────────────────────────────────────────────
        // FIX BUG C: gunakan LABEL_COL = 5, bukan default 0
        $timeChartRowIdx = $this->detectRowIndexByLabel(
            $sheet, 'TIME CHART MONTH', self::TIME_CHART_ROW, self::LABEL_COL, 25
        ) ?? self::TIME_CHART_ROW;

        $etaRowIdx = $this->detectRowIndexByLabel(
            $sheet, 'ETA', self::ETA_ROW, self::LABEL_COL, 25, true
        ) ?? self::ETA_ROW;

        $etdRowIdx = $this->detectRowIndexByLabel(
            $sheet, 'ETD', self::ETD_ROW, self::LABEL_COL, 25, true
        ) ?? self::ETD_ROW;

        $headerRowIdx = $this->detectHeaderRowIndex($sheet) ?? self::HEADER_ROW;
        $dataStartRow = $headerRowIdx + 1;

        $timeChartRow = $sheet[$timeChartRowIdx] ?? [];
        $etdRow       = $sheet[$etdRowIdx]       ?? [];
        $etaRow       = $sheet[$etaRowIdx]       ?? [];
        // FIX BUG A+B: baca header row untuk mendapatkan week number yang benar
        $headerRow    = $sheet[$headerRowIdx]    ?? [];

        Log::info("YCMapper [{$sheetName}]: timeChartRowIdx={$timeChartRowIdx}, etdRowIdx={$etdRowIdx}, etaRowIdx={$etaRowIdx}, headerRowIdx={$headerRowIdx}, dataStartRow={$dataStartRow}");

        // ── 3. Reference date & window ────────────────────────────────────────
        $sheetReference = $referenceDate
            ?? $this->guessReferenceDate($etdRow, $timeChartRow)
            ?? Carbon::now();

        $ref           = $sheetReference->copy()->startOfMonth();
        $firmStart     = $ref->copy()->subMonth()->startOfMonth();
        $firmEnd       = $ref->copy()->endOfMonth();
        $forecastStart = $ref->copy()->startOfMonth();
        $forecastEnd   = $ref->copy()->addMonths(4)->endOfMonth();

        Log::info("YCMapper [{$sheetName}]: ref={$ref->toDateString()}, FIRM={$firmStart->format('Y-m')}~{$firmEnd->format('Y-m')}, FORECAST={$forecastStart->format('Y-m')}~{$forecastEnd->format('Y-m')}");

        // ── 4. Hidden options ─────────────────────────────────────────────────
        $hiddenColumns = array_flip($options['hidden_columns'] ?? []);
        $hiddenRows    = array_flip($options['hidden_rows']    ?? []);

        // ── 5. Bangun peta kolom ──────────────────────────────────────────────
        // FIX BUG A+B: teruskan $headerRow agar week label dibaca dari sana
        $dateColumns = $this->buildDateColumns(
            $timeChartRow,
            $etdRow,
            $etaRow,
            $headerRow,      // ← NEW parameter
            $firmStart, $firmEnd,
            $forecastStart, $forecastEnd,
            $hiddenColumns
        );

        if (empty($dateColumns)) {
            Log::warning("YCMapper [{$sheetName}]: window kosong, mencoba fallback tanpa filter window");
            $dateColumns = $this->buildDateColumnsNoFilter(
                $timeChartRow, $etdRow, $etaRow, $headerRow, $hiddenColumns
            );
        }

        if (empty($dateColumns)) {
            throw new \Exception("Sheet '{$sheetName}': tidak ada kolom tanggal ditemukan.");
        }

        Log::info("YCMapper [{$sheetName}]: " . count($dateColumns) . " kolom aktif");

        // ── 6. Loop baris data ────────────────────────────────────────────────
        $lastModel  = null;
        $lastFamily = null;
        $processedRows = 0;

        for ($i = $dataStartRow; $i < count($sheet); $i++) {
            if (isset($hiddenRows[$i])) {
                continue;
            }

            $row = $sheet[$i];
            if (!is_array($row) || empty($row)) {
                continue;
            }

            $colA    = trim((string) ($row[self::COL_MODEL]  ?? ''));
            $colB    = trim((string) ($row[self::COL_FAMILY] ?? ''));
            $colC    = trim((string) ($row[self::COL_JIG]    ?? ''));
            $colD    = $row[self::COL_NO]   ?? null;
            $colE    = trim((string) ($row[self::COL_PART]   ?? ''));
            $colDStr = trim((string) ($colD ?? ''));

            // Stop di baris TOTAL level sheet
            if (strtolower($colA) === 'total') {
                break;
            }

            // Skip baris TOTAL subgroup
            if (strtolower($colB) === 'total') {
                continue;
            }

            // Skip CUM row: colE kosong dan colD kosong
            // (CUM row = baris genap tanpa PRODUCT NO — berisi running cumulative qty)
            if ($colE === '' && $colDStr === '') {
                continue;
            }

            // Update lastFamily / lastModel dari baris header subgroup
            if ($colE === '') {
                if ($colB !== '' && !is_numeric($colB) && strtolower($colB) !== 'total') {
                    $lastFamily = $colB;
                }
                if ($colA !== '') {
                    $lastModel = $colA;
                }
                continue;
            }

            if (in_array(strtolower($colE), self::SKIP_WORDS, true)) {
                continue;
            }

            if ($colA !== '') {
                $lastModel = $colA;
            }
            if ($colB !== '' && !is_numeric($colB) && strtolower($colB) !== 'total') {
                $lastFamily = $colB;
            }

            $processedRows++;
            $jigType = $colC ?: null;
            $no      = $colDStr !== '' ? $colD : null;
            $route   = isset($row[self::COL_ROUTE])
                ? (trim((string) ($row[self::COL_ROUTE])) ?: null)
                : null;

            foreach ($dateColumns as $colIndex => $info) {
                $qtyRaw = $row[$colIndex] ?? null;

                if ($qtyRaw === null || $qtyRaw === '') {
                    continue;
                }
                if (is_string($qtyRaw) && str_starts_with(trim($qtyRaw), '=')) {
                    continue;
                }

                $qty = is_string($qtyRaw)
                    ? (int) preg_replace('/[^0-9\-]/', '', $qtyRaw)
                    : (int) $qtyRaw;

                if ($qty < 0) {
                    continue;
                }

                $result[] = [
                    'customer'      => 'YC',
                    'source_file'   => null,
                    'assy_number'   => $colE,
                    'qty'           => $qty,
                    'delivery_date' => $info['eta']->toDateString(),
                    'eta'           => $info['eta']->toDateString(),
                    'etd'           => $info['etd']->toDateString(),
                    'week'          => $info['week_label'],
                    'month'         => $info['month'],
                    'order_type'    => $info['type'],
                    'model'         => $lastModel,
                    'family'        => $lastFamily,
                    'route'         => $route,
                    'port'          => $port ?: 'HAKATA BA',
                    'extra'         => json_encode([
                        'row'        => $i + 1,
                        'sheet'      => $sheetName,
                        'sr_no'      => $srNo,
                        'no'         => $no,
                        'jig_type'   => $jigType,
                        'week_label' => $info['week_label'],
                        'col'        => $colIndex + 1,
                        'jpn_fact'   => $jpnFact,
                        'overseas'   => $overseas,
                        'cust_group' => $custGrp,
                        'cust'       => $custRaw,
                    ]),
                ];
            }
        }

        Log::info("YCMapper [{$sheetName}]: processed_rows={$processedRows}, records=" . count($result));
        return $result;
    }

    // =========================================================================
    // PRIVATE — Column Map Builder
    // =========================================================================

    /**
     * Bangun peta kolom aktif dengan filter window FIRM/FORECAST.
     *
     * FIX BUG A+B: Tambah parameter $headerRow.
     * Week label dibaca dari $headerRow[$col] yang berisi "1,2,3,4,5"
     * per bulan — BUKAN dari $timeChartRow yang berisi nomor bulan (3,4,5,6,7,8).
     */
    private function buildDateColumns(
        array  $timeChartRow,
        array  $etdRow,
        array  $etaRow,
        array  $headerRow,       // ← PARAMETER BARU
        Carbon $firmStart,
        Carbon $firmEnd,
        Carbon $forecastStart,
        Carbon $forecastEnd,
        array  $hiddenColumns = []
    ): array {
        $columns = [];
        $skipped = [];

        // ── Bangun peta month anchor dari TIME CHART row ───────────────────────
        // TIME CHART row berisi NOMOR BULAN (1-12) di kolom anchor bulan,
        // dan NULL/kosong di kolom week biasa.
        $monthAnchors = [];
        foreach ($timeChartRow as $col => $val) {
            if ($col < self::COL_LIVE_START) {
                continue;
            }
            // Hanya ambil nilai 1-12 yang berada di posisi anchor bulan
            // (bukan week number — week sudah ada di headerRow)
            if ($val !== null && $val !== '' && is_numeric($val)
                && (int) $val >= 1 && (int) $val <= 12) {
                $monthAnchors[$col] = (int) $val;
            }
        }

        if (empty($monthAnchors)) {
            Log::warning('YCMapper: TIME CHART MONTH anchors tidak ditemukan');
        }

        $firstAnchorCol   = !empty($monthAnchors) ? min(array_keys($monthAnchors)) : self::COL_LIVE_START;
        $firstAnchorMonth = $monthAnchors[$firstAnchorCol] ?? Carbon::now()->month;
        $baseYear         = $this->resolveBaseYear($firstAnchorMonth, $etdRow, $firstAnchorCol);

        // ── FASE 1: Kolom historis F–J (index 5–9) ────────────────────────────
        $prevMonth     = $firstAnchorMonth === 1 ? 12 : $firstAnchorMonth - 1;
        $prevMonthYear = $firstAnchorMonth === 1 ? $baseYear - 1 : $baseYear;

        for ($col = self::COL_HIST_START; $col <= self::COL_HIST_END; $col++) {
            if (isset($hiddenColumns[$col])) {
                continue;
            }

            $etdDate = $this->parseDateValue($etdRow[$col] ?? null);
            if ($etdDate === null) {
                continue;
            }

            $etaDate = $this->parseDateValue($etaRow[$col] ?? null)
                ?? $etdDate->copy()->addDays(14);

            $etdDate = $this->normalizeYear($etdDate, $prevMonthYear);
            $etaDate = $this->normalizeYear($etaDate, $prevMonthYear);

            // FIX BUG A: Gunakan headerRow untuk week label historis
            // Header row col 5-9 = 4,5,6,7,8 → format menjadi "4W","5W","6W","7W","8W"
            $rawHeaderWeek = $headerRow[$col] ?? null;
            $weekLabel = ($rawHeaderWeek !== null && is_numeric($rawHeaderWeek))
                ? ((int) $rawHeaderWeek . 'W')
                : ('W' . ($col - self::COL_HIST_START + 4)); // fallback

            $colMonthStr = Carbon::create($prevMonthYear, $prevMonth, 1)->format('Y-m');

            $entry = [
                'etd'        => $etdDate,
                'eta'        => $etaDate,
                'type'       => 'FIRM',
                'week_label' => $weekLabel,
                'month'      => $colMonthStr,
            ];

            $colMonth = Carbon::create($prevMonthYear, $prevMonth, 1);
            if ($colMonth->between($firmStart, $firmEnd)) {
                $columns[$col] = $entry;
            } else {
                $skipped[$col] = $entry;
            }
        }

        // ── FASE 2: Kolom live K+ (index 10+) ────────────────────────────────
        $currentMonth = null;
        $currentYear  = $baseYear;
        $lastMonth    = null;

        $maxCol = max(
            count($timeChartRow) - 1,
            count($etdRow) - 1,
            count($etaRow) - 1,
            self::COL_LIVE_START
        );

        for ($col = self::COL_LIVE_START; $col <= $maxCol; $col++) {
            if (isset($hiddenColumns[$col])) {
                continue;
            }

            // Update anchor bulan jika TIME CHART row punya nilai di kolom ini
            if (isset($monthAnchors[$col])) {
                $month = $monthAnchors[$col];
                if ($lastMonth !== null && $month < $lastMonth) {
                    $currentYear++;
                }
                $currentMonth = $month;
                $lastMonth    = $month;
            }

            if ($currentMonth === null) {
                continue;
            }

            $etdDate = $this->parseDateValue($etdRow[$col] ?? null);
            if ($etdDate === null) {
                continue;
            }

            $etaDate = $this->parseDateValue($etaRow[$col] ?? null)
                ?? $etdDate->copy()->addDays(14);

            $etdDate = $this->normalizeYear($etdDate, $currentYear);
            $etaDate = $this->normalizeYear($etaDate, $currentYear);

            $colMonthStr = Carbon::create($currentYear, $currentMonth, 1)->format('Y-m');

            // ─────────────────────────────────────────────────────────────────
            // FIX BUG A (CRITICAL): Baca week label dari HEADER ROW, bukan timeChartRow.
            //
            // timeChartRow[$col] berisi nomor BULAN (3=Mar, 4=Apr, 5=May…),
            // sedangkan headerRow[$col] berisi nomor WEEK (1,2,3,4,5 per bulan).
            //
            // Kode lama:
            //   $rawWeekVal = $timeChartRow[$col]; // → dapat 3,4,5 (bulan!)
            //   if (val >= 1 && val <= 5) weekLabel = val . 'W'; // 3W,4W,5W ← SALAH
            //
            // Kode baru:
            //   $rawWeekVal = $headerRow[$col];    // → dapat 1,2,3,4 (week benar)
            // ─────────────────────────────────────────────────────────────────
            $rawWeekVal = $headerRow[$col] ?? null;

            if ($rawWeekVal !== null && $rawWeekVal !== ''
                && is_numeric($rawWeekVal)
                && (int) $rawWeekVal >= 1 && (int) $rawWeekVal <= 5) {
                $weekLabel = (int) $rawWeekVal . 'W';
            } else {
                // Fallback: hitung dari TIME CHART anchor (jika col ini adalah anchor bulan)
                // Anchor bulan sendiri tidak punya week di header row, skip
                Log::debug("YCMapper: col {$col} tidak punya week label di headerRow, skip.");
                continue;
            }

            $colMonth = Carbon::create($currentYear, $currentMonth, 1);

            if ($colMonth->lte($firmEnd)) {
                $type     = 'FIRM';
                $inWindow = $colMonth->between($firmStart, $firmEnd);
            } else {
                $type     = 'FORECAST';
                $inWindow = $colMonth->between($forecastStart, $forecastEnd);
            }

            $entry = [
                'etd'        => $etdDate,
                'eta'        => $etaDate,
                'type'       => $type,
                'week_label' => $weekLabel,
                'month'      => $colMonthStr,
            ];

            if ($inWindow) {
                $columns[$col] = $entry;
            } else {
                $skipped[$col] = $entry;
            }
        }

        if (empty($columns) && !empty($skipped)) {
            Log::warning('YCMapper: window kosong, fallback ke semua kolom tersedia.');
            return $skipped;
        }

        return $columns;
    }

    /**
     * Fallback: semua kolom ETD valid, tanpa filter window.
     * FIX BUG D: Sama seperti buildDateColumns, gunakan $headerRow untuk week label.
     */
    private function buildDateColumnsNoFilter(
        array $timeChartRow,
        array $etdRow,
        array $etaRow,
        array $headerRow,    // ← PARAMETER BARU
        array $hiddenColumns = []
    ): array {
        $columns      = [];
        $monthAnchors = [];

        foreach ($timeChartRow as $col => $val) {
            if ($col >= self::COL_LIVE_START
                && $val !== null && $val !== '' && is_numeric($val)
                && (int) $val >= 1 && (int) $val <= 12) {
                $monthAnchors[$col] = (int) $val;
            }
        }

        $firstAnchorCol   = !empty($monthAnchors) ? min(array_keys($monthAnchors)) : self::COL_LIVE_START;
        $firstAnchorMonth = $monthAnchors[$firstAnchorCol] ?? Carbon::now()->month;
        $baseYear         = $this->resolveBaseYear($firstAnchorMonth, $etdRow, $firstAnchorCol);

        $currentMonth = null;
        $currentYear  = $baseYear;
        $lastMonth    = null;

        $maxCol = max(count($etdRow) - 1, self::COL_LIVE_START);

        for ($col = self::COL_HIST_START; $col <= $maxCol; $col++) {
            if (isset($hiddenColumns[$col])) {
                continue;
            }

            // Fase historis
            if ($col < self::COL_LIVE_START) {
                $etdDate = $this->parseDateValue($etdRow[$col] ?? null);
                if ($etdDate === null) continue;

                $prevMonth     = $firstAnchorMonth === 1 ? 12 : $firstAnchorMonth - 1;
                $prevMonthYear = $firstAnchorMonth === 1 ? $baseYear - 1 : $baseYear;

                $etaDate     = $this->parseDateValue($etaRow[$col] ?? null) ?? $etdDate->copy()->addDays(14);
                $etdDate     = $this->normalizeYear($etdDate, $prevMonthYear);
                $etaDate     = $this->normalizeYear($etaDate, $prevMonthYear);

                // FIX BUG D: Gunakan headerRow untuk week label
                $rawHeaderWeek = $headerRow[$col] ?? null;
                $weekLabel = ($rawHeaderWeek !== null && is_numeric($rawHeaderWeek))
                    ? ((int) $rawHeaderWeek . 'W')
                    : ('W' . ($col - self::COL_HIST_START + 4));

                $colMonthStr = Carbon::create($prevMonthYear, $prevMonth, 1)->format('Y-m');

                $columns[$col] = [
                    'etd'        => $etdDate,
                    'eta'        => $etaDate,
                    'type'       => 'FIRM',
                    'week_label' => $weekLabel,
                    'month'      => $colMonthStr,
                ];
                continue;
            }

            // Fase live
            if (isset($monthAnchors[$col])) {
                $month = $monthAnchors[$col];
                if ($lastMonth !== null && $month < $lastMonth) $currentYear++;
                $currentMonth = $month;
                $lastMonth    = $month;
            }
            if ($currentMonth === null) continue;

            $etdDate = $this->parseDateValue($etdRow[$col] ?? null);
            if ($etdDate === null) continue;

            $etaDate     = $this->parseDateValue($etaRow[$col] ?? null) ?? $etdDate->copy()->addDays(14);
            $etdDate     = $this->normalizeYear($etdDate, $currentYear);
            $etaDate     = $this->normalizeYear($etaDate, $currentYear);
            $colMonthStr = Carbon::create($currentYear, $currentMonth, 1)->format('Y-m');

            // FIX BUG D: Gunakan headerRow, bukan timeChartRow
            $rawWeekVal = $headerRow[$col] ?? null;
            if ($rawWeekVal !== null && is_numeric($rawWeekVal)
                && (int) $rawWeekVal >= 1 && (int) $rawWeekVal <= 5) {
                $weekLabel = (int) $rawWeekVal . 'W';
            } else {
                continue; // Kolom anchor bulan (tidak punya week number di header)
            }

            $type = Carbon::create($currentYear, $currentMonth, 1)->lte(
                Carbon::now()->endOfMonth()
            ) ? 'FIRM' : 'FORECAST';

            $columns[$col] = [
                'etd'        => $etdDate,
                'eta'        => $etaDate,
                'type'       => $type,
                'week_label' => $weekLabel,
                'month'      => $colMonthStr,
            ];
        }

        return $columns;
    }

    // =========================================================================
    // PRIVATE — Row Detection
    // =========================================================================

    /**
     * FIX BUG C: Parameter $labelCol sekarang dipakai dengan benar.
     * Caller harus pass LABEL_COL = 5 untuk label YC (Col F).
     */
    private function detectRowIndexByLabel(
        array  $sheet,
        string $label,
        int    $defaultIdx,
        int    $labelCol = 0,
        int    $maxRows  = 25,
        bool   $exact    = false
    ): ?int {
        $limit = min(count($sheet), $maxRows);
        for ($i = 0; $i < $limit; $i++) {
            $row = $sheet[$i];
            if (!is_array($row)) {
                continue;
            }
            $cellVal = strtoupper(trim((string) ($row[$labelCol] ?? '')));
            $target = strtoupper($label);
            if ($exact ? $cellVal === $target : str_contains($cellVal, $target)) {
                return $i;
            }
        }
        return null;
    }

    private function detectHeaderRowIndex(array $sheet, int $maxRows = 25): ?int
    {
        $limit = min(count($sheet), $maxRows);
        for ($i = 0; $i < $limit; $i++) {
            $row = $sheet[$i];
            if (!is_array($row)) {
                continue;
            }
            $e = strtoupper(trim((string) ($row[self::COL_PART] ?? '')));
            if ($e === 'PRODUCT NO' || $e === 'PRODUCT NO.') {
                return $i;
            }
        }
        return null;
    }

    // =========================================================================
    // PRIVATE — Date & Year Helpers (tidak berubah)
    // =========================================================================

    private function guessReferenceDate(array $etdRow, array $timeChartRow): ?Carbon
    {
        $today  = Carbon::today();
        $future = [];
        $all    = [];

        foreach ($etdRow as $val) {
            $date = $this->parseDateValue($val);
            if ($date === null) continue;
            $all[] = $date;
            if ($date->gte($today)) $future[] = $date;
        }

        if (!empty($future)) {
            usort($future, fn($a, $b) => $a->timestamp <=> $b->timestamp);
            return $future[0];
        }

        if (!empty($all)) {
            usort($all, fn($a, $b) => $a->timestamp <=> $b->timestamp);
            return $all[0];
        }

        foreach ($timeChartRow as $val) {
            if ($val !== null && is_numeric($val) && (int) $val >= 1 && (int) $val <= 12) {
                return Carbon::create(Carbon::now()->year, (int) $val, 1);
            }
        }

        return null;
    }

    private function resolveBaseYear(int $anchorMonth, array $etdRow, int $anchorCol): int
    {
        $etdAtAnchor = $this->parseDateValue($etdRow[$anchorCol] ?? null);
        if ($etdAtAnchor !== null) {
            return $etdAtAnchor->year;
        }

        $years = [];
        foreach ($etdRow as $val) {
            $date = $this->parseDateValue($val);
            if ($date !== null) {
                $years[$date->year] = ($years[$date->year] ?? 0) + 1;
            }
        }

        if (!empty($years)) {
            arsort($years);
            return array_key_first($years);
        }

        return Carbon::now()->year;
    }

    private function normalizeYear(Carbon $date, int $expectedYear): Carbon
    {
        if (abs($date->year - $expectedYear) <= 1) {
            return $date;
        }
        try {
            return $date->copy()->year($expectedYear);
        } catch (\Throwable $e) {
            return $date;
        }
    }

    private function parseDateValue(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTime || $value instanceof \DateTimeImmutable) {
            return Carbon::instance($value)->startOfDay();
        }

        if (is_float($value) || (is_int($value) && $value > 40000)) {
            try {
                $dt = \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($value);
                return Carbon::instance($dt)->startOfDay();
            } catch (\Throwable $e) {
                Log::warning("YCMapper: gagal parse serial: {$value}");
            }
        }

        if (is_string($value)) {
            return $this->parseDateString($value);
        }

        return null;
    }

    private function parseDateString(string $str): ?Carbon
    {
        $str = trim($str);
        if ($str === '' || str_starts_with($str, '=')) {
            return null;
        }

        if (preg_match('/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/', $str, $m)) {
            if (checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
                return Carbon::create((int) $m[1], (int) $m[2], (int) $m[3])->startOfDay();
            }
        }

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
}
