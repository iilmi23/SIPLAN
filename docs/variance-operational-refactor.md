# Variance Operational Refactor

Variance is now scoped as an operational dashboard feature, not a BI-style analytics module.

## Active Flow

1. SR upload completes a batch.
2. `VarianceTriggerService` calls `VarianceGenerator`.
3. `VarianceGenerator` compares the completed batch against the previous completed batch for the same customer.
4. Detail rows are stored in `sr_variance_analytics`.
5. Lightweight per-batch dashboard rows are stored in `sr_variance_dashboard_summaries`.
6. The main dashboard reads:
   - KPI cards from latest dashboard summaries per customer.
   - Customer line chart from recent dashboard summaries.
   - Top 10 changes from latest variance detail rows.
   - Recent activity from the same top changes payload.

## Preserved Core Logic

- Completed batch comparison.
- `FIRM` order variance.
- `variance_qty`.
- `variance_percent`.
- `classification`.
- `is_new`.
- `is_disappeared`.
- Variance history in `sr_variance_analytics`.
- Excel export from `/variance/export`.

## Removed From The UI

These are no longer exposed as user-facing features:

- Variance sidebar menu.
- Variance permission catalog item.
- Standalone variance analytics page.
- Variance report page.

## Disabled Heavy Analytics

These are no longer rebuilt in the operational variance flow:

- `TrendGenerator`
- `ForecastGenerator`
- `InsightGenerator`
- `sr_variance_trends`
- `sr_variance_forecasts`
- `sr_variance_insights`
- Standalone variance page and report view were removed.

## Recommended Cleanup

After the operational dashboard is validated in production:

1. Drop or archive the deprecated trend, forecast, and insight tables.
2. Remove the deprecated generators and models:
   - `SrVarianceTrend`
   - `SrVarianceForecast`
   - `SrVarianceInsight`
3. Keep `sr_variance_analytics` and `sr_variance_dashboard_summaries`.
