<?php

namespace App\Http\Requests\Assy;

use Illuminate\Foundation\Http\FormRequest;

class StoreAssyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'carline_id' => 'required|exists:carline,id',
            'assy_number' => 'required|string|max:50|unique:assy',
            'assy_code' => 'required|string|max:20',
            'level' => 'required|string|max:20',
            'type' => 'nullable|string|max:10',
            'umh' => 'required|numeric|min:0|max:9999.999999',
            'std_pack' => 'required|integer|min:1',
            'is_active' => 'boolean',
        ];
    }
}
