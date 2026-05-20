<?php

namespace App\Http\Requests\SPP;

use Illuminate\Foundation\Http\FormRequest;

class StoreSPPRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'months' => ['required', 'array', 'min:1'],
            'months.*.period' => ['required', 'date_format:Y-m'],
            'months.*.label' => ['nullable', 'string', 'max:12'],
            'months.*.year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
            'months.*.bucket' => ['nullable', 'string', 'max:20'],
            'months.*.period_start' => ['nullable', 'date'],
            'months.*.period_end' => ['nullable', 'date'],
            'source_batch_ids' => ['nullable', 'array'],
            'source_batch_ids.*' => ['integer', 'exists:upload_batches,id'],
            'rows' => ['required', 'array', 'min:1'],
            'rows.*.assy_number' => ['required', 'string', 'max:50'],
            'rows.*.type' => ['nullable', 'string', 'max:50'],
            'rows.*.carline' => ['nullable', 'string', 'max:50'],
            'rows.*.level' => ['nullable', 'string', 'max:20'],
            'rows.*.assy_code' => ['nullable', 'string', 'max:20'],
            'rows.*.cct' => ['nullable', 'string', 'max:20'],
            'rows.*.std_pack' => ['nullable'],
            'rows.*.umh' => ['nullable'],
            'rows.*.months' => ['nullable', 'array'],
        ];
    }
}
