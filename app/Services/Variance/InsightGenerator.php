<?php

namespace App\Services\Variance;

use App\Models\Variance\SrVarianceAnalytic;
use App\Models\Variance\SrVarianceInsight;
use App\Models\Variance\SrVarianceTrend;
use Illuminate\Support\Facades\DB;

class InsightGenerator
{
    public function rebuild(?int $customerId = null): void
    {
        SrVarianceInsight::query()
            ->when($customerId, fn ($query) => $query->where('customer_id', $customerId))
            ->delete();

        $payload = array_merge(
            $this->criticalVariance($customerId),
            $this->newAndDisappearedAssy($customerId),
            $this->suddenSpike($customerId),
            $this->unstableTrend($customerId),
            $this->weekImpact($customerId)
        );

        foreach (array_chunk($payload, 500) as $chunk) {
            SrVarianceInsight::insert($chunk);
        }
    }

    private function criticalVariance(?int $customerId): array
    {
        return SrVarianceAnalytic::query()
            ->when($customerId, fn ($query) => $query->where('customer_id', $customerId))
            ->where('classification', 'critical')
            ->orderByRaw('ABS(variance_qty) DESC')
            ->limit(20)
            ->get()
            ->map(fn ($row) => $this->payload(
                $row->customer_id,
                $row->customer_code,
                $row->assy_number,
                'critical_variance',
                'critical',
                'Critical variance detected',
                "Assy {$row->assy_number} memiliki variance {$row->variance_qty} pada {$row->customer_code}.",
                ['variance_qty' => $row->variance_qty, 'variance_percent' => $row->variance_percent]
            ))
            ->all();
    }

    private function newAndDisappearedAssy(?int $customerId): array
    {
        return SrVarianceAnalytic::query()
            ->when($customerId, fn ($query) => $query->where('customer_id', $customerId))
            ->where(fn ($query) => $query->where('is_new', true)->orWhere('is_disappeared', true))
            ->latest('analyzed_at')
            ->limit(30)
            ->get()
            ->map(function ($row) {
                $type = $row->is_new ? 'new_assy' : 'disappeared_assy';
                $title = $row->is_new ? 'New assy appears' : 'Assy disappeared';
                $message = $row->is_new
                    ? "Assy {$row->assy_number} muncul pada SR terbaru {$row->customer_code}."
                    : "Assy {$row->assy_number} hilang dari SR terbaru {$row->customer_code}.";

                return $this->payload($row->customer_id, $row->customer_code, $row->assy_number, $type, 'moderate', $title, $message, [
                    'current_qty' => $row->current_qty,
                    'previous_qty' => $row->previous_qty,
                ]);
            })
            ->all();
    }

    private function suddenSpike(?int $customerId): array
    {
        return SrVarianceAnalytic::query()
            ->when($customerId, fn ($query) => $query->where('customer_id', $customerId))
            ->whereNotNull('variance_percent')
            ->whereRaw('ABS(variance_percent) >= 50')
            ->orderByRaw('ABS(variance_percent) DESC')
            ->limit(20)
            ->get()
            ->map(fn ($row) => $this->payload(
                $row->customer_id,
                $row->customer_code,
                $row->assy_number,
                'sudden_spike',
                'critical',
                'Sudden variance spike',
                "Assy {$row->assy_number} mengalami spike {$row->variance_percent}% pada {$row->customer_code}.",
                ['variance_percent' => $row->variance_percent]
            ))
            ->all();
    }

    private function unstableTrend(?int $customerId): array
    {
        return SrVarianceTrend::query()
            ->when($customerId, fn ($query) => $query->where('customer_id', $customerId))
            ->where('variance_volatility', '>', 100)
            ->orderByDesc('variance_volatility')
            ->limit(20)
            ->get()
            ->map(fn ($row) => $this->payload(
                $row->customer_id,
                $row->customer_code,
                $row->assy_number,
                'unstable_trend',
                'moderate',
                'Unstable trend detected',
                "Assy {$row->assy_number} memiliki volatilitas {$row->variance_volatility} selama histori {$row->period_key}.",
                ['volatility' => $row->variance_volatility, 'period' => $row->period_key]
            ))
            ->all();
    }

    private function weekImpact(?int $customerId): array
    {
        $row = SrVarianceAnalytic::query()
            ->selectRaw('production_week, SUM(ABS(variance_qty)) as impact')
            ->when($customerId, fn ($query) => $query->where('customer_id', $customerId))
            ->whereNotNull('production_week')
            ->groupBy('production_week')
            ->orderByDesc('impact')
            ->first();

        if (! $row) {
            return [];
        }

        return [$this->payload(
            $customerId,
            null,
            null,
            'week_impact',
            'moderate',
            'Highest variance week',
            "Variance tertinggi terjadi pada Week {$row->production_week} dengan impact {$row->impact}.",
            ['week' => $row->production_week, 'impact' => $row->impact]
        )];
    }

    private function payload(?int $customerId, ?string $customerCode, ?string $assyNumber, string $type, string $severity, string $title, string $message, array $payload): array
    {
        return [
            'customer_id' => $customerId,
            'customer_code' => $customerCode,
            'assy_number' => $assyNumber,
            'insight_type' => $type,
            'severity' => $severity,
            'title' => $title,
            'message' => $message,
            'payload' => json_encode($payload),
            'generated_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }
}
