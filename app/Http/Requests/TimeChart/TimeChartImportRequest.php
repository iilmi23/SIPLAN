<?php

namespace App\Http\Requests\TimeChart;

use Illuminate\Foundation\Http\FormRequest;

class TimeChartImportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:xlsx,xls,xlsm',
            'sheet' => 'required|integer|min:0',
            'year' => 'required|integer|min:2020|max:2030',
            'month' => 'required|integer|min:1|max:12',
            'customer_id' => 'required|exists:customers,id',
        ];
    }
}
