<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\SR\SAIMapper;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;

class TestSaiMapper extends Command
{
    protected $signature = 'test:sai-mapper';
    protected $description = 'Test SAI Mapper dengan file Excel aktual';

    public function handle()
    {
        $file = 'storage/app/private/temp/sr_temp_69d468daa0dba7.20583998.xlsx';

        if (!file_exists($file)) {
            $this->error("❌ File tidak ditemukan: $file");
            return 1;
        }

        $this->info("📁 File: $file");
        $this->info("📊 Ukuran: " . number_format(filesize($file) / (1024*1024), 2) . " MB");
        $this->line("");

        try {
            // Baca sheet dengan Excel facade
            $this->info("⏳ Loading sheet index 1...");
            $excel = Excel::toArray(null, $file);
            
            if (!isset($excel[1])) {
                $this->error("❌ Sheet index 1 tidak ditemukan (available: " . count($excel) . " sheets)");
                return 1;
            }

            $sheetData = $excel[1];
            $this->line("✅ Sheet loaded: " . count($sheetData) . " rows");

            // Ekstrak hidden columns/rows
            $this->info("⏳ Extracting hidden columns/rows...");
            $spreadsheet = IOFactory::load($file);
            $worksheet = $spreadsheet->getSheet(1);
            
            $hiddenColumns = [];
            foreach ($worksheet->getColumnDimensions() as $colLetter => $colDim) {
                if (!$colDim->getVisible()) {
                    $oneBased = Coordinate::columnIndexFromString($colLetter);
                    $hiddenColumns[] = $oneBased - 1;
                }
            }
            
            $hiddenRows = [];
            foreach ($worksheet->getRowDimensions() as $rowNum => $rowDim) {
                if (!$rowDim->getVisible()) {
                    $hiddenRows[] = (int)$rowNum - 1;
                }
            }
            
            $this->line("Hidden columns: " . (empty($hiddenColumns) ? 'none' : implode(', ', $hiddenColumns)));
            $this->line("Hidden rows: " . count($hiddenRows) . " rows");
            $this->line("");

            // Jalankan mapper
            $this->info("⏳ Running SAIMapper...");
            $mapper = new SAIMapper();
            $options = [
                'hidden_columns' => $hiddenColumns,
                'hidden_rows' => $hiddenRows,
            ];
            
            $startMemory = memory_get_usage(true) / (1024*1024);
            $peakBefore = memory_get_peak_usage(true) / (1024*1024);
            $startTime = microtime(true);
            
            $result = $mapper->map($sheetData, null, $options);
            
            $endTime = microtime(true);
            $endMemory = memory_get_usage(true) / (1024*1024);
            $peakAfter = memory_get_peak_usage(true) / (1024*1024);
            
            $this->line("✅ Mapping complete!");
            $this->line("   Memory now: " . number_format($endMemory, 2) . " MB");
            $this->line("   Peak memory before: " . number_format($peakBefore, 2) . " MB");
            $this->line("   Peak memory after: " . number_format($peakAfter, 2) . " MB");
            $this->line("   Time: " . number_format($endTime - $startTime, 2) . " seconds");
            $this->line("   Records generated: " . count($result));

            // Analisis hasil
            if (!empty($result)) {
                $firm = count(array_filter($result, fn($r) => ($r['order_type'] ?? '') === 'FIRM'));
                $forecast = count(array_filter($result, fn($r) => ($r['order_type'] ?? '') === 'FORECAST'));
                $uniqueAssyNumbers = count(array_unique(array_column($result, 'assy_number')));
                $qty = array_sum(array_column($result, 'qty'));

                $this->info("📊 Summary:");
                $this->line("   FIRM records: $firm");
                $this->line("   FORECAST records: $forecast");
                $this->line("   Unique assy numbers: $uniqueAssyNumbers");
                $this->line("   Total QTY: " . number_format($qty));
                
                $this->info("📋 Sample records (first 5):");
                foreach (array_slice($result, 0, 5) as $i => $item) {
                    $extra = json_decode($item['extra'] ?? '{}', true);
                    $this->line(sprintf(
                        "   [%d] Assy: %s, Qty: %d, Type: %s, ETA: %s, PO: %s",
                        $i,
                        $item['assy_number'],
                        $item['qty'],
                        $item['order_type'],
                        $item['eta'],
                        $extra['po_number'] ?? 'N/A'
                    ));
                }
            }

            $this->info("✅ All tests PASSED!");
            return 0;

        } catch (\Exception $e) {
            $this->error("❌ Error: " . $e->getMessage());
            $this->line($e->getTraceAsString());
            return 1;
        }
    }
}
