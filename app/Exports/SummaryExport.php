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

class SummaryExport implements FromArray, WithStyles, WithColumnWidths, WithCustomStartCell
{
    protected $data;

    // ── Fixed Left Columns ────────────────────────────────────────────────
    const COLOR_HEADER_FIXED    = 'FF1D4D2A'; // dark forest       → col A-C header rows 1-4
    const COLOR_LEFT_BG         = 'FF2D5A3D'; // slate green       → col A-C data rows
    const COLOR_LEFT_QTY_BG     = 'FF3A6B4E'; // muted green       → "QTY" label col

    // ── Period Header Sub-rows ────────────────────────────────────────────
    const COLOR_HEADER_ETD      = 'FF1D6F42'; // forest green      → ETD row
    const COLOR_HEADER_ETA      = 'FF2E9E5E'; // medium green      → ETA row
    const COLOR_HEADER_WEEK     = 'FF237A50'; // between ETD/ETA   → week row

    // ── Data Rows ─────────────────────────────────────────────────────────
    const COLOR_ROW_ODD         = 'FFEAF5EF'; // soft mint
    const COLOR_ROW_EVEN        = 'FFC6E8D4'; // powder green

    // ── Text ──────────────────────────────────────────────────────────────
    const COLOR_TEXT_WHITE      = 'FFFFFFFF';
    const COLOR_TEXT_MUTED      = 'FFAABFB0';
    const COLOR_TEXT_VALUE      = 'FF0D4F2C';
    const COLOR_TEXT_QTY_LABEL  = 'FFD4EDE0';

    // ── Borders ───────────────────────────────────────────────────────────
    const COLOR_BORDER_LIGHT    = 'FF8FC9A8';
    const COLOR_BORDER_HEADER   = 'FF145233';

    // ── FIRM / FORECAST group header colors ───────────────────────────────
    const COLOR_FIRM_HEADER     = 'FFFFFF00'; // yellow
    const COLOR_FORE_HEADER     = 'FFF4B183'; // orange

    // ── TOT Column ────────────────────────────────────────────────────────
    const COLOR_TOT_HEADER_BG   = 'FF5A8F75'; // muted green for TOT sub-header rows 2,3
    const COLOR_TOT_WEEK_BG     = 'FF2D5A3D'; // darker forest green for TOT week row
    const COLOR_TOT_DATA_ODD    = 'FFC6E8D4'; // powder green to match data odd
    const COLOR_TOT_DATA_EVEN   = 'FFB0D9C4'; // deeper powder green for harmony
    const COLOR_TOT_TEXT        = 'FF0D4F2C'; // dark green text matching VALUE color

    // ── GRAND TOTAL Row ───────────────────────────────────────────────────
    const COLOR_TOTAL_BG        = 'FF0F3320';
    const COLOR_TOTAL_BORDER    = 'FF2E7D52';
    const COLOR_TOTAL_TOP       = 'FF4CAF78';

    /** @var array Cached periods with month totals */
    private $_cachedPeriods = null;

    public function __construct($data)
    {
        $this->data = $data;
    }

    // ── 1. Array ──────────────────────────────────────────────────────────
    public function array(): array
    {
        $periods = $this->getPeriodsWithMonthTotals();
        $rows    = [];

        // ── Header Row 1: Group labels (FIRM / FORECAST per month group)
        $row1 = ['NO', 'ASSY NO', 'Order Type'];
        foreach ($periods as $period) {
            // All columns filled via merges in styles() for group headers
            $row1[] = '';
        }
        $rows[] = $row1;

        // ── Header Row 2: ETD / TOT
        $row2 = ['', '', 'ETD'];
        foreach ($periods as $period) {
            $row2[] = ($period['week'] === 'TOT') ? 'TOT' : $period['etd'];
        }
        $rows[] = $row2;

        // ── Header Row 3: ETA
        $row3 = ['', '', 'ETA'];
        foreach ($periods as $period) {
            $row3[] = ($period['week'] === 'TOT') ? '' : $period['eta'];
        }
        $rows[] = $row3;

        // ── Header Row 4: Week
        $row4 = ['', '', 'week'];
        foreach ($periods as $period) {
            $row4[] = ($period['week'] === 'TOT') ? '' : $period['week'];
        }
        $rows[] = $row4;

        // ── Data Rows
        $grouped = $this->data->groupBy('assy_number');
        $index   = 0;

        foreach ($grouped as $assyNumber => $items) {
            $index++;
            $dataRow = [$index, $assyNumber, 'QTY'];

            foreach ($periods as $period) {
                if ($period['week'] === 'TOT') {
                    // Monthly subtotal for this part
                    $monthKey = $period['month'];
                    $total    = 0;
                    foreach ($items as $item) {
                        $itemMonth = $item->month ?? date('Y-m', strtotime($item->eta));
                        if ($itemMonth === $monthKey) {
                            $total += (int)($item->qty ?? 0);
                        }
                    }
                    $dataRow[] = ($total === 0) ? '0' : $total;
                } else {
                    $key   = implode('|', [$period['etd_raw'], $period['eta_raw'], $period['week']]);
                    $total = 0;
                    foreach ($items as $item) {
                        $itemKey = implode('|', [$item->etd, $item->eta, $this->normalizeWeek($item->week)]);
                        if ($itemKey === $key) {
                            $total += (int)($item->qty ?? 0);
                        }
                    }
                    $dataRow[] = ($total === 0) ? '0' : $total;
                }
            }

            $rows[] = $dataRow;
        }

        // ── Grand Total Row
        $totalRow = ['', 'GRAND TOTAL', ''];
        foreach ($periods as $period) {
            if ($period['week'] === 'TOT') {
                $monthKey = $period['month'];
                $total    = 0;
                foreach ($this->data as $item) {
                    $itemMonth = $item->month ?? date('Y-m', strtotime($item->eta));
                    if ($itemMonth === $monthKey) {
                        $total += (int)($item->qty ?? 0);
                    }
                }
                $totalRow[] = ($total === 0) ? '0' : $total;
            } else {
                $key   = implode('|', [$period['etd_raw'], $period['eta_raw'], $period['week']]);
                $total = 0;
                foreach ($this->data as $item) {
                    $itemKey = implode('|', [$item->etd, $item->eta, $this->normalizeWeek($item->week)]);
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
        $widths  = ['A' => 5, 'B' => 16, 'C' => 10];
        $periods = $this->getPeriodsWithMonthTotals();

        foreach ($periods as $i => $period) {
            $col           = Coordinate::stringFromColumnIndex($i + 4);
            $widths[$col]  = ($period['week'] === 'TOT') ? 6 : 7;
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
        $periods      = $this->getPeriodsWithMonthTotals();
        $lastColIdx   = 3 + count($periods);
        $lastCol      = Coordinate::stringFromColumnIndex($lastColIdx);
        $totalRows    = $sheet->getHighestRow();
        $dataLastRow  = $totalRows - 1;

        // ── Row heights
        for ($r = 1; $r <= 4; $r++) {
            $sheet->getRowDimension($r)->setRowHeight(16);
        }
        for ($r = 5; $r <= $totalRows; $r++) {
            $sheet->getRowDimension($r)->setRowHeight(15);
        }

        // ── Freeze pane
        $sheet->freezePane('D5');

        // ── Merge fixed cols A-B across header rows
        $sheet->mergeCells('A1:A4');
        $sheet->mergeCells('B1:B4');

        // ── Build month-group metadata for merges & coloring
        // groups: [ ['type'=>'FIRM|FORECAST', 'month'=>'2025-02', 'startCol'=>4, 'endCol'=>9, 'totCol'=>9], ... ]
        $monthGroups = $this->buildMonthGroups($periods);

        // ── Row 1: Group header merges and colors
        foreach ($monthGroups as $group) {
            $startCol = Coordinate::stringFromColumnIndex($group['startCol']);
            $endCol   = Coordinate::stringFromColumnIndex($group['endCol']);

            if ($group['startCol'] <= $group['endCol']) {
                $sheet->mergeCells("{$startCol}1:{$endCol}1");
            }

            $groupLabel = $group['type'];
            $sheet->getCell("{$startCol}1")->setValue($groupLabel);

            $bgColor = ($group['type'] === 'FIRM')
                ? self::COLOR_FIRM_HEADER
                : self::COLOR_FORE_HEADER;

            $sheet->getStyle("{$startCol}1:{$endCol}1")->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgColor]],
                'font'      => ['bold' => true, 'color' => ['argb' => 'FF000000'], 'name' => 'Arial', 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::COLOR_BORDER_HEADER]]],
            ]);
        }

        // ── Fixed cols A-C header (rows 1-4)
        $sheet->getStyle('A1:C4')->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::COLOR_HEADER_FIXED]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE], 'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::COLOR_BORDER_HEADER]]],
        ]);

        // ── Set headers in column C (row 2-4) — labels that aren't set by data array
        $sheet->getCell('C2')->setValue('ETD');
        $sheet->getCell('C3')->setValue('ETA');
        $sheet->getCell('C4')->setValue('Week');

        // ── Period column headers (rows 2-4)
        foreach ($periods as $pIdx => $period) {
            $colIdx = 4 + $pIdx;
            $col    = Coordinate::stringFromColumnIndex($colIdx);
            $isTot  = ($period['week'] === 'TOT');

            // Row 2 — ETD
            $sheet->getStyle("{$col}2")->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $isTot ? self::COLOR_TOT_HEADER_BG : self::COLOR_HEADER_ETD]],
                'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE], 'name' => 'Arial', 'size' => 8],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::COLOR_BORDER_HEADER]]],
            ]);
            if (!$isTot) {
                $sheet->getCell("{$col}2")->setValue($period['etd']);
            }

            // Row 3 — ETA
            $sheet->getStyle("{$col}3")->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $isTot ? self::COLOR_TOT_HEADER_BG : self::COLOR_HEADER_ETA]],
                'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE], 'name' => 'Arial', 'size' => 8],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::COLOR_BORDER_HEADER]]],
            ]);
            if (!$isTot) {
                $sheet->getCell("{$col}3")->setValue($period['eta']);
            }

            // Row 4 — Week / TOT
            $weekVal = ($period['week'] === 'TOT') ? 'TOT' : ($period['week'] ?: '');
            $sheet->getCell("{$col}4")->setValue($weekVal);
            $sheet->getStyle("{$col}4")->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $isTot ? self::COLOR_TOT_WEEK_BG : self::COLOR_HEADER_WEEK]],
                'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE], 'name' => 'Arial', 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::COLOR_BORDER_HEADER]]],
            ]);

            // Merge rows 2-4 for TOT column (no ETD/ETA/WEEK content)
            if ($isTot) {
                $sheet->mergeCells("{$col}2:{$col}4");
            }
        }

        // ── Data rows — fixed left cols A-C
        for ($r = 5; $r <= $dataLastRow; $r++) {
            $sheet->getStyle("A{$r}:C{$r}")->applyFromArray([
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::COLOR_LEFT_BG]],
                'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE], 'name' => 'Arial', 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF334155']]],
            ]);

            // Assy number: left-aligned with indent
            $sheet->getStyle("B{$r}")->getAlignment()
                  ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                  ->setIndent(1);

            // QTY cell: lighter bg + smaller muted font
            $sheet->getStyle("C{$r}")->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::COLOR_LEFT_QTY_BG]],
                'font' => ['bold' => false, 'color' => ['argb' => self::COLOR_TEXT_QTY_LABEL], 'name' => 'Arial', 'size' => 8],
            ]);
        }

        // ── Data rows — period columns (alternating bg + TOT col differentiated)
        for ($r = 5; $r <= $dataLastRow; $r++) {
            $isOdd = ($r % 2 === 1);

            foreach ($periods as $pIdx => $period) {
                $colIdx    = 4 + $pIdx;
                $col       = Coordinate::stringFromColumnIndex($colIdx);
                $cellCoord = "{$col}{$r}";
                $isTot     = ($period['week'] === 'TOT');

                if ($isTot) {
                    $bgColor = $isOdd ? self::COLOR_TOT_DATA_ODD : self::COLOR_TOT_DATA_EVEN;
                    $sheet->getStyle($cellCoord)->applyFromArray([
                        'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgColor]],
                        'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TOT_TEXT], 'name' => 'Arial', 'size' => 9],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT, 'vertical' => Alignment::VERTICAL_CENTER],
                        'numberFormat' => ['formatCode' => '0'],
                        'borders'   => [
                            'allBorders' => ['borderStyle' => Border::BORDER_THIN,   'color' => ['argb' => 'FF5A8F75']],
                            'left'       => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF2D5A3D']],
                            'right'      => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF2D5A3D']],
                        ],
                    ]);
                } else {
                    $bgColor = $isOdd ? self::COLOR_ROW_ODD : self::COLOR_ROW_EVEN;
                    $sheet->getStyle($cellCoord)->applyFromArray([
                        'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bgColor]],
                        'font'      => ['name' => 'Arial', 'size' => 9, 'bold' => false],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT, 'vertical' => Alignment::VERTICAL_CENTER],
                        'numberFormat' => ['formatCode' => '0'],
                        'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => self::COLOR_BORDER_LIGHT]]],
                    ]);
                }

                // Zero / non-zero coloring
                $cellVal = $sheet->getCell($cellCoord)->getValue();
                if ($isTot) {
                    // TOT column always shows value prominently
                    // Zero values: muted green; non-zero: dark green
                    $fontColor = ($cellVal === 0 || $cellVal === '0') ? 'FF7AA68A' : self::COLOR_TOT_TEXT;
                    $sheet->getStyle($cellCoord)->getFont()->getColor()->setARGB($fontColor);
                    $sheet->getStyle($cellCoord)->getFont()->setBold($cellVal !== 0 && $cellVal !== '0');
                } else {
                    if ($cellVal === 0 || $cellVal === '0') {
                        $sheet->getStyle($cellCoord)->getFont()->getColor()->setARGB(self::COLOR_TEXT_MUTED);
                        $sheet->getStyle($cellCoord)->getFont()->setBold(false);
                    } else {
                        $sheet->getStyle($cellCoord)->getFont()
                              ->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color(self::COLOR_TEXT_VALUE));
                        $sheet->getStyle($cellCoord)->getFont()->setBold(true);
                    }
                }
            }
        }

        // ── GRAND TOTAL row
        $sheet->getStyle("A{$totalRows}:{$lastCol}{$totalRows}")->applyFromArray([
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => self::COLOR_TOTAL_BG]],
            'font'      => ['bold' => true, 'color' => ['argb' => self::COLOR_TEXT_WHITE], 'name' => 'Arial', 'size' => 9],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT, 'vertical' => Alignment::VERTICAL_CENTER],
            'numberFormat' => ['formatCode' => '0'],
            'borders'   => [
                'top'        => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => self::COLOR_TOTAL_TOP]],
                'bottom'     => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => self::COLOR_TOTAL_BG]],
                'allBorders' => ['borderStyle' => Border::BORDER_THIN,   'color' => ['argb' => self::COLOR_TOTAL_BORDER]],
            ],
        ]);

        // Grand total label: left-aligned
        $sheet->getStyle("B{$totalRows}")->getAlignment()
              ->setHorizontal(Alignment::HORIZONTAL_LEFT)
              ->setIndent(1);

        // ── Outer border
        $sheet->getStyle("A1:{$lastCol}{$totalRows}")->applyFromArray([
            'borders' => ['outline' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF1E2A3A']]],
        ]);

        return [];
    }

    // ── Helper: cached periods ────────────────────────────────────────────
    protected function getPeriodsWithMonthTotals(): array
    {
        if ($this->_cachedPeriods !== null) {
            return $this->_cachedPeriods;
        }

        // 1. Group unique periods by (order_type → month)
        $byTypeMonth = []; // ['FIRM' => ['2025-02' => [...periods...]], 'FORECAST' => [...]]

        foreach ($this->data as $item) {
            $type  = $item->order_type ?? 'FORECAST';
            $month = $item->month ?? date('Y-m', strtotime($item->eta));
            $week  = $this->normalizeWeek($item->week);
            $key   = implode('|', [$item->etd, $item->eta, $week]);

            $byTypeMonth[$type][$month][$key] = [
                'etd'     => date('n/j', strtotime($item->etd)),
                'eta'     => date('n/j', strtotime($item->eta)),
                'week'    => $week,
                'etd_raw' => $item->etd,
                'eta_raw' => $item->eta,
                'month'   => $month,
                'type'    => $type,
            ];
        }

        // Sort types: FIRM first, FORECAST after
        $sortedTypes = array_filter(['FIRM', 'FORECAST'], fn($t) => isset($byTypeMonth[$t]));

        $result = [];

        foreach ($sortedTypes as $type) {
            $months = $byTypeMonth[$type];
            ksort($months); // sort months chronologically

            foreach ($months as $month => $periods) {
                // Sort weeks inside month by ETD date
                usort($periods, fn($a, $b) => strcmp($a['etd_raw'], $b['etd_raw']));

                // Keep every actual ETD/ETA period. Fill later slots so the sheet
                // still has the customer-specific monthly shape.
                $weekCount = 0;
                foreach ($periods as $period) {
                    $result[]  = $period;
                    $weekCount++;
                }
                while ($weekCount < $this->periodsPerMonth()) {
                    $weekNum = $weekCount + 1;
                    $result[] = [
                        'week'    => $weekNum,
                        'month'   => $month,
                        'type'    => $type,
                        'etd'     => '',
                        'eta'     => '',
                        'etd_raw' => '',
                        'eta_raw' => '',
                    ];
                    $weekCount++;
                }

                // TOT column after the weeks of this month
                $result[] = [
                    'week'    => 'TOT',
                    'month'   => $month,
                    'type'    => $type,
                    'etd'     => '',
                    'eta'     => '',
                    'etd_raw' => '',
                    'eta_raw' => '',
                ];
            }
        }

        $this->_cachedPeriods = $result;
        return $result;
    }

    // ── Helper: build month groups for Row-1 merges ───────────────────────
    /**
     * Returns array of groups, each group spanning one (type, month) block:
     * ['type' => 'FIRM', 'month' => '2025-02', 'startCol' => 4, 'endCol' => 9]
     */
    private function normalizeWeek($week)
    {
        if ($week === null || $week === '') {
            return '';
        }

        if ($week === 'TOT') {
            return 'TOT';
        }

        if (is_numeric($week)) {
            return (int) $week;
        }

        if (preg_match('/\d+/', (string) $week, $matches)) {
            return (int) $matches[0];
        }

        return $week;
    }

    protected function periodsPerMonth(): int
    {
        return 5;
    }

    protected function buildMonthGroups(array $periods): array
    {
        $groups      = [];
        $currentGroup = null;

        foreach ($periods as $pIdx => $period) {
            $colIdx  = 4 + $pIdx;
            $groupKey = ($period['type'] ?? 'FORECAST') . '|' . $period['month'];

            if ($currentGroup === null || $currentGroup['key'] !== $groupKey) {
                if ($currentGroup !== null) {
                    $groups[] = $currentGroup;
                }
                $currentGroup = [
                    'key'      => $groupKey,
                    'type'     => $period['type'] ?? 'FORECAST',
                    'month'    => $period['month'],
                    'startCol' => $colIdx,
                    'endCol'   => $colIdx,
                ];
            } else {
                $currentGroup['endCol'] = $colIdx;
            }
        }

        if ($currentGroup !== null) {
            $groups[] = $currentGroup;
        }

        return $groups;
    }
}
