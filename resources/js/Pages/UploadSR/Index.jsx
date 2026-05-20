import AdminLayout from "@/Layouts/AdminLayout";
import ExcelPreview from "@/Components/ExcelPreview";
import { Link, router, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
    ArrowPathIcon,
    ArrowsPointingInIcon,
    ArrowsPointingOutIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    CloudArrowUpIcon,
    DocumentArrowUpIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    TableCellsIcon,
    UserGroupIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

const ACCEPTED_EXTENSIONS = ["xlsx", "xls", "xlsm"];

export default function Index() {
    const { customers = [], flash = {}, errors = {} } = usePage().props;
    const fileInputRef = useRef(null);
    const previewContainerRef = useRef(null);
    const timeoutRef = useRef(null);

    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [selectedPort, setSelectedPort] = useState("");
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState("");
    const [workbook, setWorkbook] = useState(null);
    const [sheets, setSheets] = useState([]);
    const [selectedSheet, setSelectedSheet] = useState("");
    const [zoom, setZoom] = useState(100);
    const [showGridlines, setShowGridlines] = useState(true);
    const [fullscreen, setFullscreen] = useState(false);
    const [isReadingFile, setIsReadingFile] = useState(false);
    const [isCheckingPreview, setIsCheckingPreview] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewResult, setPreviewResult] = useState(null);
    const [showAssyWarning, setShowAssyWarning] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: "success", message: "" });

    const selectedCustomerData = useMemo(
        () => customers.find((customer) => String(customer.id) === String(selectedCustomer)),
        [customers, selectedCustomer]
    );

    const customerPorts = selectedCustomerData?.ports || [];
    const requiresPort = customerPorts.length > 0;
    const selectedSheetIndex = selectedSheet === "" ? null : Number(selectedSheet);
    const selectedSheetName = selectedSheetIndex !== null && !Number.isNaN(selectedSheetIndex)
        ? sheets[selectedSheetIndex]
        : "";
    const validationErrors = normalizeErrors(errors);
    const isBusy = isReadingFile || isCheckingPreview || isUploading;
    const canUpload = Boolean(
        selectedCustomer &&
        file &&
        selectedSheet !== "" &&
        !Number.isNaN(selectedSheetIndex) &&
        (!requiresPort || selectedPort) &&
        !isBusy
    );

    useEffect(() => {
        const successMessage = flash?.success;
        const warningMessage = flash?.warning;
        const errorMessage = flash?.error;
        const message = successMessage || warningMessage || errorMessage;

        if (!message) return;

        notify(successMessage ? "success" : warningMessage ? "warning" : "error", message);
    }, [flash?.success, flash?.warning, flash?.error]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setFullscreen(Boolean(document.fullscreenElement));
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    useEffect(() => {
        return () => window.clearTimeout(timeoutRef.current);
    }, []);

    const notify = (type, message) => {
        setAlert({ show: true, type, message });
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
            setAlert((current) => ({ ...current, show: false }));
        }, type === "error" ? 5000 : 4000);
    };

    const resetFileState = () => {
        setFile(null);
        setFileName("");
        setWorkbook(null);
        setSheets([]);
        setSelectedSheet("");
        setPreviewResult(null);
        setShowAssyWarning(false);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const resetForm = () => {
        setSelectedCustomer("");
        setSelectedPort("");
        setZoom(100);
        setShowGridlines(true);
        resetFileState();
    };

    const handleCustomerChange = (event) => {
        setSelectedCustomer(event.target.value);
        setSelectedPort("");
        setPreviewResult(null);
        setShowAssyWarning(false);
    };

    const handleFileChange = (event) => {
        const uploadedFile = event.target.files?.[0] ?? null;
        resetFileState();

        if (!uploadedFile) return;

        const extension = uploadedFile.name.split(".").pop()?.toLowerCase();
        if (!ACCEPTED_EXTENSIONS.includes(extension)) {
            notify("error", "Format file tidak didukung. Gunakan .xlsx, .xls, atau .xlsm.");
            return;
        }

        setFile(uploadedFile);
        setFileName(uploadedFile.name);
        setIsReadingFile(true);

        const reader = new FileReader();

        reader.onload = (readerEvent) => {
            try {
                const data = new Uint8Array(readerEvent.target.result);
                const parsedWorkbook = XLSX.read(data, {
                    type: "array",
                    cellStyles: true,
                    cellFormula: true,
                    cellNF: true,
                    cellDates: true,
                });

                setWorkbook(parsedWorkbook);
                setSheets(parsedWorkbook.SheetNames || []);
                setSelectedSheet(parsedWorkbook.SheetNames?.length === 1 ? "0" : "");

                notify("success", "File berhasil dibaca. Pilih sheet untuk melihat preview.");
            } catch (error) {
                console.error("Read Excel error:", error);
                resetFileState();
                notify("error", "File Excel tidak bisa dibaca. Pastikan file tidak rusak dan formatnya sesuai.");
            } finally {
                setIsReadingFile(false);
            }
        };

        reader.onerror = () => {
            setIsReadingFile(false);
            resetFileState();
            notify("error", "Gagal membaca file. Silakan pilih file lain.");
        };

        reader.readAsArrayBuffer(uploadedFile);
    };

    const buildSrFormData = () => {
        const formData = new FormData();
        formData.append("customer", selectedCustomer);
        if (selectedPort) {
            formData.append("port", selectedPort);
        }
        formData.append("file", file);
        formData.append("sheet", selectedSheetIndex);

        return formData;
    };

    const validateUploadInput = () => {
        if (!selectedCustomer) {
            notify("error", "Pilih customer terlebih dahulu.");
            return false;
        }

        if (requiresPort && !selectedPort) {
            notify("error", `Port wajib dipilih untuk customer ${selectedCustomerData?.code || selectedCustomerData?.name}.`);
            return false;
        }

        if (!file) {
            notify("error", "Pilih file Excel terlebih dahulu.");
            return false;
        }

        if (selectedSheet === "" || Number.isNaN(selectedSheetIndex)) {
            notify("error", "Pilih worksheet yang ingin diupload.");
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateUploadInput()) {
            return;
        }

        setIsCheckingPreview(true);

        try {
            const response = await fetch(route("sr.preview"), {
                method: "POST",
                headers: {
                    "X-CSRF-TOKEN": getCsrfToken(),
                    "Accept": "application/json",
                },
                body: buildSrFormData(),
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok || !payload?.success) {
                throw new Error(payload?.error || "Preview SR gagal diproses.");
            }

            const result = payload.data || {};
            setPreviewResult(result);

            if (result.has_unknown_assy_numbers) {
                setShowAssyWarning(true);
                notify("warning", "Ada assy number yang belum ada di master assy. Cek daftar sebelum lanjut upload.");
                return;
            }

            uploadSr();
        } catch (error) {
            notify("error", error.message || "Preview SR gagal diproses.");
        } finally {
            setIsCheckingPreview(false);
        }
    };

    const uploadSr = () => {
        if (!validateUploadInput()) {
            return;
        }

        setShowAssyWarning(false);

        setIsUploading(true);

        const uploadTimeout = window.setTimeout(() => {
            notify("warning", "Upload masih diproses. File besar bisa memerlukan beberapa menit.");
        }, 120000);

        router.post(route("sr.upload"), buildSrFormData(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => {
                const serverFlash = page?.props?.flash || {};
                if (serverFlash?.error || serverFlash?.warning) {
                    return;
                }

                resetForm();
            },
            onError: (serverErrors) => {
                notify("error", formatServerErrors(serverErrors));
            },
            onFinish: () => {
                window.clearTimeout(uploadTimeout);
                setIsUploading(false);
            },
        });
    };

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement && previewContainerRef.current) {
                await previewContainerRef.current.requestFullscreen();
                return;
            }

            if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
        } catch (error) {
            console.error("Fullscreen error:", error);
            notify("error", "Mode fullscreen tidak bisa dibuka di browser ini.");
        }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <nav className="flex items-center gap-2 mb-4 text-sm" aria-label="Breadcrumb">
                    <Link href={route("dashboard")} className="text-gray-600 hover:text-[#1D6F42] transition-colors">
                        Home
                    </Link>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Shipping Release</span>
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 font-medium">Upload SR</span>
                </nav>

                {alert.show && alert.message && (
                    <Alert
                        type={alert.type}
                        message={alert.message}
                        onClose={() => setAlert((current) => ({ ...current, show: false }))}
                    />
                )}

                {validationErrors.length > 0 && (
                    <ValidationAlert errors={validationErrors} />
                )}

                {(isCheckingPreview || isUploading) && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
                        <div className="flex items-center gap-3 rounded-xl bg-white p-6 shadow-xl">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#1D6F42] border-t-transparent" />
                            <span className="text-sm font-medium text-gray-700">
                                {isCheckingPreview ? "Checking master assy..." : "Uploading SR..."}
                            </span>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 pb-4 border-b border-gray-100">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                    Upload Shipping Release
                                </h1>
                                <p className="mt-1 text-sm text-gray-500">
                                    Pilih customer, Port, Upload file Excel SR, Pilih worksheet, lalu review preview sebelum diproses.
                                </p>
                            </div>

                            <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-[#1D6F42]/10 text-[#1D6F42] sm:flex">
                                <DocumentArrowUpIcon className="h-6 w-6" />
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                            <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
                                <div className="flex items-center gap-3">
                                    {/* <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1D6F42]/10 text-[#1D6F42]">
                                        <CloudArrowUpIcon className="h-5 w-5" />
                                    </div> */}
                                    {/* <div>
                                        <h2 className="text-sm font-semibold text-gray-900">Upload Setup</h2>
                                        <p className="text-xs text-gray-500">Lengkapi customer, port jika ada, file, dan worksheet.</p>
                                    </div> */}
                                </div>
                            </div>

                            <div className="grid gap-5 p-5 lg:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        <UserGroupIcon className="h-4 w-4 text-gray-400" />
                                        Customer <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedCustomer}
                                        onChange={handleCustomerChange}
                                        className={inputClass}
                                    >
                                        <option value="">Select Customer</option>
                                        {customers.map((customer) => (
                                            <option key={customer.id} value={customer.id}>
                                                {customer.code}
                                                {customer.name ? ` - ${customer.name}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        <UserGroupIcon className="h-4 w-4 text-gray-400" />
                                        Port {requiresPort && <span className="text-red-500">*</span>}
                                    </label>
                                    <select
                                        value={selectedPort}
                                        onChange={(event) => setSelectedPort(event.target.value)}
                                        disabled={!selectedCustomer || customerPorts.length === 0}
                                        className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
                                    >
                                        {!selectedCustomer ? (
                                            <option value="">Select customer first</option>
                                        ) : customerPorts.length === 0 ? (
                                            <option value="">No port required</option>
                                        ) : (
                                            <>
                                                <option value="">Select Port</option>
                                                {customerPorts.map((port) => (
                                                    <option key={port.id} value={port.id}>
                                                        {port.name}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                    {requiresPort && !selectedPort && (
                                        <p className="mt-1 text-xs text-amber-600">
                                            Customer ini membutuhkan port sebelum upload.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        <DocumentArrowUpIcon className="h-4 w-4 text-gray-400" />
                                        Excel File <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        id="sr-file-upload"
                                        type="file"
                                        accept=".xlsx,.xls,.xlsm"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="sr-file-upload"
                                        className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 transition-all hover:bg-gray-50 focus-within:border-[#1D6F42]"
                                    >
                                        <DocumentArrowUpIcon className="h-5 w-5 shrink-0 text-gray-400" />
                                        <span className={`truncate ${fileName ? "font-medium text-gray-800" : "text-gray-400"}`}>
                                            {fileName || "Choose .xlsx, .xls, or .xlsm file"}
                                        </span>
                                    </label>
                                    {isReadingFile && (
                                        <p className="mt-2 text-xs text-gray-500">Reading workbook...</p>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-gray-700">
                                        <TableCellsIcon className="h-4 w-4 text-gray-400" />
                                        Worksheet <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={selectedSheet}
                                        onChange={(event) => setSelectedSheet(event.target.value)}
                                        disabled={sheets.length === 0 || isReadingFile}
                                        className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}
                                    >
                                        {sheets.length === 0 ? (
                                            <option value="">Select file first</option>
                                        ) : (
                                            <>
                                                <option value="">Select Sheet</option>
                                                {sheets.map((sheet, index) => (
                                                    <option key={sheet} value={index}>
                                                        {sheet}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                    {selectedCustomerData?.code?.toUpperCase() === "YC" && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            Untuk file YC, hanya sheet yang dipilih yang akan diproses.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={!canUpload}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1D6F42] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#185c38] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <CloudArrowUpIcon className="h-4 w-4" />
                                        {isCheckingPreview ? "Checking..." : isUploading ? "Uploading..." : "Upload SR"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        disabled={isBusy}
                                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        <ArrowPathIcon className="h-4 w-4" />
                                        Reset
                                    </button>
                                </div>

                                <p className="text-xs text-gray-500">
                                    Supported customers: TYC, YNA, SAI, YC, or any customer with an active SR Mapping Template.
                                </p>
                            </div>
                        </section>

                        <PreviewSection
                            workbook={workbook}
                            sheetName={selectedSheetName}
                            selectedSheet={selectedSheet}
                            sheets={sheets}
                            zoom={zoom}
                            setZoom={setZoom}
                            showGridlines={showGridlines}
                            setShowGridlines={setShowGridlines}
                            fullscreen={fullscreen}
                            toggleFullscreen={toggleFullscreen}
                            previewContainerRef={previewContainerRef}
                        />
                    </div>
                </div>
            </div>

            {showAssyWarning && previewResult && (
                <UnknownAssyModal
                    preview={previewResult}
                    onCancel={() => setShowAssyWarning(false)}
                    onConfirm={uploadSr}
                    disabled={isUploading}
                />
            )}

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

function PreviewSection({
    workbook,
    sheetName,
    selectedSheet,
    sheets,
    zoom,
    setZoom,
    showGridlines,
    setShowGridlines,
    fullscreen,
    toggleFullscreen,
    previewContainerRef,
}) {
    const hasWorkbook = Boolean(workbook && sheets.length > 0);
    const hasPreview = Boolean(workbook && selectedSheet !== "" && sheetName);

    if (!hasWorkbook) {
        return (
            <section className="rounded-xl border border-gray-200 bg-white p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
                    <DocumentArrowUpIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-gray-800">Belum ada file</h2>
                <p className="mt-1 text-sm text-gray-500">Pilih file Excel untuk membuka preview worksheet.</p>
            </section>
        );
    }

    if (!hasPreview) {
        return (
            <section className="rounded-xl border border-gray-200 bg-white p-10 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
                    <TableCellsIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-gray-800">Pilih worksheet</h2>
                <p className="mt-1 text-sm text-gray-500">Preview Excel akan tampil setelah sheet dipilih.</p>
            </section>
        );
    }

    return (
        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden animate-slideDown">
            <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1D6F42]/10 text-[#1D6F42]">
                        <EyeIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900">Excel Preview</h2>
                        <p className="mt-0.5 text-xs text-gray-500">
                            Sheet: <span className="font-semibold text-[#1D6F42]">{sheetName}</span>
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600">
                        Zoom
                        <select
                            value={zoom}
                            onChange={(event) => setZoom(Number(event.target.value))}
                            className="bg-transparent text-sm font-semibold text-gray-800 focus:outline-none"
                        >
                            <option value={75}>75%</option>
                            <option value={100}>100%</option>
                            <option value={125}>125%</option>
                            <option value={150}>150%</option>
                            <option value={200}>200%</option>
                        </select>
                    </label>

                    <button
                        type="button"
                        onClick={() => setShowGridlines((current) => !current)}
                        className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                            showGridlines
                                ? "border-[#1D6F42]/30 bg-[#1D6F42]/10 text-[#1D6F42]"
                                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        <TableCellsIcon className="h-4 w-4" />
                        Grid
                    </button>

                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50"
                    >
                        {fullscreen ? (
                            <ArrowsPointingInIcon className="h-4 w-4" />
                        ) : (
                            <ArrowsPointingOutIcon className="h-4 w-4" />
                        )}
                        {fullscreen ? "Exit" : "Fullscreen"}
                    </button>
                </div>
            </div>

            <div ref={previewContainerRef} className="bg-white">
                <ExcelPreview
                    workbook={workbook}
                    sheetName={sheetName}
                    zoom={zoom}
                    showGridlines={showGridlines}
                />
            </div>
        </section>
    );
}

function Alert({ type, message, onClose }) {
    const isSuccess = type === "success";
    const isWarning = type === "warning";
    const Icon = isSuccess ? CheckCircleIcon : ExclamationTriangleIcon;

    return (
        <div className="mb-6 animate-slideDown">
            <div className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm ${
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

function ValidationAlert({ errors }) {
    return (
        <div className="mb-6 animate-slideDown">
            <div className="rounded-xl border border-l-4 border-gray-200 border-l-red-500 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">Upload belum bisa diproses</p>
                        <div className="mt-2 space-y-1">
                            {errors.map((error, index) => (
                                <p key={index} className="text-sm text-gray-700">
                                    {error}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UnknownAssyModal({ preview, onCancel, onConfirm, disabled }) {
    const unknownAssyNumbers = preview?.unknown_assy_numbers || [];
    const visibleAssyNumbers = unknownAssyNumbers.slice(0, 30);
    const hiddenCount = Math.max(unknownAssyNumbers.length - visibleAssyNumbers.length, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="border-b border-amber-100 bg-amber-50 px-6 py-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <ExclamationTriangleIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Assy belum ada di master</h2>
                            <p className="mt-1 text-sm text-gray-700">
                                SR bisa tetap diupload, tapi baris ini akan tersimpan sebagai unmapped sampai master assy dilengkapi.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 px-6 py-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <PreviewMetric label="Total records" value={preview.total_records} />
                        <PreviewMetric label="Unique assy" value={preview.unique_assy_numbers} />
                        <PreviewMetric label="Unmapped assy" value={unknownAssyNumbers.length} tone="warning" />
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-gray-900">Daftar assy unknown</p>
                            <p className="text-xs text-gray-500">{unknownAssyNumbers.length} assy</p>
                        </div>
                        <div className="max-h-64 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
                            <div className="flex flex-wrap gap-2">
                                {visibleAssyNumbers.map((assyNumber) => (
                                    <span
                                        key={assyNumber}
                                        className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 font-mono text-xs font-semibold text-amber-800"
                                    >
                                        {assyNumber}
                                    </span>
                                ))}
                                {hiddenCount > 0 && (
                                    <span className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600">
                                        +{hiddenCount} lainnya
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={disabled}
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                        Batal dulu
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={disabled}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1D6F42] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#185c38] disabled:opacity-50"
                    >
                        <CloudArrowUpIcon className="h-4 w-4" />
                        {disabled ? "Uploading..." : "Lanjut upload"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PreviewMetric({ label, value, tone = "default" }) {
    const isWarning = tone === "warning";

    return (
        <div className={`rounded-xl border px-4 py-3 ${isWarning ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"}`}>
            <p className={`text-xs font-medium ${isWarning ? "text-amber-700" : "text-gray-500"}`}>{label}</p>
            <p className={`mt-1 text-xl font-semibold ${isWarning ? "text-amber-800" : "text-gray-900"}`}>
                {formatNumber(value)}
            </p>
        </div>
    );
}

function normalizeErrors(errors) {
    if (!errors || typeof errors !== "object") return [];

    return Object.values(errors)
        .flat()
        .filter(Boolean)
        .map((error) => String(error));
}

function formatServerErrors(serverErrors) {
    const normalized = normalizeErrors(serverErrors);
    if (normalized.length === 0) {
        return "Upload gagal. Silakan cek data dan coba lagi.";
    }

    return normalized.join("\n");
}

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString("en-US");
}

const inputClass =
    "w-full h-11 px-4 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] bg-white transition-all";
