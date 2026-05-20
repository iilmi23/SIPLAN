<?php

namespace App\Http\Controllers;

use App\Http\Requests\TimeChart\TimeChartImportRequest;
use App\Models\Customer;
use App\Models\TimeChart;
use App\Services\TimeChartService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class TimeChartController extends Controller
{
    public function __construct(private readonly TimeChartService $timeCharts)
    {
    }

    public function index(Request $request)
    {
        $year = (int) $request->get('year', now()->year);
        $month = (int) $request->get('month', now()->month);
        $timeCharts = TimeChart::getForMonth($year, $month);

        return Inertia::render('Master/TimeChart/Index', [
            'customers' => Customer::select('id', 'code', 'name')->orderBy('code')->get(),
            'timeCharts' => $timeCharts->isEmpty() ? [] : $this->timeCharts->monthRows($year, $month),
            'year' => $year,
            'month' => $month,
            'monthName' => Carbon::create($year, $month, 1)->format('F Y'),
            'needsUpload' => $timeCharts->isEmpty(),
            'latestBatch' => TimeChart::getLatestBatch(),
        ]);
    }

    public function preview(TimeChartImportRequest $request)
    {
        try {
            return response()->json($this->timeCharts->preview(
                $request->file('file'),
                (int) $request->input('sheet'),
                (int) $request->input('year'),
                (int) $request->input('month'),
                Customer::findOrFail($request->input('customer_id'))
            ));
        } catch (\DomainException $exception) {
            return response()->json([
                'success' => false,
                'error' => $exception->getMessage(),
            ], 400);
        } catch (\Throwable $exception) {
            Log::error('TimeChart preview error: ' . $exception->getMessage());

            return response()->json([
                'success' => false,
                'error' => $exception->getMessage(),
            ], 400);
        }
    }

    public function upload(TimeChartImportRequest $request)
    {
        try {
            return response()->json($this->timeCharts->upload(
                $request->file('file'),
                (int) $request->input('sheet'),
                (int) $request->input('year'),
                (int) $request->input('month'),
                Customer::findOrFail($request->input('customer_id'))
            ));
        } catch (\DomainException $exception) {
            return response()->json([
                'success' => false,
                'error' => $exception->getMessage(),
            ], 400);
        } catch (\Throwable $exception) {
            Log::error('TimeChart upload error: ' . $exception->getMessage(), [
                'trace' => $exception->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Gagal memproses: ' . $exception->getMessage(),
            ], 500);
        }
    }
}
