<?php

namespace App\Http\Requests\Assy;

use Illuminate\Foundation\Http\FormRequest;

class SheetNamesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ];
    }
}
