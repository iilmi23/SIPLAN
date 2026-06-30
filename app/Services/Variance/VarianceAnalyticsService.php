<?php

namespace App\Services\Variance;

use App\Models\Variance\SrVarianceAnalytic;
use App\Models\Variance\SrVarianceDashboardSummary;

use App\Services\Variance\AnalyticsCacheService;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Auth;

class VarianceAnalyticsService
{
    public function __construct(private readonly AnalyticsCacheService $cache)
    {
    }

    public function dashboard(array $filters): array
    {
        return [
            'kpis' => $this->cache->remember('kpis', $filters, fn () => $this->kpis($filters)),
            'historical' => [
                'monthly' => $this->cache->remember('monthly', $filters, fn () => $this->monthlyTrend($filters)),
                'by_customer' => $this->cache->remember('customer_trend', $filters, fn () => $this->customerTrend($filters)),
                'by_assy' => $this->cache->remember('assy_trend', $filters, fn () => $this->assyTrend($filters)),
                'heatmap' => $this->cache->remember('heatmap', $filters, fn () => $this->heatmap($filters)),
            ],
            'top' => $this->cache->remember('top', $filters, fn () => $this->topAnalytics($filters)),
            'distribution' => $this->cache->remember('distribution', $filters, fn () => $this->distribution($filters), 20),

            'recent_activity' => $this->cache->remember('recent_activity', $filters, fn () => $this->recentActivity($filters), 5),
            'alerts' => $this->cache->remember('alerts', $filters, fn () => $this->alerts($filters), 5),
            'meta' => [
                'generated_at' => now()->toDateTimeString(),
                'rows_considered' => $this->cache->remember('rows_count', $filters, fn () => $this->filteredAnalyticsQuery($filters)->count()),
                'analytics_cached' => true,
                'read_only' => true,
            ],
        ];
    }

    public function dashboardOverview(): array
    {
        return $this->operationalDashboard();
    }

    public function operationalDashboard(): array
    {
        return $this->cache->remember('operational_dashboard', [], function () {
            $latestSummaries = $this->latestDashboardSummaries();
            $latestBatchIds = $latestSummaries->pluck('current_batch_id')->filter()->values();

            if ($latestSummaries->isEmpty()) {
                return [
                    'kpis' => [
                        'changed_assy_count' => 0,
                        'increase_count' => 0,
                        'decrease_count' => 0,
                        'critical_count' => 0,
                    ],
                    'trend' => [
                        'customers' => [],
                        'points' => [],
                    ],
                    'top_changes' => [],
                    'recent_activity' => [],
                    'meta' => [
                        'latest_batch_ids' => [],
                        'generated_at' => now()->toDateTimeString(),
                    ],
                ];
            }

            $topChanges = $this->dashboardRows($latestBatchIds->all())
                ->orderByRaw('ABS(variance_qty) DESC')
                ->limit(10)
                ->get()
                ->map(fn ($row) => $this->dashboardRow($row))
                ->values()
                ->all();

            return [
                'kpis' => [
                    'changed_assy_count' => (int) $latestSummaries->sum('changed_assy_count'),
                    'increase_count' => (int) $latestSummaries->sum('increase_count'),
                    'decrease_count' => (int) $latestSummaries->sum('decrease_count'),
                    'critical_count' => (int) $latestSummaries->sum('critical_count'),
                ],
                'trend' => $this->customerVarianceTrend(),
                'top_changes' => $topChanges,
                'recent_activity' => $this->dashboardActivity($topChanges),
                'meta' => [
                    'latest_batch_ids' => $latestBatchIds->all(),
                    'generated_at' => now()->toDateTimeString(),
                ],
            ];
        }, 10);
    }

    private function latestDashboardSummaries()
    {
        $latestIdsQuery = SrVarianceDashboardSummary::query();
        if (Auth::check() && !Auth::user()?->isAdmin()) {
            $latestIdsQuery->whereHas('currentBatch', function ($q) {
                $q->where('uploaded_by', Auth::id());
            });
        }
        $latestIds = $latestIdsQuery
            ->selectRaw('MAX(id) as id')
            ->groupBy('customer_id')
            ->pluck('id');

        if ($latestIds->isEmpty()) {
            return collect();
        }

        return SrVarianceDashboardSummary::query()
            ->whereIn('id', $latestIds)
            ->orderBy('customer_code')
            ->get();
    }

    private function customerVarianceTrend(): array
    {
        $rowsQuery = SrVarianceDashboardSummary::query();
        if (Auth::check() && !Auth::user()?->isAdmin()) {
            $rowsQuery->whereHas('currentBatch', function ($q) {
                $q->where('uploaded_by', Auth::id());
            });
        }
        $rows = $rowsQuery
            ->orderByDesc('current_batch_id')
            ->limit(80)
            ->get()
            ->sortBy('current_batch_id')
            ->values();

        $customers = $rows
            ->pluck('customer_code')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $points = $rows
            ->groupBy('current_batch_id')
            ->map(function ($batchRows, $batchId) {
                $first = $batchRows->first();
                $point = [
                    'period' => 'B'.$batchId,
                    'label' => $first->period_label,
                ];

                foreach ($batchRows as $row) {
                    if ($row->customer_code) {
                        $point[$row->customer_code] = (int) $row->total_variance_qty;
                    }
                }

                return $point;
            })
            ->values()
            ->all();

        return [
            'customers' => $customers,
            'points' => $points,
        ];
    }

    private function dashboardRows(array $batchIds): Builder
    {
        return SrVarianceAnalytic::query()
            ->whereIn('current_batch_id', $batchIds)
            ->where('variance_qty', '<>', 0);
    }

    private function dashboardRow(SrVarianceAnalytic $row): array
    {
        return [
            'customer' => $row->customer_code,
            'assy_number' => $row->assy_number,
            'previous_qty' => (int) $row->previous_qty,
            'current_qty' => (int) $row->current_qty,
            'variance_qty' => (int) $row->variance_qty,
            'classification' => $row->classification,
            'is_new' => (bool) $row->is_new,
            'is_disappeared' => (bool) $row->is_disappeared,
        ];
    }

    private function dashboardActivity(array $rows): array
    {
        return collect($rows)
            ->take(8)
            ->map(function ($row) {
                $delta = (int) ($row['variance_qty'] ?? 0);
                $direction = $delta >= 0 ? 'naik' : 'turun';
                $signed = $delta > 0 ? '+'.$delta : (string) $delta;

                return [
                    'assy_number' => $row['assy_number'] ?? '-',
                    'customer' => $row['customer'] ?? '-',
                    'message' => trim(($row['assy_number'] ?? '-').' '.($row['customer'] ?? '').' '.$direction.' '.$signed),
                    'variance_qty' => $delta,
                    'classification' => $row['classification'] ?? 'normal',
                ];
            })
            ->values()
            ->all();
    }

    public function exportRows(array $filters)
    {
        return $this->filteredAnalyticsQuery($filters)
            ->orderByDesc('year')
            ->orderByDesc('month_number')
            ->orderByRaw('ABS(variance_qty) DESC')
            ->limit(10000)
            ->cursor();
    }

    public function paginatedRows(array $filters, int $page, int $perPage): LengthAwarePaginator
    {
        $rows = $this->filteredAnalyticsQuery($filters)
            ->with(['currentBatch:id,source_file', 'previousBatch:id,source_file'])
            ->orderByRaw('ABS(variance_qty) DESC')
            ->paginate($perPage, ['*'], 'page', $page);

        $rows->setCollection($rows->getCollection()->map(fn ($row) => $this->detailRow($row)));

        return $rows;
    }

    private function filteredAnalyticsQuery(array $filters): Builder
    {
        $query = SrVarianceAnalytic::query()
            ->with(['customer:id,code,name', 'currentBatch:id,source_file,created_at', 'previousBatch:id,source_file,created_at']);

        if (Auth::check() && !Auth::user()?->isAdmin()) {
            $query->whereHas('currentBatch', function ($q) {
                $q->where('uploaded_by', Auth::id());
            });
        }

        return $query
            ->when($filters['customer_id'] ?? null, fn ($query, $id) => $query->where('customer_id', $id))
            ->when($filters['batch_id'] ?? null, fn ($query, $id) => $query->where('current_batch_id', $id))
            ->when($filters['assy_number'] ?? null, fn ($query, $assy) => $query->where('assy_number', 'like', "%{$assy}%"))
            ->when($filters['port'] ?? null, fn ($query, $port) => $query->where('port', $port))
            ->when($filters['month_number'] ?? null, fn ($query, $month) => $query->where('month_number', (int) $month))
            ->when($filters['year'] ?? null, fn ($query, $year) => $query->where('year', (int) $year))
            ->when($filters['production_week'] ?? null, fn ($query, $week) => $query->where('production_week', (int) $week))
            ->when($filters['variance_status'] ?? null, fn ($query, $status) => $query->where('classification', $status))
            ->when($filters['threshold'] ?? null, fn ($query, $threshold) => $query->whereRaw('ABS(COALESCE(variance_percent, variance_qty)) >= ?', [(float) $threshold]))
            ->when($filters['etd_from'] ?? null, fn ($query, $date) => $query->whereDate('etd', '>=', $date))
            ->when($filters['etd_to'] ?? null, fn ($query, $date) => $query->whereDate('etd', '<=', $date))
            ->when($filters['eta_from'] ?? null, fn ($query, $date) => $query->whereDate('eta', '>=', $date))
            ->when($filters['eta_to'] ?? null, fn ($query, $date) => $query->whereDate('eta', '<=', $date));
    }

    private function kpis(array $filters): array
    {
        $base = $this->filteredAnalyticsQuery($filters);
        $aggregate = (clone $base)
            ->selectRaw(
                'COALESCE(SUM(variance_qty), 0) as total_variance, '.
                'SUM(CASE WHEN variance_qty > 0 THEN 1 ELSE 0 END) as increased_items, '.
                'SUM(CASE WHEN variance_qty < 0 THEN 1 ELSE 0 END) as decreased_items, '.
                "SUM(CASE WHEN classification = 'critical' THEN 1 ELSE 0 END) as critical_variance_count, ".
                'SUM(CASE WHEN is_new THEN 1 ELSE 0 END) as new_assy_count, '.
                'SUM(CASE WHEN is_disappeared THEN 1 ELSE 0 END) as disappeared_assy_count, '.
                'COALESCE(SUM(current_qty), 0) as total_current_qty, '.
                'COALESCE(SUM(previous_qty), 0) as total_previous_qty, '.
                'COUNT(DISTINCT assy_number) as changed_assy_numbers'
            )
            ->first();
        $highest = (clone $base)->orderByRaw('ABS(variance_qty) DESC')->first();

        return [
            'total_variance' => (int) ($aggregate->total_variance ?? 0),
            'increased_items' => (int) ($aggregate->increased_items ?? 0),
            'decreased_items' => (int) ($aggregate->decreased_items ?? 0),
            'highest_variance' => $highest ? [
                'value' => (int) $highest->variance_qty,
                'assy_number' => $highest->assy_number,
                'customer' => $highest->customer_code,
            ] : ['value' => 0, 'assy_number' => null, 'customer' => null],
            'stable_assy_count' => $this->trendQuery($filters)->where('trend_direction', 'stable')->distinct('assy_number')->count('assy_number'),
            'critical_variance_count' => (int) ($aggregate->critical_variance_count ?? 0),
            'new_assy_count' => (int) ($aggregate->new_assy_count ?? 0),
            'disappeared_assy_count' => (int) ($aggregate->disappeared_assy_count ?? 0),
            'total_current_qty' => (int) ($aggregate->total_current_qty ?? 0),
            'total_previous_qty' => (int) ($aggregate->total_previous_qty ?? 0),
            'changed_assy_numbers' => (int) ($aggregate->changed_assy_numbers ?? 0),
        ];
    }

    private function monthlyTrend(array $filters): array
    {
        return $this->filteredAnalyticsQuery($filters)
            ->selectRaw('year, month_number, SUM(variance_qty) as variance_qty, SUM(current_qty) as current_qty')
            ->whereNotNull('year')
            ->whereNotNull('month_number')
            ->groupBy('year', 'month_number')
            ->orderBy('year')
            ->orderBy('month_number')
            ->limit(36)
            ->get()
            ->map(fn ($row) => [
                'label' => sprintf('%s-%02d', $row->year, $row->month_number),
                'variance_qty' => (int) $row->variance_qty,
                'current_qty' => (int) $row->current_qty,
            ])
            ->values()
            ->all();
    }

    private function customerTrend(array $filters): array
    {
        return $this->filteredAnalyticsQuery($filters)
            ->selectRaw('customer_code, SUM(variance_qty) as variance_qty, SUM(current_qty) as current_qty')
            ->groupBy('customer_code')
            ->orderByRaw('ABS(SUM(variance_qty)) DESC')
            ->limit(12)
            ->get()
            ->map(fn ($row) => [
                'label' => $row->customer_code ?: '-',
                'variance_qty' => (int) $row->variance_qty,
                'current_qty' => (int) $row->current_qty,
            ])
            ->values()
            ->all();
    }

    private function assyTrend(array $filters): array
    {
        return $this->trendQuery($filters)
            ->selectRaw('assy_number, SUM(total_variance_qty) as variance_qty, AVG(variance_volatility) as volatility')
            ->groupBy('assy_number')
            ->orderByRaw('ABS(SUM(total_variance_qty)) DESC')
            ->limit(12)
            ->get()
            ->map(fn ($row) => [
                'label' => $row->assy_number ?: '-',
                'variance_qty' => (int) $row->variance_qty,
                'volatility' => round((float) $row->volatility, 2),
            ])
            ->values()
            ->all();
    }

    private function heatmap(array $filters): array
    {
        return $this->filteredAnalyticsQuery($filters)
            ->selectRaw('month_number, production_week, SUM(ABS(variance_qty)) as intensity')
            ->whereNotNull('month_number')
            ->whereNotNull('production_week')
            ->groupBy('month_number', 'production_week')
            ->orderBy('month_number')
            ->orderBy('production_week')
            ->get()
            ->map(fn ($row) => [
                'month' => (int) $row->month_number,
                'week' => (int) $row->production_week,
                'intensity' => (int) $row->intensity,
            ])
            ->values()
            ->all();
    }

    private function topAnalytics(array $filters): array
    {
        return [
            'increase' => $this->topRows($filters, 'desc', 10),
            'decrease' => $this->topRows($filters, 'asc', 10),
            'volatile_assy' => $this->volatileAssy($filters),
            'stable_assy' => $this->stableAssy($filters),
            'customer_growth' => $this->customerGrowth($filters),
            'impacted_ports' => $this->impactedPorts($filters),
        ];
    }

    private function distribution(array $filters): array
    {
        $expression = 'COALESCE(variance_percent, variance_qty)';
        $stats = $this->filteredAnalyticsQuery($filters)
            ->selectRaw("AVG({$expression}) as mean, STDDEV_POP({$expression}) as stddev, MIN({$expression}) as min_value, MAX({$expression}) as max_value")
            ->first();
        $mean = (float) ($stats->mean ?? 0);
        $stddev = (float) ($stats->stddev ?? 0);
        $min = floor((float) ($stats->min_value ?? 0));
        $max = ceil((float) ($stats->max_value ?? 0));
        $range = max($max - $min, 1);
        $bucketSize = max(1, (int) ceil($range / 12));

        $bins = collect(range(0, 11))->map(function ($index) use ($filters, $expression, $min, $bucketSize, $mean, $stddev) {
            $from = $min + ($index * $bucketSize);
            $to = $from + $bucketSize;
            $center = ($from + $to) / 2;
            $normal = $stddev > 0
                ? (1 / ($stddev * sqrt(2 * pi()))) * exp(-0.5 * (($center - $mean) / $stddev) ** 2)
                : 0;

            return [
                'label' => "{$from}..{$to}",
                'from' => $from,
                'to' => $to,
                'count' => $this->filteredAnalyticsQuery($filters)
                    ->whereRaw("{$expression} >= ?", [$from])
                    ->whereRaw("{$expression} < ?", [$to])
                    ->count(),
                'normal_curve' => round($normal, 6),
            ];
        })->all();

        return [
            'mean' => round($mean, 2),
            'standard_deviation' => round($stddev, 2),
            'bins' => $bins,
            'outliers' => $this->filteredAnalyticsQuery($filters)
                ->where(function ($query) use ($expression, $mean, $stddev) {
                    $spread = 2 * max($stddev, 1);
                    $query->whereRaw("{$expression} > ?", [$mean + $spread])
                        ->orWhereRaw("{$expression} < ?", [$mean - $spread]);
                })
                ->orderByRaw('ABS(variance_qty) DESC')
                ->limit(10)
                ->get()
                ->map(fn ($row) => $this->activityRow($row))
                ->values(),
            'interpretation' => 'Near mean is normal movement; outside mean +/- 2 standard deviations is abnormal variance.',
        ];
    }

    private function topRows(array $filters, string $direction, int $limit): array
    {
        $query = $this->filteredAnalyticsQuery($filters)
            ->where('variance_qty', $direction === 'desc' ? '>' : '<', 0);

        $direction === 'desc'
            ? $query->orderByDesc('variance_qty')
            : $query->orderBy('variance_qty');

        return $query->limit($limit)->get()->map(fn ($row) => $this->activityRow($row))->values()->all();
    }

    private function topAssyNumbers(): array
    {
        return $this->filteredAnalyticsQuery([])
            ->orderByRaw('ABS(variance_qty) DESC')
            ->limit(5)
            ->get()
            ->map(fn ($row) => $this->activityRow($row))
            ->values()
            ->all();
    }

    private function volatileAssy(array $filters): array
    {
        return $this->trendQuery($filters)
            ->selectRaw('assy_number, customer_code, COUNT(*) as points, AVG(variance_volatility) as volatility, SUM(total_variance_qty) as variance_qty')
            ->groupBy('assy_number', 'customer_code')
            ->orderByDesc('volatility')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'assy_number' => $row->assy_number,
                'customer' => $row->customer_code,
                'points' => (int) $row->points,
                'volatility' => round((float) $row->volatility, 2),
                'variance_qty' => (int) $row->variance_qty,
            ])
            ->values()
            ->all();
    }

    private function stableAssy(array $filters): array
    {
        return $this->trendQuery($filters)
            ->selectRaw('assy_number, customer_code, COUNT(*) as points, AVG(variance_volatility) as volatility, SUM(ABS(total_variance_qty)) as movement')
            ->groupBy('assy_number', 'customer_code')
            ->orderBy('volatility')
            ->orderBy('movement')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'assy_number' => $row->assy_number,
                'customer' => $row->customer_code,
                'points' => (int) $row->points,
                'volatility' => round((float) $row->volatility, 2),
                'movement' => (int) $row->movement,
            ])
            ->values()
            ->all();
    }

    private function customerGrowth(array $filters): array
    {
        return $this->trendQuery($filters)
            ->selectRaw('customer_code, SUM(total_variance_qty) as variance_qty, AVG(average_growth) as average_growth')
            ->groupBy('customer_code')
            ->orderByDesc('average_growth')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'customer' => $row->customer_code,
                'variance_qty' => (int) $row->variance_qty,
                'average_growth' => round((float) $row->average_growth, 2),
            ])
            ->values()
            ->all();
    }

    private function impactedPorts(array $filters): array
    {
        return $this->filteredAnalyticsQuery($filters)
            ->selectRaw('port, SUM(ABS(variance_qty)) as impact, COUNT(*) as changes')
            ->whereNotNull('port')
            ->groupBy('port')
            ->orderByDesc('impact')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'port' => $row->port,
                'impact' => (int) $row->impact,
                'changes' => (int) $row->changes,
            ])
            ->values()
            ->all();
    }

    private function recentActivity(array $filters): array
    {
        return $this->filteredAnalyticsQuery($filters)
            ->latest('analyzed_at')
            ->limit(100)
            ->get()
            ->map(fn ($row) => $this->activityRow($row))
            ->values()
            ->all();
    }

    private function alerts(array $filters): array
    {
        $analyticsAlerts = $this->filteredAnalyticsQuery($filters)
            ->where(fn ($query) => $query
                ->where('classification', 'critical')
                ->orWhere('is_new', true)
                ->orWhere('is_disappeared', true)
                ->orWhereRaw('ABS(COALESCE(variance_percent, variance_qty)) >= 50'))
            ->orderByRaw('ABS(variance_qty) DESC')
            ->limit(8)
            ->get()
            ->map(function ($row) {
                $type = $row->is_new ? 'new_assy' : ($row->is_disappeared ? 'disappeared' : 'threshold');

                return array_merge($this->activityRow($row), ['alert_type' => $type]);
            })
            ->values()
            ->all();

        return $analyticsAlerts;
    }



    private function activityRow(SrVarianceAnalytic $row): array
    {
        return [
            'id' => $row->id,
            'customer' => $row->customer_code,
            'assy_number' => $row->assy_number,
            'month' => $row->month,
            'week' => $row->week,
            'production_week' => $row->production_week,
            'etd' => optional($row->etd)->toDateString(),
            'eta' => optional($row->eta)->toDateString(),
            'port' => $row->port,
            'previous_qty' => (int) $row->previous_qty,
            'current_qty' => (int) $row->current_qty,
            'variance_qty' => (int) $row->variance_qty,
            'variance_percent' => $row->variance_percent === null ? null : (float) $row->variance_percent,
            'classification' => $row->classification,
            'is_new' => (bool) $row->is_new,
            'is_disappeared' => (bool) $row->is_disappeared,
            'source_file' => $row->currentBatch?->source_file,
        ];
    }

    private function detailRow(SrVarianceAnalytic $row): array
    {
        return [
            'customer' => $row->customer_code,
            'assy_number' => $row->assy_number,
            'order_type' => $row->order_type,
            'month' => $row->month,
            'week' => $row->week,
            'etd' => optional($row->etd)->toDateString(),
            'eta' => optional($row->eta)->toDateString(),
            'port' => $row->port,
            'previous_qty' => (int) $row->previous_qty,
            'current_qty' => (int) $row->current_qty,
            'variance_qty' => (int) $row->variance_qty,
            'variance_percent' => $row->variance_percent === null ? null : (float) $row->variance_percent,
            'classification' => $row->classification,
            'current_file' => $row->currentBatch?->source_file,
            'previous_file' => $row->previousBatch?->source_file,
        ];
    }
}
