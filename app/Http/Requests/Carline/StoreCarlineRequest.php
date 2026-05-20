<?php

namespace App\Http\Requests\Carline;

use Illuminate\Foundation\Http\FormRequest;

class StoreCarlineRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'code' => 'required|string|max:20|unique:carline,code',
        ];
    }
}
