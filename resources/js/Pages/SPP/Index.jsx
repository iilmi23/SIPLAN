import AdminLayout from "@/Layouts/AdminLayout";
import { Link, router } from "@inertiajs/react";
import { useMemo, useState } from "react";
import {
    ArrowPathIcon,
    ChevronRightIcon,
    EyeIcon,
    MagnifyingGlassIcon,
    TableCellsIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

export default function SPPIndex({ srList = [], customers = [], filters = {} }) {
    const [customer, setCustomer] = useState(filters.customer || "");
    const [search, setSearch] = useState(filters.search || "");
    const [selectedIds, setSelectedIds] = useState([]);

    const rows = Array.isArray(srList) ? srList : [];
    const hasFilters = Boolean(customer || search);
    const query = useMemo(() => buildQuery({ customer, search }), [customer, search]);
    const totalQty = useMemo(() => rows.reduce((sum, row) => sum + toNumber(row.total_qty), 0), [rows]);
    const selectedRows = useMemo(
        () => rows.filter((row) => selectedIds.includes(Number(row.upload_batch_id))),
        [rows, selectedIds]
    );
    const selectedCustomers = useMemo(
        () => Array.from(new Set(selectedRows.map((row) => row.customer).filter(Boolean))),
        [selectedRows]
    );
    const canPreviewCombined = selectedRows.length >= 2 && selectedCustomers.length === 1;

    const applyFilter = (event) => {
        event?.preventDefault();
        router.get(route("spp"), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const resetFilter = () => {
        setCustomer("");
        setSearch("");
        setSelectedIds([]);
        router.get(route("spp"), {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const toggleSelected = (id) => {
        const numericId = Number(id);
        if (!numericId) return;

        setSelectedIds((current) => (
            current.includes(numericId)
                ? current.filter((item) => item !== numericId)
                : [...current, numericId]
        ));
    };

    const previewCombined = () => {
        if (!canPreviewCombined) return;

        router.get(route("spp.previewCombined"), {
            batches: selectedIds,
        });
    };

    return (
        <AdminLayout title="SPP">
            <div className="min-h-screen bg-gray-50/40 px-5 pb-8 pt-2 font-sans md:px-8">
                <nav className="mb-4 flex items-center gap-2 text-sm" aria-label="Breadcrumb">
                    <Link href={route("dashboard")} className="text-gray-600 hover:text-[#1D6F42]">Home</Link>
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Shipping Release</span>
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900">SPP</span>
                </nav>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 p-6 pb-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">SPP Upload List</h1>
                                <p className="mt-1 text-sm text-gray-500">
                                    Pilih satu SR untuk SPP biasa, atau centang beberapa SR customer yang sama untuk combined SPP.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-3">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <MiniStat label="Uploads" value={formatNumber(rows.length)} />
                                    <MiniStat label="Qty" value={formatNumber(totalQty)} />
                                </div>
                                <button
                                    type="button"
                                    onClick={previewCombined}
                                    disabled={!canPreviewCombined}
                                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#0f3320] px-4 text-sm font-semibold text-white hover:bg-[#174b2e] disabled:cursor-not-allowed disabled:opacity-50"
                                    title={selectedRows.length < 2 ? "Pilih minimal dua SR upload" : selectedCustomers.length > 1 ? "Combined SPP harus dari customer yang sama" : "Preview Combined SPP"}
                                >
                                    Preview Combined ({selectedRows.length})
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="border-b border-gray-100 px-6 py-4">
                        <form onSubmit={applyFilter} className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                            <div className="grid flex-1 gap-4 md:grid-cols-2">
                                <div>
                                    <label htmlFor="spp-search" className="mb-1.5 block text-sm font-semibold text-gray-700">Source File</label>
                                    <div className="relative">
                                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                        <input
                                            id="spp-search"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search source file..."
                                            className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1D6F42] focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20"
                                        />
                                        {search && (
                                            <button type="button" onClick={() => setSearch("")} className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-gray-600" aria-label="Clear search">
                                                <XMarkIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="spp-customer" className="mb-1.5 block text-sm font-semibold text-gray-700">Customer</label>
                                    <select
                                        id="spp-customer"
                                        value={customer}
                                        onChange={(event) => setCustomer(event.target.value)}
                                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 focus:border-[#1D6F42] focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20"
                                    >
                                        <option value="">All Customers</option>
                                        {customers.map((customerItem) => (
                                            <option key={customerItem.code ?? customerItem.name} value={customerItem.code ?? customerItem.name}>
                                                {customerItem.code ?? customerItem.name}
                                                {customerItem.name && customerItem.code ? ` - ${customerItem.name}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1D6F42] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#185c38]">
                                    <MagnifyingGlassIcon className="h-4 w-4" />
                                    Apply
                                </button>
                                {hasFilters && (
                                    <button type="button" onClick={resetFilter} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                                        <ArrowPathIcon className="h-4 w-4" />
                                        Reset
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1180px] table-fixed">
                            <colgroup>
                                <col className="w-[56px]" />
                                <col className="w-[72px]" />
                                <col className="w-[130px]" />
                                <col className="w-[130px]" />
                                <col className="w-[300px]" />
                                <col className="w-[150px]" />
                                <col className="w-[120px]" />
                                <col className="w-[120px]" />
                                <col className="w-[155px]" />
                                <col className="w-[150px]" />
                            </colgroup>
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-100/80">
                                    <TableHeader>Select</TableHeader>
                                    <TableHeader>#</TableHeader>
                                    <TableHeader>Customer</TableHeader>
                                    <TableHeader>Port</TableHeader>
                                    <TableHeader>Source File</TableHeader>
                                    <TableHeader>Sheet</TableHeader>
                                    <TableHeader align="right">Assy Numbers</TableHeader>
                                    <TableHeader align="right">Qty</TableHeader>
                                    <TableHeader>ETA Range</TableHeader>
                                    <TableHeader>Action</TableHeader>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.length > 0 ? rows.map((sr, index) => (
                                    <tr key={`${sr.upload_batch}-${sr.id}`} className="transition-colors hover:bg-gray-50/80">
                                        <td className="border-r border-gray-100 px-5 py-4 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(Number(sr.upload_batch_id))}
                                                onChange={() => toggleSelected(sr.upload_batch_id)}
                                                disabled={!sr.upload_batch_id}
                                                className="h-4 w-4 rounded border-gray-300 text-[#1D6F42] focus:ring-[#1D6F42]"
                                                aria-label={`Select ${sr.source_file || "SR upload"}`}
                                            />
                                        </td>
                                        <td className="border-r border-gray-100 px-5 py-4 text-sm font-medium tabular-nums text-gray-500">
                                            {(index + 1).toString().padStart(2, "0")}
                                        </td>
                                        <td className="border-r border-gray-100 px-5 py-4">
                                            <span className="inline-flex max-w-full rounded-lg border border-green-100 bg-green-50 px-2.5 py-1 text-xs font-semibold text-[#1D6F42]">
                                                <span className="truncate">{sr.customer || "-"}</span>
                                            </span>
                                        </td>
                                        <td className="border-r border-gray-100 px-5 py-4 text-sm text-gray-600">{sr.port || "-"}</td>
                                        <td className="border-r border-gray-100 px-5 py-4">
                                            <p className="truncate text-sm font-semibold text-gray-900" title={sr.source_file || ""}>{sr.source_file || "-"}</p>
                                            <p className="mt-0.5 truncate text-xs text-gray-400">Batch: {sr.upload_batch || "-"}</p>
                                        </td>
                                        <td className="border-r border-gray-100 px-5 py-4 text-sm text-gray-600">{sr.sheet_name || "-"}</td>
                                        <td className="border-r border-gray-100 px-5 py-4 text-right font-mono text-sm text-gray-700">{formatNumber(sr.unique_assy_numbers)}</td>
                                        <td className="border-r border-gray-100 px-5 py-4 text-right font-mono text-sm text-gray-700">{formatNumber(sr.total_qty)}</td>
                                        <td className="border-r border-gray-100 px-5 py-4 text-sm text-gray-600">{formatDateRange(sr.earliest_eta, sr.latest_eta)}</td>
                                        <td className="px-5 py-4">
                                            <Link
                                                href={route("spp.preview", sr.id)}
                                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:border-[#1D6F42]/30 hover:bg-gray-50 hover:text-[#1D6F42]"
                                            >
                                                <EyeIcon className="h-4 w-4" />
                                                Preview
                                            </Link>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center">
                                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50">
                                                <TableCellsIcon className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <h2 className="mt-4 text-base font-semibold text-gray-800">No SR upload found</h2>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {hasFilters ? "Tidak ada upload yang cocok dengan filter saat ini." : "Upload SR terlebih dahulu untuk membuat SPP."}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

function MiniStat({ label, value }) {
    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</div>
            <div className="text-lg font-bold text-gray-900">{value}</div>
        </div>
    );
}

function TableHeader({ children, align = "left" }) {
    return (
        <th className={`border-r border-gray-200 px-5 py-4 text-xs font-bold uppercase tracking-wider text-gray-700 ${align === "right" ? "text-right" : "text-left"}`}>
            {children}
        </th>
    );
}

function buildQuery(filters) {
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    );
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
    return toNumber(value).toLocaleString("en-US");
}

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateRange(startDate, endDate) {
    if (!startDate && !endDate) return "-";
    if (startDate === endDate) return formatDate(startDate);
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}
