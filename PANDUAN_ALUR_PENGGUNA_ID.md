# SIPLAN - PANDUAN ALUR PENGGUNA (BAHASA INDONESIA)

---

# 🎯 ALUR BESAR APLIKASI

## RINGKASAN VISUAL

```
┌──────────────────────────────────────────────────────────────────┐
│                        LOGIN / AUTENTIKASI                        │
│              (Redirect berdasarkan status login)                   │
└──────────────────────┬───────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
    ┌───▼────┐                   ┌────▼────┐
    │ ADMIN  │                   │   PPC   │
    │ SETUP  │                   │ OPERASI │
    └───┬────┘                   └────┬────┘
        │                             │
        │ (SETUP AWAL)                │ (OPERASI HARIAN)
        │                             │
        ├─► DATA MASTER              ├─► UPLOAD FILE SR
        │   (Pelanggan, Assy, dll)   │
        │                             ├─► PREVIEW & VALIDASI
        ├─► TEMPLATE MAPPING         │
        │   (Per format pelanggan)    ├─► GENERATE SPP
        │                             │
        ├─► PRODUCTION WEEKS         ├─► LIHAT SUMMARY
        │   (Kalender setup)          │
        │                             ├─► LIHAT VARIANCE
        ├─► ETD MAPPINGS             │
        │   (Translasi tanggal)       ├─► LIHAT DASHBOARD
        │                             │
        └─► USER SETTINGS            └─► EXPORT HASIL
            (Roles, permissions)
```

---

# 👤 ROLE 1: WORKFLOW ADMIN (SETUP AWAL)

## Fase 1: KONFIGURASI AWAL (Hari Pertama)

### 1.1 Login ke Panel Admin

```
Alur:
  User → Buka URL (http://localhost)
       → Redirect ke /login (belum login)
       → Input username & password
       → Click Login
       → Redirect ke /dashboard (authenticated, role=admin)

Halaman:
  - Auth/Login.jsx
  - Form sederhana: email, password, remember me
```

### 1.2 Setup Data Master - PELANGGAN

```
Lokasi: /customers

Langkah-langkah:
  1. Click menu "Data Master" → "Pelanggan"
  2. Lihat: List semua pelanggan
     ├─ YNA (pelanggan 1)
     ├─ YC (pelanggan 2)
     ├─ TYC (pelanggan 3)
     └─ SAI (pelanggan 4)
  
  3. Tambah Pelanggan Baru:
     - Click tombol "Tambah Pelanggan"
     - Form input:
       ├─ Kode (YNA, YC, TYC, SAI)
       ├─ Nama lengkap
       ├─ Negara
       └─ Info kontak
     - Submit → Pelanggan tersimpan
  
  4. Edit Pelanggan (jika perlu):
     - Click pada baris pelanggan → Edit
     - Ubah field
     - Save → Updated

Database:
  Table: customers
  ├─ id, code, name, country, contact
  ├─ created_by, updated_by, timestamps
  └─ Relationship: hasMany(Port), hasMany(Upload)
```

### 1.3 Setup Data Master - PORT

```
Lokasi: /customers/{id}/ports (Nested under Pelanggan)

Langkah-langkah:
  1. Dari list Pelanggan → Click "Manage Ports"
  2. Lihat: List semua port untuk pelanggan ini
  3. Tambah Port:
     - Click "Tambah Port"
     - Form:
       ├─ Kode (TPEB, JPTYO, dll)
       ├─ Nama port
       ├─ Negara
       └─ Deskripsi
     - Save → Port linked ke pelanggan
  
  4. Edit/Hapus port sesuai kebutuhan

Database:
  Table: ports
  ├─ id, customer_id, code, name, country
  ├─ Relationship: belongsTo(Customer)
  └─ Used in: ETD Mapping, Summary grouping
```

### 1.4 Setup Data Master - CARLINE (Lini Produksi)

```
Lokasi: /carline

Tujuan:
  - Define lini produksi/assembly
  - Assign assy ke carline
  - Track kapasitas lini

Langkah-langkah:
  1. Click "Data Master" → "Carlines"
  2. Lihat: Semua carline
  3. Buat Carline:
     - Click "Tambah Carline"
     - Form:
       ├─ Nama (Lini A, Lini B, dll)
       ├─ Deskripsi
       ├─ Kapasitas (optional, untuk masa depan)
       └─ Status (active/inactive)
     - Save → Carline created
  
  4. Bulk Import Carlines:
     - Click "Import Carlines"
     - Download template
     - Isi data
     - Upload file
     - Preview → Confirm → Import

Database:
  Table: carlines
  ├─ id, name, description, capacity
  └─ Relationship: hasMany(Assy)
```

### 1.5 Setup Data Master - ASSEMBLY (Assy)

```
Lokasi: /assy

Tujuan:
  - Define semua assembly yang bisa dipesan pelanggan
  - Main linking point untuk validasi SR
  - Connect ke carline

Langkah-langkah:
  1. Click "Data Master" → "Assemblies"
  2. Lihat: Semua assy dengan carline & status
  
  3. Tambah Single Assy:
     - Click "Tambah Assy"
     - Form:
       ├─ Assy Number (unique)
       ├─ Carline (dropdown)
       ├─ Model (optional)
       ├─ Family (optional)
       └─ Status (active/inactive)
     - Save
  
  4. Bulk Import:
     - Click "Import Assemblies"
     - Select carline
     - Download template
     - Isi data assy
     - Upload Excel
     - Preview → Confirm → Bulk import
  
  5. Sync dengan SIREP (sistem eksternal):
     - Click "Sync SIREP"
     - System fetch assy latest dari SIREP
     - Update database lokal
     - Show results

Database:
  Table: assy
  ├─ id, carline_id, assy_number, model, family
  ├─ is_active (toggle status)
  └─ Relationship: belongsTo(Carline), hasMany(SR), hasMany(SPP)
```

### 1.6 Setup - PRODUCTION WEEKS (Kalender)

```
Lokasi: /production-week

Tujuan:
  - Define kalender produksi untuk tahun ini
  - Mark working days per minggu
  - Digunakan untuk: ETD → week resolution

Langkah-langkah:
  1. Click "Kalender" → "Production Weeks"
  2. Lihat: Grid kalender (52 minggu)
  
  3. Tambah Single Week:
     - Click "Tambah Week"
     - Form:
       ├─ Tahun (2026)
       ├─ Nomor Minggu (1-52)
       ├─ Mulai (tanggal)
       ├─ Selesai (tanggal)
       ├─ Working Days (JSON: [1,1,1,1,1,0,0] = Sen-Jum)
       └─ Status
     - Save
  
  4. Bulk Import:
     - Click "Import Kalender"
     - Download template Excel
     - Isi semua 52 minggu
     - Upload
     - Preview → Confirm → Bulk import
  
  5. Edit Week:
     - Click pada minggu
     - Ubah tanggal/working days
     - Save

Database:
  Table: production_weeks
  ├─ id, year, week_no, week_start, end_date
  ├─ working_days (JSON array)
  ├─ month_number, month_name
  └─ total_working_days (int)
```

### 1.7 Setup - TEMPLATE MAPPING SR

```
Lokasi: /sr-mapping-templates

Tujuan:
  - Define cara parse setiap format Excel pelanggan
  - 1 template per format pelanggan
  - Sistem pakai ini untuk auto-convert Excel

Langkah-langkah:
  1. Click "Upload" → "SR Mapping Templates"
  2. Lihat: List template pelanggan
     ├─ YNA Template
     ├─ YC Template
     ├─ TYC Template
     └─ SAI Template
  
  3. Buat/Edit Template:
     - Click "Buat Baru" atau "Edit"
     - Form:
       ├─ Pelanggan (dropdown)
       ├─ Nama Template
       │
       └─ Field Mapping (JSON editor):
          ├─ sr_number → Kolom A
          ├─ qty → Kolom B
          ├─ etd → Kolom C
          ├─ assy_number → Kolom D
          └─ ... (field lainnya)
     
     - Test Preview:
       ├─ Upload sample file
       ├─ System parse
       ├─ Show preview
       ├─ Verify: Kolom ter-map dengan benar
       └─ Save jika ok
  
  4. Upload Sample File untuk Test:
     - Click "Preview Excel"
     - Upload sample SR file
     - System parse & show preview
     - Adjust mapping jika perlu
     - Save template

Database:
  Table: sr_mapping_templates
  ├─ id, customer_id, template_name
  ├─ field_mapping (JSON)
  ├─ rules (JSON, optional)
  └─ Relationship: belongsTo(Customer)
```

### 1.8 Setup - ETD MAPPINGS

```
Lokasi: /etd-mapping/{customerId}

Tujuan:
  - Map custom date codes dari pelanggan ke tanggal standard
  - Contoh: YNA gunakan "W20" → map ke tanggal actual
  - Contoh: YC gunakan "2026-05-15" → standard format

Langkah-langkah:
  1. Click "Konfigurasi" → "ETD Mappings"
  2. Select Pelanggan (dropdown)
  3. Lihat: Semua ETD mapping untuk pelanggan ini
  
  4. Tambah Mapping:
     - Form:
       ├─ ETD Code Pelanggan (apa yang pelanggan kirim)
       ├─ Actual ETD Date (apa yang kita interpret)
       └─ Valid From/To (date range optional)
     - Contoh:
       ├─ Input: "W20" → Output: "2026-05-20"
       ├─ Input: "05-15" → Output: "2026-05-15"
       └─ Input: "May 15" → Output: "2026-05-15"
  
  5. Edit/Hapus mappings

Database:
  Table: etd_mappings
  ├─ id, customer_id, etd_code, actual_etd
  ├─ valid_from, valid_to
  └─ Relationship: belongsTo(Customer)
```

### 1.9 Setup - USER MANAGEMENT

```
Lokasi: /settings (Admin only)

Tujuan:
  - Tambah users ke sistem
  - Assign roles (Admin, PPC, User)
  - Manage permissions

Langkah-langkah:
  1. Click "Settings" → "Users"
  2. Lihat: Semua users
  
  3. Buat User:
     - Form:
       ├─ Nama
       ├─ Email (unique)
       ├─ Role (dropdown: Admin, PPC, User)
       ├─ Password (system generate atau user set)
       └─ Status
     - System send: Welcome email
     - User bisa change password di first login
  
  4. Edit User:
     - Modify role, status
     - Reset password jika perlu
     - Save
  
  5. Roles yang tersedia:
     - Admin: Full access (setup, master data, operasi)
     - PPC: Upload SR, lihat summary, export
     - User: View-only (dashboard, reports)
```

---

## Fase 2: ONGOING ADMIN TASKS

```
Lokasi: Dashboard → Admin Panel

Tasks:
  1. Monitor kesehatan sistem
     - Lihat history upload
     - Check error logs
     - Monitor performance
  
  2. Update master data (jika perlu)
     - Tambah pelanggan baru
     - Tambah assy baru
     - Update info carline
  
  3. Manage users
     - Reset password
     - Deactivate users
     - Update permissions
```

---

# 💼 ROLE 2: WORKFLOW PPC (OPERASI HARIAN)

## Fase 1: OPERASI HARIAN - UPLOAD SR

### 1.1 Akses Halaman Upload

```
Alur:
  User (PPC) → Click menu "Upload"
            → Navigate ke /sr/upload
            → Lihat: Halaman Upload SR

Halaman: Resources/js/Pages/UploadSR/UploadPage.jsx

Komponen:
  ├─ Area upload file (drag & drop atau click)
  ├─ Selector pelanggan (YNA, YC, TYC, SAI)
  ├─ Selector port (jika multi-port)
  ├─ Selector sheet (jika Excel punya multiple sheets)
  └─ Tombol Submit
```

### 1.2 Upload File SR dari Pelanggan

```
Proses:
  1. Terima file SR dari pelanggan (format Excel)
     - Contoh: SR_YNA_20260515.xlsx
     - Isi: SR orders, delivery dates, qty, assy numbers
  
  2. Di Halaman Upload:
     - Select pelanggan: YNA (dropdown)
     - Select port: TPEB (jika multi-port)
     - Click "Pilih File"
     - Browse & select: SR_YNA_20260515.xlsx
     - Click "Upload"
  
  3. Backend Processing (Otomatis):
     POST /sr/upload
     ├─ Terima file + pelanggan + port
     ├─ Store temp file
     ├─ Detect format pelanggan
     ├─ Parse Excel dengan template mapping
     ├─ Transform ke format standard
     ├─ Validasi assy numbers
     ├─ Resolve week dari ETD date
     ├─ Generate batch UUID
     └─ Siap untuk preview

Halaman:
  - Resources/js/Pages/UploadSR/UploadPage.jsx
```

### 1.3 Preview & Validasi Data

```
Setelah upload → System tampilkan halaman PREVIEW

Halaman: Resources/js/Pages/UploadSR/PreviewPage.jsx

Tampilan:
  ├─ Info File:
  │  ├─ Filename
  │  ├─ Pelanggan (YNA)
  │  ├─ Timestamp upload
  │  └─ Total records (contoh: 500 items)
  │
  ├─ Data Preview (table):
  │  ├─ Kolom: SR#, Qty, ETD, Assy, Model, Port
  │  ├─ Tampil: First 20 rows
  │  ├─ Total: 500 rows (lebih banyak di pagination)
  │  └─ Subtotals by assy atau pelanggan
  │
  ├─ Quality Checks:
  │  ├─ ✅ Assy valid: 485 items (97%)
  │  ├─ ⚠️ Assy unmapped: 15 items
  │  │   └─ List: [ASSY001, ASSY002, ...]
  │  ├─ ✅ ETD dates valid: 490 items
  │  ├─ ⚠️ Invalid dates: 10 items
  │  └─ ℹ️ Warnings: 3 items
  │
  ├─ Summary Stats:
  │  ├─ Total quantity
  │  ├─ Order count
  │  ├─ Average qty per order
  │  └─ Period range
  │
  └─ Actions (tombol):
     ├─ "Confirm Upload" (jika validation OK)
     ├─ "Fix & Re-upload" (jika ada error)
     └─ "Cancel" (discard)

Route:
  POST /preview
  ├─ Input: file, pelanggan, port
  ├─ Return: preview data + validation results
```

### 1.4 Confirm & Save Upload

```
Setelah validasi OK → Click "Confirm Upload"

Backend:
  POST /sr/upload
  ├─ Create upload_batch record
  ├─ Insert SR records (500 per kali)
  ├─ Generate summary aggregation
  ├─ Calculate variance (vs batch sebelumnya)
  ├─ Invalidate cache
  └─ Return: Success message
  
Result: 
  ✅ Upload selesai
  - Batch UUID: 12345-abcde (untuk tracking)
  - Records inserted: 500
  - Summary records: ~50 (aggregated)
  - Processing time: ~5-10 seconds

Next: User redirect ke halaman Summary atau Dashboard
```

---

## Fase 2: LIHAT & ANALISIS DATA

### 2.1 Lihat Tabel Summary

```
Lokasi: /summary

Tujuan:
  - Lihat semua aggregated SR data
  - Group by: Pelanggan, Assy, Bulan, Minggu, Port
  - Filter & search

Halaman: Resources/js/Pages/Summary/SummaryTable.jsx

Tampilan:
  ├─ Filter Bar:
  │  ├─ Filter pelanggan (multi-select)
  │  ├─ Filter period (bulan/minggu)
  │  ├─ Search box (search assy, sr#)
  │  ├─ Filter status (mapped/unmapped)
  │  └─ Tombol "Apply"
  │
  ├─ Summary Table:
  │  ├─ Kolom: Pelanggan, Assy, Carline, Model
  │  ├─ Kolom: SR Count, Total Qty, ETD, ETA
  │  ├─ Kolom: Week, Month, Port, Family
  │  ├─ Baris: Aggregated data per unique combination
  │  ├─ Pagination: 25/50/100 items per page
  │  └─ Total rows: Bisa 10,000+ items
  │
  ├─ Actions:
  │  ├─ Click baris → Lihat detail
  │  ├─ Icon download → Export baris ini
  │  └─ Icon hapus (jika perlu)
  │
  └─ Export Button:
     ├─ "Export Semua" (export dengan current filters)
     ├─ File: Summary_[date].xlsx
     └─ Download ke komputer user

Filters Applied:
  ├─ Client-side: Instant UI filter
  ├─ Server-side: GET /summary?filters=...
  └─ Pagination: 25 items per page
```

### 2.2 Lihat Dashboard (KPI & Trends)

```
Lokasi: /dashboard

Tujuan:
  - High-level overview SR/SPP status
  - KPI cards dengan key metrics
  - Trend charts
  - Latest updates

Halaman: Resources/js/Pages/Dashboard.jsx

Komponen:
  ├─ KPI Cards:
  │  ├─ "Total SR Qty Bulan Ini": 125,000 units
  │  ├─ "Total SPP Qty": 105,000 units
  │  ├─ "Unmapped Items": 15 assy (warning)
  │  ├─ "Variance": +12% (over-supply)
  │  └─ "Upload Count": 23 batches
  │
  ├─ Charts:
  │  ├─ Trend chart: SR qty per minggu (12 minggu terakhir)
  │  ├─ Variance chart: Over/under supply trend
  │  ├─ Top customers chart: Top 5 customers by qty
  │  └─ Carline utilization: Qty per carline
  │
  ├─ Latest Uploads:
  │  ├─ Table: Recent upload batches
  │  ├─ Kolom: Pelanggan, Date, Record Count, Qty, Status
  │  ├─ Click baris → Lihat detail
  │  └─ Link ke upload history
  │
  └─ Alerts:
     ├─ Unmapped items: Click untuk fix
     ├─ High variance: Check manual
     └─ System status: All OK
```

### 2.3 Lihat Variance Analysis

```
Lokasi: /variance

Tujuan:
  - Compare SR vs SPP (plan vs actual)
  - Week-to-week variance
  - Over/under supply detection
  - Trend analysis

Halaman: Resources/js/Pages/Variance/VarianceTable.jsx

Tampilan:
  ├─ Variance Table:
  │  ├─ Kolom: Pelanggan, Assy, Week, Month
  │  ├─ Kolom: Previous SPP, Current SR, Variance
  │  ├─ Kolom: Change %, Status (over/under/balanced)
  │  ├─ Kolom: Trend (↑ naik, ↓ turun, = flat)
  │  ├─ Baris: Color coded (hijau=balanced, merah=over/under)
  │  └─ Sort/Filter: Click header untuk sort
  │
  ├─ Metrics:
  │  ├─ High variance items (>10% change)
  │  ├─ Variance per pelanggan
  │  ├─ Weekly trend (4 minggu terakhir)
  │  └─ Forecast accuracy
  │
  ├─ Filters:
  │  ├─ Filter pelanggan
  │  ├─ Filter assy
  │  ├─ Filter period
  │  └─ Filter status (over/under/balanced)
  │
  └─ Export:
     ├─ Tombol "Export Report"
     ├─ File: Variance_[date].xlsx
     └─ Include: Semua filtered rows
```

### 2.4 Lihat SPP (Rencana Supply)

```
Lokasi: /spp

Tujuan:
  - Lihat 6-month rolling supply plan
  - Lihat FIRM orders (2 bulan locked)
  - Lihat FORECAST (4 bulan ke depan)
  - Generate/modify plan

Halaman: Resources/js/Pages/SPP/SPPTable.jsx

Tampilan:
  ├─ SPP List:
  │  ├─ Kolom: Pelanggan, Assy, Bulan1, Bulan2, Bulan3, Bulan4, Bulan5, Bulan6
  │  ├─ Kolom: Status (FIRM/FORECAST), Total Qty
  │  ├─ Baris: Per assy per bulan combination
  │  ├─ Warna: Cell hijau=FIRM, kuning=FORECAST
  │  └─ Pagination: Handle 1000+ rows
  │
  ├─ Period Display:
  │  ├─ Tampil: Actual month names
  │  ├─ Contoh: May, June, July, Aug, Sept, Oct
  │  ├─ FIRM: May (1 bulan lalu), June (sekarang) = FIRM
  │  └─ FORECAST: July, Aug, Sept, Oct, Nov, Dec = FORECAST
  │
  ├─ Generate SPP:
  │  ├─ Select SR batch (dari list)
  │  ├─ Click tombol "Generate SPP"
  │  ├─ Preview ditampilkan
  │  ├─ Modify jika perlu (edit quantities)
  │  ├─ Click "Confirm" → SPP saved
  │  └─ SPP sekarang visible di table
  │
  ├─ Combine Multiple Batches:
  │  ├─ Select multiple batches (checkboxes)
  │  ├─ Click "Combine SPP"
  │  ├─ Preview combined plan
  │  ├─ Click "Confirm"
  │  └─ Single SPP created dari semua batches
  │
  └─ Export SPP:
     ├─ Select period/pelanggan
     ├─ Click "Export"
     ├─ File: SPP_[Pelanggan]_[Period].xlsx
     ├─ Format: 6-month grid, professional
     └─ Download
```

---

## Fase 3: GENERATE SPP DARI SR

### 3.1 Generate Single SPP (dari 1 upload)

```
Skenario:
  - Upload 1 batch SR (500 items)
  - Need generate SPP dari batch ini
  
Proses:
  1. Di halaman Upload Success:
     - Click tombol "Generate SPP" (atau pergi ke /spp)
  
  2. Halaman Preview:
     - Tampil: Aggregated data by month/assy
     - Tampil: 6-month window (May-Oct)
     - Tampil: 2 bulan marked FIRM (Apr-May)
     - Tampil: 4 bulan marked FORECAST (Jun-Oct)
     - Tampil: Total qty per bulan
     - Tampil: Unmapped items (jika ada)
  
  3. Review & Modify (optional):
     - User bisa edit quantities
     - User bisa select/deselect items
     - Contoh: Toggle month visibility
  
  4. Confirm:
     - Click "Save SPP"
     - Backend:
       POST /spp/preview/{id} atau similar
       ├─ Insert SPP records
       ├─ Set order_type (FIRM or FORECAST)
       ├─ Link ke upload_batch
       └─ Return: Success
     - SPP sekarang saved
     - Show confirmation

Halaman:
  - Resources/js/Pages/SPP/PreviewPage.jsx
```

### 3.2 Generate Combined SPP (dari multiple uploads)

```
Skenario:
  - Pelanggan kirim multiple batches (different days)
  - Need combine semua jadi 1 SPP
  - Contoh:
    ├─ Upload 1 (Monday): 300 items
    ├─ Upload 2 (Tuesday): 200 items
    ├─ Upload 3 (Wednesday): 250 items
    └─ Combined SPP: 750 items

Proses:
  1. Di halaman SPP:
     - Select Upload 1 (checkbox)
     - Select Upload 2 (checkbox)
     - Select Upload 3 (checkbox)
     - Click "Combine SPP"
  
  2. System validasi:
     - Semua dari pelanggan sama? ✅
     - No overlapping periods? ✅
     - Semua valid? ✅
  
  3. Halaman Preview:
     - Tampil: Aggregated dari semua 3 uploads
     - Tampil: 750 items total
     - Tampil: 6-month plan
     - Tampil: FIRM/FORECAST marking
  
  4. Modify (optional):
     - Edit quantities jika perlu
  
  5. Confirm:
     - Click "Save Combined SPP"
     - Backend:
       POST /spp/preview (combined version)
       ├─ Aggregate data dari semua batches
       ├─ Insert SPP records
       ├─ upload_batch_id = NULL (indicates combined)
       └─ Return: Success
     - SPP saved sebagai "COMBINED" batch

Route:
  GET /spp/preview (untuk combined preview)
  POST /spp/preview (untuk save combined)
```

---

## Fase 4: EXPORT DATA

### 4.1 Export Summary

```
Langkah-langkah:
  1. Di halaman Summary:
     - Apply filters (pelanggan, period, dll)
     - Lihat filtered data di table
  
  2. Click tombol "Export":
     - Semua visible data selected
     - Respect current filters
  
  3. Click "Export to Excel":
     - Browser download starts
     - File: Summary_[timestamp].xlsx
  
  4. File dibuka di Excel:
     ├─ Header info (title, date, pelanggan)
     ├─ Table dengan semua filtered data
     ├─ Kolom: Pelanggan, Assy, Qty, Week, Month, dll
     ├─ Total row: Sum of quantities
     ├─ Professional formatting
     └─ User bisa: Copy, edit, share

Backend:
  GET /summary/export?filters=...
  ├─ Query filtered data
  ├─ Generate Excel file
  ├─ maatwebsite/excel library
  └─ Return downloadable file
```

### 4.2 Export SPP

```
Langkah-langkah:
  1. Di halaman SPP:
     - Select SPP untuk export (atau export semua)
     - Optional: Select pelanggan atau period
  
  2. Click tombol "Export":
     - File: SPP_[Pelanggan]_[Period].xlsx
  
  3. File format:
     ├─ Header: SPP Report, Date, Pelanggan
     ├─ Table structure:
     │  ├─ Kolom A-C: Assy Number, Carline, Model
     │  ├─ Kolom D-I: Bulan 1-6 quantities
     │  ├─ Kolom J: Status (FIRM/FORECAST)
     │  └─ Kolom K: Total Qty
     │
     ├─ Baris:
     │  ├─ Data per assy
     │  ├─ Color coded: Hijau=FIRM, Kuning=FORECAST
     │  └─ Total row: Monthly sums
     │
     └─ Professional: Numbers formatted, borders, colors

Backend:
  GET /spp/export
  ├─ Query SPP data
  ├─ Group by: Pelanggan, Assy, Month
  ├─ Generate Excel grid format
  ├─ Add formatting, colors, totals
  └─ Return downloadable file
```

### 4.3 Export Variance Report

```
Langkah-langkah:
  1. Di halaman Variance:
     - Apply filters
     - Lihat filtered variance data
  
  2. Click tombol "Export":
     - File: Variance_[timestamp].xlsx
  
  3. File format:
     ├─ Header info (date, pelanggan)
     ├─ Variance table:
     │  ├─ Kolom: Pelanggan, Assy, Week
     │  ├─ Kolom: Previous SPP, Current SR, Variance
     │  ├─ Kolom: Change %, Status
     │  ├─ Kolom: Trend
     │  └─ Baris: Semua filtered items
     │
     └─ Totals & summary stats
```

---

# 🎯 COMPLETE USER JOURNEY MAP

## Day 1: ADMIN SETUP (1-2 jam)

```
Admin mulai →
  1. Tambah Pelanggan (YNA, YC, TYC, SAI) - 5 menit
  2. Tambah Ports per pelanggan - 5 menit
  3. Tambah Carlines (production lines) - 5 menit
  4. Bulk import Assemblies - 10 menit
  5. Bulk import Production Weeks - 5 menit
  6. Define ETD Mappings per pelanggan - 10 menit
  7. Create/verify SR Mapping Templates - 10 menit
  8. Tambah Users (PPC team) - 10 menit
  9. Configure user roles - 5 menit
  
→ Sistem siap untuk operasi
```

## Day 2-N: PPC DAILY OPERATIONS

```
┌─ PAGI ────────────────────────────┐
│                                   │
│ 1. Check Dashboard (2 menit)      │
│    - Lihat KPIs                   │
│    - Cek untuk alerts             │
│    - Lihat latest uploads         │
│                                   │
│ 2. Cek untuk incoming SR files    │
│    - Email dari pelanggan         │
│    - Download Excel files         │
│                                   │
└───────────────────────────────────┘

┌─ SIANG ────────────────────────────┐
│                                    │
│ 3. Upload SR Files (3 files, 15m) │
│    - File 1 (YNA): Upload & prev  │
│    - File 2 (YC): Upload & prev   │
│    - File 3 (TYC): Upload & prev  │
│    - Semua validated & confirmed  │
│                                    │
└────────────────────────────────────┘

┌─ SORE ────────────────────────────┐
│                                   │
│ 4. Generate SPP (5 menit)         │
│    - Click "Generate SPP"         │
│    - Preview 6-month plan         │
│    - Confirm                      │
│    - SPP generated                │
│                                   │
│ 5. Combine SPP jika perlu (5m)    │
│    - Select multiple uploads      │
│    - Combine jadi single plan     │
│                                   │
│ 6. Lihat Summary (5 menit)        │
│    - Lihat aggregated data        │
│    - Apply filters                │
│    - Verify quantities            │
│                                   │
│ 7. Lihat Variance (5 menit)       │
│    - Check week-to-week changes   │
│    - Identify issues              │
│                                   │
│ 8. Export Data (5 menit)          │
│    - Export Summary to Excel      │
│    - Export SPP to Excel          │
│    - Export Variance to Excel     │
│    - Kirim ke Planning team       │
│                                   │
└───────────────────────────────────┘

TOTAL TIME: ~60 minutes
(vs 2-3 hours dengan manual Excel)

RESULTS:
  ✅ Semua SR processed & validated
  ✅ SPP generated (6-month plan)
  ✅ Variance analyzed
  ✅ Semua data exported untuk sharing
  ✅ Zero manual Excel work
  ✅ Complete audit trail
```

---

# 📱 USER INTERFACE LAYOUT

## Halaman Login
```
┌──────────────────────────────────┐
│                                  │
│         SIPLAN LOGIN             │
│                                  │
│  Email:    [_______________]     │
│  Password: [_______________]     │
│                                  │
│  [ ] Remember Me                 │
│                                  │
│         [ LOGIN ]                │
│                                  │
│  Lupa password?                  │
│                                  │
└──────────────────────────────────┘
```

## Main Menu (Left Sidebar)

```
┌─────────────────────────┐
│ SIPLAN                  │
│                         │
│ ☰ MENU                  │
│                         │
│ [Dashboard]             │
│ [Upload SR]             │
│ [Summary]               │
│ [SPP]                   │
│ [Variance]              │
│                         │
│ ─ ADMIN ONLY ─          │
│ [Data Master]           │
│   ├─ Pelanggan          │
│   ├─ Port               │
│   ├─ Carlines           │
│   ├─ Assemblies         │
│   └─ [+ lebih]          │
│                         │
│ [Kalender Setup]        │
│ [Mappings]              │
│ [Settings]              │
│ [Users]                 │
│                         │
│ ─ USER ─                │
│ [Profile]               │
│ [Logout]                │
│                         │
└─────────────────────────┘
```

## Dashboard Layout
```
┌─────────────────────────────────────────────────┐
│ DASHBOARD                    [Date]  [User]     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ SR   │  │ SPP  │  │UNMAP │  │VAR   │       │
│  │125k  │  │105k  │  │  15  │  │ +12% │       │
│  └──────┘  └──────┘  └──────┘  └──────┘       │
│   [Qty]     [Qty]     [Items]   [Trend]        │
│                                                 │
│ ┌─────────────────────┐ ┌──────────────────┐  │
│ │ Trend Chart (12wk) │ │ Top Pelanggan    │  │
│ │                    │ │ 1. YNA: 40k      │  │
│ │     ▲              │ │ 2. YC: 35k       │  │
│ │    ╱│╲             │ │ 3. TYC: 30k      │  │
│ │   ╱ │ ╲            │ │ 4. SAI: 20k      │  │
│ │  ╱  │  ╲           │ └──────────────────┘  │
│ │ ────────           │                        │
│ │ W1 W2 W3 ... W12   │                        │
│ └─────────────────────┘                        │
│                                                 │
│ Latest Uploads:                                │
│ ┌──────────────────────────────────────────┐  │
│ │ YNA     | 5/15  | 500 items | ✅ OK    │  │
│ │ YC      | 5/14  | 450 items | ✅ OK    │  │
│ │ TYC     | 5/13  | 380 items | ✅ OK    │  │
│ │ SAI     | 5/12  | 200 items | ⚠️ 5ERR │  │
│ └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Halaman Upload SR
```
┌─────────────────────────────────────────────────┐
│ UPLOAD FILE SR                                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  Select Pelanggan:                              │
│  [▼ Pilih Pelanggan] (YNA, YC, TYC, SAI)        │
│                                                 │
│  Select Port (optional):                        │
│  [▼ Pilih Port]                                 │
│                                                 │
│  Select Sheet (jika multiple):                  │
│  [▼ Pilih Sheet]                                │
│                                                 │
│  ┌─────────────────────────────────────┐       │
│  │  📁 Drag & Drop File Di Sini        │       │
│  │     atau click untuk select         │       │
│  │                                     │       │
│  │  ✓ Hanya .xlsx files diterima      │       │
│  │  ✓ Max size: 50MB                  │       │
│  └─────────────────────────────────────┘       │
│                                                 │
│  File selected: SR_YNA_20260515.xlsx           │
│                                                 │
│       [ UPLOAD ]  [ CANCEL ]                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Summary Table Layout
```
┌──────────────────────────────────────────────────────────┐
│ SUMMARY                                  [Filter][Export] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Pelanggan: [▼] | Period: [▼] | Search: [_______]       │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Cust │ Assy  │ Qty  │ Week │ Month │ ETD  │ Port │ ...│
├─────────────────────────────────────────────────────────┤
│ YNA  │ ASS01 │ 500  │  20  │  May  │ 5/15 │ TPEB │... │
│ YNA  │ ASS02 │ 300  │  20  │  May  │ 5/15 │ TPEB │... │
│ YC   │ ASS03 │ 450  │  21  │  May  │ 5/22 │ JPSA │... │
│ TYC  │ ASS04 │ 380  │  21  │  May  │ 5/22 │ TPEB │... │
│ SAI  │ ASS05 │ 200  │  22  │  Jun  │ 6/01 │ JPSA │... │
│ ...  │ ...   │ ...  │ ...  │ ...   │ ...  │ ...  │... │
├─────────────────────────────────────────────────────────┤
│ Total                         │ 125,230 items           │
│                               │ (Showing 1-25 of 1,540)  │
├─────────────────────────────────────────────────────────┤
│ ◀ 1 [2] 3 4 5 ... 56 ▶                                  │
└──────────────────────────────────────────────────────────┘
```

## SPP View Layout
```
┌────────────────────────────────────────────────────────┐
│ SPP - 6 BULAN PLAN                   [Generate][Export]│
├────────────────────────────────────────────────────────┤
│                                                        │
│ Period: May 2026 - Oct 2026                            │
│ ├─ FIRM (2 bulan): Apr, May  [🟢 LOCKED]             │
│ └─ FORECAST (4 bulan): Jun-Oct [🟡 ESTIMATED]        │
│                                                        │
├────────────────────────────────────────────────────────┤
│ Cust │ Assy │  May  │  Jun  │  Jul  │ Aug │ Sep │ Oct │
├────────────────────────────────────────────────────────┤
│      │      │ 🟢   │ 🟡   │ 🟡   │ 🟡 │ 🟡 │ 🟡 │
│ YNA  │AS001 │ 500  │ 450  │ 400  │ 350│ 300│ 250│
│ YNA  │AS002 │ 300  │ 280  │ 260  │ 240│ 220│ 200│
│ YC   │AS003 │ 450  │ 420  │ 400  │ 380│ 360│ 340│
│ TYC  │AS004 │ 380  │ 350  │ 330  │ 310│ 290│ 270│
│ SAI  │AS005 │ 200  │ 180  │ 160  │ 140│ 120│ 100│
│ ...  │ ...  │ ...  │ ...  │ ...  │..│ ..│ .. │
├────────────────────────────────────────────────────────┤
│ TOTAL        │2,230 │2,080 │1,950 │1,820│1,690│1,560│
└────────────────────────────────────────────────────────┘

Legend:
  🟢 FIRM: Locked, confirmed orders
  🟡 FORECAST: Estimated, subject to change
```

---

# 🔄 KEY WORKFLOWS AT A GLANCE

## Workflow 1: COMPLETE SR PROCESSING (10 menit)
```
Terima file
    ↓
Upload ke sistem
    ↓
System auto-detect format & parse
    ↓
Preview & validasi
    ↓
Confirm upload
    ↓
Database updated ✅
Summary generated ✅
```

## Workflow 2: SPP GENERATION (5 menit)
```
SR data confirmed
    ↓
Click "Generate SPP"
    ↓
System aggregate data (6 bulan)
    ↓
Preview dengan FIRM/FORECAST marking
    ↓
Confirm
    ↓
SPP saved ✅
```

## Workflow 3: DATA EXPORT (2 menit per file)
```
Apply filters
    ↓
Click "Export"
    ↓
Choose format (Excel)
    ↓
Download starts
    ↓
File saved di komputer ✅
Siap untuk sharing ✅
```

---

# 📊 PERBANDINGAN: MANUAL vs SIPLAN

```
┌─────────────────────┬────────────┬──────────┐
│ Task                │ Manual Way │ SIPLAN   │
├─────────────────────┼────────────┼──────────┤
│ Parse Excel format  │ 30 min     │ 30 sec   │
│ Validasi data       │ 45 min     │ 1 min    │
│ Link ke master data │ 1 jam      │ Auto     │
│ Resolve weeks       │ 30 min     │ Auto     │
│ Generate summary    │ 45 min     │ Auto     │
│ Calculate variance  │ 1 jam      │ Auto     │
│ Create SPP          │ 1 jam      │ 5 min    │
│ Export results      │ 20 min     │ 2 min    │
├─────────────────────┼────────────┼──────────┤
│ TOTAL TIME          │ 2-3 hours  │ 5-10 min │
│ ERROR RATE          │ 5-10%      │ 0.1%     │
│ MANUAL STEPS        │ 20+        │ 3-4      │
└─────────────────────┴────────────┴──────────┘
```

---

# 🎓 UNTUK PRESENTASI MANAJEMEN

## Main Points untuk Highlight:

```
"SIPLAN WORKFLOW DARI USER PERSPECTIVE:

ADMIN (SETUP AWAL - 1-2 JAM):
  1. Setup data master (pelanggan, assy, carlines)
  2. Import kalender produksi (52 minggu)
  3. Define customer format mappings
  4. Configure ETD date mappings
  5. Add users & roles
  ✅ Sistem siap untuk operasi

PPC DAILY WORKFLOW (5-10 MENIT PER SIKLUS):
  1. Terima file SR dari pelanggan
  2. Upload file ke SIPLAN
     → System auto-detect format
     → System auto-parse & validasi
     → Show preview
  3. Confirm upload
     → Data saved to database
     → Summary auto-generated
     → Variance auto-calculated
  4. Generate SPP (6-month plan)
     → System show preview
     → Confirm → SPP saved
  5. Export data
     → Download Excel files
     → Share dengan team

MANFAAT:
  ✅ 90% time savings (2-3h → 5-10m)
  ✅ 99.9% accuracy (vs 90-95% manual)
  ✅ Zero manual Excel work
  ✅ Complete audit trail
  ✅ Automated validation
  ✅ Scalable untuk pelanggan baru
  ✅ Professional reporting
"
```

