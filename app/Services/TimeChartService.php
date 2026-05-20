<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\TimeChart;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;

class TimeChartService
{
    public function monthRows(int $year, int $month)
    {
        return TimeChart::getForMonth($year, $month)->map(fn ($chart) => [
            'id' => $chart->id,
            'week_number' => $chart->week_number,
            'start_date' => $chart->start_date?->format('Y-m-d'),
            'end_date' => $chart->end_date?->format('Y-m-d'),
            'working_days' => $chart->working_days,
            'total_working_days' => $chart->total_working_days,
            'source_file' => $chart->source_file,
            'upload_batch' => $chart->upload_batch,
        ]);
    }

    public function preview(UploadedFile $file, int $sheetIndex, int $year, int $month, Customer $customer): array
    {
        return $this->withSpreadsheet($file, function ($spreadsheet) use ($sheetIndex, $year, $month, $customer) {
            if ($sheetIndex >= $spreadsheet->getSheetCount()) {
                throw new \DomainException(
                    'Sheet index ' . $sheetIndex . ' tidak valid. Total sheet: ' . $spreadsheet->getSheetCount()
                );
            }

            $worksheet = $spreadsheet->getSheet($sheetIndex);
            $timeChartData = $this->parseByCustomer($worksheet, $year, $month, strtoupper($customer->code));
            $sheets = $this->sheetList($spreadsheet);

            if (empty($timeChartData)) {
                throw new \DomainException('Tidak ada data time chart yang valid untuk bulan ' . $month . '/' . $year . '.');
            }

            return [
                'success' => true,
                'sheets' => $sheets,
                'current_sheet' => [
                    'index' => $sheetIndex,
                    'name' => $worksheet->getTitle(),
                ],
                'preview' => array_map(fn ($chart) => $this->formatPreviewRow($chart), $timeChartData),
                'total_weeks' => count($timeChartData),
                'message' => 'Data siap di-upload',
            ];
        });
    }

    public function upload(UploadedFile $file, int $sheetIndex, int $year, int $month, Customer $customer): array
    {
        return $this->withTempFile($file, function (string $tempPath) use ($file, $sheetIndex, $year, $month, $customer) {
            $fileHash = $this->calculateFileHash($tempPath);
            $spreadsheet = $this->createReader($tempPath)->load($tempPath);
            $worksheet = $spreadsheet->getSheet($sheetIndex);

            if ($worksheet === null) {
                throw new \DomainException('Sheet tidak valid.');
            }

            $timeChartData = $this->parseByCustomer($worksheet, $year, $month, strtoupper($customer->code));

            if (empty($timeChartData)) {
                throw new \DomainException(
                    'Tidak ada data time chart yang valid untuk bulan ' . $month . '/' . $year . '. ' .
                    'Pastikan kolom dan format file sesuai dengan customer ' . $customer->code . '.'
                );
            }

            if ($this->sameFileAlreadyUploaded($year, $month, $fileHash)) {
                throw new \DomainException(
                    'File ini sudah pernah diupload untuk bulan ' . $month . '/' . $year . '. ' .
                    'Silakan upload file yang berbeda jika ingin update.'
                );
            }

            return DB::transaction(function () use ($timeChartData, $year, $month, $fileHash, $file, $customer) {
                $uploadBatch = 'TC_' . $year . '_' . str_pad((string) $month, 2, '0', STR_PAD_LEFT) . '_' . time();
                $counts = $this->upsertRows($timeChartData, $year, $month, $fileHash, $uploadBatch, $file->getClientOriginalName());
                $totalProcessed = $counts['inserted'] + $counts['updated'];

                return [
                    'success' => true,
                    'message' => $this->uploadMessage($totalProcessed, $counts['inserted'], $counts['updated'], $customer->code),
                    'data' => [
                        'upload_batch' => $uploadBatch,
                        'total_weeks' => $totalProcessed,
                        'inserted' => $counts['inserted'],
                        'updated' => $counts['updated'],
                    ],
                ];
            });
        });
    }

    private function parseByCustomer($worksheet, int $year, int $month, string $code): array
    {
        return match ($code) {
            'TYC', 'YNA', 'SAI', 'YC' => $this->parseGeneric($worksheet, $year, $month),
            default => $this->parseGeneric($worksheet, $year, $month),
        };
    }

    private function parseGeneric($worksheet, int $year, int $month): array
    {
        return $this->parseWithColumns($worksheet, $year, $month, 'TC SEQ', ['SR ISSUE DATE', 'ETD PORT']);
    }

    private function parseWithColumns($worksheet, int $year, int $month, string $weekColName, array|string $dateColNames, int $headerRow = 1): array
    {
        $highestRow = $worksheet->getHighestRow();
        $headers = $this->headers($worksheet, $headerRow);
        $weekCol = array_search(strtoupper($weekColName), $headers, true);
        $dateCol = $this->firstExistingColumn($headers, (array) $dateColNames);

        if (!$weekCol) {
            throw new \DomainException('Kolom ' . $weekColName . ' tidak ditemukan. Header yang tersedia: ' . implode(', ', array_values($headers)));
        }

        if (!$dateCol) {
            throw new \DomainException('Kolom ' . implode(' atau ', (array) $dateColNames) . ' harus ada.');
        }

        $data = [];

        for ($row = $headerRow + 1; $row <= $highestRow; $row++) {
            $weekValue = $worksheet->getCellByColumnAndRow($weekCol, $row)->getValue();
            $rawDate = $worksheet->getCellByColumnAndRow($dateCol, $row)->getValue();

            if (!$weekValue || !$rawDate) {
                continue;
            }

            $workingDate = $this->parseDate($rawDate);

            if (!$workingDate || $workingDate->year !== $year || $workingDate->month !== $month) {
                continue;
            }

            $this->addWorkingDate($data, (int) $weekValue, $workingDate);
        }

        return $this->finalizeWeeks($data);
    }

    private function upsertRows(array $timeChartData, int $year, int $month, string $fileHash, string $uploadBatch, string $originalName): array
    {
        $insertCount = 0;
        $updateCount = 0;

        foreach ($timeChartData as $data) {
            $payload = [
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'working_days' => $data['working_days'],
                'total_working_days' => count($data['working_days']),
                'source_file' => $originalName,
                'file_hash' => $fileHash,
                'upload_batch' => $uploadBatch,
                'last_upload_at' => now(),
            ];

            $existing = TimeChart::where('year', $year)
                ->where('month', $month)
                ->where('week_number', $data['week_number'])
                ->first();

            if ($existing) {
                $existing->update($payload);
                $updateCount++;
                continue;
            }

            TimeChart::create(array_merge($payload, [
                'year' => $year,
                'month' => $month,
                'week_number' => $data['week_number'],
            ]));
            $insertCount++;
        }

        return [
            'inserted' => $insertCount,
            'updated' => $updateCount,
        ];
    }

    private function headers($worksheet, int $headerRow): array
    {
        $highestColIndex = Coordinate::columnIndexFromString($worksheet->getHighestColumn());
        $headers = [];

        for ($col = 1; $col <= $highestColIndex; $col++) {
            $headers[$col] = strtoupper(trim((string) $worksheet->getCellByColumnAndRow($col, $headerRow)->getValue()));
        }

        return $headers;
    }

    private function firstExistingColumn(array $headers, array $columnNames): ?int
    {
        foreach ($columnNames as $columnName) {
            $column = array_search(strtoupper($columnName), $headers, true);

            if ($column) {
                return $column;
            }
        }

        return null;
    }

    private function addWorkingDate(array &$data, int $weekNumber, Carbon $workingDate): void
    {
        if (!isset($data[$weekNumber])) {
            $data[$weekNumber] = [
                'week_number' => $weekNumber,
                'working_days' => [],
                'start_date' => $workingDate,
                'end_date' => $workingDate,
            ];
        }

        $date = $workingDate->format('Y-m-d');

        if (!in_array($date, $data[$weekNumber]['working_days'], true)) {
            $data[$weekNumber]['working_days'][] = $date;
        }

        if ($workingDate < $data[$weekNumber]['start_date']) {
            $data[$weekNumber]['start_date'] = $workingDate;
        }

        if ($workingDate > $data[$weekNumber]['end_date']) {
            $data[$weekNumber]['end_date'] = $workingDate;
        }
    }

    private function finalizeWeeks(array $data): array
    {
        ksort($data);

        foreach ($data as &$weekData) {
            sort($weekData['working_days']);
        }

        return array_values($data);
    }

    private function parseDate($dateValue): ?Carbon
    {
        if (!$dateValue) {
            return null;
        }

        try {
            if (is_numeric($dateValue)) {
                return Carbon::createFromTimestamp(((float) $dateValue - 25569) * 86400)->startOfDay();
            }

            return Carbon::parse($dateValue)->startOfDay();
        } catch (\Throwable) {
            return null;
        }
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

    private function formatPreviewRow(array $chart): array
    {
        return [
            'week_number' => $chart['week_number'],
            'start_date' => is_string($chart['start_date']) ? $chart['start_date'] : $chart['start_date']->format('Y-m-d'),
            'end_date' => is_string($chart['end_date']) ? $chart['end_date'] : $chart['end_date']->format('Y-m-d'),
            'total_working_days' => count($chart['working_days']),
            'working_days' => $chart['working_days'],
        ];
    }

    private function uploadMessage(int $totalProcessed, int $insertCount, int $updateCount, string $customerCode): string
    {
        $message = $totalProcessed . ' minggu berhasil diproses dari file ' . $customerCode . '.';

        if ($insertCount > 0 && $updateCount > 0) {
            return $message . " ({$insertCount} baru, {$updateCount} update)";
        }

        if ($updateCount > 0) {
            return $message . ' (semua update)';
        }

        return $message;
    }

    private function sameFileAlreadyUploaded(int $year, int $month, string $fileHash): bool
    {
        return TimeChart::where('year', $year)
            ->where('month', $month)
            ->where('file_hash', $fileHash)
            ->exists();
    }

    private function withSpreadsheet(UploadedFile $file, callable $callback): mixed
    {
        return $this->withTempFile($file, function (string $tempPath) use ($callback) {
            return $callback($this->createReader($tempPath)->load($tempPath));
        });
    }

    private function withTempFile(UploadedFile $file, callable $callback): mixed
    {
        $tempPath = $this->storeTempFile($file);

        try {
            return $callback($tempPath);
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
            mkdir($directory, 0755, true);
        }

        $path = $directory . '/' . Str::uuid() . '.' . $file->getClientOriginalExtension();
        $file->move($directory, basename($path));

        return $path;
    }

    private function createReader(string $filePath): \PhpOffice\PhpSpreadsheet\Reader\IReader
    {
        return match (strtolower(pathinfo($filePath, PATHINFO_EXTENSION))) {
            'xlsx', 'xlsm' => IOFactory::createReader('Xlsx'),
            'xls' => IOFactory::createReader('Xls'),
            default => throw new \DomainException('Format tidak didukung: ' . pathinfo($filePath, PATHINFO_EXTENSION)),
        };
    }

    private function calculateFileHash(string $filePath): string
    {
        return hash_file('sha256', $filePath);
    }
}
