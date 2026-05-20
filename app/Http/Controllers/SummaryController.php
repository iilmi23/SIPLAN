<?php

namespace App\Http\Controllers;

use App\Exports\SAIExport;
use App\Exports\SummaryExport;
use App\Exports\SummaryListExport;
use App\Exports\TYCExport;
use App\Exports\YCExport;
use App\Exports\YNAExport;
use App\Models\Customer;
use App\Models\SR;
use App\Services\SummaryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class SummaryController extends Controller
{
    public function __construct(private readonly SummaryService $summaries)
    {
    }

    public function index(Request $request)
    {
        $filters = $request->only($this->summaries->filterKeys());
        $srList = $this->summaries->batchSummaries(
            $filters,
            min(max((int) $request->integer('per_page', 25), 10), 100)
        );

        Log::info('Summary index', [
            'total_results' => $srList->count(),
            'filters' => $filters,
        ]);

        return Inertia::render('Summary/Index', [
            'srList' => $srList,
            'customers' => Customer::orderBy('name')->get(['name', 'code']),
            'filters' => $filters,
            'flash' => $this->flashMessages(),
        ]);
    }

    public function show($id)
    {
        $sr = SR::findOrFail($id);

        return Inertia::render('Summary/Show', [
            'sr' => $this->summaries->srPayload($sr, includeMonth: true),
            'data' => $this->summaries->detail($sr),
        ]);
    }

    public function data($id)
    {
        try {
            return response()->json($this->summaries->apiPayload(SR::findOrFail($id)));
        } catch (\Throwable $exception) {
            Log::error('Summary data error: ' . $exception->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Data tidak ditemukan',
            ], 404);
        }
    }

    public function destroy($id)
    {
        try {
            $deleted = $this->summaries->deleteUpload(SR::findOrFail($id));

            return redirect()
                ->route('summary.index')
                ->with('success', "Upload \"{$deleted['source_file']}\" deleted! ({$deleted['deleted_count']} records)");
        } catch (\Throwable $exception) {
            Log::error('Summary delete error: ' . $exception->getMessage());

            return redirect()
                ->route('summary.index')
                ->with('error', 'Gagal hapus: ' . $exception->getMessage());
        }
    }

    public function export($id)
    {
        try {
            $sr = SR::findOrFail($id);
            $summaryData = $this->summaries->detail($sr);
            $filename = Str::slug(pathinfo((string) $sr->source_file, PATHINFO_FILENAME)) ?: $sr->id;
            $exportClass = $this->exportClassFor($sr->customer);

            return Excel::download(
                new $exportClass($summaryData),
                "Summary_{$filename}_Detail.xlsx"
            );
        } catch (\Throwable $exception) {
            Log::error('Summary export error: ' . $exception->getMessage());

            return redirect()
                ->route('summary.index')
                ->with('error', 'Gagal export: ' . $exception->getMessage());
        }
    }

    public function exportAll(Request $request)
    {
        $srList = $this->summaries->batchSummaries($request->only($this->summaries->filterKeys()), null);

        return Excel::download(new SummaryListExport($srList), 'Summary_List.xlsx');
    }

    private function exportClassFor(?string $customer): string
    {
        return match (strtoupper($customer ?? '')) {
            'YNA' => YNAExport::class,
            'YC' => YCExport::class,
            'TYC' => TYCExport::class,
            'SAI' => SAIExport::class,
            default => SummaryExport::class,
        };
    }

    private function flashMessages(): array
    {
        return session('flash') ?: [
            'success' => session('success'),
            'warning' => session('warning'),
            'error' => session('error'),
        ];
    }
}
