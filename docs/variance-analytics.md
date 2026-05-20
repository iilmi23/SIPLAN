# Variance Analytics Structure

SIPLAN variance analytics is split into two paths:

1. Request path: read-only dashboard queries from materialized analytics tables.
2. Generation path: batch upload or `php artisan variance:warmup` generates analytics snapshots and derived summaries.

## Data Flow

Raw SR data -> summaries -> legacy variance engine -> `sr_variance_analytics` -> trend/forecast/insight tables -> dashboard.

The legacy engine remains the source of truth for comparison behavior:

- `FIRM` only.
- `summaries.total_qty` first, fallback to `srs.qty`.
- `variance_qty = current_qty - previous_qty`.
- Logistics key: assy number, order type, month, week, ETD, ETA, and port.

## Services

- `VarianceGenerator`: materializes variance rows for completed upload batches.
- `TrendGenerator`: creates monthly trend summaries from variance analytics.
- `ForecastGenerator`: creates lightweight moving-average and slope projections.
- `InsightGenerator`: creates rule-based insights and alerts.
- `AnalyticsCacheService`: versions dashboard cache and invalidates it when analytics/source data changes.
- `VarianceAnalyticsService`: read-only dashboard/export/report facade.

## Operational Notes

Run initial historical materialization manually after migration:

```bash
php artisan variance:warmup
```

Useful scoped runs:

```bash
php artisan variance:warmup --customer=YNA
php artisan variance:warmup --batch=123
php artisan variance:warmup --limit=50
```

Dashboard requests do not warm up or rebuild analytics. They only read analytics tables and cached aggregates.
