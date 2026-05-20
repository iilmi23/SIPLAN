<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductionWeek\ImportProductionWeekRequest;
use App\Http\Requests\ProductionWeek\MonthProductionWeekRequest;
use App\Http\Requests\ProductionWeek\StoreProductionWeekRequest;
use App\Http\Requests\ProductionWeek\UpdateProductionWeekRequest;
use App\Models\Customer;
use App\Models\ProductionWeek;
use App\Services\ProductionWeekService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductionWeekController extends Controller
{
    public function __construct(private readonly ProductionWeekService $productionWeeks) {}

    public function index(Request $request)
    {
        $filters = $request->only(['customer_id', 'year', 'month_number', 'search']);
        $productionWeeks = $this->productionWeeks->paginateMonths(
            $filters
        );

        return Inertia::render('Master/ProductionWeek/Index', [
            'productionWeeks' => $productionWeeks,
            'customers' => $this->customers(),
            'availableYears' => ProductionWeek::select('year')->distinct()->orderBy('year', 'desc')->pluck('year'),
            'filters' => $filters,
            'stats' => [
                'total' => $productionWeeks->total(),
                'edited_count' => ProductionWeek::whereHas('etdMappings', fn ($q) => $q->where('is_edited', true))->count(),
                'global_weeks_count' => ProductionWeek::whereNull('customer_id')->count(),
                'customer_weeks_count' => ProductionWeek::whereNotNull('customer_id')->count(),
            ],
            'flash' => session('flash') ?: [
                'success' => session('success'),
                'warning' => session('warning'),
                'error' => session('error'),
            ],
        ]);
    }

    public function create()
    {
        return Inertia::render('Master/ProductionWeek/Create', [
            'customers' => $this->customers(),
        ]);
    }

    public function importPage()
    {
        return Inertia::render('Master/ProductionWeek/Import', [
            'customers' => $this->customers(),
        ]);
    }

    public function store(StoreProductionWeekRequest $request)
    {
        try {
            $this->productionWeeks->createMonth($request->validated());
        } catch (\DomainException $exception) {
            return redirect()->back()
                ->with('error', $exception->getMessage())
                ->withInput();
        }

        return redirect()->route('production-week.index')
            ->with('success', 'Production Week bulanan berhasil ditambahkan.');
    }

    public function edit(MonthProductionWeekRequest $request)
    {
        return Inertia::render('Master/ProductionWeek/Edit', [
            'productionWeek' => $this->productionWeeks->monthSummary($request->validated()),
            'customers' => $this->customers(),
        ]);
    }

    public function update(UpdateProductionWeekRequest $request)
    {
        try {
            $updated = $this->productionWeeks->updateMonth($request->validated(), [
                'year' => $request->query('year', $request->input('year')),
                'month' => $request->query('month', $request->input('month_number')),
                'customer_id' => $request->query('customer_id'),
            ]);
        } catch (\DomainException $exception) {
            return redirect()->back()
                ->with('error', $exception->getMessage())
                ->withInput();
        }

        if (! $updated) {
            return redirect()->back()
                ->with('error', 'Production week bulan tersebut tidak ditemukan.')
                ->withInput();
        }

        return redirect()->route('production-week.index')
            ->with('success', 'Production Week bulan tersebut berhasil diupdate!');
    }

    public function destroy(MonthProductionWeekRequest $request)
    {
        if (! $this->productionWeeks->deleteMonth($request->validated())) {
            return redirect()->back()
                ->with('error', 'Bulan tersebut tidak bisa dihapus karena masih dipakai di ETD Mapping');
        }

        return redirect()->route('production-week.index')
            ->with('success', 'Production Week bulan tersebut berhasil dihapus!');
    }

    public function import(ImportProductionWeekRequest $request)
    {
        $result = $this->productionWeeks->import(
            $request->file('file'),
            $request->filled('customer_id') ? $request->input('customer_id') : null,
            $request->input('sheet')
        );

        $message = "Import completed: {$result['success_count']} weeks imported successfully.";

        if ($result['error_count'] > 0) {
            return redirect()->route('production-week.index')
                ->with('warning', $message." {$result['error_count']} records failed.")
                ->with('import_errors', array_slice($result['errors'], 0, 10));
        }

        return redirect()->route('production-week.index')->with('success', $message);
    }

    public function downloadTemplate()
    {
        $directory = storage_path('app/templates');
        $templatePath = $directory.'/production-week-template.xlsx';

        if (! file_exists($directory)) {
            mkdir($directory, 0777, true);
        }

        $this->productionWeeks->createTemplate($templatePath);

        return response()->download($templatePath, 'production-week-template.xlsx');
    }

    private function customers()
    {
        return Customer::orderBy('name')->get();
    }
}
