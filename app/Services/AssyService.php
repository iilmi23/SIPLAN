<?php

namespace App\Services;

use App\Imports\AssyMasterImport;
use App\Models\Assy;
use App\Models\Carline;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AssyService
{
    private const REQUIRED_UPDATE_COLUMNS = [
        'assy_number',
        'umh',
        'std_pack',
    ];

    private const IMPORT_COLUMNS = [
        'assy_number',
        'assy_code',
        'level',
        'type',
        'umh',
        'std_pack',
    ];

    public function query(array $filters): Builder
    {
        return Assy::with('carline')
            ->when($filters['search'] ?? null, function ($query, $search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery->where('assy_number', 'like', "%{$search}%")
                        ->orWhere('assy_code', 'like', "%{$search}%")
                        ->orWhere('level', 'like', "%{$search}%");
                });
            })
            ->when($filters['carline_id'] ?? null, fn($query, $carlineId) => $query->where('carline_id', $carlineId))
            ->when(
                array_key_exists('is_active', $filters) && $filters['is_active'] !== null && $filters['is_active'] !== '',
                fn($query) => $query->where('is_active', $filters['is_active'] === '1')
            );
    }

    public function uploadMaster(UploadedFile $file, int $carlineId): array
    {
        $import = new AssyMasterImport($carlineId);
        Excel::import($import, $file);

        return [
            'count' => $import->getRowCount(),
            'errors' => $import->getErrors(),
        ];
    }

    public function sheetNames(UploadedFile $file): array
    {
        return IOFactory::load($file->getPathname())->getSheetNames();
    }

    public function previewSheet(UploadedFile $file, string $sheetName): array
    {
        $rows = $this->sheetRows($file, $sheetName);
        [$headers, $rows] = $this->headerAndDataRows($rows);

        return collect($rows)
            ->reject(fn ($row) => $this->isBlankRow($row))
            ->map(function ($row) use ($headers) {
                $rowData = [];

                foreach ($headers as $index => $header) {
                    $header = trim((string) $header);

                    if ($header === '') {
                        continue;
                    }

                    $rowData[$header] = $row[$index] ?? '';
                }

                return $rowData;
            })
            ->values()
            ->all();
    }

    public function importSheet(UploadedFile $file, string $sheetName, int $carlineId): array
    {
        $rows = $this->sheetRows($file, $sheetName);
        [$headers, $rows] = $this->headerAndDataRows($rows);
        $headers = array_map(fn($header) => strtolower(trim((string) $header)), $headers);
        $columns = $this->columnIndexes($headers);
        $missingColumns = array_values(array_diff(self::REQUIRED_UPDATE_COLUMNS, array_keys($columns)));

        if (!empty($missingColumns)) {
            throw new \DomainException('File Excel harus memiliki kolom: ' . implode(', ', $missingColumns));
        }

        $created = 0;
        $updated = 0;
        $errors = [];

        DB::transaction(function () use ($rows, $columns, $carlineId, &$created, &$updated, &$errors) {
            foreach ($rows as $rowIndex => $row) {
                if ($this->isBlankRow($row)) {
                    continue;
                }

                $payload = $this->rowPayload($row, $columns, $carlineId);
                $rowNumber = $rowIndex + 2;

                if (empty($payload['assy_number'])) {
                    $errors[] = "Baris {$rowNumber}: Assy number kosong";
                    continue;
                }

                if ($this->hasBlankUpdatePayload($row, $columns)) {
                    $errors[] = "Baris {$rowNumber}: Field wajib tidak lengkap (umh, std_pack)";
                    continue;
                }

                $assy = Assy::where('assy_number', $payload['assy_number'])->first();

                try {
                    if ($assy) {
                        if ((int) $assy->carline_id !== $carlineId) {
                            $errors[] = "Baris {$rowNumber}: Assy number '{$payload['assy_number']}' sudah terdaftar di Car Line lain";
                            continue;
                        }

                        $assy->update($this->updatePayload($payload));
                        $updated++;
                        continue;
                    }

                    if ($this->hasBlankCreatePayload($payload)) {
                        $errors[] = "Baris {$rowNumber}: Data baru wajib memiliki assy_code dan level";
                        continue;
                    }

                    Assy::create($payload);
                    $created++;
                } catch (\Throwable $exception) {
                    $errors[] = "Baris {$rowNumber}: Gagal menyimpan - " . $exception->getMessage();
                }
            }
        });

        return [
            'success' => ($created + $updated) > 0,
            'message' => $this->importMessage($created, $updated, $errors),
            'imported' => $created,
            'updated' => $updated,
            'errors' => $errors,
        ];
    }

    public function createTemplate(Carline $carline): array
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Template Assy');

        $this->fillTemplateSheet($sheet, $carline);
        $this->fillInstructionSheet($spreadsheet, $carline);

        $spreadsheet->setActiveSheetIndex(0);

        return [
            'spreadsheet' => $spreadsheet,
            'filename' => 'template_assy_' . $carline->code . '_' . date('Ymd') . '.xlsx',
        ];
    }

    public function streamTemplate(Carline $carline): void
    {
        $template = $this->createTemplate($carline);
        (new Xlsx($template['spreadsheet']))->save('php://output');
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

    private function columnIndexes(array $headers): array
    {
        $columns = [];

        foreach ($headers as $index => $header) {
            if (in_array($header, self::IMPORT_COLUMNS, true)) {
                $columns[$header] = $index;
            }
        }

        return $columns;
    }

    private function headerAndDataRows(array $rows): array
    {
        foreach ($rows as $index => $row) {
            $headers = array_map(fn($header) => strtolower(trim((string) $header)), $row);
            $matchedColumns = array_intersect(self::REQUIRED_UPDATE_COLUMNS, $headers);

            if (count($matchedColumns) === count(self::REQUIRED_UPDATE_COLUMNS)) {
                return [$row, array_slice($rows, $index + 1)];
            }
        }

        throw new \DomainException('Header Excel tidak ditemukan. Pastikan ada kolom: ' . implode(', ', self::REQUIRED_UPDATE_COLUMNS));
    }

    private function isBlankRow(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function rowPayload(array $row, array $columns, int $carlineId): array
    {
        return [
            'carline_id' => $carlineId,
            'assy_number' => trim((string) ($row[$columns['assy_number']] ?? '')),
            'assy_code' => isset($columns['assy_code']) ? trim((string) ($row[$columns['assy_code']] ?? '')) : '',
            'level' => isset($columns['level']) ? trim((string) ($row[$columns['level']] ?? '')) : '',
            'type' => isset($columns['type']) ? trim((string) ($row[$columns['type']] ?? '')) : null,
            'umh' => (float) ($row[$columns['umh']] ?? 0),
            'std_pack' => (int) ($row[$columns['std_pack']] ?? 0),
            'is_active' => true,
        ];
    }

    private function updatePayload(array $payload): array
    {
        $update = [
            'umh' => $payload['umh'],
            'std_pack' => $payload['std_pack'],
        ];

        foreach (['assy_code', 'level', 'type'] as $field) {
            if (array_key_exists($field, $payload) && $payload[$field] !== null && $payload[$field] !== '') {
                $update[$field] = $payload[$field];
            }
        }

        return $update;
    }

    private function hasBlankUpdatePayload(array $row, array $columns): bool
    {
        foreach (['umh', 'std_pack'] as $field) {
            if (trim((string) ($row[$columns[$field]] ?? '')) === '') {
                return true;
            }
        }

        return false;
    }

    private function hasBlankCreatePayload(array $payload): bool
    {
        return $payload['assy_code'] === ''
            || $payload['level'] === ''
            || $payload['std_pack'] < 1;
    }

    private function importMessage(int $created, int $updated, array $errors): string
    {
        $processed = $created + $updated;
        $message = $processed > 0
            ? "Berhasil memproses {$processed} assy ({$created} baru, {$updated} update)"
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

    private function fillTemplateSheet($sheet, Carline $carline): void
    {
        $sheet->setCellValue('A1', 'TEMPLATE IMPORT ASSY MASTER');
        $sheet->mergeCells('A1:G1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

        $sheet->setCellValue('A2', 'Car Line:');
        $sheet->setCellValue('B2', $carline->code);
        $sheet->mergeCells('B2:G2');
        $sheet->getStyle('A2')->getFont()->setBold(true);

        $headers = ['assy_number', 'carline', 'type', 'level', 'assy_code', 'std_pack', 'umh'];
        $headerRow = 4;

        foreach ($headers as $index => $header) {
            $column = chr(65 + $index);
            $sheet->setCellValue($column . $headerRow, strtoupper($header));
            $sheet->getColumnDimension($column)->setWidth(20);
        }

        $sheet->getStyle('A4:G4')->applyFromArray($this->headerStyle());
        $sheet->freezePane('A5');
        $sheet->setAutoFilter('A4:G4');

        $rows = Assy::with('carline')
            ->where('carline_id', $carline->id)
            ->orderBy('assy_number')
            ->get()
            ->map(fn(Assy $assy) => [
                $assy->assy_number,
                $assy->carline?->code ?? $carline->code,
                $assy->type,
                $assy->level,
                $assy->assy_code,
                $assy->std_pack,
                $assy->umh,
            ])
            ->values()
            ->all();

        if (empty($rows)) {
            $rows = [
                ['82115-0E490 K', $carline->code, 'LHD-HEV', 'K 0001', 'DZ01', 4, 5.3387],
                ['82115-0E480 K', $carline->code, 'LHD-HEV', 'K 0301', 'DVB1', 4, 4.9637],
                ['82115-0E440 M', $carline->code, 'LHD-HEV', 'M 0001', 'DYB9', 4, 4.3842],
            ];
        }

        foreach ($rows as $index => $rowData) {
            $row = 5 + $index;
            $sheet->fromArray($rowData, null, 'A' . $row);
        }

        $lastDataRow = 4 + count($rows);

        if ($lastDataRow >= 5) {
            $sheet->getStyle("A5:G{$lastDataRow}")
                ->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_LEFT)
                ->setVertical(Alignment::VERTICAL_CENTER);
        }

        for ($i = 0; $i < 10; $i++) {
            $row = 5 + count($rows) + $i;
            $sheet->getStyle("A{$row}:G{$row}")->applyFromArray($this->borderStyle());
        }
    }

    private function fillInstructionSheet(Spreadsheet $spreadsheet, Carline $carline): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Petunjuk');
        $sheet->fromArray([
            ['PETUNJUK PENGISIAN TEMPLATE', ''],
            ['', ''],
            ['Informasi Car Line:', ''],
            ['Car Line ID:', $carline->id],
            ['Car Line Code:', $carline->code],
            ['', ''],
            ['Kolom wajib untuk update data SIREP:', ''],
            ['1. assy_number', 'Nomor Part Assy yang sudah ada di Master Assy'],
            ['2. std_pack', 'Standard Pack (Angka bulat)'],
            ['3. umh', 'Nilai UMH (Decimal, contoh: 5.3387)'],
            ['', ''],
            ['Kolom tambahan:', ''],
            ['- carline', 'Informasi dari template; car line import tetap mengikuti pilihan di halaman import'],
            ['- type', 'Opsional, akan ikut diperbarui jika diisi'],
            ['- level', 'Wajib jika assy_number belum ada dan ingin membuat data baru'],
            ['- assy_code', 'Wajib jika assy_number belum ada dan ingin membuat data baru'],
            ['', ''],
            ['Format Data:', ''],
            ['- assy_number: Maksimal 50 karakter', ''],
            ['- assy_code: Maksimal 20 karakter', ''],
            ['- level: Maksimal 20 karakter', ''],
            ['- type: Maksimal 10 karakter', ''],
            ['- umh: 0 - 9999.999999', ''],
            ['- std_pack: Minimal 1', ''],
            ['', ''],
            ['Catatan Penting:', ''],
            ['- Car Line sudah ditentukan, tidak perlu diisi', ''],
            ['- Jika assy_number sudah ada, sistem akan update umh dan std_pack', ''],
            ['- Jika assy_number belum ada, assy_code dan level wajib diisi', ''],
            ['- File maksimal 1000 baris data', ''],
            ['- Format file: .xlsx, .xls, atau .csv', ''],
            ['- Baris pertama (header) tidak akan diimport', ''],
            ['- Data contoh bisa dihapus atau diganti dengan data asli', ''],
        ]);

        $sheet->getColumnDimension('A')->setWidth(30);
        $sheet->getColumnDimension('B')->setWidth(50);
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(12);
        $sheet->getStyle('A1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('1D6F42');
        $sheet->getStyle('A1')->getFont()->getColor()->setRGB('FFFFFF');
    }

    private function headerStyle(): array
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

    private function borderStyle(): array
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
}
