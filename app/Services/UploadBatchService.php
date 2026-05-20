<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\UploadBatch;
use Illuminate\Support\Str;

class UploadBatchService
{
    public function createForSrUpload(Customer $customer, ?int $portId, ?int $uploadedBy, string $sourceFile, int $sheetIndex, ?string $sheetName): UploadBatch
    {
        return UploadBatch::create([
            'batch_uuid' => (string) Str::uuid(),
            'customer_id' => $customer->id,
            'port_id' => $portId,
            'uploaded_by' => $uploadedBy,
            'source_file' => $sourceFile,
            'sheet_index' => $sheetIndex,
            'sheet_name' => $sheetName,
            'status' => 'processing',
            'record_count' => 0,
            'mapped_count' => 0,
            'unmapped_count' => 0,
            'total_qty' => 0,
        ]);
    }

    public function markCompleted(UploadBatch $batch, array $mapped, int $insertedCount, int $summaryCount, array $unknownAssyNumbers): void
    {
        $mappedCount = count(array_filter($mapped, fn ($item) => ($item['is_mapped'] ?? false) === true));
        $unmappedCount = count(array_filter($mapped, fn ($item) => ($item['is_mapped'] ?? false) === false));

        $batch->update([
            'status' => 'completed',
            'record_count' => $insertedCount,
            'mapped_count' => $mappedCount,
            'unmapped_count' => $unmappedCount,
            'total_qty' => array_sum(array_column($mapped, 'qty')),
            'notes' => trim(
                ($summaryCount > 0 ? "Summary rows: {$summaryCount}." : '').
                (empty($unknownAssyNumbers) ? '' : ' Unknown assy numbers: '.implode(', ', $unknownAssyNumbers))
            ) ?: null,
        ]);
    }

    public function markFailed(UploadBatch $batch, \Throwable $exception): void
    {
        $batch->update([
            'status' => 'failed',
            'notes' => $exception->getMessage(),
        ]);
    }
}
