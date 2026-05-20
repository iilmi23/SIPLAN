<?php

namespace App\Http\Requests\SRMappingTemplate;

use Illuminate\Foundation\Http\FormRequest;

class PreviewExcelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:xlsx,xls,xlsm', 'max:51200'],
            'sheet_index' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
