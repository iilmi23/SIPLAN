import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { useState, useMemo } from "react";
import {
    ArrowDownTrayIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    TableCellsIcon,
    ListBulletIcon,
    PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { SummaryItem } from "@/types/models";

// Import helpers
import {
    normalizeWeek,
    formatUploadTimestamp,
    dateInputValue,
    hasFallbackEta,
} from "./Components/helpers";

// Import subcomponents
import PivotPreview, { PivotCellSelection } from "./Components/PivotPreview";
import SummaryRowEditor from "./Components/SummaryRowEditor";
import SummaryPeriodEditor from "./Components/SummaryPeriodEditor";

// ─── Original List View (unchanged) ──────────────────────────────────────────
interface ListViewProps {
    filteredData: SummaryItem[];
    totalQty: number;
    resetFilters: () => void;
    activeFiltersCount: number;
    customer?: string;
    onEdit: (item: SummaryItem) => void;
}

function ListView({
    filteredData,
    totalQty,
    resetFilters,
    activeFiltersCount,
    customer,
    onEdit,
}: ListViewProps) {
    const isYNAFormat = customer?.toUpperCase() === "YNA";
    const formatDate = (date: any) => {
        if (!date) return "-";
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) return "-";
        return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
    };

    return (
        <div className="flex flex-col border-y border-gray-200 bg-white dark:border-slate-700 dark:bg-[#0f172a]">
            {filteredData.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                    <p>No data found</p>
                    {activeFiltersCount > 0 && (
                        <button onClick={resetFilters} className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-sky-300 dark:hover:text-sky-200">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="border-b border-gray-200 bg-[#f4faf6] px-3 py-2 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        Tampilan list detail per baris. Gunakan tab <strong>Excel Preview</strong> untuk tampilan pivot.
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-[980px] border-collapse border border-slate-200 text-xs dark:border-slate-700">
                            <thead className="bg-slate-50 dark:bg-[#172033]">
                                <tr>
                                    {["No", "Assy Number", "Car Model", "Week", "Order Type", "ETD", "ETA", "Qty", "Actions"].map((h) => (
                                        <th key={h} className="sticky top-0 z-10 border border-slate-200 bg-slate-50 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-[#172033] dark:text-slate-300">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[#0f172a]">
                                {filteredData.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/70">
                                        <td className="border border-slate-200 px-2 py-1 text-slate-600 dark:border-slate-700 dark:text-slate-400">{index + 1}</td>
                                        <td className="border border-slate-200 px-2 py-1 font-medium text-slate-800 dark:border-slate-700 dark:text-slate-100">{item.assy_number || "-"}</td>
                                        <td className="border border-slate-200 px-2 py-1 text-slate-700 dark:border-slate-700 dark:text-slate-300">{item.model || "-"}</td>
                                        <td className="border border-slate-200 px-2 py-1 text-slate-700 dark:border-slate-700 dark:text-slate-300">{normalizeWeek(item.week) || "-"}</td>
                                        <td className="border border-slate-200 px-2 py-1 text-slate-700 dark:border-slate-700 dark:text-slate-300">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${(item.order_type || "").toUpperCase() === "FIRM"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200"
                                                : "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200"
                                                }`}>
                                                {item.order_type || "-"}
                                            </span>
                                        </td>
                                        <td className="border border-slate-200 px-2 py-1 text-slate-700 dark:border-slate-700 dark:text-slate-300">{formatDate(item.etd)}</td>
                                        <td className="border border-slate-200 px-2 py-1 text-slate-700 dark:border-slate-700 dark:text-slate-300">
                                            {isYNAFormat && hasFallbackEta(item) ? "-" : formatDate(item.eta)}
                                        </td>
                                        <td className="border border-slate-200 px-2 py-1 text-right font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100">{Number(item.qty || 0).toLocaleString()}</td>
                                        <td className="border border-slate-200 px-2 py-1 dark:border-slate-700">
                                            <button
                                                type="button"
                                                onClick={() => onEdit(item)}
                                                disabled={!item.is_editable}
                                                title="Edit"
                                                aria-label={`Edit ${item.assy_number || "summary row"}`}
                                                className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 hover:border-[#1D6F42]/40 hover:text-[#1D6F42] disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-400/50 dark:hover:text-emerald-300"
                                            >
                                                <PencilSquareIcon className="h-3.5 w-3.5" />
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-semibold dark:bg-[#172033]">
                                <tr>
                                    <td colSpan={7} className="border border-slate-200 px-2 py-1.5 text-right text-xs text-slate-900 dark:border-slate-700 dark:text-slate-100">Total Qty</td>
                                    <td className="border border-slate-200 px-2 py-1.5 text-right text-xs text-slate-900 dark:border-slate-700 dark:text-slate-100">{totalQty.toLocaleString()}</td>
                                    <td className="border border-slate-200 px-2 py-1.5 dark:border-slate-700" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SummaryShow({
    sr,
    data,
    running_week,
}: {
    sr: Record<string, any>;
    data: SummaryItem[];
    running_week?: Record<string, any> | null;
}) {
    const [searchAssyNumber, setSearchAssyNumber] = useState("");
    const [orderTypeFilter, setOrderTypeFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [weekFilter, setWeekFilter] = useState("");
    const [viewMode, setViewMode] = useState("excel"); // "excel" | "list"
    const [editingRow, setEditingRow] = useState<SummaryItem | null>(null);
    const [editForm, setEditForm] = useState<Record<string, any>>({});
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [selectedPivotCell, setSelectedPivotCell] = useState<PivotCellSelection | null>(null);
    const [editingPeriod, setEditingPeriod] = useState<PivotCellSelection | null>(null);
    const [periodForm, setPeriodForm] = useState<Record<string, any>>({});
    const [isSavingPeriod, setIsSavingPeriod] = useState(false);
    const [periodsPerMonth, setPeriodsPerMonth] = useState(() => {
        const saved = localStorage.getItem(`siplan_periods_per_month_${sr.customer}_${sr.id}`);
        if (saved) return parseInt(saved, 10);
        return sr.customer?.toUpperCase() === 'SAI' ? 15 : 5;
    });

    const handleBack = () => router.get("/summary");
    const reloadSummaryDetail = () => {
        router.get(window.location.pathname + window.location.search, {}, {
            preserveScroll: true,
            preserveState: false,
            replace: true,
        });
    };

    const openEdit = (item: SummaryItem) => {
        setEditingRow(item);
        setEditForm({
            assy_number: item.assy_number || "",
            model: item.model || "",
            family: item.family || "",
            order_type: item.order_type || "",
            week: item.week || "",
            month: item.month || "",
            etd: dateInputValue(item.etd),
            eta: dateInputValue(item.eta),
            port: item.port || "",
        });
        setViewMode("list");
    };

    const closeEdit = () => {
        setEditingRow(null);
        setEditForm({});
        setIsSavingEdit(false);
    };

    const editFromPivotCell = (item: SummaryItem) => {
        setSelectedPivotCell(null);
        openEdit(item);
    };

    const openPeriodEdit = (selection: PivotCellSelection) => {
        const first = selection.rows[0] || {};

        setEditingPeriod(selection);
        setPeriodForm({
            order_type: first.order_type || "",
            month: first.month || "",
            week: first.week || "",
            etd: dateInputValue(first.etd),
            eta: dateInputValue(first.eta),
            port: first.port || "",
        });
    };

    const closePeriodEdit = () => {
        setEditingPeriod(null);
        setPeriodForm({});
        setIsSavingPeriod(false);
    };

    const updateEditField = (field: string, value: unknown) => {
        setEditForm((current) => ({ ...current, [field]: value }));
    };

    const updatePeriodField = (field: string, value: unknown) => {
        setPeriodForm((current) => ({ ...current, [field]: value }));
    };

    const saveEdit = () => {
        if (!editingRow) return;

        const rowId = editingRow.summary_id || editingRow.id;
        if (!rowId) return;

        setIsSavingEdit(true);
        router.patch(route("summary.rows.update", rowId), editForm, {
            preserveScroll: true,
            onSuccess: () => {
                closeEdit();
                reloadSummaryDetail();
            },
            onFinish: () => setIsSavingEdit(false),
        });
    };

    const savePeriodEdit = () => {
        if (!editingPeriod) return;

        const summaryIds = editingPeriod.rows
            .map((item) => item.summary_id || item.id)
            .filter(Boolean);

        if (summaryIds.length === 0) return;

        setIsSavingPeriod(true);
        router.patch(route("summary.periods.update"), {
            summary_ids: summaryIds,
            ...periodForm,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                closePeriodEdit();
                setSelectedPivotCell(null);
                reloadSummaryDetail();
            },
            onFinish: () => setIsSavingPeriod(false),
        });
    };

    const filteredData = useMemo(() => {
        let filtered = [...data];

        const parseWeek = (w: any) => Number(normalizeWeek(w)) || 0;
        const typeRank = (t: any) => { const u = (t || "").toUpperCase(); return u === "FIRM" ? 0 : u === "FORECAST" ? 1 : 2; };

        if (searchAssyNumber)
            filtered = filtered.filter((i) => {
                const needle = searchAssyNumber.toLowerCase();

                return i.assy_number?.toLowerCase().includes(needle);
            });

        if (orderTypeFilter)
            filtered = filtered.filter((i) => (i.order_type || "").toUpperCase() === orderTypeFilter.toUpperCase());

        if (startDate && endDate) {
            filtered = filtered.filter((i) => {
                const etdOk = i.etd && i.etd >= startDate && i.etd <= endDate;
                const etaOk = i.eta && i.eta >= startDate && i.eta <= endDate;
                return etdOk || etaOk;
            });
        } else if (startDate) {
            filtered = filtered.filter((i) => (i.etd && i.etd >= startDate) || (i.eta && i.eta >= startDate));
        } else if (endDate) {
            filtered = filtered.filter((i) => (i.etd && i.etd <= endDate) || (i.eta && i.eta <= endDate));
        }

        if (weekFilter) filtered = filtered.filter((i) => parseWeek(i.week) === Number(weekFilter));

        return filtered.sort((a, b) => {
            const pn = (a.assy_number || "").localeCompare(b.assy_number || "", undefined, { numeric: true });
            if (pn !== 0) return pn;
            const tr = typeRank(a.order_type) - typeRank(b.order_type);
            if (tr !== 0) return tr;
            const wr = parseWeek(a.week) - parseWeek(b.week);
            if (wr !== 0) return wr;
            return (a.etd || "").localeCompare(b.etd || "");
        });
    }, [data, searchAssyNumber, orderTypeFilter, startDate, endDate, weekFilter]);

    const totalQty = filteredData.reduce((s, i) => s + Number(i.qty || 0), 0);
    const resetFilters = () => { setSearchAssyNumber(""); setOrderTypeFilter(""); setStartDate(""); setEndDate(""); setWeekFilter(""); };

    const activeFiltersCount = [searchAssyNumber, orderTypeFilter, startDate, endDate, weekFilter].filter(Boolean).length;

    const uniqueWeeks = useMemo(() => {
        const set = new Set<string>();
        data.forEach((i) => {
            const n = normalizeWeek(i.week);
            if (n !== "") set.add(String(n));
        });
        return Array.from(set).sort((a, b) => {
            const na = a === 'TOT' ? 99 : Number(a);
            const nb = b === 'TOT' ? 99 : Number(b);
            return na - nb;
        });
    }, [data]);

    const uploadDateLabel = formatUploadTimestamp(sr.upload_date);
    const metadataChips = [
        sr.customer || "-",
        sr.port || "-",
        sr.sheet_name || "-",
        sr.month || "-",
        uploadDateLabel,
    ];

    return (
        <AdminLayout title="Summary Detail">
            <div
                className="min-h-screen bg-gray-50/40 px-4 py-3 pb-8 font-sans dark:bg-[#0f172a] md:px-6"
            >
                {/* Breadcrumb */}
                <div className="shrink-0 mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                    <span>Menu</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span>Shipping Release</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <button onClick={handleBack} className="hover:text-gray-900 dark:hover:text-slate-100">Summary</button>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span className="font-medium text-gray-900 dark:text-slate-100">Detail</span>
                </div>

                <div
                    className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#111827]"
                >
                    {/* Header */}
                    <div className="shrink-0 border-b border-gray-200 px-5 py-3 dark:border-slate-700">
                        <div className="min-w-0">
                            <button onClick={handleBack} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-[#1D6F42] hover:text-green-800 dark:text-emerald-300 dark:hover:text-emerald-200">
                                Back to Summary List
                            </button>
                            <h1 className="truncate text-xl font-semibold tracking-tight text-gray-950 dark:text-slate-50" title={sr.source_file || sr.sr_number || "Summary Detail"}>
                                {sr.source_file || sr.sr_number || "Summary Detail"}
                            </h1>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {metadataChips.map((chip, index) => (
                                    <span
                                        key={`${chip}-${index}`}
                                        className="inline-flex max-w-[260px] items-center truncate rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                        title={chip}
                                    >
                                        {chip}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col">
                        <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3 dark:border-slate-700 dark:bg-[#111827]">
                            <div className="flex flex-wrap items-end gap-3">
                                <div className="w-full sm:w-64">
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Search Assy</label>
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Assy number..."
                                            className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 focus:border-[#1D6F42] focus:ring-2 focus:ring-[#1D6F42]/20 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-100 dark:placeholder:text-slate-500"
                                            value={searchAssyNumber}
                                            onChange={(e) => setSearchAssyNumber(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="w-28">
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Week</label>
                                    <select
                                        className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-[#1D6F42] focus:ring-2 focus:ring-[#1D6F42]/20 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-100"
                                        value={weekFilter}
                                        onChange={(e) => setWeekFilter(e.target.value)}
                                    >
                                        <option value="">All</option>
                                        {uniqueWeeks.map((w) => <option key={w} value={w}>{w}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">View</label>
                                    <div className="inline-flex h-9 overflow-hidden rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-slate-700 dark:bg-[#0f172a]">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode("excel")}
                                            className={`inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors ${viewMode === "excel"
                                                ? "bg-[#1D6F42] text-white shadow-sm dark:bg-emerald-500 dark:text-slate-950"
                                                : "text-gray-600 hover:bg-white hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                                }`}
                                        >
                                            <TableCellsIcon className="h-4 w-4" />
                                            Excel Preview
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode("list")}
                                            className={`inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors ${viewMode === "list"
                                                ? "bg-[#1D6F42] text-white shadow-sm dark:bg-emerald-500 dark:text-slate-950"
                                                : "text-gray-600 hover:bg-white hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                                }`}
                                        >
                                            <ListBulletIcon className="h-4 w-4" />
                                            List Detail
                                        </button>
                                    </div>
                                </div>

                                {viewMode === "excel" && (
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Cols per Month</label>
                                        <div className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-slate-700 dark:bg-[#0f172a]">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = Math.max(1, periodsPerMonth - 1);
                                                    setPeriodsPerMonth(newVal);
                                                    localStorage.setItem(`siplan_periods_per_month_${sr.customer}_${sr.id}`, String(newVal));
                                                }}
                                                className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-200"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center text-sm font-bold text-gray-900 dark:text-slate-100">{periodsPerMonth}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = Math.min(30, periodsPerMonth + 1);
                                                    setPeriodsPerMonth(newVal);
                                                    localStorage.setItem(`siplan_periods_per_month_${sr.customer}_${sr.id}`, String(newVal));
                                                }}
                                                className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-200"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeFiltersCount > 0 && (
                                    <button onClick={resetFilters} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-slate-700 dark:bg-[#0f172a] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100" title="Reset filters">
                                        <XMarkIcon className="h-4 w-4" />
                                        Reset
                                    </button>
                                )}

                                <a
                                    href={`/summary/${sr.id}/export?periods_per_month=${periodsPerMonth}`}
                                    className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-[#1D6F42] px-4 text-sm font-semibold text-white transition-colors hover:bg-green-700 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                    <span>Export Excel</span>
                                </a>
                            </div>

                            {activeFiltersCount > 0 && (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                                    <span className="font-semibold">Active:</span>
                                    {searchAssyNumber && <span className="rounded-md bg-gray-100 px-2 py-1 dark:bg-slate-800">Assy: {searchAssyNumber}</span>}
                                    {orderTypeFilter && <span className="rounded-md bg-gray-100 px-2 py-1 dark:bg-slate-800">{orderTypeFilter}</span>}
                                    {weekFilter && <span className="rounded-md bg-gray-100 px-2 py-1 dark:bg-slate-800">Week: {weekFilter}</span>}
                                    {(startDate || endDate) && <span className="rounded-md bg-gray-100 px-2 py-1 dark:bg-slate-800">Date: {startDate || "..."} - {endDate || "..."}</span>}
                                </div>
                            )}
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-[#0f172a]">
                            {viewMode === "excel" ? (
                                <PivotPreview
                                    data={filteredData}
                                    customer={sr.customer}
                                    onOpenCell={setSelectedPivotCell}
                                    runningWeek={running_week}
                                    periodsPerMonth={periodsPerMonth}
                                />
                            ) : (
                                <ListView
                                    filteredData={filteredData}
                                    totalQty={totalQty}
                                    resetFilters={resetFilters}
                                    activeFiltersCount={activeFiltersCount}
                                    customer={sr.customer}
                                    onEdit={openEdit}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {editingRow && (
                    <SummaryRowEditor
                        form={editForm}
                        isSaving={isSavingEdit}
                        onChange={updateEditField}
                        onCancel={closeEdit}
                        onSave={saveEdit}
                    />
                )}

                {selectedPivotCell && (
                    <PivotCellDialog
                        selection={selectedPivotCell}
                        onClose={() => setSelectedPivotCell(null)}
                        onEdit={editFromPivotCell}
                        onEditPeriod={openPeriodEdit}
                    />
                )}

                {editingPeriod && (
                    <SummaryPeriodEditor
                        selection={editingPeriod}
                        form={periodForm}
                        isSaving={isSavingPeriod}
                        onChange={updatePeriodField}
                        onCancel={closePeriodEdit}
                        onSave={savePeriodEdit}
                    />
                )}
            </div>
        </AdminLayout>
    );
}

function PivotCellDialog({
    selection,
    onClose,
    onEdit,
    onEditPeriod,
}: {
    selection: PivotCellSelection;
    onClose: () => void;
    onEdit: (item: SummaryItem) => void;
    onEditPeriod: (selection: PivotCellSelection) => void;
}) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-[2px]">
            <div className="flex max-h-[calc(100vh-48px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-slate-950">{selection.title}</h2>
                        <p className="mt-1 truncate text-sm text-slate-500">{selection.subtitle}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-right">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Qty From SR</div>
                        <div className="text-lg font-bold text-[#1D6F42]">{selection.totalQty.toLocaleString()}</div>
                        <div className="text-[11px] font-semibold text-emerald-700">Locked</div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50 p-4">
                    <table className="min-w-[900px] border-separate border-spacing-0 overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-100 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                {["Assy Number", "Type", "ETD", "ETA", "Week", "Port", "Qty SR", "Action"].map((header) => (
                                    <th key={header} className="border-b border-slate-200 px-3 py-2.5">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {selection.rows.map((item, index) => (
                                <tr key={`${item.summary_id || item.id || index}`} className="odd:bg-white even:bg-slate-50 hover:bg-emerald-50/60">
                                    <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-900">{item.assy_number || "-"}</td>
                                    <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{item.order_type || "-"}</td>
                                    <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{dateInputValue(item.etd) || "-"}</td>
                                    <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{dateInputValue(item.eta) || "-"}</td>
                                    <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{normalizeWeek(item.week) || "-"}</td>
                                    <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{item.port || "-"}</td>
                                    <td className="border-b border-slate-100 px-3 py-3 text-right font-semibold text-slate-900">{Number(item.qty || 0).toLocaleString()}</td>
                                    <td className="border-b border-slate-100 px-3 py-2.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(item)}
                                            disabled={!item.is_editable}
                                            title="Review"
                                            aria-label={`Review ${item.assy_number || "summary row"}`}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-2.5 text-xs font-semibold text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            <PencilSquareIcon className="h-4 w-4" />
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
                    <button
                        type="button"
                        onClick={() => onEditPeriod(selection)}
                        className="h-10 rounded-lg bg-[#1D6F42] px-5 text-sm font-semibold text-white hover:bg-[#185c38]"
                    >
                        Review Period
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
