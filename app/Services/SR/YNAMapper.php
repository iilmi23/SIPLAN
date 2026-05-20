<?php

namespace App\Services\SR;

use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class YNAMapper implements SRMapperInterface
{
    private const DATA_COL_START = 9; // Excel column J
    private const FALLBACK_SHEET_NAME = 'Final SR';

    private const COL_F = 5;
    private const COL_G = 6;
    private const COL_I = 8;

    public function map(
        array $sheet,
        ?Carbon $referenceDate = null,
        ?string $filePath = null,
        int $sheetIndex = 0,
        ?int $customerId = null
    ): array {
        if (empty($sheet)) {
            throw new \Exception('Sheet kosong atau tidak valid');
        }

        if ($filePath === null || !file_exists($filePath)) {
            throw new \Exception(
                'YNAMapper membutuhkan filePath untuk membaca nilai formula Excel secara langsung.'
            );
        }

        Log::info('=== MAPPING YNA START ===');

        return $this->mapFromFile($filePath, $referenceDate, $customerId, $sheetIndex);
    }

    private function mapFromFile(string $filePath, ?Carbon $referenceDate, ?int $customerId, int $sheetIndex): array
    {
        $spreadsheet = IOFactory::load($filePath);
        $worksheet = $this->resolveWorksheet($spreadsheet, $sheetIndex);
        $rows = $this->worksheetRows($worksheet);
        $psaRows = $this->findPsaRows($rows);

        Log::info('Membaca sheet: ' . $worksheet->getTitle());
        Log::info('Total rows dibaca: ' . count($rows));
        Log::info('Reference: ' . ($referenceDate ?? Carbon::now())->toDateString() . ' | YNA mengambil semua kolom ETD/ETA');
        Log::info('Total assy blocks ditemukan: ' . count($psaRows));

        if (empty($psaRows)) {
            throw new \Exception(
                "Tidak dapat menemukan blok data di sheet '{$worksheet->getTitle()}'. " .
                "Pastikan format YNA benar dan ada baris berlabel 'PSA#'."
            );
        }

        $referenceEtaByColumn = $this->extractReferenceEtaByColumn($rows, $psaRows);
        $records = [];
        $processed = 0;
        $skipped = 0;

        foreach ($psaRows as $psaRow) {
            try {
                $blockRecords = $this->parseBlock($rows, $psaRow, $customerId, $referenceEtaByColumn);

                if ($blockRecords === []) {
                    $skipped++;
                    Log::debug('Block row ' . ($psaRow + 1) . ' tidak punya data.');
                    continue;
                }

                array_push($records, ...$blockRecords);
                $processed++;
            } catch (\Throwable $e) {
                $skipped++;
                Log::warning('Error parsing block di row ' . ($psaRow + 1) . ': ' . $e->getMessage());
            }
        }

        Log::info("Processed blocks: {$processed} | Skipped: {$skipped} | Records: " . count($records));

        if (empty($records)) {
            throw new \Exception('Tidak ada data ETD/ETA yang valid di file YNA. Total blocks: ' . count($psaRows) . '.');
        }

        return $records;
    }

    private function parseBlock(array $rows, int $psaRow, ?int $customerId, array $referenceEtaByColumn): array
    {
        if (!isset($rows[$psaRow + 5])) {
            Log::debug('Block di row ' . ($psaRow + 1) . ' tidak lengkap, skip.');
            return [];
        }

        $assyRow = $rows[$psaRow + 1];
        $customerPartRow = $rows[$psaRow + 2];
        $etdRow = $rows[$psaRow + 3];
        $etaRow = $rows[$psaRow + 4];
        $netRow = $rows[$psaRow + 5];
        $familyRow = $rows[$psaRow + 6] ?? [];

        $assyNumber = $this->readAssyNumber($assyRow, $customerPartRow, $psaRow);
        if ($assyNumber === null || !$this->isValidBlock($psaRow, $assyNumber, $etdRow, $netRow)) {
            return [];
        }

        $model = $this->cleanString($netRow[self::COL_G] ?? null) ?: null;
        $family = $this->readFamily($familyRow);
        $hasEtaRow = $this->cleanString($etaRow[self::COL_I] ?? null) === 'ETA Date';
        $maxCols = max(count($etdRow), count($etaRow), count($netRow));
        $records = [];

        for ($col = self::DATA_COL_START; $col < $maxCols; $col++) {
            $record = $this->recordFromColumn(
                $psaRow,
                $col,
                $assyNumber,
                $etdRow,
                $etaRow,
                $netRow,
                $hasEtaRow,
                $referenceEtaByColumn,
                $customerId,
                $model,
                $family
            );

            if ($record !== null) {
                $records[] = $record;
            }
        }

        Log::debug("Block row " . ($psaRow + 1) . " assy '{$assyNumber}': " . count($records) . ' kolom parsed.');

        return $records;
    }

    private function recordFromColumn(
        int $psaRow,
        int $col,
        string $assyNumber,
        array $etdRow,
        array $etaRow,
        array $netRow,
        bool $hasEtaRow,
        array $referenceEtaByColumn,
        ?int $customerId,
        ?string $model,
        ?string $family
    ): ?array {
        $etd = $this->parseDateValue($etdRow[$col] ?? null);
        if ($etd === null) {
            return null;
        }

        [$eta, $etaSource] = $this->resolveEta($etaRow[$col] ?? null, $hasEtaRow, $referenceEtaByColumn[$col] ?? null);
        $qty = $this->parseQty($netRow[$col] ?? null, $psaRow, $assyNumber, $col);

        if ($qty < 0) {
            Log::debug('Block row ' . ($psaRow + 1) . ' col ' . ($col + 1) . ": qty negatif ({$qty}), skip.");
            return null;
        }

        $weekInfo = $this->resolveWeekFromEtd($customerId, $etd);

        return [
            'customer' => 'YNA',
            'source_file' => null,
            'assy_number' => $assyNumber,
            'qty' => $qty,
            'delivery_date' => $eta?->toDateString(),
            'eta' => $eta?->toDateString(),
            'etd' => $etd->toDateString(),
            'week' => $weekInfo['week'],
            'month' => $weekInfo['month'],
            'year' => $weekInfo['year'],
            'order_type' => 'FIRM',
            'model' => $model,
            'family' => $family,
            'route' => null,
            'port' => null,
            'extra' => json_encode([
                'row' => $psaRow + 1,
                'col' => $col + 1,
                'etd_raw' => $etd->toDateString(),
                'eta_source' => $eta ? $etaSource : null,
                'eta_fallback' => false,
                'week_source' => $weekInfo['source'],
                'model_source' => $model ? 'sr_car_line' : null,
                'family_source' => $family ? 'sr_family' : null,
            ]),
        ];
    }

    private function readAssyNumber(array $assyRow, array $customerPartRow, int $psaRow): ?string
    {
        $ynaPartLabel = $this->cleanString($assyRow[self::COL_F] ?? null);
        $customerPartLabel = $this->cleanString($customerPartRow[self::COL_F] ?? null);
        $assyNumber = $this->cleanString($customerPartRow[self::COL_G] ?? null);

        if ($ynaPartLabel !== 'YNA Part#') {
            Log::debug("Block row " . ($psaRow + 1) . ": label +1 bukan 'YNA Part#', got '{$ynaPartLabel}', skip.");
            return null;
        }

        if ($customerPartLabel !== 'Customer Part#') {
            Log::debug("Block row " . ($psaRow + 1) . ": label +2 bukan 'Customer Part#', got '{$customerPartLabel}', skip.");
            return null;
        }

        if ($assyNumber === '') {
            Log::debug('Block row ' . ($psaRow + 1) . ': customer part kosong di col G, skip.');
            return null;
        }

        return $assyNumber;
    }

    private function isValidBlock(int $psaRow, string $assyNumber, array $etdRow, array $netRow): bool
    {
        $etdLabel = $this->cleanString($etdRow[self::COL_I] ?? null);
        $netLabel = $this->cleanString($netRow[self::COL_I] ?? null);

        if ($etdLabel !== 'ETD Date') {
            Log::warning("Block row " . ($psaRow + 1) . " assy '{$assyNumber}': ETD label tidak cocok, got '{$etdLabel}'");
            return false;
        }

        if ($netLabel !== 'Net') {
            Log::warning("Block row " . ($psaRow + 1) . " assy '{$assyNumber}': Net label tidak cocok, got '{$netLabel}'");
            return false;
        }

        return true;
    }

    private function readFamily(array $familyRow): ?string
    {
        if ($this->cleanString($familyRow[self::COL_F] ?? null) !== 'Family') {
            return null;
        }

        return $this->cleanString($familyRow[self::COL_G] ?? null) ?: null;
    }

    private function resolveEta($etaRaw, bool $hasEtaRow, ?Carbon $referenceEta): array
    {
        $eta = $hasEtaRow ? $this->parseDateValue($etaRaw) : null;

        if ($eta !== null) {
            return [$eta, 'sr_eta_row'];
        }

        if ($referenceEta !== null) {
            return [$referenceEta->copy(), 'yna_reference_eta_row'];
        }

        return [null, null];
    }

    private function parseQty($value, int $psaRow, string $assyNumber, int $col): int
    {
        if ($value === null || $value === '' || (is_string($value) && trim($value) === '')) {
            return 0;
        }

        if (is_string($value) && str_starts_with(trim($value), '=')) {
            $qty = $this->parseInteger($value);
            if ($qty !== null) {
                Log::debug("Block row " . ($psaRow + 1) . " assy '{$assyNumber}' col " . ($col + 1) . ": formula qty terbaca: {$qty}");
                return $qty;
            }

            Log::warning("Block row " . ($psaRow + 1) . " assy '{$assyNumber}' col " . ($col + 1) . ": formula qty tidak terbaca, default 0. Raw: {$value}");
            return 0;
        }

        return $this->parseInteger($value) ?? 0;
    }

    private function extractReferenceEtaByColumn(array $rows, array $psaRows): array
    {
        foreach ($psaRows as $psaRow) {
            $etaRow = $rows[$psaRow + 4] ?? [];
            if ($this->cleanString($etaRow[self::COL_I] ?? null) !== 'ETA Date') {
                continue;
            }

            $etaByColumn = $this->dateMapFromRow($etaRow);
            if ($etaByColumn !== []) {
                Log::info('YNA reference ETA row memakai block row ' . ($psaRow + 1) . ' dengan ' . count($etaByColumn) . ' kolom ETA.');
                return $etaByColumn;
            }
        }

        Log::warning('YNA reference ETA row tidak ditemukan; ETA kosong akan tetap null.');
        return [];
    }

    public function extractEtdRangeFromFile(string $filePath, int $sheetIndex = 0): array
    {
        $rows = $this->worksheetRows($this->resolveWorksheet(IOFactory::load($filePath), $sheetIndex));
        $dates = [];

        foreach ($this->findPsaRows($rows) as $psaRow) {
            foreach ($this->dateMapFromRow($rows[$psaRow + 3] ?? []) as $date) {
                $dates[] = $date->toDateString();
            }
        }

        return $dates === [] ? [null, null] : [min($dates), max($dates)];
    }

    public function extractWeekNumbersFromFile(string $filePath, int $sheetIndex = 0): array
    {
        $rows = $this->worksheetRows($this->resolveWorksheet(IOFactory::load($filePath), $sheetIndex));

        for ($row = 0; $row < min(5, count($rows)); $row++) {
            $weekMap = $this->weekMapFromRow($rows[$row]);
            if (count($weekMap) >= 3) {
                Log::info('Extract week numbers dari row ' . ($row + 1) . ': ' . count($weekMap) . ' weeks found');
                return $weekMap;
            }
        }

        Log::debug('No explicit week labels found in file, will use ETD-based resolution');
        return [];
    }

    private function resolveWorksheet(Spreadsheet $spreadsheet, int $sheetIndex): Worksheet
    {
        if ($sheetIndex >= 0 && $sheetIndex < $spreadsheet->getSheetCount()) {
            $worksheet = $spreadsheet->getSheet($sheetIndex);
            Log::info("YNA memakai worksheet pilihan user index {$sheetIndex}: " . $worksheet->getTitle());
            return $worksheet;
        }

        foreach ($spreadsheet->getWorksheetIterator() as $worksheet) {
            if (strtolower(trim($worksheet->getTitle())) === strtolower(self::FALLBACK_SHEET_NAME)) {
                Log::warning("Sheet index {$sheetIndex} tidak valid, fallback ke sheet '" . self::FALLBACK_SHEET_NAME . "'.");
                return $worksheet;
            }
        }

        $worksheet = $spreadsheet->getActiveSheet();
        Log::warning("Sheet index {$sheetIndex} tidak valid, menggunakan sheet aktif: " . $worksheet->getTitle());

        return $worksheet;
    }

    private function worksheetRows(Worksheet $worksheet): array
    {
        $rows = [];

        foreach ($worksheet->getRowIterator() as $row) {
            $rowData = [];
            foreach ($row->getCellIterator() as $cell) {
                $rowData[] = $cell->getCalculatedValue();
            }
            $rows[] = $rowData;
        }

        return $rows;
    }

    private function findPsaRows(array $rows): array
    {
        $psaRows = [];

        foreach ($rows as $index => $row) {
            if ($this->cleanString($row[self::COL_F] ?? null) === 'PSA#') {
                $psaRows[] = $index;
            }
        }

        return $psaRows;
    }

    private function dateMapFromRow(array $row): array
    {
        $dates = [];

        for ($col = self::DATA_COL_START; $col < count($row); $col++) {
            $date = $this->parseDateValue($row[$col] ?? null);
            if ($date !== null) {
                $dates[$col] = $date;
            }
        }

        return $dates;
    }

    private function weekMapFromRow(array $row): array
    {
        $weekMap = [];

        for ($col = self::DATA_COL_START; $col < count($row); $col++) {
            $value = $this->cleanString($row[$col] ?? null);

            if (preg_match('/^w(?:eek)?\s*(\d+)$/i', $value, $match)) {
                $weekMap[$col] = (int) $match[1];
            } elseif (is_numeric($value) && (int) $value > 0 && (int) $value < 53) {
                $weekMap[$col] = (int) $value;
            }
        }

        return $weekMap;
    }

    private function resolveWeekFromEtd(?int $customerId, Carbon $etd): array
    {
        $weekInfo = $this->getYNAWeekInfo($etd);

        return [
            'week' => $weekInfo['week'],
            'month' => $weekInfo['month_year'],
            'year' => $etd->year,
            'source' => 'yna_etd',
        ];
    }

    private function getYNAWeekInfo(Carbon $date): array
    {
        $weekMonday = $date->copy()->startOfWeek(Carbon::MONDAY);
        $monthDate = $weekMonday->copy();

        if (($weekMonday->daysInMonth - $weekMonday->day + 1) <= 1) {
            $monthDate->addMonthNoOverflow();
        }

        $firstMonday = Carbon::create($monthDate->year, $monthDate->month, 1)->startOfWeek(Carbon::MONDAY);

        if ($firstMonday->month !== $monthDate->month) {
            $remainingDaysInPreviousMonth = $firstMonday->daysInMonth - $firstMonday->day + 1;
            if ($remainingDaysInPreviousMonth > 1) {
                $firstMonday->addWeek();
            }
        }

        $weekNumber = intdiv($firstMonday->diffInDays($weekMonday, false), 7) + 1;

        return [
            'week' => min($weekNumber, 5),
            'month_year' => $monthDate->format('Y-m'),
        ];
    }

    private function parseDateValue($value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance($value)->startOfDay();
        }

        if (is_float($value) || (is_int($value) && $value > 40000)) {
            try {
                return Carbon::instance(ExcelDate::excelToDateTimeObject($value))->startOfDay();
            } catch (\Throwable) {
                Log::debug('ExcelDate conversion failed for value: ' . var_export($value, true));
            }
        }

        if (!is_string($value)) {
            return null;
        }

        $value = trim($value);
        if ($value === '' || str_starts_with($value, '=')) {
            return null;
        }

        foreach (['Y-m-d', 'Y/m/d', 'd/m/Y', 'm/d/Y', 'd-m-Y', 'n/j/Y', 'n/j/y'] as $format) {
            try {
                $date = Carbon::createFromFormat($format, $value);
                if ($date !== false && $date->format($format) === $value) {
                    return $date->startOfDay();
                }
            } catch (\Throwable) {
                // Try the next format.
            }
        }

        try {
            $date = Carbon::parse($value);
            return $date->year >= 2000 && $date->year <= 2100 ? $date->startOfDay() : null;
        } catch (\Throwable) {
            Log::debug('Date parsing failed for string: ' . $value);
            return null;
        }
    }

    private function parseInteger($value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_int($value)) {
            return $value;
        }

        if (is_float($value)) {
            return (int) round($value);
        }

        $value = trim((string) $value);
        if ($value === '' || str_starts_with($value, '=')) {
            return null;
        }

        $cleaned = preg_replace('/[^0-9\-]/', '', $value);
        if ($cleaned === '') {
            return null;
        }

        $number = (int) $cleaned;
        return abs($number) > 1000000 ? null : $number;
    }

    private function cleanString($value): string
    {
        return trim((string) ($value ?? ''));
    }
}
