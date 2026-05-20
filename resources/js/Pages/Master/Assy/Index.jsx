import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Link, router, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowPathIcon,
    CheckCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon as ChevronNextIcon,
    DocumentArrowUpIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    PlusIcon,
    TableCellsIcon,
    TrashIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

const normalizeStatusFilter = (value) => {
    if (value === true) return "1";
    if (value === false) return "0";
    if (value === 1) return "1";
    if (value === 0) return "0";
    return value ?? "";
};

const normalizeIdFilter = (value) => {
    if (value === null || value === undefined) return "";
    return String(value);
};

const formatDecimal = (value) => {
    if (value === null || value === undefined || value === "") return "-";

    const number = Number(value);
    if (!Number.isFinite(number)) return value;

    return number.toLocaleString("en-US", {
        maximumFractionDigits: 4,
    });
};

const formatInteger = (value) => {
    if (value === null || value === undefined || value === "") return "-";

    const number = Number(value);
    if (!Number.isFinite(number)) return value;

    return number.toLocaleString("en-US");
};

const getVisiblePages = (currentPage, lastPage) => {
    const maxVisible = 5;
    if (!lastPage || lastPage <= maxVisible) {
        return Array.from({ length: lastPage || 0 }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
        return Array.from({ length: maxVisible }, (_, index) => index + 1);
    }

    if (currentPage >= lastPage - 2) {
        return Array.from({ length: maxVisible }, (_, index) => lastPage - maxVisible + index + 1);
    }

    return Array.from({ length: maxVisible }, (_, index) => currentPage - 2 + index);
};

export default function Index({ assy, carlines = [], filters = {}, flash: propFlash }) {
    const { flash: sharedFlash } = usePage().props;
    const flash = propFlash || sharedFlash || {};

    const [search, setSearch] = useState(filters?.search || "");
    const [carlineId, setCarlineId] = useState(normalizeIdFilter(filters?.carline_id));
    const [isActive, setIsActive] = useState(normalizeStatusFilter(filters?.is_active));
    const [filterOpen, setFilterOpen] = useState(
        Boolean(filters?.carline_id || normalizeStatusFilter(filters?.is_active) !== "")
    );
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const assyRows = assy?.data ?? [];
    const hasActiveFilters = Boolean(search || carlineId || isActive !== "");

    const currentPage = assy?.current_page ?? 1;
    const lastPage = assy?.last_page ?? 1;
    const visiblePages = useMemo(
        () => getVisiblePages(currentPage, lastPage),
        [currentPage, lastPage]
    );

    useEffect(() => {
        setSearch(filters?.search || "");
        setCarlineId(normalizeIdFilter(filters?.carline_id));
        setIsActive(normalizeStatusFilter(filters?.is_active));
    }, [filters?.search, filters?.carline_id, filters?.is_active]);

    useEffect(() => {
        const successMessage = flash?.success || flash?.message;
        const warningMessage = flash?.warning;
        const errorMessage = flash?.error;
        const message = successMessage || warningMessage || errorMessage;

        if (!message) return;

        setAlertType(successMessage ? "success" : warningMessage ? "warning" : "error");
        setAlertMessage(message);
        setShowAlert(true);

        const timer = setTimeout(() => setShowAlert(false), 4000);
        return () => clearTimeout(timer);
    }, [flash?.success, flash?.message, flash?.warning, flash?.error]);

    const getQuery = (page) => ({
        search: search.trim() || undefined,
        carline_id: carlineId || undefined,
        is_active: isActive === "" ? undefined : isActive,
        page: page || undefined,
    });

    const applyFilters = (event) => {
        event?.preventDefault();

        router.get(window.route("assy.index"), getQuery(), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const clearFilters = () => {
        setSearch("");
        setCarlineId("");
        setIsActive("");

        router.get(window.route("assy.index"), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const visitPage = (page) => {
        if (!page || page < 1 || page > lastPage || page === currentPage) return;

        router.get(window.route("assy.index"), getQuery(page), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleToggleStatus = (assyItem) => {
        setIsProcessing(true);

        router.patch(window.route("assy.toggle-status", assyItem.id), {}, {
            preserveScroll: true,
            onFinish: () => setIsProcessing(false),
        });
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;

        setIsProcessing(true);
        router.delete(window.route("assy.destroy", deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
            onError: () => {
                setAlertType("error");
                setAlertMessage("Gagal menghapus assy. Silakan coba lagi.");
                setShowAlert(true);
            },
            onFinish: () => setIsProcessing(false),
        });
    };

    const handleSyncSirep = () => {
        setIsProcessing(true);

        router.post(window.route("assy.sync-sirep"), {}, {
            preserveScroll: true,
            onFinish: () => setIsProcessing(false),
        });
    };

    const firstRecord = assy?.from ?? (assyRows.length > 0 ? (currentPage - 1) * (assy?.per_page ?? assyRows.length) + 1 : 0);
    const lastRecord = assy?.to ?? Math.min(currentPage * (assy?.per_page ?? assyRows.length), assy?.total ?? assyRows.length);

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <Breadcrumb items={[{ label: "Masters" }, { label: "Assy" }]} />

                {showAlert && alertMessage && (
                    <div className="mb-5 animate-slideDown">
                        <div
                            className={`flex items-start gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-200 border-l-4 ${
                                alertType === "success"
                                    ? "border-l-[#1D6F42]"
                                    : alertType === "warning"
                                        ? "border-l-amber-500"
                                        : "border-l-red-500"
                            }`}
                        >
                            <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                    alertType === "success"
                                        ? "bg-green-50 text-[#1D6F42]"
                                        : alertType === "warning"
                                            ? "bg-amber-50 text-amber-600"
                                            : "bg-red-50 text-red-600"
                                }`}
                            >
                                {alertType === "success" ? (
                                    <CheckCircleIcon className="w-5 h-5" />
                                ) : (
                                    <ExclamationTriangleIcon className="w-5 h-5" />
                                )}
                            </div>
                            <p className="flex-1 text-sm font-medium text-gray-800 whitespace-pre-line">
                                {alertMessage}
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowAlert(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                aria-label="Close alert"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {isProcessing && !deleteTarget && (
                    <div className="fixed inset-0 z-50 bg-black/20 flex items-center justify-center">
                        <div className="bg-white rounded-xl px-6 py-5 shadow-xl flex items-center gap-3">
                            <div className="w-5 h-5 border-2 border-[#1D6F42] border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-medium text-gray-700">Processing...</span>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 pb-4 border-b border-gray-100">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                    Assy Master
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Kelola assy number, assy code, car line, UMH, dan status master assy.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={handleSyncSirep}
                                    disabled={isProcessing}
                                    className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:text-[#1D6F42] hover:border-[#1D6F42]/30 transition-all disabled:opacity-60"
                                >
                                    <ArrowPathIcon className={`w-5 h-5 ${isProcessing ? "animate-spin" : ""}`} />
                                    Sync SIREP
                                </button>
                                <Link
                                    href={window.route("assy.importPage")}
                                    className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:text-[#1D6F42] hover:border-[#1D6F42]/30 transition-all"
                                >
                                    <DocumentArrowUpIcon className="w-5 h-5" />
                                    Import Excel
                                </Link>
                                <Link
                                    href={window.route("assy.create")}
                                    className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition-all shadow-sm active:scale-[0.98]"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Add Assy
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-4 border-b border-gray-100">
                        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                            <form onSubmit={applyFilters} className="flex-1 max-w-xl">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        className="w-full h-11 pl-10 pr-24 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                        placeholder="Search assy number, assy code, or level..."
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch("")}
                                            className="absolute inset-y-0 right-16 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                                            aria-label="Clear search"
                                        >
                                            <XMarkIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="absolute inset-y-1 right-1 px-4 rounded-lg bg-[#1D6F42] text-white text-sm font-medium hover:bg-[#185c38] transition-colors"
                                    >
                                        Search
                                    </button>
                                </div>
                            </form>

                            <div className="flex flex-wrap items-center gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setFilterOpen((open) => !open)}
                                    className={`inline-flex items-center justify-center gap-2 h-11 px-4 border rounded-xl text-sm font-medium transition-all ${
                                        filterOpen || carlineId || isActive !== ""
                                            ? "bg-[#1D6F42]/10 border-[#1D6F42]/30 text-[#1D6F42]"
                                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <FunnelIcon className="w-5 h-5" />
                                    Filter
                                </button>

                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="inline-flex items-center justify-center gap-2 h-11 px-4 bg-white border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all"
                                    >
                                        <ArrowPathIcon className="w-5 h-5" />
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        {filterOpen && (
                            <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-slideDown">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-800">Filter By</h3>
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className="text-xs font-medium text-[#1D6F42] hover:underline"
                                    >
                                        Reset
                                    </button>
                                </div>

                                <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_180px_auto] md:items-end">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            Car Line
                                        </label>
                                        <select
                                            value={carlineId}
                                            onChange={(event) => setCarlineId(event.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                        >
                                            <option value="">All Car Lines</option>
                                            {carlines.map((carline) => (
                                                <option key={carline.id} value={carline.id}>
                                                    {carline.code}
                                                    {carline.description
                                                        ? ` - ${carline.description}`
                                                        : carline.name
                                                            ? ` - ${carline.name}`
                                                            : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            Status
                                        </label>
                                        <select
                                            value={isActive}
                                            onChange={(event) => setIsActive(event.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                        >
                                            <option value="">All Status</option>
                                            <option value="1">Active</option>
                                            <option value="0">Inactive</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={applyFilters}
                                            className="h-10 px-4 bg-[#1D6F42] text-white text-sm font-medium rounded-lg hover:bg-[#185c38] transition-colors"
                                        >
                                            Apply
                                        </button>
                                        <button
                                            type="button"
                                            onClick={clearFilters}
                                            className="h-10 px-4 bg-white text-gray-600 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="overflow-hidden">
                        <table className="w-full table-fixed">
                            <colgroup>
                                <col className="w-[4%]" />
                                <col className="w-[18%]" />
                                <col className="w-[10%]" />
                                <col className="w-[9%]" />
                                <col className="w-[9%]" />
                                <col className="w-[10%]" />
                                <col className="w-[9%]" />
                                <col className="w-[8%]" />
                                <col className="w-[12%]" />
                                <col className="w-[9%]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-gray-100/80 border-b border-gray-200">
                                    <th className="px-2 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                                        #
                                    </th>
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                                        Assy Number
                                    </th>
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                                        Car Line
                                    </th>
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                                        Type
                                    </th>
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                                        Level
                                    </th>
                                    <th className="px-3 py-3 text-left text-[11px] font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                                        Assy Code
                                    </th>
                                    <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                                        Std Pack
                                    </th>
                                    <th className="px-3 py-3 text-right text-[11px] font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                                        UMH
                                    </th>
                                    <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-700 uppercase tracking-wide border-r border-gray-200">
                                        Status
                                    </th>
                                    <th className="px-3 py-3 text-center text-[11px] font-bold text-gray-700 uppercase tracking-wide">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {assyRows.length > 0 ? (
                                    assyRows.map((assyItem, index) => {
                                        const rowNumber = (currentPage - 1) * (assy?.per_page ?? assyRows.length) + index + 1;
                                        const isActiveRow = Boolean(assyItem.is_active);
                                        const carlineLabel = assyItem.carline?.code || "-";

                                        return (
                                            <tr key={assyItem.id} className="hover:bg-gray-50/80 transition-colors">
                                                <td className="px-2 py-3 text-xs text-gray-500 font-medium tabular-nums border-r border-gray-100">
                                                    {rowNumber.toString().padStart(2, "0")}
                                                </td>
                                                <td className="px-3 py-3 border-r border-gray-100 overflow-hidden">
                                                    <div className="min-w-0">
                                                        <p className="truncate font-mono text-xs font-semibold text-gray-900" title={assyItem.assy_number || "-"}>
                                                            {assyItem.assy_number || "-"}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-gray-400">
                                                            ID #{assyItem.id}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 border-r border-gray-100 overflow-hidden">
                                                    <span className="inline-flex max-w-full px-2 py-1 rounded-lg bg-green-50 text-[#1D6F42] text-xs font-medium border border-green-100">
                                                        <span className="truncate" title={carlineLabel}>{carlineLabel}</span>
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-xs text-gray-600 border-r border-gray-100 overflow-hidden">
                                                    <span className="block truncate" title={assyItem.type || "-"}>
                                                        {assyItem.type || "-"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-xs text-gray-600 border-r border-gray-100 overflow-hidden">
                                                    <span className="inline-flex max-w-full justify-center rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                                                        <span className="truncate">
                                                        {assyItem.level || "-"}
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-xs text-gray-700 border-r border-gray-100 overflow-hidden">
                                                    <span className="block truncate font-medium" title={assyItem.assy_code || "-"}>
                                                        {assyItem.assy_code || "-"}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-right font-mono text-xs text-gray-700 border-r border-gray-100 truncate">
                                                    {formatInteger(assyItem.std_pack)}
                                                </td>
                                                <td className="px-3 py-3 text-right font-mono text-xs text-gray-700 border-r border-gray-100 truncate">
                                                    {formatDecimal(assyItem.umh)}
                                                </td>
                                                <td className="px-3 py-3 text-center border-r border-gray-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStatus(assyItem)}
                                                        disabled={isProcessing}
                                                        className={`inline-flex w-full max-w-[82px] items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold transition-colors ${
                                                            isActiveRow
                                                                ? "bg-green-50 text-[#1D6F42] hover:bg-green-100"
                                                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                        }`}
                                                    >
                                                        {isActiveRow ? "Active" : "Inactive"}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Link
                                                            href={window.route("assy.edit", assyItem.id)}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-[#1D6F42] hover:border-[#1D6F42]/30 transition-colors"
                                                            title="Edit"
                                                            aria-label={`Edit ${assyItem.assy_number || "assy"}`}
                                                        >
                                                            <PencilIcon className="w-4 h-4" />
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteTarget(assyItem)}
                                                            disabled={isProcessing}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-60"
                                                            title="Delete"
                                                            aria-label={`Delete ${assyItem.assy_number || "assy"}`}
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                                                <TableCellsIcon className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-800 mb-1">No assy data found</h3>
                                            <p className="text-sm text-gray-400 mt-1">
                                                {hasActiveFilters
                                                    ? "Tidak ada data yang cocok dengan filter saat ini."
                                                    : "Tambahkan assy baru atau import data dari Excel untuk mulai."}
                                            </p>
                                            {hasActiveFilters && (
                                                <button
                                                    type="button"
                                                    onClick={clearFilters}
                                                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                                                >
                                                    <ArrowPathIcon className="w-4 h-4" />
                                                    Reset filter
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {assyRows.length > 0 && (
                        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm text-gray-500">
                                Showing {firstRecord} - {lastRecord} of {assy?.total ?? assyRows.length} records
                            </div>

                            {lastPage > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => visitPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className={`p-2 rounded-lg border text-sm transition-colors ${
                                            currentPage === 1
                                                ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400"
                                                : "border-gray-300 text-gray-700 hover:bg-gray-100"
                                        }`}
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeftIcon className="w-4 h-4" />
                                    </button>

                                    {visiblePages.map((page) => (
                                        <button
                                            key={page}
                                            type="button"
                                            onClick={() => visitPage(page)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                                page === currentPage
                                                    ? "bg-[#1D6F42] text-white"
                                                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => visitPage(currentPage + 1)}
                                        disabled={currentPage === lastPage}
                                        className={`p-2 rounded-lg border text-sm transition-colors ${
                                            currentPage === lastPage
                                                ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400"
                                                : "border-gray-300 text-gray-700 hover:bg-gray-100"
                                        }`}
                                        aria-label="Next page"
                                    >
                                        <ChevronNextIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {deleteTarget && (
                    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
                        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="p-6 border-b border-gray-100">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Delete Assy
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Data yang sudah dihapus tidak bisa dikembalikan.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteTarget(null)}
                                        disabled={isProcessing}
                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-60"
                                        aria-label="Close"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <p className="text-sm text-gray-600">
                                    Yakin ingin menghapus assy{" "}
                                    <span className="font-semibold text-gray-900">
                                        {deleteTarget.assy_number}
                                    </span>
                                    ?
                                </p>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDeleteTarget(null)}
                                    disabled={isProcessing}
                                    className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={isProcessing}
                                    className="h-10 px-4 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                                >
                                    {isProcessing ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
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
