<?php

namespace App\Http\Requests\ProductionWeek;

use Illuminate\Foundation\Http\FormRequest;

class ImportProductionWeekRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:xlsx,xls',
            'customer_id' => 'nullable|exists:customers,id',
            'sheet' => 'nullable|string',
        ];
    }
}
