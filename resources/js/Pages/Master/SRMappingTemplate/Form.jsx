import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Link, useForm } from "@inertiajs/react";
import { useState } from "react";

const columnFields = [
    ["assy_number_column", "Assy Number Column", true],
    ["qty_column", "Qty Column", false],
    ["qty_start_column", "Qty Start Column", false],
    ["qty_end_column", "Qty End Column", false],
    ["etd_column", "ETD Column", false],
    ["eta_column", "ETA Column", false],
    ["order_type_column", "Order Type Column", false],
    ["model_column", "Model Column", false],
    ["family_column", "Family Column", false],
    ["port_column", "Port Column", false],
    ["month_column", "Month Column", false],
    ["week_column", "Week Column", false],
    ["year_column", "Year Column", false],
];

export default function Form({ customers = [], template }) {
    const isEdit = Boolean(template);
    const [sampleFile, setSampleFile] = useState(null);
    const [excelPreview, setExcelPreview] = useState(null);
    const [mappingPreview, setMappingPreview] = useState(null);
    const [previewError, setPreviewError] = useState("");
    const [isReadingExcel, setIsReadingExcel] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const { data, setData, post, put, processing, errors } = useForm({
        customer_id: template?.customer_id || "",
        name: template?.name || "Default SR Template",
        orientation: template?.orientation || "vertical",
        sheet_index: template?.sheet_index ?? "",
        header_row: template?.header_row ?? "",
        data_start_row: template?.data_start_row || 2,
        assy_number_column: template?.assy_number_column || "",
        qty_column: template?.qty_column || "",
        qty_start_column: template?.qty_start_column || "",
        qty_end_column: template?.qty_end_column || "",
        date_header_row: template?.date_header_row ?? "",
        etd_column: template?.etd_column || "",
        eta_column: template?.eta_column || "",
        order_type_column: template?.order_type_column || "",
        default_order_type: template?.default_order_type || "FORECAST",
        model_column: template?.model_column || "",
        family_column: template?.family_column || "",
        port_column: template?.port_column || "",
        month_column: template?.month_column || "",
        week_column: template?.week_column || "",
        year_column: template?.year_column || "",
        date_format: template?.date_format || "",
        skip_keywords: Array.isArray(template?.skip_keywords) ? template.skip_keywords.join(", ") : "total, subtotal, grand total",
        is_active: template?.is_active ?? true,
    });

    const submit = (event) => {
        event.preventDefault();
        if (isEdit) {
            put(route("sr-mapping-templates.update", template.id));
        } else {
            post(route("sr-mapping-templates.store"));
        }
    };

    const inputClass = "h-11 w-full rounded-xl border border-gray-200 px-4 text-sm focus:border-[#1D6F42] focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20";
    const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";

    const buildTemplateFormData = () => {
        const formData = new FormData();
        if (sampleFile) {
            formData.append("file", sampleFile);
        }

        Object.entries(data).forEach(([key, value]) => {
            formData.append(key, value === null || value === undefined ? "" : value);
        });

        return formData;
    };

    const readExcelPreview = async (file = sampleFile, sheetIndex = data.sheet_index || 0) => {
        if (!file) {
            setPreviewError("Pilih contoh file SR terlebih dahulu.");
            return;
        }

        setIsReadingExcel(true);
        setPreviewError("");
        setMappingPreview(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("sheet_index", sheetIndex || 0);

        try {
            const response = await fetch(route("sr-mapping-templates.preview-excel"), {
                method: "POST",
                body: formData,
                headers: { "X-CSRF-TOKEN": csrfToken() },
            });
            const result = await response.json();

            if (!result.success) {
                setPreviewError(result.error || "Gagal membaca file Excel.");
                return;
            }

            setExcelPreview(result);
            setData("sheet_index", result.current_sheet.index);
        } catch (error) {
            setPreviewError(error.message);
        } finally {
            setIsReadingExcel(false);
        }
    };

    const validateTemplatePreview = async () => {
        if (!sampleFile) {
            setPreviewError("Upload contoh file SR dulu untuk validasi template.");
            return;
        }

        setIsValidating(true);
        setPreviewError("");
        setMappingPreview(null);

        try {
            const response = await fetch(route("sr-mapping-templates.validate-preview"), {
                method: "POST",
                body: buildTemplateFormData(),
                headers: { "X-CSRF-TOKEN": csrfToken() },
            });
            const result = await response.json();

            if (!result.success) {
                setPreviewError(result.error || "Template belum bisa membaca file contoh.");
                return;
            }

            setMappingPreview(result);
        } catch (error) {
            setPreviewError(error.message);
        } finally {
            setIsValidating(false);
        }
    };

    const handleSampleFileChange = (event) => {
        const file = event.target.files?.[0] || null;
        setSampleFile(file);
        setExcelPreview(null);
        setMappingPreview(null);
        if (file) {
            readExcelPreview(file, data.sheet_index || 0);
        }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 px-5 py-6 md:px-8">
                <Breadcrumb
                    items={[
                        { label: "Masters" },
                        { label: "SR Templates", href: route("sr-mapping-templates.index") },
                        { label: isEdit ? "Edit" : "Create" },
                    ]}
                />

                <form onSubmit={submit} className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 p-6">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            {isEdit ? "Edit SR Mapping Template" : "Add SR Mapping Template"}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Template dibuat sekali per customer dari contoh file Excel, lalu dipakai otomatis saat upload SR berikutnya.
                        </p>
                    </div>

                    <div className="border-b border-gray-100 p-6">
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                            <Field
                                label="1. Upload Sample SR Excel"
                                hint="Upload contoh file dulu. Setelah file dibaca, pilih sheet yang benar sebelum validasi mapping."
                            >
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.xlsm"
                                    onChange={handleSampleFileChange}
                                    className="block w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#1D6F42] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#185c38]"
                                />
                            </Field>

                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={() => readExcelPreview()}
                                    disabled={!sampleFile || isReadingExcel}
                                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {isReadingExcel ? "Reading..." : "Read Sheets"}
                                </button>
                            </div>
                        </div>

                        {previewError && (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {previewError}
                            </div>
                        )}

                        {excelPreview && (
                            <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                                <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-gray-800">2. Select Sheet and Check Excel Preview</p>
                                        <p className="text-xs text-gray-500">
                                            Pilih sheet yang berisi data SR. Gunakan huruf kolom dan nomor baris dari tabel ini untuk mengisi template.
                                        </p>
                                    </div>
                                    <select
                                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                                        value={data.sheet_index}
                                        onChange={(event) => readExcelPreview(sampleFile, event.target.value)}
                                    >
                                        {excelPreview.sheets.map((sheet) => (
                                            <option key={sheet.index} value={sheet.index}>
                                                {sheet.index} - {sheet.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="max-h-[360px] overflow-auto">
                                    <table className="min-w-full border-collapse text-xs">
                                        <thead className="sticky top-0 bg-white">
                                            <tr>
                                                <th className="border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-500">Row</th>
                                                {excelPreview.columns.map((column) => (
                                                    <th key={column} className="border-b border-r border-gray-200 px-3 py-2 text-left font-semibold text-gray-600">
                                                        {column}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {excelPreview.rows.map((row) => (
                                                <tr key={row.row_number} className="odd:bg-gray-50/60">
                                                    <td className="border-r border-gray-200 px-3 py-2 font-semibold text-gray-500">{row.row_number}</td>
                                                    {row.cells.map((cell) => (
                                                        <td key={`${row.row_number}-${cell.column}`} className="max-w-[180px] truncate border-r border-gray-100 px-3 py-2 text-gray-700">
                                                            {cell.value || "-"}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-6 p-6 lg:grid-cols-2">
                        <Field label="Customer" error={errors.customer_id}>
                            <select className={inputClass} value={data.customer_id} onChange={(e) => setData("customer_id", e.target.value)}>
                                <option value="">Select customer</option>
                                {customers.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.code} - {customer.name}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Template Name" error={errors.name}>
                            <input className={inputClass} value={data.name} onChange={(e) => setData("name", e.target.value)} />
                        </Field>

                        <Field label="Orientation" error={errors.orientation}>
                            <select className={inputClass} value={data.orientation} onChange={(e) => setData("orientation", e.target.value)}>
                                <option value="vertical">Vertical: satu baris satu order</option>
                                <option value="horizontal">Horizontal: qty tersebar per kolom tanggal</option>
                            </select>
                        </Field>

                        <Field label="Sheet Index" hint="Kosongkan jika template boleh dipakai di sheet mana pun." error={errors.sheet_index}>
                            <input type="number" min="0" className={inputClass} value={data.sheet_index} onChange={(e) => setData("sheet_index", e.target.value)} />
                        </Field>

                        <Field label="Header Row" error={errors.header_row}>
                            <input type="number" min="1" className={inputClass} value={data.header_row} onChange={(e) => setData("header_row", e.target.value)} />
                        </Field>

                        <Field label="Data Start Row" error={errors.data_start_row}>
                            <input type="number" min="1" className={inputClass} value={data.data_start_row} onChange={(e) => setData("data_start_row", e.target.value)} />
                        </Field>

                        {columnFields.map(([key, label]) => (
                            <Field key={key} label={label} error={errors[key]}>
                                <input
                                    className={inputClass}
                                    value={data[key]}
                                    onChange={(e) => setData(key, e.target.value.toUpperCase())}
                                    placeholder="A"
                                />
                            </Field>
                        ))}

                        <Field label="Date Header Row" hint="Wajib untuk horizontal. Baris yang berisi tanggal di atas kolom qty." error={errors.date_header_row}>
                            <input type="number" min="1" className={inputClass} value={data.date_header_row} onChange={(e) => setData("date_header_row", e.target.value)} />
                        </Field>

                        <Field label="Default Order Type" error={errors.default_order_type}>
                            <input className={inputClass} value={data.default_order_type} onChange={(e) => setData("default_order_type", e.target.value.toUpperCase())} />
                        </Field>

                        <Field label="Date Format" hint="Opsional, contoh d/m/Y. Kosongkan jika tanggal Excel normal." error={errors.date_format}>
                            <input className={inputClass} value={data.date_format} onChange={(e) => setData("date_format", e.target.value)} />
                        </Field>

                        <Field label="Skip Keywords" hint="Pisahkan dengan koma." error={errors.skip_keywords}>
                            <input className={inputClass} value={data.skip_keywords} onChange={(e) => setData("skip_keywords", e.target.value)} />
                        </Field>

                        <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData("is_active", e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-[#1D6F42] focus:ring-[#1D6F42]"
                            />
                            Active template for this customer
                        </label>
                    </div>

                    <div className="border-t border-gray-100 p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-gray-800">Validate Template</p>
                                <p className="text-xs text-gray-500">Cek apakah konfigurasi ini sudah menghasilkan data SR yang benar sebelum disimpan.</p>
                            </div>
                            <button
                                type="button"
                                onClick={validateTemplatePreview}
                                disabled={!sampleFile || isValidating}
                                className="h-11 rounded-xl bg-gray-900 px-5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                                {isValidating ? "Validating..." : "Validate Preview"}
                            </button>
                        </div>

                        {mappingPreview && (
                            <div className="mt-5 overflow-hidden rounded-xl border border-green-200">
                                <div className="grid gap-3 bg-green-50 px-4 py-3 text-sm text-green-900 sm:grid-cols-3">
                                    <div>Total records: <span className="font-semibold">{mappingPreview.total_records}</span></div>
                                    <div>Unique assy numbers: <span className="font-semibold">{mappingPreview.unique_assy_numbers}</span></div>
                                    <div>Total qty: <span className="font-semibold">{mappingPreview.total_qty}</span></div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[900px] text-sm">
                                        <thead className="bg-white text-xs uppercase text-gray-500">
                                            <tr>
                                                {["Assy Number", "Qty", "ETD", "ETA", "Order Type", "Month", "Week", "Model", "Family"].map((header) => (
                                                    <th key={header} className="px-4 py-3 text-left font-semibold">{header}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {mappingPreview.preview.map((row, index) => (
                                                <tr key={`${row.assy_number}-${index}`} className="bg-white">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{row.assy_number}</td>
                                                    <td className="px-4 py-3 text-gray-700">{row.qty}</td>
                                                    <td className="px-4 py-3 text-gray-700">{row.etd}</td>
                                                    <td className="px-4 py-3 text-gray-700">{row.eta}</td>
                                                    <td className="px-4 py-3 text-gray-700">{row.order_type}</td>
                                                    <td className="px-4 py-3 text-gray-700">{row.month}</td>
                                                    <td className="px-4 py-3 text-gray-700">{row.week}</td>
                                                    <td className="px-4 py-3 text-gray-700">{row.model || "-"}</td>
                                                    <td className="px-4 py-3 text-gray-700">{row.family || "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-100 p-6">
                        <Link href={route("sr-mapping-templates.index")} className="inline-flex h-11 items-center rounded-xl border border-gray-200 px-5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Back
                        </Link>
                        <button disabled={processing} className="inline-flex h-11 items-center rounded-xl bg-[#1D6F42] px-5 text-sm font-medium text-white hover:bg-[#185c38] disabled:opacity-50">
                            {processing ? "Saving..." : "Save Template"}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}

function Field({ label, hint, error, children }) {
    return (
        <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">{label}</label>
            {children}
            {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
    );
}
