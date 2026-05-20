<?php

namespace App\Http\Requests\ProductionWeek;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductionWeekRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (! $this->filled('start_date') && $this->filled('week_start')) {
            $this->merge([
                'start_date' => $this->input('week_start'),
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'customer_id' => 'nullable|exists:customers,id',
            'year' => 'required|integer|min:2020|max:2030',
            'month_number' => 'required|integer|min:1|max:12',
            'month_name' => 'required|string|max:3',
            'start_date' => 'required|date',
            'week_start' => 'nullable|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'num_weeks' => 'required|integer|in:3,4,5',
            'working_days' => 'nullable|array',
            'working_days.*' => 'array',
            'working_days.*.*' => 'date',
        ];
    }
}
