<?php

namespace App\Http\Controllers;

use App\Http\Requests\SRMappingTemplate\PreviewExcelRequest;
use App\Http\Requests\SRMappingTemplate\PreviewSRMappingTemplateRequest;
use App\Http\Requests\SRMappingTemplate\SaveSRMappingTemplateRequest;
use App\Models\Customer;
use App\Models\SRMappingTemplate;
use App\Services\SRMappingTemplateService;
use Inertia\Inertia;

class SRMappingTemplateController extends Controller
{
    public function __construct(private readonly SRMappingTemplateService $templates)
    {
    }

    public function index()
    {
        return Inertia::render('Master/SRMappingTemplate/Index', [
            'templates' => SRMappingTemplate::with('customer:id,code,name')->latest()->get(),
            'flash' => session('flash'),
        ]);
    }

    public function create()
    {
        return Inertia::render('Master/SRMappingTemplate/Form', [
            'customers' => $this->customers(),
            'template' => null,
        ]);
    }

    public function store(SaveSRMappingTemplateRequest $request)
    {
        $this->templates->create($this->templates->normalize($request->validated()));

        return redirect()
            ->route('sr-mapping-templates.index')
            ->with('flash', ['success' => 'Template SR berhasil ditambahkan.']);
    }

    public function edit(SRMappingTemplate $srMappingTemplate)
    {
        return Inertia::render('Master/SRMappingTemplate/Form', [
            'customers' => $this->customers(),
            'template' => $srMappingTemplate,
        ]);
    }

    public function update(SaveSRMappingTemplateRequest $request, SRMappingTemplate $srMappingTemplate)
    {
        $this->templates->update($srMappingTemplate, $this->templates->normalize($request->validated()));

        return redirect()
            ->route('sr-mapping-templates.index')
            ->with('flash', ['success' => 'Template SR berhasil diperbarui.']);
    }

    public function destroy(SRMappingTemplate $srMappingTemplate)
    {
        $srMappingTemplate->delete();

        return redirect()
            ->route('sr-mapping-templates.index')
            ->with('flash', ['success' => 'Template SR berhasil dihapus.']);
    }

    public function previewExcel(PreviewExcelRequest $request)
    {
        try {
            return response()->json($this->templates->previewExcel(
                $request->file('file'),
                (int) $request->input('sheet_index', 0)
            ));
        } catch (\DomainException $exception) {
            return $this->previewError($exception->getMessage());
        }
    }

    public function validatePreview(PreviewSRMappingTemplateRequest $request)
    {
        try {
            $validated = $this->templates->normalize($request->validated());

            return response()->json($this->templates->validatePreview(
                $request->file('file'),
                (int) $request->input('sheet_index', $validated['sheet_index'] ?? 0),
                $validated
            ));
        } catch (\Throwable $exception) {
            return $this->previewError($exception->getMessage());
        }
    }

    private function customers()
    {
        return Customer::orderBy('code')->get(['id', 'code', 'name']);
    }

    private function previewError(string $message)
    {
        return response()->json([
            'success' => false,
            'error' => $message,
        ], 422);
    }
}
