<?php

namespace App\Http\Requests\ProductionWeek;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductionWeekRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => 'nullable|exists:customers,id',
            'year' => 'required|integer|min:2020|max:2030',
            'month_number' => 'required|integer|min:1|max:12',
            'month_name' => 'required|string|max:3',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'num_weeks' => 'required|integer|in:3,4,5',
            'working_days' => 'nullable|array',
            'working_days.*' => 'array',
            'working_days.*.*' => 'date',
        ];
    }
}
