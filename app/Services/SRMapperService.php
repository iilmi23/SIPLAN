<?php

namespace App\Services;

use App\Models\Customer;
use App\Services\SR\GenericTemplateMapper;
use App\Services\SR\SAIMapper;
use App\Services\SR\SRMapperInterface;
use App\Services\SR\TYCMapper;
use App\Services\SR\YCMapper;
use App\Services\SR\YNAMapper;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class SRMapperService
{
    public function mapUploadedSheet(string $tempPath, Customer $customer, int $sheetIndex): array
    {
        $reader = $this->createReader($tempPath);
        $spreadsheet = $reader->load($tempPath);
        $worksheet = $spreadsheet->getSheet($sheetIndex);

        if ($worksheet === null) {
            throw new \Exception('Sheet tidak valid. Tersedia: '.$spreadsheet->getSheetCount().' sheet.');
        }

        $sheetName = $worksheet->getTitle();
        $sheetData = $this->worksheetToArray($worksheet);

        if (empty($sheetData)) {
            throw new \Exception('Sheet yang dipilih kosong.');
        }

        $mapper = $this->resolveMapper($customer, $sheetIndex);

        if ($mapper === null) {
            throw new \Exception('Customer '.$customer->code.' belum punya mapper khusus atau template SR aktif. Buat template di menu SR Mapping Templates.');
        }

        $options = $this->extractSheetOptions($tempPath, $sheetIndex, $customer->code);

        Log::info('SR mapping started', [
            'customer' => $customer->code,
            'sheet_index' => $sheetIndex,
            'sheet_name' => $sheetName,
            'mapper' => class_basename($mapper),
        ]);

        if (strtoupper($customer->code) === 'YC') {
            $mapped = $this->runYCMapper($mapper, $tempPath, $options, true, $sheetIndex);
        } else {
            $mapped = $this->runMapper($mapper, $customer->code, $sheetData, $tempPath, $sheetIndex, $options, $customer->id);
        }

        $mapped = array_values(array_filter($mapped));

        Log::info('SR mapping completed', [
            'customer' => $customer->code,
            'sheet_name' => $sheetName,
            'mapped_rows' => count($mapped),
        ]);

        return [$mapped, $sheetName];
    }

    private function resolveMapper(Customer $customer, int $sheetIndex): ?SRMapperInterface
    {
        $customMapper = match (strtoupper($customer->code)) {
            'TYC' => new TYCMapper(),
            'YNA' => new YNAMapper(),
            'SAI' => new SAIMapper(),
            'YC' => new YCMapper(),
            default => null,
        };

        if ($customMapper !== null) {
            return $customMapper;
        }

        $template = $customer->activeSrMappingTemplate;

        if ($template === null) {
            return null;
        }

        if ($template->sheet_index !== null && (int) $template->sheet_index !== $sheetIndex) {
            throw new \Exception(
                'Template SR aktif untuk customer '.$customer->code.
                ' hanya berlaku untuk sheet index '.$template->sheet_index.
                '. Sheet yang dipilih: '.$sheetIndex.'.'
            );
        }

        return new GenericTemplateMapper($template, $customer);
    }

    private function runMapper(
        SRMapperInterface $mapper,
        string $customerCode,
        array $sheetData,
        string $tempPath,
        int $sheetIndex,
        array $options,
        ?int $customerId = null
    ): array {
        if ($mapper instanceof GenericTemplateMapper) {
            return $mapper->map($sheetData);
        }

        if (strtoupper($customerCode) === 'YNA') {
            return $mapper->map($sheetData, null, $tempPath, $sheetIndex, $customerId);
        }

        return $mapper->map($sheetData, null, $options);
    }

    private function runYCMapper(YCMapper $mapper, string $tempPath, array $options, bool $singleSheetMode, ?int $sheetIndex): array
    {
        $reader = $this->createReader($tempPath);
        $spreadsheet = $reader->load($tempPath);
        $allSheets = [];
        $sheetNames = [];

        foreach ($spreadsheet->getWorksheetIterator() as $index => $worksheet) {
            $sheetNames[$index] = $worksheet->getTitle();

            if ($singleSheetMode && $sheetIndex !== null && $index !== $sheetIndex) {
                continue;
            }

            $allSheets[$index] = $this->worksheetToArray($worksheet);
        }

        if (empty($allSheets)) {
            throw new \Exception('Tidak ada sheet yang bisa diproses');
        }

        $sheetResults = $mapper->mapAllSheets($allSheets, $sheetNames, [], null, $options);
        $result = [];

        foreach ($sheetResults as $sheetRecords) {
            if (is_array($sheetRecords)) {
                $result = array_merge($result, $sheetRecords);
            }
        }

        return $result;
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

    private function createReader(string $filePath): \PhpOffice\PhpSpreadsheet\Reader\IReader
    {
        $extension = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));

        $reader = match ($extension) {
            'xlsx', 'xlsm' => new \PhpOffice\PhpSpreadsheet\Reader\Xlsx(),
            'xls' => new \PhpOffice\PhpSpreadsheet\Reader\Xls(),
            default => throw new \Exception("Unsupported file type: {$extension}"),
        };

        $reader->setReadDataOnly(true);

        return $reader;
    }

    private function extractSheetOptions(string $filePath, int $sheetIndex, string $customerCode): array
    {
        $options = ['hidden_columns' => [], 'hidden_rows' => []];

        if (strtoupper($customerCode) === 'YNA') {
            return $options;
        }

        try {
            $reader = $this->createReader($filePath);
            $worksheet = $reader->load($filePath)->getSheet($sheetIndex);

            foreach ($worksheet->getColumnDimensions() as $colLetter => $colDim) {
                if (! $colDim->getVisible()) {
                    $options['hidden_columns'][] = Coordinate::columnIndexFromString($colLetter) - 1;
                }
            }

            foreach ($worksheet->getRowDimensions() as $rowNum => $rowDim) {
                if (! $rowDim->getVisible()) {
                    $options['hidden_rows'][] = (int) $rowNum - 1;
                }
            }
        } catch (\Throwable $exception) {
            Log::warning('extractSheetOptions failed', ['error' => $exception->getMessage()]);
        }

        return $options;
    }
}
