<?php

namespace App\Services;

use App\Models\Carline;
use Illuminate\Http\UploadedFile;
use PhpOffice\PhpSpreadsheet\IOFactory;

class CarlineService
{
    public function query(array $filters)
    {
        return Carline::withCount('assy')
            ->when(!empty($filters['search']), fn ($query) => $query->where('code', 'like', '%' . $filters['search'] . '%'));
    }

    public function sheetNames(UploadedFile $file): array
    {
        return IOFactory::load($file->getPathname())->getSheetNames();
    }

    public function previewSheet(UploadedFile $file, string $sheetName): array
    {
        $rows = $this->sheetRows($file, $sheetName);
        $headers = array_shift($rows);

        return collect($rows)
            ->map(function ($row) use ($headers) {
                $rowData = [];

                foreach ($headers as $index => $header) {
                    $rowData[trim((string) $header)] = $row[$index] ?? '';
                }

                return $rowData;
            })
            ->values()
            ->all();
    }

    public function importSheet(UploadedFile $file, string $sheetName): array
    {
        $rows = $this->sheetRows($file, $sheetName);
        $headers = array_shift($rows);
        $codeIndex = $this->codeColumnIndex($headers);

        if ($codeIndex === null) {
            throw new \DomainException('File Excel harus memiliki kolom "code"');
        }

        $imported = 0;
        $errors = [];
        $duplicates = [];

        foreach ($rows as $rowIndex => $row) {
            $code = trim((string) ($row[$codeIndex] ?? ''));
            $rowNumber = $rowIndex + 2;

            if ($code === '') {
                $errors[] = "Baris {$rowNumber}: Kode kosong";
                continue;
            }

            if (Carline::where('code', $code)->exists()) {
                $duplicates[] = $code;
                $errors[] = "Baris {$rowNumber}: Kode '{$code}' sudah ada";
                continue;
            }

            try {
                Carline::create(['code' => $code]);
                $imported++;
            } catch (\Throwable $exception) {
                $errors[] = "Baris {$rowNumber}: Gagal menyimpan kode '{$code}' - " . $exception->getMessage();
            }
        }

        return [
            'success' => $imported > 0,
            'message' => $this->importMessage($imported, $errors),
            'imported' => $imported,
            'errors' => $errors,
            'duplicates' => $duplicates,
        ];
    }

    private function sheetRows(UploadedFile $file, string $sheetName): array
    {
        $sheet = IOFactory::load($file->getPathname())->getSheetByName($sheetName);

        if (!$sheet) {
            throw new \DomainException('Sheet tidak ditemukan');
        }

        $rows = $sheet->toArray();

        if (empty($rows)) {
            throw new \DomainException('Sheet kosong');
        }

        return $rows;
    }

    private function codeColumnIndex(array $headers): ?int
    {
        foreach ($headers as $index => $header) {
            if (strtolower(trim((string) $header)) === 'code') {
                return $index;
            }
        }

        return null;
    }

    private function importMessage(int $imported, array $errors): string
    {
        $message = $imported > 0
            ? "Berhasil mengimport {$imported} carline"
            : 'Tidak ada data yang berhasil diimport';

        if (empty($errors)) {
            return $message;
        }

        $message .= '. Error: ' . implode(', ', array_slice($errors, 0, 5));

        if (count($errors) > 5) {
            $message .= ' dan ' . (count($errors) - 5) . ' error lainnya';
        }

        return $message;
    }
}
