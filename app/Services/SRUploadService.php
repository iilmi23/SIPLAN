<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\SR;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class SRUploadService
{
    public function __construct(
        private readonly SRMapperService $mapper,
        private readonly WeekResolverService $weeks,
        private readonly MasterAssyResolverService $assyResolver,
        private readonly UploadBatchService $batches,
        private readonly SummaryGeneratorService $summaries,
        private readonly VarianceTriggerService $variance,
        private readonly PlanningCacheService $cache
    ) {
    }

    public function upload(Request $request): RedirectResponse
    {
        $tempPath = null;

        try {
            $customer = Customer::with('ports')->findOrFail($request->customer);
            $sheetIndex = (int) $request->sheet;
            $file = $request->file('file');
            $tempPath = $this->storeTempFile($file);
            $originalName = $file->getClientOriginalName();

            Log::info('SR upload started', [
                'file' => $originalName,
                'customer_id' => $customer->id,
                'customer' => $customer->code,
                'sheet_index' => $sheetIndex,
                'uploaded_by' => Auth::id(),
            ]);

            [$portId, $portName] = $this->resolvePort($request, $customer);
            [$mapped, $sheetName] = $this->mapper->mapUploadedSheet($tempPath, $customer, $sheetIndex);

            if (empty($mapped)) {
                return redirect()->back()->with('error', 'Mapping gagal: tidak ada data valid.');
            }

            $mapped = $this->weeks->applyProductionWeeks($mapped, $customer->id);
            [$mapped, $unknownAssyNumbers] = $this->assyResolver->apply($mapped);
            $uploadBatch = $this->batches->createForSrUpload($customer, $portId, Auth::id(), $originalName, $sheetIndex, $sheetName);
            $mapped = $this->decorateRows($mapped, $customer->code, $uploadBatch, $originalName, $sheetIndex, $sheetName, $portName);

            DB::beginTransaction();

            try {
                $insertedCount = 0;

                foreach (array_chunk($mapped, 500) as $chunk) {
                    SR::insert($chunk);
                    $insertedCount += count($chunk);
                }

                $summaryCount = $this->summaries->regenerateForBatch($mapped, $uploadBatch);
                $this->batches->markCompleted($uploadBatch, $mapped, $insertedCount, $summaryCount, $unknownAssyNumbers);

                DB::commit();
            } catch (\Throwable $exception) {
                DB::rollBack();
                $this->batches->markFailed($uploadBatch, $exception);

                Log::error('SR upload database write failed', [
                    'upload_batch_id' => $uploadBatch->id,
                    'error' => $exception->getMessage(),
                ]);

                return redirect()->back()->with('error', 'Gagal menyimpan ke database: '.$exception->getMessage());
            }

            $this->variance->refreshForBatch($uploadBatch);
            $this->cache->invalidate();

            return redirect()
                ->route('summary.index')
                ->with($this->messageType($unknownAssyNumbers), $this->successMessage($mapped, $unknownAssyNumbers));
        } catch (\Throwable $exception) {
            Log::error('SR upload failed', [
                'error' => $exception->getMessage(),
                'trace' => $exception->getTraceAsString(),
            ]);

            return redirect()->back()->with('error', 'Upload gagal: '.$exception->getMessage());
        } finally {
            $this->cleanupTempFile($tempPath);
        }
    }

    private function resolvePort(Request $request, Customer $customer): array
    {
        if ($customer->ports->isNotEmpty()) {
            if (! $request->filled('port')) {
                throw new \DomainException('Port wajib diisi untuk customer '.$customer->name.'.');
            }

            $port = $customer->ports()->findOrFail($request->port);

            return [$port->id, $port->name];
        }

        if ($request->filled('port')) {
            $port = $customer->ports()->findOrFail($request->port);

            return [$port->id, $port->name];
        }

        return [null, null];
    }

    private function decorateRows(array $mapped, string $customerCode, $uploadBatch, string $sourceFile, int $sheetIndex, ?string $sheetName, ?string $portName): array
    {
        $now = now();

        foreach ($mapped as &$item) {
            $item['source_file'] = $sourceFile;
            $item['upload_batch'] = $uploadBatch->batch_uuid;
            $item['upload_batch_id'] = $uploadBatch->id;
            $item['sheet_index'] = $sheetIndex;
            $item['sheet_name'] = $sheetName;
            $item['port'] = $portName ?? ($item['port'] ?? null);
            $item['customer'] = $customerCode;
            $item['created_at'] = $now;
            $item['updated_at'] = $now;
        }
        unset($item);

        return $mapped;
    }

    private function successMessage(array $mapped, array $unknownAssyNumbers): string
    {
        $mappedCount = count(array_filter($mapped, fn ($item) => ($item['is_mapped'] ?? false) === true));
        $unmappedCount = count(array_filter($mapped, fn ($item) => ($item['is_mapped'] ?? false) === false));
        $message = sprintf(
            'Upload berhasil! Total records: %d (Mapped: %d, Unmapped: %d, Total Qty: %s). Selanjutnya buka Summary untuk lihat batch terbaru.',
            count($mapped),
            $mappedCount,
            $unmappedCount,
            number_format(array_sum(array_column($mapped, 'qty')))
        );

        if (! empty($unknownAssyNumbers)) {
            $message .= ' Ada assy number yang tidak dikenal. Cek master assy atau proses remap sebelum dipakai lebih lanjut.';
        }

        return $message;
    }

    private function messageType(array $unknownAssyNumbers): string
    {
        return empty($unknownAssyNumbers) ? 'success' : 'warning';
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
