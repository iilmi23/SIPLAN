<?php

namespace App\Http\Controllers;

use App\Http\Requests\Carline\CarlineSheetRequest;
use App\Http\Requests\Carline\StoreCarlineRequest;
use App\Http\Requests\Carline\UpdateCarlineRequest;
use App\Models\Carline;
use App\Services\CarlineService;
use App\Services\SirepMasterSyncService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Throwable;

class CarlineController extends Controller
{
    public function __construct(private readonly CarlineService $carlines)
    {
    }

    public function index(Request $request)
    {
        return Inertia::render('Master/Carline/Index', [
            'carlines' => $this->carlines->query($request->only(['search']))->orderBy('code')->get(),
            'filters' => $request->only(['search']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Master/Carline/Create');
    }

    public function store(StoreCarlineRequest $request)
    {
        Carline::create($request->validated());

        return redirect()->route('carline.index')
            ->with('success', 'Carline berhasil ditambahkan');
    }

    public function edit(Carline $carline)
    {
        return Inertia::render('Master/Carline/Edit', [
            'carline' => $carline,
        ]);
    }

    public function update(UpdateCarlineRequest $request, Carline $carline)
    {
        $carline->update($request->validated());

        return redirect()->route('carline.index')
            ->with('success', 'Carline berhasil diubah');
    }

    public function destroy(Carline $carline)
    {
        if ($carline->assy()->count() > 0) {
            return redirect()->back()
                ->with('error', 'Carline tidak dapat dihapus karena masih memiliki Assy');
        }

        $carline->delete();

        return redirect()->route('carline.index')
            ->with('success', 'Carline berhasil dihapus');
    }

    public function syncSirep(SirepMasterSyncService $service)
    {
        try {
            $result = $service->syncCarlines();

            return back()->with('success', sprintf(
                'Sync SIREP Carline selesai. %d created, %d updated, %d skipped.',
                $result['created'],
                $result['updated'],
                $result['skipped']
            ));
        } catch (Throwable $exception) {
            return back()->with('error', 'Sync SIREP Carline gagal: ' . $exception->getMessage());
        }
    }

    public function getSheets(CarlineSheetRequest $request)
    {
        try {
            return response()->json([
                'success' => true,
                'sheets' => $this->carlines->sheetNames($request->file('file')),
            ]);
        } catch (Throwable $exception) {
            return $this->excelError('Gagal membaca file Excel: ' . $exception->getMessage());
        }
    }

    public function previewSheet(CarlineSheetRequest $request)
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $this->carlines->previewSheet($request->file('file'), $request->input('sheet')),
            ]);
        } catch (Throwable $exception) {
            return $this->excelError('Gagal preview sheet: ' . $exception->getMessage());
        }
    }

    public function import(CarlineSheetRequest $request)
    {
        try {
            return response()->json(
                $this->carlines->importSheet($request->file('file'), $request->input('sheet'))
            );
        } catch (Throwable $exception) {
            return $this->excelError('Gagal mengimport data: ' . $exception->getMessage());
        }
    }

    public function importPage()
    {
        return Inertia::render('Master/Carline/Import');
    }

    public function apiIndex(Request $request)
    {
        $carlines = $this->carlines->query($request->only(['search']))->orderBy('code')->get();

        return response()->json([
            'success' => true,
            'data' => $carlines,
            'count' => $carlines->count(),
        ]);
    }

    private function excelError(string $message)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], 400);
    }
}
