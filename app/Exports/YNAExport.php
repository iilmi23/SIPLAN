<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

/**
 * YNAExport — Export untuk customer YNA
 * Format sederhana: NO, ASSY NO, ETD, ETA, WEEK (tanpa FIRM/FORECAST grouping)
 */
class YNAExport implements FromArray, WithStyles, WithColumnWidths, WithCustomStartCell
{
    protected $data;

    // ── Color Palette — "Forest Green" ───────────────────────────────────
    const COLOR_HEADER_FIXED    = 'FF1D4D2A'; // dark forest
    const COLOR_HEADER_ETD      = 'FF1D6F42'; // forest green
    const COLOR_HEADER_ETA      = 'FF2E9E5E'; // medium green
    const COLOR_HEADER_WEEK     = 'FF237A50'; // balanced green
    const COLOR_LEFT_BG         = 'FF2D5A3D'; // slate green
    const COLOR_LEFT_QTY_BG     = 'FF3A6B4E'; // muted green
    const COLOR_ROW_ODD         = 'FFEAF5EF'; // soft mint
    const COLOR_ROW_EVEN        = 'FFC6E8D4'; // powder green
    const COLOR_TOT_DATA_ODD    = 'FF98D9C0'; // medium mint (TOT columns)
    const COLOR_TOT_DATA_EVEN   = 'FF7ECFB5'; // deeper mint (TOT columns)
    const COLOR_TEXT_WHITE      = 'FFFFFFFF';
    const COLOR_TEXT_MUTED      = 'FFAABFB0';
    const COLOR_TEXT_VALUE      = 'FF0D4F2C';
    const COLOR_TEXT_QTY_LABEL  = 'FFD4EDE0';
    const COLOR_BORDER_LIGHT    = 'FF8FC9A8';
    const COLOR_BORDER_HEADER   = 'FF145233';
    const COLOR_TOTAL_BG        = 'FF0F3320';
    const COLOR_TOTAL_BORDER    = 'FF2E7D52';
    const COLOR_TOTAL_TOP       = 'FF4CAF78';

    public function __construct($data)
    {
        $this->data = $data;
    }

    // ── 1. Array ──────────────────────────────────────────────────────────
    public function array(): array
    {
        $rows    = [];
        $periods = $this->buildPeriodsWithMonthTotals();

        // Row 1 — ETD labels
        $row1 = ['NO', 'ASSY NO', 'ETD'];
        foreach ($periods as $p) {
            $row1[] = ($p['week'] === 'TOT') ? 'TOT' : $p['etd'];
        }
        $rows[] = $row1;

        // Row 2 — ETA labels
        $row2 = ['', '', 'ETA'];
        foreach ($periods as $p) {
            $row2[] = ($p['week'] === 'TOT') ? '' : $p['eta'];
        }
        $rows[] = $row2;

        // Row 3 — Week numbers
        $row3 = ['', '', 'WEEK'];
        foreach ($periods as $p) {
            $row3[] = ($p['week'] === 'TOT') ? '' : $p['week'];
        }
        $rows[] = $row3;

        // Data rows — satu baris per assy_number
        $grouped = $this->data->groupBy('assy_number');
        $index   = 0;

        foreach ($grouped as $assyNumber => $items) {
            $index++;

            $dataRow = [$index, $assyNumber, 'QTY'];
            foreach ($periods as $p) {
                if ($p['week'] === 'TOT') {
                    // Monthly subtotal for this part
                    $monthKey = $p['month'];
                    $total    = 0;
                    foreach ($items as $item) {
                        $itemMonth = $this->monthKey($item);
                        if ($itemMonth === $monthKey) {
                            $total += (int)($item->qty ?? 0);
                        }
                    }
                    $dataRow[] = ($total === 0) ? '0' : $total;
                } else {
                    $key   = $p['key'];
                    $total = 0;
                    foreach ($items as $item) {
                        $itemKey = $this->periodKey($item);
                        if ($itemKey === $key) {
                            $total += (int)($item->qty ?? 0);
                        }
                    }
                    $dataRow[] = ($total === 0) ? '0' : $total;
                }
            }
            $rows[] = $dataRow;
        }

        // Row total
        $totalRow = ['', 'TOTAL', ''];
        foreach ($periods as $p) {
            if ($p['week'] === 'TOT') {
                $monthKey = $p['month'];
                $total    = 0;
                foreach ($this->data as $item) {
                    $itemMonth = $this->monthKey($item);
                    if ($itemMonth === $monthKey) {
                        $total += (int)($item->qty ?? 0);
                    }
                }
                $totalRow[] = ($total === 0) ? '0' : $total;
            } else {
                $key   = $p['key'];
                $total = 0;
                foreach ($this->data as $item) {
                    $itemKey = $this->periodKey($item);
                    if ($itemKey === $key) {
                        $total += (int)($item->qty ?? 0);
                    }
                }
                $totalRow[] = ($total === 0) ? '0' : $total;
            }
        }
        $rows[] = $totalRow;

        return $rows;
    }

    // ── 2. Column widths ──────────────────────────────────────────────────
    public function columnWidths(): array
    {
        $widths  = ['A' => 5, 'B' => 16, 'C' => 9];
        $periods = $this->buildPeriodsWithMonthTotals();

        for ($i = 0; $i < count($periods); $i++) {
            $col = Coordinate::stringFromColumnIndex($i + 4);
            $widths[$col] = ($periods[$i]['week'] === 'TOT') ? 6 : 7;
        }
        return $widths;
    }

    // ── 3. Start cell ─────────────────────────────────────────────────────
    public function startCell(): string
    {
        return 'A1';
    }

    // ── 4. Styles ─────────────────────────────────────────────────────────
    public function styles(Worksheet $sheet)
    {
        $periods       = $this->buildPeriodsWithMonthTotals();
        $totalDataCols = count($periods);
        $lastColIdx    = 3 + $totalDataCols;
        $lastCol       = Coordinate::stringFromColumnIndex($lastColIdx);
        $totalRows     = $sheet->getHighestRow();
        $dataFirstRow  = 4;
        $dataLastRow   = $totalRows - 1;

        // ── Row heights ───────────────────────────────────────────────────
        $sheet->getRowDimension(1)->setRowHeight(18);
        $sheet->getRowDimension(2)->setRowHeight(18);
        $sheet->getRowDimension(3)->setRowHeight(18);
        for ($r = 4; $r <= $totalRows; $r++) {
            $sheet->getRowDimension($r)->setRowHeight(15);
        }

        // ── Freeze panes (include week row) ───────────────────────────────
        $sheet->freezePane('D4');

        // ── Merge: NO, ASSY NO (span 3 header rows) ───────────────────────
        $sheet->mergeCells('A1:A3');
        $sheet->mergeCells('B1:B3');

        // ════════════════════════════════════════════════════════════════
        // HEADER — fixed cols (A-C)
        // ════════════════════════════════════════════════════════════════
        $sheet->getStyle("A1:C3")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_HEADER_FIXED]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER, 'wrapText' => false],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                             'color'       => ['argb' => self::COLOR_BORDER_HEADER]]],
        ]);

        // ════════════════════════════════════════════════════════════════
        // HEADER — period cols
        // ════════════════════════════════════════════════════════════════
        $startPeriodCol = Coordinate::stringFromColumnIndex(4);
        $endPeriodCol   = $lastCol;

        // ETD row (row 1)
        $sheet->getStyle("{$startPeriodCol}1:{$endPeriodCol}1")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_HEADER_ETD]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                             'color'       => ['argb' => self::COLOR_BORDER_HEADER]]],
        ]);

        // ETA row (row 2)
        $sheet->getStyle("{$startPeriodCol}2:{$endPeriodCol}2")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_HEADER_ETA]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                             'color'       => ['argb' => self::COLOR_BORDER_HEADER]]],
        ]);

        // WEEK row (row 3)
        $sheet->getStyle("{$startPeriodCol}3:{$endPeriodCol}3")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_HEADER_WEEK]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                             'color'       => ['argb' => self::COLOR_BORDER_HEADER]]],
        ]);

        // ════════════════════════════════════════════════════════════════
        // DATA ROWS — left fixed cols (A-C)
        // ════════════════════════════════════════════════════════════════
        $sheet->getStyle("A{$dataFirstRow}:C{$dataLastRow}")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_LEFT_BG]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                             'color'       => ['argb' => 'FF334155']]],
        ]);

        // Col B (ASSY NO) — left-align with indent
        $sheet->getStyle("B{$dataFirstRow}:B{$dataLastRow}")->getAlignment()
              ->setHorizontal(Alignment::HORIZONTAL_LEFT);
        $sheet->getStyle("B{$dataFirstRow}:B{$dataLastRow}")->getAlignment()->setIndent(1);

        // Col C (QTY label)
        $sheet->getStyle("C{$dataFirstRow}:C{$dataLastRow}")->applyFromArray([
            'fill' => ['fillType'   => Fill::FILL_SOLID,
                       'startColor' => ['argb' => self::COLOR_LEFT_QTY_BG]],
            'font' => ['bold'  => false, 'color' => ['argb' => self::COLOR_TEXT_QTY_LABEL],
                       'name'  => 'Arial', 'size' => 8],
        ]);

        // ════════════════════════════════════════════════════════════════
        // DATA ROWS — alternating bg, period columns
        // ════════════════════════════════════════════════════════════════
        for ($r = $dataFirstRow; $r <= $dataLastRow; $r++) {
            for ($c = 4; $c <= $lastColIdx; $c++) {
                $colIdx = $c - 4;
                if (isset($periods[$colIdx]) && $periods[$colIdx]['week'] === 'TOT') {
                    // TOT column styling - bold with different background
                    $bgColor = ($r % 2 === 0) ? self::COLOR_TOT_DATA_ODD : self::COLOR_TOT_DATA_EVEN;
                    $sheet->getStyle(Coordinate::stringFromColumnIndex($c) . $r)->applyFromArray([
                        'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgColor]],
                        'font'      => ['name' => 'Arial', 'size' => 9, 'bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE]],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT, 'vertical' => Alignment::VERTICAL_CENTER],
                        'numberFormat' => ['formatCode' => '0'],
                        'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::COLOR_BORDER_LIGHT]]],
                    ]);
                } else {
                    // Regular week columns
                    $bgColor = ($r % 2 === 0) ? self::COLOR_ROW_ODD : self::COLOR_ROW_EVEN;
                    $sheet->getStyle(Coordinate::stringFromColumnIndex($c) . $r)->applyFromArray([
                        'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgColor]],
                        'font'      => ['name' => 'Arial', 'size' => 9, 'bold' => false],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT, 'vertical' => Alignment::VERTICAL_CENTER],
                        'numberFormat' => ['formatCode' => '0'],
                        'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::COLOR_BORDER_LIGHT]]],
                    ]);
                }
            }
        }

        // ════════════════════════════════════════════════════════════════
        // Zero / non-zero value coloring
        // ════════════════════════════════════════════════════════════════
        for ($r = $dataFirstRow; $r <= $dataLastRow; $r++) {
            for ($c = 4; $c <= $lastColIdx; $c++) {
                $cellCoord = Coordinate::stringFromColumnIndex($c) . $r;
                $cellVal   = $sheet->getCell($cellCoord)->getValue();
                if ($cellVal === 0 || $cellVal === '0') {
                    $sheet->getStyle($cellCoord)->getFont()
                          ->getColor()->setARGB(self::COLOR_TEXT_MUTED);
                } else {
                    $sheet->getStyle($cellCoord)->getFont()
                          ->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color(self::COLOR_TEXT_VALUE));
                    $sheet->getStyle($cellCoord)->getFont()->setBold(true);
                }
            }
        }

        // ════════════════════════════════════════════════════════════════
        // TOTAL ROW
        // ════════════════════════════════════════════════════════════════
        $sheet->getStyle("A{$totalRows}:{$lastCol}{$totalRows}")->applyFromArray([
            'fill'      => ['fillType'   => Fill::FILL_SOLID,
                            'startColor' => ['argb' => self::COLOR_TOTAL_BG]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE],
                            'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT,
                            'vertical'   => Alignment::VERTICAL_CENTER],
            'numberFormat' => ['formatCode' => '0'],
            'borders'   => [
                'top'        => ['borderStyle' => Border::BORDER_MEDIUM,
                                 'color'       => ['argb' => self::COLOR_TOTAL_TOP]],
                'bottom'     => ['borderStyle' => Border::BORDER_MEDIUM,
                                 'color'       => ['argb' => self::COLOR_TOTAL_BG]],
                'allBorders' => ['borderStyle' => Border::BORDER_THIN,
                                 'color'       => ['argb' => self::COLOR_TOTAL_BORDER]],
            ],
        ]);

        // "TOTAL" label — left-align
        $sheet->getStyle("B{$totalRows}")->getAlignment()
              ->setHorizontal(Alignment::HORIZONTAL_LEFT);
        $sheet->getStyle("B{$totalRows}")->getAlignment()->setIndent(1);

        // Outer border
        $sheet->getStyle("A1:{$lastCol}{$totalRows}")->applyFromArray([
            'borders' => ['outline' => ['borderStyle' => Border::BORDER_MEDIUM,
                                        'color'       => ['argb' => 'FF1E2A3A']]],
        ]);

        return [];
    }

    // ── Helper Methods ────────────────────────────────────────────────────

    protected function buildPeriodsWithMonthTotals(): array
    {
        $byMonth = [];

        $this->data->each(function ($item) use (&$byMonth) {
            $month = $this->monthKey($item);
            $key   = $this->periodKey($item);

            $byMonth[$month] = $byMonth[$month] ?? [];
            if (!isset($byMonth[$month][$key])) {
                $byMonth[$month][$key] = [
                    'key'      => $key,
                    'month'    => $month,
                    'week'     => $this->normalizeWeek($item->week),
                    'etd'      => $this->dateLabel($item->etd),
                    'eta'      => $this->shouldDisplayEta($item) ? $this->dateLabel($item->eta) : '',
                    'etd_raw'  => $item->etd,
                    'eta_raw'  => $item->eta,
                ];
            } elseif (empty($byMonth[$month][$key]['eta']) && $this->shouldDisplayEta($item)) {
                $byMonth[$month][$key]['eta'] = $this->dateLabel($item->eta);
                $byMonth[$month][$key]['eta_raw'] = $item->eta;
            }
        });

        $result = [];

        // Iterate through months in order
        ksort($byMonth);
        foreach (array_keys($byMonth) as $month) {
            $periodsInMonth = $byMonth[$month];
            $sorted = collect($periodsInMonth)->sortBy(function ($p) {
                return $p['etd_raw'] ?? '';
            })->values()->toArray();

            // Keep every actual period, then pad only when fewer than 5 columns.
            foreach ($sorted as $period) {
                $result[] = $period;
            }

            // Pad to 5 weeks if needed
            $weekCount = count($sorted);
            for ($w = $weekCount; $w < 5; $w++) {
                $result[] = [
                    'key'      => "pad|{$month}|".($w + 1),
                    'month'    => $month,
                    'week'     => $w + 1,
                    'etd'      => '',
                    'eta'      => '',
                    'etd_raw'  => '',
                    'eta_raw'  => '',
                ];
            }

            // Add TOT row for this month
            $result[] = [
                'key'      => "tot|{$month}",
                'month'    => $month,
                'week'     => 'TOT',
                'etd'      => '',
                'eta'      => '',
                'etd_raw'  => '',
                'eta_raw'  => '',
            ];
        }

        return $result;
    }

    private function monthKey($item): string
    {
        $date = $item->etd ?: ($item->eta ?: null);

        if ($date) {
            return substr((string) $date, 0, 7);
        }

        return (string) ($item->month ?: 'unknown');
    }

    private function periodKey($item): string
    {
        return (string) ($item->etd ?: '');
    }

    protected function normalizeWeek($week): string
    {
        if ($week === null || $week === '' || $week === 'TOT') {
            return (string)$week;
        }
        $match = preg_match('/\d+/', (string)$week, $m) ? $m[0] : $week;
        return (string)$match;
    }

    private function dateLabel($date): string
    {
        if (empty($date)) {
            return '';
        }

        $timestamp = strtotime((string) $date);
        return $timestamp ? date('n/j', $timestamp) : '';
    }

    private function shouldDisplayEta($item): bool
    {
        if (empty($item->eta)) {
            return false;
        }

        $extra = $item->extra ?? null;
        if (is_string($extra)) {
            $decoded = json_decode($extra, true);
            $extra = json_last_error() === JSON_ERROR_NONE ? $decoded : [];
        }

        return !is_array($extra) || (($extra['eta_fallback'] ?? false) !== true);
    }
}
