<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\UploadBatch;
use App\Services\Variance\AnalyticsCacheService;
use App\Services\Variance\VarianceGenerator;
use Illuminate\Console\Command;

class WarmupVarianceAnalytics extends Command
{
    protected $signature = 'variance:warmup
        {--customer= : Customer code or id to warm up}
        {--batch= : Single upload batch id to regenerate}
        {--limit= : Optional max number of completed batches to process}';

    protected $description = 'Generate materialized SR variance analytics from completed SR batches.';

    public function handle(VarianceGenerator $generator, AnalyticsCacheService $cache): int
    {
        $query = UploadBatch::query()
            ->with('customer')
            ->where('status', 'completed');

        if ($batchId = $this->option('batch')) {
            $query->whereKey((int) $batchId);
        }

        if ($customer = $this->option('customer')) {
            $customerModel = Customer::query()
                ->where('code', $customer)
                ->orWhere('id', is_numeric($customer) ? (int) $customer : 0)
                ->first();

            if (! $customerModel) {
                $this->error("Customer {$customer} not found.");

                return self::FAILURE;
            }

            $query->where('customer_id', $customerModel->id);
        }

        $limit = $this->option('limit') ? (int) $this->option('limit') : null;
        $processed = 0;
        $customerIds = [];

        $this->info('Generating variance analytics from completed batches...');

        $query->chunkById(50, function ($batches) use ($generator, $limit, &$processed, &$customerIds) {
            foreach ($batches as $batch) {
                if ($limit !== null && $processed >= $limit) {
                    return false;
                }

                $generator->refreshForBatch($batch, rebuildDerived: false);
                $customerIds[$batch->customer_id] = $batch->customer_id;
                $processed++;
                $this->line("Processed batch #{$batch->id} ({$batch->source_file})");
            }

            return true;
        });

        foreach ($customerIds as $customerId) {
            $generator->rebuildDerived($customerId);
        }

        if (empty($customerIds)) {
            $cache->invalidate();
        }
        $this->info("Variance warmup completed. Batches processed: {$processed}");

        return self::SUCCESS;
    }
}
