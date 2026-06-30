<?php

namespace App\Services\Utilities;

use App\Models\ProductionWeek;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class ProductionWeekService
{
    private const MONTH_NAMES = [
        1 => 'JAN',
        2 => 'FEB',
        3 => 'MAR',
        4 => 'APR',
        5 => 'MAY',
        6 => 'JUN',
        7 => 'JUL',
        8 => 'AUG',
        9 => 'SEP',
        10 => 'OCT',
        11 => 'NOV',
        12 => 'DEC',
    ];

    public function paginateMonths(array $filters): LengthAwarePaginator
    {
        $query = ProductionWeek::query()
            ->when(
                ($filters['customer_id'] ?? '') !== '',
                fn ($q) => $filters['customer_id'] === 'global'
                    ? $q->whereNull('customer_id')
                    : $q->where('customer_id', $filters['customer_id'])
            )
            ->when($filters['year'] ?? null, fn ($q, $year) => $q->where('year', $year))
            ->when($filters['month_number'] ?? null, fn ($q, $monthNumber) => $q->where('month_number', $monthNumber))
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($subQuery) use ($search) {
                    $subQuery->where('month_name', 'like', "%{$search}%")
                        ->orWhere('year', 'like', "%{$search}%");
                });
            });

        $months = $query
            ->selectRaw(
                'customer_id, year, month_number, month_name, MIN(week_start) as start_date, '.
                'MAX(end_date) as end_date, COUNT(*) as total_weeks, SUM(total_working_days) as total_working_days'
            )
            ->groupBy('customer_id', 'year', 'month_number', 'month_name')
            ->orderBy('year', 'desc')
            ->orderBy('month_number')
            ->paginate(15)
            ->withQueryString();

        $months->setCollection(
            $months->getCollection()->map(fn ($month) => $this->formatMonthRow($month))
        );

        return $months;
    }

    public function createMonth(array $data): void
    {
        $customerId = $this->normalizeCustomerId($data['customer_id'] ?? null);
        $monthNumber = (int) $data['month_number'];

        if ($this->monthQuery((int) $data['year'], $monthNumber, $customerId)->exists()) {
            throw new \DomainException('Production week untuk bulan tersebut sudah ada.');
        }

        $startDate = isset($data['start_date']) && !empty($data['start_date']) ? Carbon::parse($data['start_date'])->startOfDay() : null;
        $endDate = isset($data['end_date']) && !empty($data['end_date']) ? Carbon::parse($data['end_date'])->startOfDay() : null;
        $totalWeeks = isset($data['num_weeks']) && !empty($data['num_weeks']) ? (int) $data['num_weeks'] : null;

        if (!$startDate || !$endDate || !$totalWeeks) {
            [$startDate, $endDate, $totalWeeks] = $this->productionMonthRange((int) $data['year'], $monthNumber);
        }

        $this->ensureEndDateCoversWeeks($startDate, $endDate, $totalWeeks);

        $this->checkOverlap($startDate, $endDate, $customerId);

        DB::transaction(function () use ($data, $customerId, $monthNumber, $startDate, $endDate, $totalWeeks) {
            $this->upsertWeeks(
                collect(),
                [
                    'customer_id' => $customerId,
                    'year' => (int) $data['year'],
                    'month_number' => $monthNumber,
                    'month_name' => self::MONTH_NAMES[$monthNumber],
                    'working_days' => $data['working_days'] ?? [],
                ],
                $startDate,
                $endDate,
                $totalWeeks
            );
        });
    }

    public function monthSummary(array $data): array
    {
        $query = $this->monthQuery(
            (int) $data['year'],
            (int) $data['month'],
            $this->normalizeCustomerId($data['customer_id'] ?? null)
        );

        $productionWeek = (clone $query)->orderBy('week_no')->firstOrFail();
        $totalWeeks = (clone $query)->count();

        return [
            'customer_id' => $productionWeek->customer_id,
            'year' => $productionWeek->year,
            'month_number' => $productionWeek->month_number,
            'month_name' => $productionWeek->month_name,
            'start_date' => (clone $query)->min('week_start'),
            'end_date' => Carbon::parse((clone $query)->max('end_date'))->toDateString(),
            'total_weeks' => (int) $totalWeeks,
            'num_weeks' => (int) $totalWeeks,
            'total_working_days' => (int) (clone $query)->sum('total_working_days'),
            'weeks' => (clone $query)->orderBy('week_no')->get()->map(fn ($week) => [
                'week_no' => (int) $week->week_no,
                'week_start' => $week->week_start?->toDateString(),
                'end_date' => $week->end_date?->toDateString(),
                'working_days' => $week->working_days ?? [],
                'total_working_days' => (int) $week->total_working_days,
            ])->values(),
        ];
    }

    public function updateMonth(array $data, array $target): bool
    {
        $query = $this->monthQuery(
            (int) $target['year'],
            (int) $target['month'],
            $this->normalizeCustomerId($target['customer_id'] ?? null)
        );

        $weeks = (clone $query)->orderBy('week_no')->get();

        if ($weeks->isEmpty()) {
            return false;
        }

        $startDate = isset($data['start_date']) && !empty($data['start_date']) ? Carbon::parse($data['start_date'])->startOfDay() : null;
        $endDate = isset($data['end_date']) && !empty($data['end_date']) ? Carbon::parse($data['end_date'])->startOfDay() : null;
        $totalWeeks = isset($data['num_weeks']) && !empty($data['num_weeks']) ? (int) $data['num_weeks'] : null;

        if (!$startDate || !$endDate || !$totalWeeks) {
            [$startDate, $endDate, $totalWeeks] = $this->productionMonthRange(
                (int) $data['year'],
                (int) $data['month_number']
            );
        }

        $this->ensureEndDateCoversWeeks($startDate, $endDate, $totalWeeks);
        $this->ensureWeeksCanBeRemoved($weeks, $totalWeeks);
        $this->ensureTargetMonthIsAvailable($data, $weeks->pluck('id'));

        $customerId = $this->normalizeCustomerId($data['customer_id'] ?? null);
        $this->checkOverlap($startDate, $endDate, $customerId, $weeks->pluck('id')->toArray());

        DB::transaction(function () use ($weeks, $data, $startDate, $endDate, $totalWeeks) {
            $weeksToRemove = $weeks->filter(fn ($week) => (int) $week->week_no > $totalWeeks);
            $weeksToRemove->each->delete();

            $this->upsertWeeks(
                $weeks->reject(fn ($week) => (int) $week->week_no > $totalWeeks)->keyBy('week_no'),
                [
                    'customer_id' => $this->normalizeCustomerId($data['customer_id'] ?? null),
                    'year' => (int) $data['year'],
                    'month_number' => (int) $data['month_number'],
                    'month_name' => $data['month_name'],
                    'working_days' => $data['working_days'] ?? [],
                ],
                $startDate,
                $endDate,
                $totalWeeks
            );
        });

        return true;
    }

    public function deleteMonth(array $data): bool
    {
        $query = $this->monthQuery(
            (int) $data['year'],
            (int) $data['month'],
            $this->normalizeCustomerId($data['customer_id'] ?? null)
        );

        if ((clone $query)->whereHas('etdMappings')->exists()) {
            return false;
        }

        $query->delete();

        return true;
    }

    public function import(UploadedFile $file, mixed $customerId, ?string $sheetName = null): array
    {
        $workbook = IOFactory::load($file->getPathname());
        $worksheet = $sheetName ? $workbook->getSheetByName($sheetName) : $workbook->getActiveSheet();

        if (! $worksheet) {
            throw new \DomainException('Sheet tidak ditemukan.');
        }

        [$headerRowIndex, $rows] = $this->productionWeekDataRows($worksheet->toArray());

        $result = [
            'success_count' => 0,
            'error_count' => 0,
            'errors' => [],
        ];

        foreach ($rows as $rowIndex => $row) {
            if (empty(array_filter($row))) {
                continue;
            }

            try {
                $data = $this->parseImportRow($row, $rowIndex);

                if ($this->monthQuery($data['year'], $data['month_number'], $customerId)->exists()) {
                    $this->addImportError($result, $headerRowIndex + $rowIndex, "Duplicate entry for {$data['month_name']} {$data['year']}");

                    continue;
                }

                $this->checkOverlap($data['start_date'], $data['end_date'], $customerId);

                $this->createImportedMonth($data, $customerId);
                $result['success_count'] += $data['num_weeks'];
            } catch (ValidationException $exception) {
                $this->addImportError($result, $headerRowIndex + $rowIndex, collect($exception->errors())->flatten()->first());
            } catch (\Throwable $exception) {
                $this->addImportError($result, $headerRowIndex + $rowIndex, $exception->getMessage());
            }
        }

        return $result;
    }

    public function createTemplate(string $templatePath): void
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        $sheet->setCellValue('A1', 'TEMPLATE IMPORT MASTER WEEK');
        $sheet->mergeCells('A1:F1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->fromArray([
            ['Month', 'Range (Start ~ End)', 'Year', 'Total Weeks', 'Holiday Dates', 'Extra Working Dates'],
            ['JAN', '05/JAN ~ 30/JAN', '2026', '4'],
            ['FEB', '02/FEB ~ 27/FEB', '2026', '4'],
            ['MAR', '02/MAR ~ 31/MAR', '2026', '4'],
        ], null, 'A3');

        $sheet->getStyle('A3:F3')->applyFromArray($this->templateHeaderStyle());
        $sheet->getStyle('A4:F13')->applyFromArray($this->templateBorderStyle());
        $sheet->getStyle('A4:F13')
            ->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_LEFT)
            ->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getStyle('E4:F1000')
            ->getNumberFormat()
            ->setFormatCode(NumberFormat::FORMAT_TEXT);
        $sheet->setCellValueExplicit('E4', '16/JAN', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('F4', '', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('E5', '16/FEB, 17/FEB', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('F5', '21/FEB', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('E6', '19/MAR, 20/MAR, 23/MAR, 24/MAR, 25/MAR, 26/MAR', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('F6', '28/MAR', DataType::TYPE_STRING);
        $sheet->freezePane('A4');
        $sheet->setAutoFilter('A3:F3');

        $widths = [
            'A' => 14,
            'B' => 28,
            'C' => 12,
            'D' => 18,
            'E' => 28,
            'F' => 32,
        ];

        foreach ($widths as $column => $width) {
            $sheet->getColumnDimension($column)->setWidth($width);
        }

        (new Xlsx($spreadsheet))->save($templatePath);
    }

    private function templateHeaderStyle(): array
    {
        return [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1D6F42'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC'],
                ],
            ],
        ];
    }

    private function templateBorderStyle(): array
    {
        return [
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC'],
                ],
            ],
        ];
    }

    public function resolveMonthlyEndDate($storedEndDate, int $year, int $monthNumber): string
    {
        $calendarEndDate = Carbon::createFromDate($year, $monthNumber, 1)->endOfMonth();

        if (empty($storedEndDate)) {
            return $calendarEndDate->toDateString();
        }

        $endDate = $storedEndDate instanceof Carbon
            ? $storedEndDate->copy()
            : Carbon::parse($storedEndDate);

        return $endDate->lte($calendarEndDate)
            ? $endDate->toDateString()
            : $calendarEndDate->toDateString();
    }

    private function formatMonthRow($month): array
    {
        return [
            'customer_id' => $month->customer_id,
            'year' => (int) $month->year,
            'month_number' => (int) $month->month_number,
            'month_name' => $month->month_name,
            'start_date' => Carbon::parse($month->start_date)->toDateString(),
            'end_date' => Carbon::parse($month->end_date)->toDateString(),
            'total_weeks' => (int) $month->total_weeks,
            'total_working_days' => (int) $month->total_working_days,
        ];
    }

    private function parseImportRow(array $row, int $rowIndex): array
    {
        $monthName = trim(strtoupper($row[0] ?? ''));
        $rangeText = trim($row[1] ?? '');
        $year = (int) trim($row[2] ?? '');
        $totalWeeks = (int) trim($row[3] ?? '');
        $holidayText = $row[4] ?? '';
        $extraWorkingText = $row[5] ?? '';

        if (empty($monthName) || empty($rangeText) || empty($year) || empty($totalWeeks)) {
            throw ValidationException::withMessages(['row' => 'Missing required data']);
        }

        $monthNumber = array_search($monthName, self::MONTH_NAMES, true);

        if (! $monthNumber) {
            throw ValidationException::withMessages(['month' => "Invalid month '{$monthName}'"]);
        }

        preg_match('/^(\d{1,2})\/([A-Z]{3})\s*~\s*(\d{1,2})\/([A-Z]{3})(?:\s*\((\d+)\))?$/', strtoupper($rangeText), $matches);

        if (empty($matches)) {
            throw ValidationException::withMessages(['range' => "Invalid range format '{$rangeText}'"]);
        }

        $startMonth = array_search($matches[2], self::MONTH_NAMES, true);
        $endMonth = array_search($matches[4], self::MONTH_NAMES, true);
        $rangeWeeks = isset($matches[5]) ? (int) $matches[5] : null;

        if (! $startMonth || ! $endMonth) {
            throw ValidationException::withMessages(['range' => 'Invalid month in range']);
        }

        if ($totalWeeks < 3 || $totalWeeks > 5) {
            throw ValidationException::withMessages(['num_weeks' => 'Total weeks must be 3, 4, or 5']);
        }

        if ($rangeWeeks !== null && $rangeWeeks !== $totalWeeks) {
            throw ValidationException::withMessages(['num_weeks' => 'Total weeks does not match range text']);
        }

        $startDate = Carbon::parse("{$year}-{$startMonth}-{$matches[1]}")->startOfDay();
        $endDate = Carbon::parse("{$year}-{$endMonth}-{$matches[3]}")->startOfDay();

        $this->ensureEndDateCoversWeeks($startDate, $endDate, $totalWeeks);
        $workingDays = $this->buildImportedWorkingDays(
            $startDate,
            $endDate,
            $totalWeeks,
            $this->parseImportDates($holidayText, $year),
            $this->parseImportDates($extraWorkingText, $year)
        );

        return [
            'year' => $year,
            'month_number' => (int) $monthNumber,
            'month_name' => $monthName,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'num_weeks' => $totalWeeks,
            'working_days' => $workingDays,
        ];
    }

    private function productionWeekDataRows(array $rows): array
    {
        foreach ($rows as $index => $row) {
            $headers = array_map(fn ($value) => strtolower(trim((string) $value)), $row);

            if (
                in_array('month', $headers, true)
                && in_array('year', $headers, true)
                && in_array('total weeks', $headers, true)
            ) {
                return [$index, array_slice($rows, $index + 1)];
            }
        }

        throw new \DomainException('Header Excel tidak ditemukan. Pastikan ada kolom Month, Year, dan Total Weeks.');
    }

    private function createImportedMonth(array $data, mixed $customerId): void
    {
        DB::transaction(function () use ($data, $customerId) {
            $this->upsertWeeks(
                collect(),
                [
                    'customer_id' => $this->normalizeCustomerId($customerId),
                    'year' => $data['year'],
                    'month_number' => $data['month_number'],
                    'month_name' => $data['month_name'],
                    'working_days' => $data['working_days'] ?? [],
                ],
                $data['start_date'],
                $data['end_date'],
                $data['num_weeks']
            );
        });
    }

    private function upsertWeeks(Collection $existingWeeks, array $basePayload, Carbon $startDate, Carbon $endDate, int $totalWeeks): void
    {
        $workingDaysByWeek = collect($basePayload['working_days'] ?? []);
        unset($basePayload['working_days']);

        for ($weekNo = 1; $weekNo <= $totalWeeks; $weekNo++) {
            $weekStart = $startDate->copy()->addWeeks($weekNo - 1);
            $weekEnd = $weekNo === $totalWeeks
                ? $endDate->copy()
                : $weekStart->copy()->addDays(6);
            $hasSelectedWorkingDays = $workingDaysByWeek->has($weekNo) || $workingDaysByWeek->has((string) $weekNo);
            $workingDays = $this->normalizeWorkingDays(
                $hasSelectedWorkingDays
                    ? ($workingDaysByWeek->get($weekNo) ?? $workingDaysByWeek->get((string) $weekNo))
                    : null,
                $weekStart,
                $weekEnd
            );

            $payload = array_merge($basePayload, [
                'week_no' => $weekNo,
                'week_start' => $weekStart->toDateString(),
                'end_date' => $weekEnd->toDateString(),
                'working_days' => $workingDays,
                'total_working_days' => count($workingDays),
                'num_weeks' => $totalWeeks,
            ]);

            $week = $existingWeeks->get($weekNo);

            $week ? $week->update($payload) : ProductionWeek::create($payload);
        }
    }

    private function productionMonthRange(int $year, int $monthNumber): array
    {
        $startDate = $this->productionMonthStart($year, $monthNumber);
        $nextMonthStart = Carbon::createFromDate($year, $monthNumber, 1)
            ->addMonthNoOverflow()
            ->startOfDay();
        $nextMonthStart = $this->productionMonthStart((int) $nextMonthStart->year, (int) $nextMonthStart->month);

        $endDate = $nextMonthStart->copy()->subDay();
        $totalWeeks = intdiv($startDate->diffInDays($endDate), 7) + 1;

        return [$startDate, $endDate, $totalWeeks];
    }

    private function productionMonthStart(int $year, int $monthNumber): Carbon
    {
        $firstOfMonth = Carbon::createFromDate($year, $monthNumber, 1)->startOfDay();
        $startDate = $firstOfMonth->copy()->startOfWeek(Carbon::MONDAY);

        if ($startDate->month !== $monthNumber) {
            $previousMonthRemainingDays = $startDate->daysInMonth - $startDate->day + 1;

            if ($previousMonthRemainingDays > 1) {
                $startDate->addWeek();
            }
        }

        return $startDate;
    }

    private function ensureEndDateCoversWeeks(Carbon $startDate, Carbon $endDate, int $totalWeeks): void
    {
        $lastWeekStart = $startDate->copy()->addWeeks($totalWeeks - 1);

        if ($endDate->lt($lastWeekStart)) {
            throw ValidationException::withMessages([
                'end_date' => "End date minimal {$lastWeekStart->toDateString()} untuk {$totalWeeks} week.",
            ]);
        }
    }

    private function checkOverlap(Carbon $startDate, Carbon $endDate, mixed $customerId, array $ignoreWeekIds = []): void
    {
        $customerId = $this->normalizeCustomerId($customerId);

        $overlappingWeek = ProductionWeek::query()
            ->when(
                $customerId !== null,
                fn ($query) => $query->where('customer_id', $customerId),
                fn ($query) => $query->whereNull('customer_id')
            )
            ->where(function ($query) use ($startDate, $endDate) {
                $query->where('week_start', '<=', $endDate->toDateString())
                      ->where('end_date', '>=', $startDate->toDateString());
            })
            ->when(!empty($ignoreWeekIds), fn ($query) => $query->whereNotIn('id', $ignoreWeekIds))
            ->first();

        if ($overlappingWeek) {
            $customerName = 'Global';
            if ($customerId) {
                $customer = \App\Models\Customer::find($customerId);
                $customerName = $customer ? $customer->name : "Customer ID {$customerId}";
            }
            throw new \DomainException(
                "Rentang tanggal ({$startDate->toDateString()} s.d {$endDate->toDateString()}) tumpang tindih (overlap) dengan minggu produksi yang sudah ada ({$overlappingWeek->week_start->toDateString()} s.d {$overlappingWeek->end_date->toDateString()}) untuk customer: {$customerName}."
            );
        }
    }

    private function normalizeWorkingDays(mixed $selectedDays, Carbon $weekStart, Carbon $weekEnd): array
    {
        $days = is_array($selectedDays)
            ? $selectedDays
            : $this->defaultWorkingDays($weekStart, $weekEnd);

        $start = $weekStart->copy()->startOfDay();
        $end = $weekEnd->copy()->startOfDay();

        return collect($days)
            ->filter()
            ->map(fn ($date) => Carbon::parse($date)->toDateString())
            ->unique()
            ->filter(function ($date) use ($start, $end) {
                $carbonDate = Carbon::parse($date)->startOfDay();

                return $carbonDate->betweenIncluded($start, $end);
            })
            ->sort()
            ->values()
            ->all();
    }

    private function defaultWorkingDays(Carbon $weekStart, Carbon $weekEnd): array
    {
        $days = [];
        $date = $weekStart->copy()->startOfDay();
        $end = $weekEnd->copy()->startOfDay();

        while ($date->lte($end)) {
            if ($date->isWeekday()) {
                $days[] = $date->toDateString();
            }

            $date->addDay();
        }

        return $days;
    }

    private function buildImportedWorkingDays(Carbon $startDate, Carbon $endDate, int $totalWeeks, array $holidayDates, array $extraWorkingDates): array
    {
        $workingDays = [];

        for ($weekNo = 1; $weekNo <= $totalWeeks; $weekNo++) {
            $weekStart = $startDate->copy()->addWeeks($weekNo - 1);
            $weekEnd = $weekNo === $totalWeeks
                ? $endDate->copy()
                : $weekStart->copy()->addDays(6);

            $workingDays[$weekNo] = $this->defaultWorkingDays($weekStart, $weekEnd);
        }

        foreach ($holidayDates as $holidayDate) {
            $weekNo = $this->weekNoForDate($holidayDate, $startDate, $endDate, $totalWeeks);

            if ($weekNo !== null) {
                $workingDays[$weekNo] = array_values(array_diff($workingDays[$weekNo], [$holidayDate]));
            }
        }

        foreach ($extraWorkingDates as $extraWorkingDate) {
            $weekNo = $this->weekNoForDate($extraWorkingDate, $startDate, $endDate, $totalWeeks);

            if ($weekNo !== null && ! in_array($extraWorkingDate, $workingDays[$weekNo], true)) {
                $workingDays[$weekNo][] = $extraWorkingDate;
                sort($workingDays[$weekNo]);
            }
        }

        return $workingDays;
    }

    private function parseImportDates(mixed $value, int $defaultYear): array
    {
        if ($value instanceof \DateTimeInterface) {
            return [Carbon::instance($value)->toDateString()];
        }

        if (is_int($value) || is_float($value)) {
            return [Carbon::instance(ExcelDate::excelToDateTimeObject((float) $value))->toDateString()];
        }

        $text = trim((string) $value);

        if ($text === '') {
            return [];
        }

        preg_match_all('/(\d{1,2})[\/-]([A-Z]{3})(?:[\/-](\d{4}))?/i', strtoupper($text), $matches, PREG_SET_ORDER);

        return collect($matches)
            ->map(function ($match) use ($defaultYear) {
                $monthNumber = array_search($match[2], self::MONTH_NAMES, true);

                if (! $monthNumber) {
                    return null;
                }

                $year = isset($match[3]) && $match[3] !== '' ? (int) $match[3] : $defaultYear;

                return Carbon::parse("{$year}-{$monthNumber}-{$match[1]}")->toDateString();
            })
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function weekNoForDate(string $date, Carbon $startDate, Carbon $endDate, int $totalWeeks): ?int
    {
        $carbonDate = Carbon::parse($date)->startOfDay();

        if (! $carbonDate->betweenIncluded($startDate, $endDate)) {
            return null;
        }

        $weekNo = intdiv((int) $startDate->diffInDays($carbonDate), 7) + 1;

        return $weekNo >= 1 && $weekNo <= $totalWeeks ? $weekNo : null;
    }

    private function ensureWeeksCanBeRemoved(Collection $weeks, int $totalWeeks): void
    {
        $weeksToRemove = $weeks->filter(fn ($week) => (int) $week->week_no > $totalWeeks);

        if ($weeksToRemove->isNotEmpty() && $weeksToRemove->contains(fn ($week) => $week->etdMappings()->exists())) {
            throw new \DomainException('Jumlah week tidak bisa dikurangi karena week yang akan dihapus masih dipakai di ETD Mapping.');
        }
    }

    private function ensureTargetMonthIsAvailable(array $data, Collection $ignoredWeekIds): void
    {
        $exists = $this->monthQuery(
            (int) $data['year'],
            (int) $data['month_number'],
            $this->normalizeCustomerId($data['customer_id'] ?? null)
        )
            ->whereNotIn('id', $ignoredWeekIds)
            ->exists();

        if ($exists) {
            throw new \DomainException('Production week tujuan sudah ada.');
        }
    }

    private function monthQuery(int $year, int $monthNumber, mixed $customerId): Builder
    {
        $customerId = $this->normalizeCustomerId($customerId);

        return ProductionWeek::query()
            ->where('year', $year)
            ->where('month_number', $monthNumber)
            ->when(
                $customerId !== null,
                fn ($query) => $query->where('customer_id', $customerId),
                fn ($query) => $query->whereNull('customer_id')
            );
    }

    private function normalizeCustomerId(mixed $customerId): ?int
    {
        return $customerId === null || $customerId === '' ? null : (int) $customerId;
    }

    private function addImportError(array &$result, int $rowIndex, ?string $message): void
    {
        $result['error_count']++;
        $result['errors'][] = 'Row '.($rowIndex + 2).': '.($message ?: 'Invalid row');
    }
}
