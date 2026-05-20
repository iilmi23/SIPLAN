<?php

namespace App\Services;

use App\Models\UploadBatch;
use App\Services\Variance\VarianceGenerator;
use Illuminate\Support\Facades\Log;

class VarianceTriggerService
{
    public function __construct(
        private readonly VarianceGenerator $variance,
        private readonly PlanningCacheService $cache
    ) {
    }

    public function refreshForBatch(UploadBatch $batch): void
    {
        try {
            $this->variance->refreshForBatch($batch->fresh('customer'));
            $this->cache->invalidate('dashboard');
        } catch (\Throwable $exception) {
            Log::error('Variance refresh failed after SR upload', [
                'upload_batch_id' => $batch->id,
                'error' => $exception->getMessage(),
            ]);

            throw $exception;
        }
    }
}
