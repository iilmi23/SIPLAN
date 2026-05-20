# SIPLAN Architecture Hardening

SIPLAN tetap memakai arsitektur monolith Laravel + Inertia React. Fokus hardening adalah membuat workflow manufacturing lebih stabil tanpa mengubah business flow lama.

## Workflow Utama

```text
SR Upload
-> customer mapper
-> production week resolver
-> master assy resolver
-> upload batch
-> srs insert
-> summaries materialized aggregation
-> variance refresh
-> Summary / SPP / Dashboard
```

## Service Layer

- `SRUploadService`
  Orchestrator upload SR. Service ini menjaga urutan proses bisnis tetap sama dan membuat controller tetap tipis.
- `SRMapperService`
  Memilih mapper per customer (`YNA`, `YC`, `TYC`, `SAI`) atau `GenericTemplateMapper`.
- `WeekResolverService`
  Mengisi `week`, `month`, dan `year` berdasarkan ETD dan `production_weeks` / `etd_mappings`.
- `MasterAssyResolverService`
  Mencocokkan `assy_number` ke master `assy` dan menandai mapped/unmapped.
- `UploadBatchService`
  Membuat dan mengubah status `upload_batches`.
- `SummaryGeneratorService`
  Menghasilkan materialized aggregation ke tabel `summaries`.
- `VarianceTriggerService`
  Menjalankan refresh variance setelah upload batch selesai.
- `PlanningCacheService`
  Cache ringan berbasis `Cache::remember()` dengan version invalidation untuk summary dan dashboard.

## Summary Layer

Summary list diarahkan untuk membaca:

- `upload_batches`
- `summaries`

Raw table `srs` tetap dipakai untuk detail/export karena tampilan detail masih membutuhkan baris SR lengkap dan pivot existing. Jika database lama belum memiliki data `summaries`, service masih punya fallback ke agregasi lama dari `srs`.

## Query Strategy

- Upload memakai chunk insert per 500 row.
- Summary list memakai pagination dan aggregate dari `summaries`.
- Variance detail sudah memakai pagination.
- Index workflow ditambahkan lewat migration `2026_05_12_020000_add_siplan_workflow_indexes.php`.

## Cache Strategy

Cache bersifat optional dan tidak membutuhkan Redis. File/database cache Laravel tetap bisa dipakai.

Invalidation dilakukan saat:

- upload SR selesai
- summary regenerate
- summary/upload batch delete
- variance refresh

## Design Boundary

Hardening ini sengaja tidak menambahkan microservice, event bus kompleks, websocket, atau AI/ML. SIPLAN tetap diarahkan sebagai internal manufacturing planning platform dengan workflow terintegrasi: SR -> Summary -> SPP -> Production Plan -> Assy Plan.
