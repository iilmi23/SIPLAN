import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Link, useForm } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
    ArrowDownTrayIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    ArrowUpTrayIcon,
    CheckCircleIcon,
    DocumentArrowUpIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    TableCellsIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

const MONTH_ORDER = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const IMPORT_WEEK_OPTIONS = ["3", "4", "5"];

export default function Import({ customers = [], flash = {} }) {
    const fileRef = useRef(null);
    const [preview, setPreview] = useState(null);
    const [previewError, setPreviewError] = useState("");
    const [previewing, setPreviewing] = useState(false);
    const [showFlash, setShowFlash] = useState(false);
    const [flashMessage, setFlashMessage] = useState("");
    const [flashType, setFlashType] = useState("success");
    const [sheets, setSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState("");

    const { data, setData, post, processing, errors, reset } = useForm({
        customer_id: "",
        file: null,
        sheet: "",
    });

    const isBusy = previewing || processing;
    const canImport = Boolean(data.file && selectedSheet && preview && preview.validRows > 0 && !isBusy);
    const importHelpText = !previewing && data.file && preview && preview.validRows === 0
        ? "Tidak ada baris valid untuk diupload. Periksa format Excel dan kolom yang wajib."
        : "Klik Preview Data untuk melihat file dan aktifkan Upload Week jika ada baris valid.";
    const serverErrorMessages = Object.values(errors || {}).flat();

    useEffect(() => {
        if (flash?.success || flash?.warning || flash?.error) {
            setFlashType(flash.success ? "success" : flash.warning ? "warning" : "error");
            setFlashMessage(flash.success || flash.warning || flash.error);
            setShowFlash(true);
            const timer = window.setTimeout(() => setShowFlash(false), 4000);
            return () => window.clearTimeout(timer);
        }
    }, [flash]);

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0] ?? null;
        setData("file", file);

        if (!file) {
            clearPreview();
            setSheets([]);
            setSelectedSheet("");
            return;
        }

        const extension = file.name.split(".").pop()?.toLowerCase();

        if (!["xlsx", "xls"].includes(extension)) {
            setData("file", null);
            setData("sheet", "");
            setPreview(null);
            setSheets([]);
            setSelectedSheet("");
            setPreviewError("Please select a valid Excel file (.xlsx or .xls).");

            if (fileRef.current) {
                fileRef.current.value = "";
            }

            return;
        }

        await loadSheets(file);
    };

    const clearPreview = () => {
        setPreview(null);
        setPreviewError("");
        setPreviewing(false);
    };

    const loadSheets = async (file) => {
        setPreviewing(true);
        setSheets([]);
        setSelectedSheet("");
        setData("sheet", "");
        clearPreview();

        try {
            const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
            const sheetNames = workbook.SheetNames || [];

            if (sheetNames.length === 0) {
                throw new Error("No worksheet found");
            }

            setSheets(sheetNames);
            setSelectedSheet(sheetNames[0]);
            setData("sheet", sheetNames[0]);
            await buildPreview(file, sheetNames[0]);
        } catch (error) {
            setPreviewError("Failed to read Excel file. Make sure the file is a valid .xlsx or .xls file.");
        } finally {
            setPreviewing(false);
        }
    };

    const resetForm = () => {
        reset();
        clearPreview();
        setSheets([]);
        setSelectedSheet("");
        setData("sheet", "");

        if (fileRef.current) {
            fileRef.current.value = "";
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!canImport) {
            setPreviewError("Preview a valid Excel file before importing.");
            return;
        }

        post(route("production-week.import"), {
            forceFormData: true,
            preserveScroll: true,
            onError: () => {
                setPreviewError("Upload gagal. Periksa pesan kesalahan di bawah dan perbaiki file/format.");
            },
        });
    };

    const buildPreview = async (file, sheetName = selectedSheet) => {
        setPreviewing(true);
        setPreview(null);
        setPreviewError("");

        try {
            const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
            const targetSheet = sheetName || workbook.SheetNames[0];

            if (!targetSheet || !workbook.Sheets[targetSheet]) {
                throw new Error("No worksheet found");
            }

            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[targetSheet], {
                header: 1,
                raw: false,
                defval: "",
            });
            const headerIndex = findProductionWeekHeaderIndex(rows);

            const parsedRows = rows
                .slice(headerIndex + 1)
                .map((row, index) => parsePreviewRow(row, headerIndex + index + 2))
                .filter((row) => row.hasData);

            const validRows = parsedRows.filter((row) => row.errors.length === 0).length;
            const errorRows = parsedRows.filter((row) => row.errors.length > 0).length;
            const noDataRows = parsedRows.length === 0;
            const noValidRows = parsedRows.length > 0 && validRows === 0;

            setPreview({
                sheetName: targetSheet,
                totalRows: parsedRows.length,
                validRows,
                errorRows,
                rows: parsedRows,
            });

            if (noDataRows) {
                setPreviewError("Tidak ditemukan data baris setelah header. Pastikan ada data di baris setelah header.");
            } else if (noValidRows) {
                setPreviewError("Tidak ada baris valid. Periksa format Month, Range, Year, dan Total Weeks.");
            } else {
                setPreviewError("");
            }
        } catch (error) {
            setPreviewError("Failed to read Excel file. Make sure the file is a valid .xlsx or .xls file.");
        } finally {
            setPreviewing(false);
        }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <Breadcrumb items={[{ label: "Masters" }, { label: "Production Weeks", href: route("production-week.index") }, { label: "Import" }]} />

                {showFlash && flashMessage && (
                    <Alert type={flashType} message={flashMessage} onClose={() => setShowFlash(false)} />
                )}

                {isBusy && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                        <div className="flex items-center gap-3 rounded-xl bg-white p-6 shadow-xl">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1D6F42] border-t-transparent" />
                            <span className="text-sm font-medium text-gray-700">Processing...</span>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 pb-4 border-b border-gray-100">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex items-start gap-4">
                                <Link
                                    href={route("production-week.index")}
                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#1D6F42]"
                                    aria-label="Back to production week list"
                                >
                                    <ArrowLeftIcon className="h-5 w-5" />
                                </Link>
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                        Import Production Week
                                    </h1>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Upload Excel, preview rows, then import valid week calendars.
                                    </p>
                                </div>
                            </div>

                            <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-[#1D6F42]/10 text-[#1D6F42] sm:flex">
                                <DocumentArrowUpIcon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="p-6 space-y-6">
                            <FormatGuide />

                            <div className="space-y-6">
                                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                                    <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1D6F42]/10 text-[#1D6F42]">
                                                <ArrowUpTrayIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-semibold text-gray-900">Upload Setup</h2>
                                                <p className="text-xs text-gray-500">Set customer scope, download template, and choose file.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-5 p-5 lg:grid-cols-2">
                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                Customer Scope
                                            </label>
                                            <select
                                                value={data.customer_id}
                                                onChange={(event) => setData("customer_id", event.target.value)}
                                                className={inputCls(errors.customer_id)}
                                            >
                                                <option value="">Global (all customers)</option>
                                                {customers.map((customer) => (
                                                    <option key={customer.id} value={customer.id}>
                                                        {customer.code}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.customer_id && <p className="mt-1 text-xs text-red-500">{errors.customer_id}</p>}
                                            <p className="mt-1 text-xs text-gray-500">Leave global if the week calendar applies to all customers.</p>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                Template
                                            </label>
                                            <a
                                                href={route("production-week.download-template")}
                                                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#1D6F42]/30 bg-[#1D6F42]/10 px-4 text-sm font-semibold text-[#1D6F42] transition-colors hover:bg-[#1D6F42] hover:text-white"
                                            >
                                                <ArrowDownTrayIcon className="h-4 w-4" />
                                                Download Template
                                            </a>
                                            <p className="mt-1 text-xs text-gray-500">Use this template for the required production week columns.</p>
                                        </div>

                                        <div>
                                            <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                Excel File <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                ref={fileRef}
                                                type="file"
                                                accept=".xlsx,.xls"
                                                onChange={handleFileChange}
                                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 transition-all file:mr-3 file:rounded-lg file:border-0 file:bg-[#1D6F42] file:px-4 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#185c38] focus:border-[#1D6F42] focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20"
                                            />
                                            {errors.file && <p className="mt-1 text-xs text-red-500">{errors.file}</p>}
                                            {data.file && (
                                                <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                                    <CheckCircleIcon className="h-4 w-4 shrink-0" />
                                                    <span className="truncate">
                                                        Selected: <span className="font-semibold">{data.file.name}</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-end">
                                            <div className="w-full">
                                                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                                                    Worksheet <span className="text-red-500">*</span>
                                                </label>
                                                <select
                                                    value={selectedSheet}
                                                    onChange={(event) => {
                                                        const nextSheet = event.target.value;
                                                        setSelectedSheet(nextSheet);
                                                        setData("sheet", nextSheet);
                                                        clearPreview();

                                                        if (data.file && nextSheet) {
                                                            buildPreview(data.file, nextSheet);
                                                        }
                                                    }}
                                                    disabled={sheets.length === 0 || isBusy}
                                                    className={`${inputCls()} disabled:bg-gray-50 disabled:text-gray-400`}
                                                >
                                                    {sheets.length === 0 ? (
                                                        <option value="">Select file first</option>
                                                    ) : (
                                                        sheets.map((sheet, index) => (
                                                            <option key={index} value={sheet}>
                                                                {sheet}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                                <p className="mt-1 text-xs text-gray-500">Preview reads the selected worksheet only.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center">
                                        <button
                                            type="button"
                                            onClick={() => data.file && selectedSheet && buildPreview(data.file, selectedSheet)}
                                            disabled={!data.file || !selectedSheet || isBusy}
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#1D6F42] bg-white px-5 text-sm font-semibold text-[#1D6F42] transition-colors hover:bg-[#1D6F42] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <EyeIcon className="h-4 w-4" />
                                            {previewing ? "Previewing..." : "Preview Data"}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!canImport}
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1D6F42] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#185c38] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <ArrowUpTrayIcon className="h-4 w-4" />
                                            {processing ? "Importing..." : "Upload Week"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            disabled={isBusy && !processing}
                                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            <ArrowPathIcon className="h-4 w-4" />
                                            Reset
                                        </button>
                                    </div>
                                    <div className="border-t border-gray-100 px-5 py-3">
                                        <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
                                            {importHelpText}
                                        </p>
                                    </div>
                                </section>

                                {previewing && (
                                    <StatusBox tone="emerald" title="Reading Excel preview" text="Checking the selected worksheet and validating the required columns." />
                                )}

                                {previewError && (
                                    <StatusBox tone="red" title="Preview needs attention" text={previewError} />
                                )}

                                {serverErrorMessages.length > 0 && (
                                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        <p className="font-semibold">Validation errors:</p>
                                        <ul className="mt-2 list-disc space-y-1 pl-5">
                                            {serverErrorMessages.map((message, index) => (
                                                <li key={index}>{message}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <PreviewTable preview={preview} />
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideDown {
                    animation: slideDown 0.25s ease-out;
                }
            `}</style>
        </AdminLayout>
    );
}

function FormatGuide() {
    const columns = [
        { key: "A", label: "Month", example: "JAN" },
        { key: "B", label: "Date Range", example: "05/JAN ~ 30/JAN" },
        { key: "C", label: "Year", example: "2026" },
        { key: "D", label: "Total Weeks", example: "3, 4, or 5" },
        { key: "E", label: "Holiday Dates", example: "12/JAN, 26/JAN" },
        { key: "F", label: "Extra Working Dates", example: "10/JAN" },
    ];

    return (
        <div className="rounded-xl border border-emerald-100 bg-[#1D6F42]/5 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1D6F42] ring-1 ring-emerald-100">
                        <DocumentArrowUpIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Excel Format Requirements</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Columns A-D are required. Columns E-F are optional working-day overrides.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
                    {columns.map((column) => (
                        <div key={column.key} className="rounded-lg border border-emerald-100 bg-white px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase text-[#1D6F42]">Column {column.key}</p>
                            <p className="mt-0.5 text-xs font-semibold text-gray-800">{column.label}</p>
                            <p className="mt-1 truncate text-[11px] text-gray-500">{column.example}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Alert({ type, message, onClose }) {
    const isSuccess = type === "success";
    const isWarning = type === "warning";
    const Icon = isSuccess ? CheckCircleIcon : ExclamationTriangleIcon;

    return (
        <div className="mb-6 animate-slideDown">
            <div className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                isSuccess
                    ? "border-l-4 border-l-[#1D6F42] border-gray-200"
                    : isWarning
                        ? "border-l-4 border-l-amber-500 border-gray-200"
                        : "border-l-4 border-l-red-500 border-gray-200"
            }`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isSuccess
                        ? "bg-green-50 text-[#1D6F42]"
                        : isWarning
                            ? "bg-amber-50 text-amber-600"
                            : "bg-red-50 text-red-500"
                }`}>
                    <Icon className="h-5 w-5" />
                </div>
                <p className="flex-1 whitespace-pre-line text-sm font-medium text-gray-800">{message}</p>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Close alert"
                >
                    <XMarkIcon className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function PreviewTable({ preview }) {
    if (!preview) {
        return (
            <section className="rounded-xl border border-gray-200 bg-white p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
                    <TableCellsIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-gray-800">No preview yet</h2>
                <p className="mt-1 text-sm text-gray-500">Choose an Excel file to inspect rows before importing.</p>
            </section>
        );
    }

    return (
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900">Preview Data: {preview.sheetName}</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                        Showing {preview.rows.length} of {preview.totalRows} data rows.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-gray-600">{preview.totalRows} rows</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">{preview.validRows} valid</span>
                    <span className={`rounded-full px-2.5 py-1 ${
                        preview.errorRows > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                    }`}>
                        {preview.errorRows} issues
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] table-fixed">
                    <colgroup>
                        <col className="w-[8%]" />
                        <col className="w-[13%]" />
                        <col className="w-[24%]" />
                        <col className="w-[13%]" />
                        <col className="w-[12%]" />
                        <col className="w-[13%]" />
                        <col className="w-[13%]" />
                        <col className="w-[17%]" />
                    </colgroup>
                    <thead>
                        <tr className="bg-gray-100/80 border-b border-gray-200">
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Row</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Month</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Date Range</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Year</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Weeks</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Holidays</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Extra Days</th>
                            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {preview.rows.length > 0 ? preview.rows.map((row) => (
                            <tr key={row.rowNumber} className="hover:bg-gray-50/70">
                                <td className="px-4 py-3 text-xs font-mono text-gray-500">{row.rowNumber}</td>
                                <td className="px-4 py-3">
                                    <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[#1D6F42]">
                                        {row.month || "-"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    <span className="block truncate">{row.rangeText || "-"}</span>
                                </td>
                                <td className="px-4 py-3 text-sm font-mono text-gray-700">{row.year || "-"}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-gray-700">{row.totalWeeks || "-"}</td>
                                <td className="px-4 py-3 text-xs text-gray-600">
                                    <span className="block truncate" title={row.holidayDates}>{row.holidayDates || "-"}</span>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-600">
                                    <span className="block truncate" title={row.extraWorkingDates}>{row.extraWorkingDates || "-"}</span>
                                </td>
                                <td className="px-4 py-3">
                                    {row.errors.length === 0 ? (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                            <CheckCircleIcon className="h-3.5 w-3.5" />
                                            Ready
                                        </span>
                                    ) : (
                                        <span className="block truncate text-xs font-medium text-red-600" title={row.errors.join(", ")}>
                                            {row.errors.join(", ")}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                                    No data rows found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function StatusBox({ tone, title, text }) {
    const toneClass = {
        emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
        red: "border-red-200 bg-red-50 text-red-700",
    }[tone];

    const Icon = tone === "red" ? ExclamationTriangleIcon : CheckCircleIcon;

    return (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${toneClass}`}>
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs">{text}</p>
            </div>
        </div>
    );
}

function findProductionWeekHeaderIndex(rows) {
    const index = rows.findIndex((row) => {
        const headers = row.map((value) => String(value ?? "").trim().toLowerCase());

        return headers.includes("month")
            && headers.includes("year")
            && headers.includes("total weeks");
    });

    if (index === -1) {
        throw new Error("Header row not found");
    }

    return index;
}

function parsePreviewRow(row, rowNumber) {
    const month = String(row[0] ?? "").trim().toUpperCase();
    const rangeText = String(row[1] ?? "").trim();
    const year = String(row[2] ?? "").trim();
    const totalWeeks = String(row[3] ?? "").trim();
    const holidayDates = String(row[4] ?? "").trim();
    const extraWorkingDates = String(row[5] ?? "").trim();
    const errors = [];
    const rangeStartMatch = rangeText.toUpperCase().match(/(\d{1,2})\/([A-Z]{3})/);
    const rangeWeeksMatch = rangeText.match(/\((\d+)\)/);

    if (!month) {
        errors.push("Month is empty");
    } else if (!MONTH_ORDER.includes(month)) {
        errors.push("Invalid month");
    }

    if (!rangeText) {
        errors.push("Range is empty");
    } else if (!rangeStartMatch || !MONTH_ORDER.includes(rangeStartMatch[2])) {
        errors.push("Invalid range");
    }

    if (month && rangeStartMatch && MONTH_ORDER.includes(month) && MONTH_ORDER.includes(rangeStartMatch[2]) && month !== rangeStartMatch[2]) {
        errors.push("Range month mismatch");
    }

    if (!year) {
        errors.push("Year is empty");
    } else if (!/^\d{4}$/.test(year)) {
        errors.push("Invalid year");
    }

    if (!totalWeeks) {
        errors.push("Weeks is empty");
    } else if (!IMPORT_WEEK_OPTIONS.includes(totalWeeks)) {
        errors.push("Weeks must be 3, 4, or 5");
    }

    if (rangeWeeksMatch && totalWeeks && rangeWeeksMatch[1] !== totalWeeks) {
        errors.push("Weeks mismatch");
    }

    return {
        rowNumber,
        month,
        rangeText,
        year,
        totalWeeks,
        holidayDates,
        extraWorkingDates,
        errors,
        hasData: [month, rangeText, year, totalWeeks, holidayDates, extraWorkingDates].some(Boolean),
    };
}

const inputCls = (error) =>
    `w-full h-11 px-3 bg-white border rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 transition-all ${
        error
            ? "border-red-300 focus:ring-red-200 focus:border-red-400"
            : "border-gray-200 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
    }`;
