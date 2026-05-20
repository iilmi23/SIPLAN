<?php

namespace App\Services;

use App\Models\Summary;
use App\Models\UploadBatch;

class SummaryGeneratorService
{
    public function __construct(private readonly PlanningCacheService $cache)
    {
    }

    public function regenerateForBatch(array $mapped, UploadBatch $uploadBatch): int
    {
        Summary::where('upload_batch_id', $uploadBatch->id)->delete();

        $buckets = collect($mapped)
            ->filter(fn ($item) => ! empty($item['assy_number']))
            ->groupBy(fn ($item) => implode('|', [
                $item['assy_number'] ?? '',
                $item['order_type'] ?? '',
                $item['month'] ?? '',
                $item['week'] ?? '',
                $item['etd'] ?? '',
                $item['eta'] ?? '',
                $item['port'] ?? '',
            ]))
            ->map(function ($rows) use ($uploadBatch) {
                $first = $rows->first();

                return [
                    'upload_batch_id' => $uploadBatch->id,
                    'customer_id' => $uploadBatch->customer_id,
                    'port_id' => $uploadBatch->port_id,
                    'assy_id' => $first['assy_id'] ?? null,
                    'upload_batch' => $uploadBatch->batch_uuid,
                    'customer' => $first['customer'] ?? $uploadBatch->customer?->code,
                    'source_file' => $first['source_file'] ?? $uploadBatch->source_file,
                    'sheet_name' => $first['sheet_name'] ?? $uploadBatch->sheet_name,
                    'assy_number' => $first['assy_number'],
                    'model' => $first['model'] ?? null,
                    'family' => $first['family'] ?? null,
                    'order_type' => $first['order_type'] ?? null,
                    'month' => $first['month'] ?? null,
                    'week' => $first['week'] ?? null,
                    'etd' => $first['etd'] ?? null,
                    'eta' => $first['eta'] ?? null,
                    'port' => $first['port'] ?? null,
                    'line_count' => $rows->count(),
                    'total_qty' => $rows->sum(fn ($item) => (int) ($item['qty'] ?? 0)),
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            })
            ->values();

        foreach ($buckets->chunk(500) as $chunk) {
            Summary::insert($chunk->all());
        }

        $this->cache->invalidate('summary');
        $this->cache->invalidate('dashboard');

        return $buckets->count();
    }
}
