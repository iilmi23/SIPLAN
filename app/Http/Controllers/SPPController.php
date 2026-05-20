<?php

namespace App\Http\Controllers;

use App\Http\Requests\SPP\StoreSPPRequest;
use App\Models\Customer;
use App\Models\SR;
use App\Services\SPPService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SPPController extends Controller
{
    public function __construct(private readonly SPPService $spp)
    {
    }

    public function index(Request $request)
    {
        return Inertia::render('SPP/Index', [
            'srList' => $this->spp->batchSummary($request->only(['customer', 'search'])),
            'customers' => $this->customers(),
            'filters' => $request->only(['customer', 'search']),
        ]);
    }

    public function preview($id)
    {
        return Inertia::render('SPP/Preview', $this->spp->previewData(SR::findOrFail($id)));
    }

    public function previewCombined(Request $request)
    {
        $batchIds = $request->collect('batches')
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();

        abort_if(count($batchIds) < 2, 422, 'Pilih minimal dua SR upload untuk combined SPP.');

        return Inertia::render('SPP/Preview', $this->spp->previewCombinedData($batchIds));
    }

    public function show(Request $request, $period)
    {
        $filters = $request->only(['customer', 'sr_batch']);
        $data = $this->spp->showData($period, $filters);

        return Inertia::render('SPP/Show', [
            'customers' => $this->customers(),
            'srBatches' => $this->spp->srBatchOptions($filters),
            'filters' => $filters,
            'period' => $period,
            'records' => $data['records'],
            'summary' => $data['summary'],
        ]);
    }

    public function store(StoreSPPRequest $request, $id)
    {
        $sr = SR::with(['uploadBatch.customer', 'uploadBatch.port'])->findOrFail($id);
        $storedCount = $this->spp->storeFixed($sr, $request->validated());

        return back()->with('success', 'SPP fixed berhasil disimpan: ' . $storedCount . ' rows.');
    }

    public function storeCombined(StoreSPPRequest $request)
    {
        $validated = $request->validated();
        $batchIds = collect($validated['source_batch_ids'] ?? [])
            ->map(fn ($id) => (int) $id)
            ->filter()
            ->unique()
            ->values()
            ->all();

        abort_if(count($batchIds) < 2, 422, 'Pilih minimal dua SR upload untuk combined SPP.');

        $storedCount = $this->spp->storeCombinedFixed($batchIds, $validated);

        return back()->with('success', 'Combined SPP fixed berhasil disimpan: ' . $storedCount . ' rows.');
    }

    private function customers()
    {
        return Customer::orderBy('name')->get(['name', 'code']);
    }
}
