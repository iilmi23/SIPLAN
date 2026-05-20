<?php

namespace App\Services\SR;

use App\Models\Customer;
use App\Services\MasterAssyResolverService;
use App\Services\SRMapperService;
use App\Services\SRUploadService;
use App\Services\WeekResolverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SRProcessingService
{
    public function __construct(
        private readonly SRMapperService $mapper,
        private readonly WeekResolverService $weeks,
        private readonly MasterAssyResolverService $assyResolver,
        private readonly SRUploadService $uploads
    ) {
    }

    public function preview(Request $request): JsonResponse
    {
        $tempPath = null;

        try {
            $customer = Customer::findOrFail($request->customer);
            $sheetIndex = (int) $request->sheet;
            $tempPath = $this->storeTempFile($request->file('file'));

            [$mapped] = $this->mapper->mapUploadedSheet($tempPath, $customer, $sheetIndex);

            if (empty($mapped)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Mapping gagal: tidak ada data valid.',
                ], 400);
            }

            $mapped = $this->weeks->applyProductionWeeks($mapped, $customer->id);
            [$mapped, $unknownAssyNumbers] = $this->assyResolver->apply($mapped);

            return response()->json([
                'success' => true,
                'data' => [
                    'total_records' => count($mapped),
                    'unique_assy_numbers' => count(array_unique(array_column($mapped, 'assy_number'))),
                    'firm_count' => count(array_filter($mapped, fn ($item) => ($item['order_type'] ?? '') === 'FIRM')),
                    'forecast_count' => count(array_filter($mapped, fn ($item) => ($item['order_type'] ?? '') === 'FORECAST')),
                    'total_firm_qty' => array_sum(array_column(array_filter($mapped, fn ($item) => ($item['order_type'] ?? '') === 'FIRM'), 'qty')),
                    'total_forecast_qty' => array_sum(array_column(array_filter($mapped, fn ($item) => ($item['order_type'] ?? '') === 'FORECAST'), 'qty')),
                    'months_covered' => $this->monthsCovered($mapped),
                    'unknown_assy_numbers' => $unknownAssyNumbers,
                    'has_unknown_assy_numbers' => count($unknownAssyNumbers) > 0,
                    'preview' => array_slice($mapped, 0, 50),
                ],
            ]);
        } catch (\Throwable $exception) {
            Log::error('SR preview failed', [
                'error' => $exception->getMessage(),
                'trace' => $exception->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => $exception->getMessage(),
            ], 500);
        } finally {
            $this->cleanupTempFile($tempPath);
        }
    }

    public function uploadTaiwan(Request $request): RedirectResponse
    {
        return $this->uploads->upload($request);
    }

    private function monthsCovered(array $mapped): array
    {
        $months = array_values(array_unique(array_filter(array_column($mapped, 'month'))));
        sort($months);

        return $months;
    }

    private function storeTempFile($file): string
    {
        $filename = 'sr_temp_'.uniqid('', true).'.'.($file->getClientOriginalExtension() ?: 'xlsx');
        $relPath = 'temp/'.$filename;

        Storage::disk('local')->put($relPath, file_get_contents($file->getRealPath()));

        return Storage::disk('local')->path($relPath);
    }

    private function cleanupTempFile(?string $absolutePath): void
    {
        if ($absolutePath === null || ! file_exists($absolutePath)) {
            return;
        }

        $storagePath = storage_path('app');

        if (str_starts_with($absolutePath, $storagePath)) {
            Storage::disk('local')->delete(ltrim(substr($absolutePath, strlen($storagePath)), DIRECTORY_SEPARATOR));
            return;
        }

        @unlink($absolutePath);
    }
}
