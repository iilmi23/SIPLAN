<?php

namespace App\Http\Requests\Carline;

use Illuminate\Foundation\Http\FormRequest;

class CarlineSheetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:xlsx,xls,csv',
            'sheet' => 'sometimes|required|string',
        ];
    }
}
