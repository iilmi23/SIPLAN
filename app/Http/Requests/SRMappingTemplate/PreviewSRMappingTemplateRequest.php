<?php

namespace App\Http\Requests\SRMappingTemplate;

class PreviewSRMappingTemplateRequest extends SaveSRMappingTemplateRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), [
            'file' => ['required', 'file', 'mimes:xlsx,xls,xlsm', 'max:51200'],
            'sheet_index' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}
