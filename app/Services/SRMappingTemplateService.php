<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\SRMappingTemplate;
use App\Services\SR\GenericTemplateMapper;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;

class SRMappingTemplateService
{
    public function normalize(array $validated): array
    {
        unset($validated['file']);

        foreach ($this->columnFields() as $field) {
            $value = isset($validated[$field]) ? trim((string) $validated[$field]) : '';
            $validated[$field] = $value !== '' ? strtoupper($value) : null;
        }

        $validated['default_order_type'] = $validated['default_order_type']
            ? strtoupper(trim($validated['default_order_type']))
            : null;
        $validated['date_format'] = isset($validated['date_format']) && trim((string) $validated['date_format']) !== ''
            ? trim($validated['date_format'])
            : null;
        $validated['skip_keywords'] = collect(explode(',', $validated['skip_keywords'] ?? ''))
            ->map(fn ($keyword) => trim($keyword))
            ->filter()
            ->values()
            ->all();
        $validated['is_active'] = filter_var($validated['is_active'] ?? false, FILTER_VALIDATE_BOOLEAN);

        return $validated;
    }

    public function create(array $data): SRMappingTemplate
    {
        return DB::transaction(function () use ($data) {
            if ($data['is_active']) {
                SRMappingTemplate::where('customer_id', $data['customer_id'])->update(['is_active' => false]);
            }

            return SRMappingTemplate::create($data);
        });
    }

    public function update(SRMappingTemplate $template, array $data): void
    {
        DB::transaction(function () use ($template, $data) {
            if ($data['is_active']) {
                SRMappingTemplate::where('customer_id', $data['customer_id'])
                    ->where('id', '!=', $template->id)
                    ->update(['is_active' => false]);
            }

            $template->update($data);
        });
    }

    public function previewExcel(UploadedFile $file, int $sheetIndex): array
    {
        return $this->withSpreadsheet($file, function ($spreadsheet) use ($sheetIndex) {
            if ($sheetIndex >= $spreadsheet->getSheetCount()) {
                throw new \DomainException('Sheet index tidak valid.');
            }

            $worksheet = $spreadsheet->getSheet($sheetIndex);
            $highestRow = min($worksheet->getHighestRow(), 25);
            $highestColumnIndex = min(Coordinate::columnIndexFromString($worksheet->getHighestColumn()), 30);
            $rows = [];

            for ($row = 1; $row <= $highestRow; $row++) {
                $cells = [];

                for ($col = 1; $col <= $highestColumnIndex; $col++) {
                    $cells[] = [
                        'column' => Coordinate::stringFromColumnIndex($col),
                        'value' => trim((string) $worksheet->getCellByColumnAndRow($col, $row)->getFormattedValue()),
                    ];
                }

                $rows[] = [
                    'row_number' => $row,
                    'cells' => $cells,
                ];
            }

            return [
                'success' => true,
                'sheets' => $this->sheetList($spreadsheet),
                'current_sheet' => [
                    'index' => $sheetIndex,
                    'name' => $worksheet->getTitle(),
                ],
                'columns' => array_map(
                    fn ($col) => Coordinate::stringFromColumnIndex($col),
                    range(1, $highestColumnIndex)
                ),
                'rows' => $rows,
            ];
        });
    }

    public function validatePreview(UploadedFile $file, int $sheetIndex, array $data): array
    {
        return $this->withSpreadsheet($file, function ($spreadsheet) use ($sheetIndex, $data) {
            if ($sheetIndex >= $spreadsheet->getSheetCount()) {
                throw new \DomainException('Sheet index tidak valid.');
            }

            $customer = Customer::findOrFail($data['customer_id']);
            $template = new SRMappingTemplate($data);
            $sheet = $this->worksheetToArray($spreadsheet->getSheet($sheetIndex));
            $mapped = (new GenericTemplateMapper($template, $customer))->map($sheet);

            return [
                'success' => true,
                'total_records' => count($mapped),
                'unique_assy_numbers' => count(array_unique(array_column($mapped, 'assy_number'))),
                'total_qty' => array_sum(array_column($mapped, 'qty')),
                'preview' => array_slice($mapped, 0, 20),
                'message' => 'Template berhasil membaca file contoh.',
            ];
        });
    }

    private function columnFields(): array
    {
        return [
            'assy_number_column',
            'qty_column',
            'qty_start_column',
            'qty_end_column',
            'etd_column',
            'eta_column',
            'order_type_column',
            'model_column',
            'family_column',
            'port_column',
            'month_column',
            'week_column',
            'year_column',
        ];
    }

    private function sheetList($spreadsheet): array
    {
        $sheets = [];

        for ($index = 0; $index < $spreadsheet->getSheetCount(); $index++) {
            $sheets[] = [
                'index' => $index,
                'name' => $spreadsheet->getSheet($index)->getTitle(),
            ];
        }

        return $sheets;
    }

    private function worksheetToArray($worksheet): array
    {
        $sheetData = [];
        $highestRow = $worksheet->getHighestRow();
        $highestColIndex = Coordinate::columnIndexFromString($worksheet->getHighestColumn());

        for ($row = 1; $row <= $highestRow; $row++) {
            $rowData = [];

            for ($col = 1; $col <= $highestColIndex; $col++) {
                $rowData[] = $worksheet->getCellByColumnAndRow($col, $row)->getValue();
            }

            $sheetData[$row - 1] = $rowData;
        }

        return $sheetData;
    }

    private function withSpreadsheet(UploadedFile $file, callable $callback): mixed
    {
        $tempPath = $this->storeTempFile($file);

        try {
            return $callback(IOFactory::load($tempPath));
        } finally {
            if (file_exists($tempPath)) {
                @unlink($tempPath);
            }
        }
    }

    private function storeTempFile(UploadedFile $file): string
    {
        $directory = storage_path('app/temp');

        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        $path = $directory . DIRECTORY_SEPARATOR . Str::uuid() . '.' . $file->getClientOriginalExtension();
        $file->move($directory, basename($path));

        return $path;
    }
}
