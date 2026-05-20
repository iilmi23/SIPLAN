<?php

namespace App\Http\Requests\ProductionWeek;

use Illuminate\Foundation\Http\FormRequest;

class MonthProductionWeekRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'year' => 'required|integer|min:2020|max:2030',
            'month' => 'required|integer|min:1|max:12',
            'customer_id' => 'nullable|integer|exists:customers,id',
        ];
    }
}
