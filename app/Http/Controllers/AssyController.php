<?php

namespace App\Http\Controllers;

use App\Http\Requests\Assy\ImportAssySheetRequest;
use App\Http\Requests\Assy\PreviewAssySheetRequest;
use App\Http\Requests\Assy\SheetNamesRequest;
use App\Http\Requests\Assy\StoreAssyRequest;
use App\Http\Requests\Assy\UpdateAssyRequest;
use App\Http\Requests\Assy\UploadAssyRequest;
use App\Models\Assy;
use App\Models\Carline;
use App\Models\SR;
use App\Services\AssyService;
use App\Services\SirepMasterSyncService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Throwable;

class AssyController extends Controller
{
    public function __construct(private readonly AssyService $assies)
    {
    }

    public function index(Request $request)
    {
        return Inertia::render('Master/Assy/Index', [
            'assy' => $this->assies
                ->query($request->only(['search', 'carline_id', 'is_active']))
                ->orderBy('assy_number')
                ->paginate(20),
            'carlines' => $this->carlines(),
            'filters' => $request->only(['search', 'carline_id', 'is_active']),
        ]);
    }

    public function create()
    {
        return Inertia::render('Master/Assy/Create', [
            'carlines' => $this->carlines(),
        ]);
    }

    public function store(StoreAssyRequest $request)
    {
        Assy::create($request->validated());

        return redirect()->route('assy.index')
            ->with('success', 'Assy berhasil ditambahkan');
    }

    public function edit(Assy $assy)
    {
        return Inertia::render('Master/Assy/Edit', [
            'assy' => $assy,
            'carlines' => $this->carlines(),
        ]);
    }

    public function update(UpdateAssyRequest $request, Assy $assy)
    {
        $assy->update($request->validated());

        return redirect()->route('assy.index')
            ->with('success', 'Assy berhasil diubah');
    }

    public function destroy(Assy $assy)
    {
        if (SR::where('assy_id', $assy->id)->exists() || $assy->spp()->exists()) {
            return back()->with('error', 'Assy tidak bisa dihapus karena sudah digunakan di SR atau SPP');
        }

        $assy->delete();

        return redirect()->route('assy.index')
            ->with('success', 'Assy berhasil dihapus');
    }

    public function show(Assy $assy)
    {
        return Inertia::render('Master/Assy/Show', [
            'assy' => $assy->load('carline'),
        ]);
    }

    public function toggleStatus(Assy $assy)
    {
        $assy->update(['is_active' => !$assy->is_active]);

        return back()->with('success', 'Status assy berhasil diubah');
    }

    public function syncSirep(SirepMasterSyncService $service)
    {
        try {
            $result = $service->syncAssy();
            $assy = $result['assy'];
            $carline = $result['carline'];

            return back()->with('success', sprintf(
                'Sync SIREP Assy selesai. Assy: %d created, %d updated, %d skipped. Carline dari Assy: %d created, %d updated.',
                $assy['created'],
                $assy['updated'],
                $assy['skipped'],
                $carline['created'],
                $carline['updated']
            ));
        } catch (Throwable $exception) {
            return back()->with('error', 'Sync SIREP Assy gagal: ' . $exception->getMessage());
        }
    }

    public function search(Request $request)
    {
        return response()->json(
            Assy::where('is_active', true)
                ->where(function ($query) use ($request) {
                    $query->where('assy_number', 'like', "%{$request->get('q')}%")
                        ->orWhere('assy_code', 'like', "%{$request->get('q')}%");
                })
                ->limit(20)
                ->get(['id', 'assy_number', 'assy_code', 'level', 'umh'])
        );
    }

    public function upload(UploadAssyRequest $request)
    {
        try {
            $result = $this->assies->uploadMaster(
                $request->file('excel_file'),
                (int) $request->input('carline_id')
            );

            if (!empty($result['errors'])) {
                return redirect()->back()->with('warning', $this->uploadWarningMessage($result['errors']));
            }

            return redirect()->back()
                ->with('success', "Berhasil upload {$result['count']} data Assy untuk Car Line yang dipilih!");
        } catch (Throwable $exception) {
            return redirect()->back()->with('error', 'Gagal upload data: ' . $exception->getMessage());
        }
    }

    public function downloadTemplate(Request $request)
    {
        try {
            $carlineId = $request->route('carline_id') ?? $request->query('carline_id');

            if (!$carlineId) {
                return response()->json(['error' => 'Car Line ID is required'], 400);
            }

            $template = $this->assies->createTemplate(Carline::findOrFail($carlineId));

            return response()->streamDownload(function () use ($template) {
                (new Xlsx($template['spreadsheet']))->save('php://output');
            }, $template['filename'], [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ]);
        } catch (Throwable $exception) {
            return response()->json(['error' => 'Gagal generate template: ' . $exception->getMessage()], 500);
        }
    }

    public function importPage()
    {
        return Inertia::render('Master/Assy/Import', [
            'carlines' => $this->carlines(),
        ]);
    }

    public function getSheets(SheetNamesRequest $request)
    {
        try {
            return response()->json([
                'success' => true,
                'sheets' => $this->assies->sheetNames($request->file('file')),
            ]);
        } catch (Throwable $exception) {
            return $this->excelError('Gagal membaca file Excel: ' . $exception->getMessage());
        }
    }

    public function previewSheet(PreviewAssySheetRequest $request)
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $this->assies->previewSheet($request->file('file'), $request->input('sheet')),
            ]);
        } catch (Throwable $exception) {
            return $this->excelError('Gagal preview sheet: ' . $exception->getMessage());
        }
    }

    public function import(ImportAssySheetRequest $request)
    {
        try {
            return response()->json($this->assies->importSheet(
                $request->file('file'),
                $request->input('sheet'),
                (int) $request->input('carline_id')
            ));
        } catch (Throwable $exception) {
            return $this->excelError('Gagal mengimport data: ' . $exception->getMessage());
        }
    }

    public function apiIndex(Request $request)
    {
        $assy = $this->assies
            ->query($request->only(['search', 'carline_id', 'is_active']))
            ->orderBy('assy_number')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $assy,
            'count' => $assy->count(),
        ]);
    }

    private function carlines()
    {
        return Carline::orderBy('code')->get();
    }

    private function uploadWarningMessage(array $errors): string
    {
        $message = 'Upload selesai dengan ' . count($errors) . " error:\n" . implode("\n", array_slice($errors, 0, 5));

        if (count($errors) > 5) {
            $message .= "...\nDan " . (count($errors) - 5) . ' error lainnya';
        }

        return $message;
    }

    private function excelError(string $message)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], 400);
    }
}
