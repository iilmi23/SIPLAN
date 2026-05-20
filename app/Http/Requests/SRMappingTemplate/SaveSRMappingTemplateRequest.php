<?php

namespace App\Http\Requests\SRMappingTemplate;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveSRMappingTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_id' => ['required', 'exists:customers,id'],
            'name' => ['required', 'string', 'max:255'],
            'orientation' => ['required', Rule::in(['vertical', 'horizontal'])],
            'sheet_index' => ['nullable', 'integer', 'min:0'],
            'header_row' => ['nullable', 'integer', 'min:1'],
            'data_start_row' => ['required', 'integer', 'min:1'],
            'assy_number_column' => ['required', 'string', 'max:8'],
            'qty_column' => ['nullable', 'required_if:orientation,vertical', 'string', 'max:8'],
            'qty_start_column' => ['nullable', 'required_if:orientation,horizontal', 'string', 'max:8'],
            'qty_end_column' => ['nullable', 'required_if:orientation,horizontal', 'string', 'max:8'],
            'date_header_row' => ['nullable', 'required_if:orientation,horizontal', 'integer', 'min:1'],
            'etd_column' => ['nullable', 'required_if:orientation,vertical', 'string', 'max:8'],
            'eta_column' => ['nullable', 'string', 'max:8'],
            'order_type_column' => ['nullable', 'string', 'max:8'],
            'default_order_type' => ['nullable', 'string', 'max:50'],
            'model_column' => ['nullable', 'string', 'max:8'],
            'family_column' => ['nullable', 'string', 'max:8'],
            'port_column' => ['nullable', 'string', 'max:8'],
            'month_column' => ['nullable', 'string', 'max:8'],
            'week_column' => ['nullable', 'string', 'max:8'],
            'year_column' => ['nullable', 'string', 'max:8'],
            'date_format' => ['nullable', 'string', 'max:50'],
            'skip_keywords' => ['nullable', 'string'],
            'is_active' => ['boolean'],
        ];
    }
}
