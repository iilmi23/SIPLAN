<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\SRMappingTemplateController;
use App\Http\Controllers\SummaryController;
use App\Http\Controllers\SPPController;
use App\Http\Controllers\PortController;
use App\Http\Controllers\SRController;
use App\Http\Controllers\CarlineController;
use App\Http\Controllers\AssyController;
use App\Http\Controllers\TimeChartController;
use App\Http\Controllers\ProductionWeekController;
use App\Http\Controllers\EtdMappingController;
use App\Http\Controllers\VarianceController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// Redirect root berdasarkan login
Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});

/*
|--------------------------------------------------------------------------
| Protected Routes (WAJIB LOGIN)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth'])->group(function () {

    // ===================== DASHBOARD =====================
    Route::get('/dashboard', [DashboardController::class, 'index'])->middleware('role:admin,ppc')->name('dashboard');

    // Production Weeks
    Route::middleware(['role:admin,ppc'])->prefix('production-week')->name('production-week.')->group(function () {
        Route::get('/', [ProductionWeekController::class, 'index'])->name('index');
        Route::get('/create', [ProductionWeekController::class, 'create'])->name('create');
        Route::get('/import', [ProductionWeekController::class, 'importPage'])->name('import-page');
        Route::get('/download-template', [ProductionWeekController::class, 'downloadTemplate'])->name('download-template');
        Route::post('/', [ProductionWeekController::class, 'store'])->name('store');
        Route::post('/import', [ProductionWeekController::class, 'import'])->name('import');
        Route::get('/edit', [ProductionWeekController::class, 'edit'])->name('edit');
        Route::put('/update', [ProductionWeekController::class, 'update'])->name('update');
        Route::delete('/delete', [ProductionWeekController::class, 'destroy'])->name('destroy');
    });

    // ETD Mapping
    Route::middleware(['role:admin,ppc'])->prefix('etd-mapping')->name('etd-mapping.')->group(function () {
        Route::get('/{customerId}', [EtdMappingController::class, 'index'])->name('index');
        Route::put('/{id}', [EtdMappingController::class, 'update'])->name('update');
        Route::delete('/{id}', [EtdMappingController::class, 'destroy'])->name('destroy');
    });

    // ===================== ADMIN & PPC PAGES =====================
    Route::middleware(['role:admin,ppc'])->group(function () {

        Route::get('/sr/upload', [SRController::class, 'uploadPage'])->name('sr.upload.page');
        Route::post('/preview', [SRController::class, 'preview'])->name('sr.preview');
        Route::post('/sr/upload', [SRController::class, 'uploadTaiwan'])->name('sr.upload');

        Route::get('/summary', [SummaryController::class, 'index'])->name('summary.index');
        Route::get('/summary/export', [SummaryController::class, 'exportAll'])->name('summary.exportAll');
        Route::get('/summary/{id}', [SummaryController::class, 'show'])->name('summary.show');
        Route::get('/summary/{id}/data', [SummaryController::class, 'data'])->name('summary.data');
        Route::get('/summary/{id}/export', [SummaryController::class, 'export'])->name('summary.export');
        Route::delete('/summary/{id}', [SummaryController::class, 'destroy'])->name('summary.destroy');

        Route::get('/variance', [VarianceController::class, 'index'])->name('variance.index');
        Route::get('/variance/export', [VarianceController::class, 'export'])->name('variance.export');

        Route::get('/spp', [SPPController::class, 'index'])->name('spp');
        Route::get('/spp/preview', [SPPController::class, 'previewCombined'])->name('spp.previewCombined');
        Route::post('/spp/preview', [SPPController::class, 'storeCombined'])->name('spp.storeCombined');
        Route::get('/spp/preview/{id}', [SPPController::class, 'preview'])->name('spp.preview');
        Route::post('/spp/preview/{id}', [SPPController::class, 'store'])->name('spp.store');
        Route::get('/spp/{period}', [SPPController::class, 'show'])->name('spp.show');

        Route::get('/history', function () {
            return Inertia::render('Admin/History');
        })->name('history');
    });

    // ===================== MASTER & OPERATIONAL PAGES =====================
    Route::middleware(['role:admin,ppc'])->group(function () {

        Route::get('/shipments', function () {
            return Inertia::render('Admin/Shipments');
        })->name('shipments');

        // Admin only: customer and port master data
        Route::middleware(['role:admin'])->group(function () {
            Route::resource('customers', CustomerController::class);
            Route::resource('customers.ports', PortController::class);
            Route::post('sr-mapping-templates/preview-excel', [SRMappingTemplateController::class, 'previewExcel'])
                ->name('sr-mapping-templates.preview-excel');
            Route::post('sr-mapping-templates/validate-preview', [SRMappingTemplateController::class, 'validatePreview'])
                ->name('sr-mapping-templates.validate-preview');
            Route::resource('sr-mapping-templates', SRMappingTemplateController::class)->except(['show']);
            Route::get('/ports', [PortController::class, 'all'])->name('ports.index');
        });

        // Route untuk carline management
        Route::prefix('carline')->group(function () {
            Route::get('/', [CarlineController::class, 'index'])->name('carline.index');
            Route::get('/create', [CarlineController::class, 'create'])->name('carline.create');
            Route::post('/', [CarlineController::class, 'store'])->name('carline.store');
            Route::get('/{carline}/edit', [CarlineController::class, 'edit'])->name('carline.edit');
            Route::put('/{carline}', [CarlineController::class, 'update'])->name('carline.update');
            Route::delete('/{carline}', [CarlineController::class, 'destroy'])->name('carline.destroy');
            Route::get('/import', [CarlineController::class, 'importPage'])->name('carline.importPage');

            // Routes untuk import Excel
            Route::post('/get-sheets', [CarlineController::class, 'getSheets'])->name('carline.getSheets');
            Route::post('/preview-sheet', [CarlineController::class, 'previewSheet'])->name('carline.previewSheet');
            Route::post('/import', [CarlineController::class, 'import'])->name('carline.import');
            Route::post('/sync-sirep', [CarlineController::class, 'syncSirep'])->name('carline.sync-sirep');
        });

        // Assy Management Routes - Specific routes BEFORE resource route
        Route::get('/assy/import', [AssyController::class, 'importPage'])->name('assy.importPage');
        Route::post('/assy/upload', [AssyController::class, 'upload'])->name('assy.upload');
        Route::get('/assy/download-template/{carline_id?}', [AssyController::class, 'downloadTemplate'])
            ->name('assy.download-template');
        Route::post('/assy/get-sheets', [AssyController::class, 'getSheets'])->name('assy.getSheets');
        Route::post('/assy/preview-sheet', [AssyController::class, 'previewSheet'])->name('assy.previewSheet');
        Route::post('/assy/import-data', [AssyController::class, 'import'])->name('assy.import');
        Route::post('/assy/sync-sirep', [AssyController::class, 'syncSirep'])->name('assy.sync-sirep');
        Route::patch('/assy/{assy}/toggle-status', [AssyController::class, 'toggleStatus'])->name('assy.toggle-status');
        
        // Resource route AFTER specific routes to prevent conflicts
        Route::resource('assy', AssyController::class);

        Route::get('/timechart', [TimeChartController::class, 'index'])->name('timechart.index');
        Route::post('/timechart/preview', [TimeChartController::class, 'preview'])->name('timechart.preview');
        Route::post('/timechart/upload', [TimeChartController::class, 'upload'])->name('timechart.upload');

        // Admin only: system settings and user management
        Route::middleware(['role:admin'])->group(function () {
            Route::get('/settings', function () {
                return Inertia::render('Admin/Settings');
            })->name('settings');

            // ===================== USER MANAGEMENT =====================
            Route::resource('users', \App\Http\Controllers\UserController::class);

            Route::get('/debug/sr-latest', function () {
                $latestUploads = \App\Models\SR::orderBy('created_at', 'desc')
                    ->limit(10)
                    ->get(['id', 'customer', 'source_file', 'upload_batch', 'assy_number', 'qty', 'created_at']);

                $totalByBatch = \App\Models\SR::selectRaw('upload_batch, COUNT(*) as count, SUM(qty) as total_qty, MAX(created_at) as latest_upload')
                    ->groupBy('upload_batch')
                    ->orderBy('latest_upload', 'desc')
                    ->limit(5)
                    ->get();

                return response()->json([
                    'latest_records' => $latestUploads,
                    'batches_summary' => $totalByBatch,
                    'total_sr_records' => \App\Models\SR::count()
                ]);
            })->name('debug.sr.latest');
        });
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// Auth bawaan Breeze
require __DIR__ . '/auth.php';
