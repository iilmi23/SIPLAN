<?php

namespace App\Services\SR;

use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ExcelReader
{
    private array $data;
    private array $config;
    private array $header;
    private array $dateColumns = [];
    private int $qtyRowIndex;
    private int $headerIndex;
    
    public function __construct(array $data, array $config)
    {
        $this->data = $data;
        $this->config = $config;
    }
    
    public function read(): array
    {
        $result = [];
        
        // 1. Ambil header dari baris yang ditentukan
        $this->headerIndex = $this->config['header_row'] ?? 17;
        $this->header = $this->data[$this->headerIndex] ?? [];
        
        Log::info("Header row index: {$this->headerIndex}");
        Log::info("Header: " . json_encode(array_slice($this->header, 0, 15)));
        
        // 2. Tentukan baris QTY
        $offset = $this->config['qty_row_offset'] ?? 1;
        $this->qtyRowIndex = $this->headerIndex + $offset;
        
        Log::info("QTY row index: {$this->qtyRowIndex}");
        
        // 3. Deteksi kolom tanggal
        $this->detectDateColumns();
        
        // 4. Baca data
        $result = $this->readData();
        
        return $result;
    }
    
    private function detectDateColumns(): void
    {
        $currentType = null;
        $firmKeyword = $this->config['firm_keyword'] ?? 'FIRM';
        $forecastKeyword = $this->config['forecast_keyword'] ?? 'FORECAST';
        $skipKeywords = $this->config['skip_keywords'] ?? [];
        $dateFormats = $this->config['date_formats'] ?? [];
        $startColumn = $this->config['columns']['type'] ?? 5;
        
        // Cari posisi FIRM dan FORECAST
        $firmIndex = null;
        $forecastIndex = null;
        
        foreach ($this->header as $index => $col) {
            $colLower = strtolower(trim((string)$col));
            
            if (str_contains($colLower, strtolower($firmKeyword))) {
                $firmIndex = $index;
                Log::info("FIRM section at column: $index");
            }
            if (str_contains($colLower, strtolower($forecastKeyword))) {
                $forecastIndex = $index;
                Log::info("FORECAST section at column: $index");
            }
        }
        
        // Loop dari kolom setelah type sampai akhir
        for ($i = $startColumn; $i < count($this->header); $i++) {
            $col = trim((string)($this->header[$i] ?? ''));
            $colLower = strtolower($col);
            
            // Update current type jika melewati batas FIRM/FORECAST
            if ($firmIndex !== null && $i == $firmIndex) {
                $currentType = 'FIRM';
                Log::info("Switched to FIRM at column: $i");
                continue;
            }
            if ($forecastIndex !== null && $i == $forecastIndex) {
                $currentType = 'FORECAST';
                Log::info("Switched to FORECAST at column: $i");
                continue;
            }
            
            // Skip kolom yang mengandung keyword tertentu
            $skip = false;
            foreach ($skipKeywords as $keyword) {
                if (str_contains($colLower, strtolower($keyword))) {
                    $skip = true;
                    break;
                }
            }
            
            if ($skip || empty($col)) {
                continue;
            }
            
            // Jika belum ada current type, skip
            if ($currentType === null) {
                continue;
            }
            
            // Cek apakah ini kolom tanggal
            $isDate = false;
            foreach ($dateFormats as $pattern) {
                if (preg_match($pattern, $col)) {
                    $isDate = true;
                    break;
                }
            }
            
            if ($isDate) {
                $this->dateColumns[$i] = [
                    'label' => $col,
                    'type' => $currentType,
                    'index' => $i,
                ];
            }
        }
        
        Log::info("Date columns detected: " . count($this->dateColumns));
        
        if (empty($this->dateColumns)) {
            throw new \Exception("Tidak ada kolom tanggal yang terdeteksi");
        }
    }
    
    private function readData(): array
    {
        $result = [];
        $columns = $this->config['columns'];
        $dataStartRow = $this->qtyRowIndex + 1;
        
        // Ambil baris QTY
        $qtyRow = $this->data[$this->qtyRowIndex] ?? [];
        
        Log::info("Data start row: $dataStartRow");
        
        for ($i = $dataStartRow; $i < count($this->data); $i++) {
            $row = $this->data[$i];
            if (!is_array($row)) continue;
            
            // Ambil assy number
            $assyNumber = $row[$columns['assy_number']] ?? null;
            if (empty($assyNumber)) continue;
            
            $assyNumber = trim((string)$assyNumber);
            $partLower = strtolower($assyNumber);
            
            // Skip baris total
            if (in_array($partLower, ['total', 'subtotal', 'cum', 'grand total', ''])) {
                continue;
            }
            
            // Ambil data lainnya
            $model = $row[$columns['model']] ?? null;
            $family = $row[$columns['family']] ?? null;
            $no = $row[$columns['no']] ?? null;
            
            // Loop setiap kolom tanggal
            foreach ($this->dateColumns as $colIndex => $dateInfo) {
                // Ambil qty dari baris QTY
                $qty = $qtyRow[$colIndex] ?? null;
                
                if ($qty === null || $qty === '' || $qty === 0) continue;
                
                // Bersihkan qty
                $qty = (int) preg_replace('/[^0-9]/', '', (string)$qty);
                if ($qty <= 0) continue;
                
                // Parse tanggal
                $eta = $this->parseDate($dateInfo['label']);
                if (!$eta) {
                    Log::warning("Cannot parse date: {$dateInfo['label']}");
                    continue;
                }
                
                $etd = $eta->copy()->subDays(5);
                
                $result[] = [
                    'customer' => $this->config['customer_code'],
                    'source_file' => null,
                    'assy_number' => $assyNumber,
                    'qty' => $qty,
                    'delivery_date' => $eta->format('Y-m-d'),
                    'eta' => $eta->format('Y-m-d'),
                    'etd' => $etd->format('Y-m-d'),
                    'week' => $eta->format('W'),
                    'route' => null,
                    'port' => null,
                    'model' => $model,
                    'family' => $family,
                    'order_type' => $dateInfo['type'],
                    'extra' => json_encode([
                        'row' => $i,
                        'no' => $no,
                        'date_label' => $dateInfo['label'],
                        'col' => $colIndex,
                    ]),
                ];
            }
        }
        
        Log::info("Total data processed: " . count($result));
        
        return $result;
    }
    
    private function parseDate($dateValue): ?Carbon
    {
        if (empty($dateValue)) return null;
        
        $dateStr = trim((string)$dateValue);
        
        // Format: angka 1-12 (bulan)
        if (preg_match('/^\d+$/', $dateStr)) {
            $month = (int)$dateStr;
            if ($month >= 1 && $month <= 12) {
                $year = date('Y');
                if ($month == 1 && date('m') == 12) $year++;
                if ($month == 12 && date('m') == 1) $year--;
                return Carbon::create($year, $month, 1);
            }
        }
        
        // Format: 2023/1, 2024/2
        if (preg_match('/(\d{4})\/(\d{1,2})/', $dateStr, $matches)) {
            return Carbon::create((int)$matches[1], (int)$matches[2], 1);
        }
        
        // Format: 2023-1, 2024-2
        if (preg_match('/(\d{4})-(\d{1,2})/', $dateStr, $matches)) {
            return Carbon::create((int)$matches[1], (int)$matches[2], 1);
        }
        
        // Format: 1W, 2W
        if (preg_match('/^(\d+)w$/i', $dateStr, $matches)) {
            $week = (int)$matches[1];
            $year = date('Y');
            $month = ceil($week / 4);
            if ($month > 12) $month = 12;
            return Carbon::create($year, $month, 1);
        }
        
        // Format Y-m-d
        if (preg_match('/\d{4}-\d{2}-\d{2}/', $dateStr, $matches)) {
            return Carbon::parse($matches[0]);
        }
        
        return null;
    }
}