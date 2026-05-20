<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\SR;
use App\Models\SPP;
use App\Models\Customer;
use App\Models\Assy;
use App\Models\UploadBatch;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\SR\SRProcessingService;

class SRController extends Controller
{
    // ─────────────────────────────────────────────────────────────────────
    // PAGES
    // ─────────────────────────────────────────────────────────────────────

    public function uploadPage()
    {
        return Inertia::render('UploadSR/Index', [
            'customers' => Customer::with(['ports' => function ($q) {
                $q->select('id', 'customer_id', 'name');
            }])->select('id', 'code', 'name')->get(),
            'flash' => [
                'success' => session('success'),
                'warning' => session('warning'),
                'error'   => session('error'),
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // PREVIEW
    // ─────────────────────────────────────────────────────────────────────

    public function preview(Request $request, SRProcessingService $service)
    {
        $request->validate([
            'file'     => 'required|file|mimes:xlsx,xls,xlsm',
            'sheet'    => 'required|integer|min:0',
            'customer' => 'required|exists:customers,id',
            'port'     => 'nullable|exists:ports,id',
        ]);

        return $service->preview($request);
    }

    // ─────────────────────────────────────────────────────────────────────
    // UPLOAD
    // ─────────────────────────────────────────────────────────────────────

    public function uploadTaiwan(Request $request, SRProcessingService $service)
    {
        $request->validate([
            'file'       => 'required|file|mimes:xlsx,xls,xlsm|max:51200',
            'sheet'      => 'required|integer|min:0',
            'customer'   => 'required|exists:customers,id',
            'port'       => 'nullable|exists:ports,id',
        ]);

        return $service->uploadTaiwan($request);
    }

    // ─────────────────────────────────────────────────────────────────────
    // OTHER ACTIONS
    // ─────────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $query = SR::query();

        if ($request->filled('assy_number')) {
            $query->where('assy_number', 'like', '%' . $request->assy_number . '%');
        }
        if ($request->filled('order_type')) {
            $query->where('order_type', $request->order_type);
        }
        if ($request->filled('start_date')) {
            $query->where('delivery_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->where('delivery_date', '<=', $request->end_date);
        }

        $srs = $query->orderBy('delivery_date')->paginate(50)->withQueryString();

        $summary = [
            'total_records'  => SR::count(),
            'total_firm'     => SR::where('order_type', 'FIRM')->count(),
            'total_forecast' => SR::where('order_type', 'FORECAST')->count(),
            'total_qty'      => SR::sum('qty'),
            'unique_assy_numbers' => SR::distinct('assy_number')->count('assy_number'),
            'mapped_count'   => SR::where('is_mapped', true)->count(),
            'unmapped_count' => SR::where('is_mapped', false)->count(),
        ];

        return Inertia::render('SR/Index', [
            'srs'     => $srs,
            'summary' => $summary,
            'filters' => $request->all(),
            'flash'   => [
                'success' => session('success'),
                'warning' => session('warning'),
                'error'   => session('error'),
            ],
        ]);
    }

    public function destroy($id)
    {
        try {
            DB::beginTransaction();
            $sr = SR::findOrFail($id);
            $batchUuid = $sr->upload_batch;

            SR::where('upload_batch', $batchUuid)->delete();
            UploadBatch::where('batch_uuid', $batchUuid)->delete();
            DB::commit();
            return redirect()->route('summary.index')->with('success', '✓ Record dihapus.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Delete SR error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Gagal hapus: ' . $e->getMessage());
        }
    }

    public function getSummaryData($id)
    {
        try {
            $sr = SR::findOrFail($id);
            return response()->json(['success' => true, 'sr' => $sr, 'data' => [$sr]]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'Data tidak ditemukan'], 400);
        }
    }

    /**
     * Remap assy number yang tidak dikenal
     */
    public function remap($id)
    {
        try {
            $sr = SR::findOrFail($id);
            $assy = assy::where('assy_number', $sr->assy_number)->first();
            
            if ($assy) {
                $sr->update([
                    'assy_id' => $assy->id,
                    'is_mapped' => true,
                    'mapping_error' => null,
                ]);
                return response()->json(['success' => true, 'message' => 'Assy number berhasil di-remap']);
            }
            
            return response()->json(['success' => false, 'message' => 'Assy number tidak ditemukan di master assy'], 404);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
