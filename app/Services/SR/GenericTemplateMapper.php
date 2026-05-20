<?php

namespace App\Services\SR;

use App\Models\Customer;
use App\Models\SRMappingTemplate;
use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class GenericTemplateMapper implements SRMapperInterface
{
    public function __construct(
        private SRMappingTemplate $template,
        private Customer $customer
    ) {
    }

    public function map(array $sheet): array
    {
        return $this->template->orientation === 'horizontal'
            ? $this->mapHorizontal($sheet)
            : $this->mapVertical($sheet);
    }

    private function mapVertical(array $sheet): array
    {
        $qtyCol = $this->requiredColumn('qty_column');
        $etdCol = $this->requiredColumn('etd_column');
        $assyCol = $this->requiredColumn('assy_number_column');
        $records = [];

        foreach ($this->dataRows($sheet) as $rowIndex => $row) {
            $assyNumber = $this->stringAt($row, $assyCol);
            if ($this->shouldSkipAssyNumber($assyNumber)) {
                continue;
            }

            $qty = $this->quantityAt($row, $qtyCol);
            if ($qty === null || $qty <= 0) {
                continue;
            }

            $etd = $this->dateAt($row, $etdCol);
            if ($etd === null) {
                continue;
            }

            $eta = $this->optionalColumnValue($row, 'eta_column', 'date') ?? $etd;
            $records[] = $this->record($row, $rowIndex, $assyNumber, $qty, $etd, $eta);
        }

        return $this->ensureRecords($records);
    }

    private function mapHorizontal(array $sheet): array
    {
        $assyCol = $this->requiredColumn('assy_number_column');
        $qtyStartCol = $this->requiredColumn('qty_start_column');
        $qtyEndCol = $this->requiredColumn('qty_end_column');
        $dateHeaderIndex = max(0, (int) ($this->template->date_header_row ?? $this->template->header_row ?? 1) - 1);
        $dateHeaderRow = $sheet[$dateHeaderIndex] ?? [];
        $records = [];

        foreach ($this->dataRows($sheet) as $rowIndex => $row) {
            $assyNumber = $this->stringAt($row, $assyCol);
            if ($this->shouldSkipAssyNumber($assyNumber)) {
                continue;
            }

            for ($col = $qtyStartCol; $col <= $qtyEndCol; $col++) {
                $qty = $this->quantityAt($row, $col);
                if ($qty === null || $qty <= 0) {
                    continue;
                }

                $etd = $this->parseDate($dateHeaderRow[$col] ?? null);
                if ($etd === null) {
                    continue;
                }

                $records[] = $this->record($row, $rowIndex, $assyNumber, $qty, $etd, $etd, [
                    'qty_column' => Coordinate::stringFromColumnIndex($col + 1),
                    'date_header_row' => $dateHeaderIndex + 1,
                ]);
            }
        }

        return $this->ensureRecords($records);
    }

    private function record(array $row, int $rowIndex, string $assyNumber, int $qty, Carbon $etd, Carbon $eta, array $extra = []): array
    {
        $orderType = $this->optionalColumnValue($row, 'order_type_column')
            ?? $this->template->default_order_type
            ?? 'FORECAST';

        $month = $this->optionalColumnValue($row, 'month_column') ?? strtoupper($etd->shortMonthName);
        $year = $this->optionalColumnValue($row, 'year_column') ?? $etd->year;

        return [
            'customer'      => $this->customer->code,
            'source_file'   => null,
            'assy_number'   => $assyNumber,
            'qty'           => $qty,
            'total'         => $qty,
            'delivery_date' => $eta->toDateString(),
            'eta'           => $eta->toDateString(),
            'etd'           => $etd->toDateString(),
            'week'          => $this->optionalColumnValue($row, 'week_column') ?? (string) ceil($etd->day / 7),
            'month'         => is_string($month) ? strtoupper($month) : $month,
            'year'          => $year,
            'order_type'    => strtoupper(trim((string) $orderType)),
            'model'         => $this->optionalColumnValue($row, 'model_column'),
            'family'        => $this->optionalColumnValue($row, 'family_column'),
            'route'         => null,
            'port'          => $this->optionalColumnValue($row, 'port_column'),
            'extra'         => json_encode(array_merge([
                'template_id' => $this->template->id,
                'template_name' => $this->template->name,
                'row' => $rowIndex + 1,
            ], $extra)),
        ];
    }

    private function dataRows(array $sheet): array
    {
        return array_slice($sheet, max(0, $this->template->data_start_row - 1), null, true);
    }

    private function ensureRecords(array $records): array
    {
        if (empty($records)) {
            throw new \Exception('Template SR tidak menghasilkan data. Cek baris awal, kolom assy number, qty, dan tanggal.');
        }

        return $records;
    }

    private function requiredColumn(string $field): int
    {
        $value = $this->template->{$field};
        if (!$value) {
            throw new \Exception("Template SR belum mengisi {$field}.");
        }

        return $this->columnIndex($value);
    }

    private function optionalColumnValue(array $row, string $field, string $type = 'string'): mixed
    {
        $column = $this->template->{$field};
        if (!$column) {
            return null;
        }

        $value = $row[$this->columnIndex($column)] ?? null;

        return $type === 'date' ? $this->parseDate($value) : $this->cleanString($value);
    }

    private function dateAt(array $row, int $column): ?Carbon
    {
        return $this->parseDate($row[$column] ?? null);
    }

    private function quantityAt(array $row, int $column): ?int
    {
        $value = $row[$column] ?? null;
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        $cleaned = preg_replace('/[^0-9-]/', '', (string) $value);
        return $cleaned === '' ? null : (int) $cleaned;
    }

    private function stringAt(array $row, int $column): string
    {
        return trim((string) ($row[$column] ?? ''));
    }

    private function cleanString(mixed $value): ?string
    {
        $value = trim((string) ($value ?? ''));
        return $value === '' ? null : $value;
    }

    private function parseDate(mixed $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance($value);
        }

        if (is_numeric($value)) {
            try {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $value));
            } catch (\Throwable) {
                return null;
            }
        }

        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }

        if ($this->template->date_format) {
            try {
                return Carbon::createFromFormat($this->template->date_format, $value);
            } catch (\Throwable) {
                // Continue with Carbon parser below.
            }
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable) {
            return null;
        }
    }

    private function shouldSkipAssyNumber(string $assyNumber): bool
    {
        if ($assyNumber === '') {
            return true;
        }

        $lower = strtolower($assyNumber);
        $keywords = $this->template->skip_keywords ?: ['total', 'subtotal', 'grand total'];

        foreach ($keywords as $keyword) {
            if ($keyword !== '' && str_contains($lower, strtolower((string) $keyword))) {
                return true;
            }
        }

        return false;
    }

    private function columnIndex(string $column): int
    {
        return Coordinate::columnIndexFromString(strtoupper(trim($column))) - 1;
    }
}
