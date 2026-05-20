<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Services\Variance\VarianceAnalyticsService;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class VarianceController extends Controller
{
    public function __construct(
        private readonly VarianceAnalyticsService $analytics
    )
    {
    }

    public function index(Request $request)
    {
        return redirect()->route('dashboard');
    }

    public function export(Request $request)
    {
        $customerCode = $request->string('customer')->toString();
        $selectedCustomer = $customerCode
            ? Customer::where('code', $customerCode)->first()
            : null;
        $rows = $this->analytics->exportRows($this->analyticsFilters($request, $selectedCustomer));
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Variance Analytics');
        $sheet->fromArray([
            'Customer',
            'Assy Number',
            'Month',
            'Year',
            'Week',
            'ETD',
            'ETA',
            'Port',
            'Previous Qty',
            'Current Qty',
            'Variance Qty',
            'Variance %',
            'Classification',
            'New Assy',
            'Disappeared',
            'Analyzed At',
        ], null, 'A1');

        $rowNumber = 2;
        foreach ($rows as $row) {
            $sheet->fromArray([
                $row->customer_code,
                $row->assy_number,
                $row->month,
                $row->year,
                $row->production_week ?? $row->week,
                optional($row->etd)->toDateString(),
                optional($row->eta)->toDateString(),
                $row->port,
                $row->previous_qty,
                $row->current_qty,
                $row->variance_qty,
                $row->variance_percent,
                strtoupper($row->classification),
                $row->is_new ? 'YES' : 'NO',
                $row->is_disappeared ? 'YES' : 'NO',
                optional($row->analyzed_at)->toDateTimeString(),
            ], null, "A{$rowNumber}");
            $rowNumber++;
        }

        foreach (range('A', 'P') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $path = storage_path('app/variance-analytics-'.now()->format('YmdHis').'.xlsx');
        (new Xlsx($spreadsheet))->save($path);

        return response()->download($path)->deleteFileAfterSend(true);
    }

    private function analyticsFilters(Request $request, ?Customer $customer): array
    {
        return [
            'customer_id' => $customer?->id,
            'customer' => $customer?->code,
            'batch_id' => $request->integer('batch_id') ?: null,
            'month_number' => $request->integer('month') ?: null,
            'year' => $request->integer('year') ?: null,
            'production_week' => $request->integer('production_week') ?: null,
            'assy_number' => $request->string('assy_number')->toString() ?: null,
            'port' => $request->string('port')->toString() ?: null,
            'etd_from' => $request->date('etd_from')?->toDateString(),
            'etd_to' => $request->date('etd_to')?->toDateString(),
            'eta_from' => $request->date('eta_from')?->toDateString(),
            'eta_to' => $request->date('eta_to')?->toDateString(),
            'variance_status' => $request->string('variance_status')->toString() ?: null,
            'threshold' => $request->input('threshold') !== null && $request->input('threshold') !== ''
                ? (float) $request->input('threshold')
                : null,
        ];
    }

}
