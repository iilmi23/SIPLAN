import { Link, router } from "@inertiajs/react";
import { useEffect, useState, useMemo } from "react";
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    CalendarDaysIcon,
    ArrowUpTrayIcon,
    FunnelIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ChevronUpDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon as ChevronNext,
} from "@heroicons/react/24/outline";
import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";

const MONTH_ORDER = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
const MONTH_FILTERS = MONTH_ORDER.map((label, index) => ({ value: String(index + 1), label }));
const compactFilters = (values) => Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== "" && value !== null && value !== undefined)
);

// Warna utama yang konsisten
const COLORS = {
    primary: "#0F3B2C",    // hijau tua premium
    primaryLight: "#1E5A44",
    primarySoft: "#E6F4EA",
    accent: "#D97706",      // aksen emas/oranye
    accentSoft: "#FEF3C7",
    gray: {
        50: "#F9FAFB",
        100: "#F3F4F6",
        200: "#E5E7EB",
        300: "#D1D5DB",
        400: "#9CA3AF",
        500: "#6B7280",
        600: "#4B5563",
        700: "#374151",
        800: "#1F2937",
        900: "#111827",
    }
};

export default function Index({ productionWeeks, customers = [], availableYears, filters, flash }) {
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "year", direction: "desc" });
    const [filterOpen, setFilterOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(filters?.customer_id ?? "");
    const [selectedMonth, setSelectedMonth] = useState(filters?.month_number ?? "");
    const [selectedYear, setSelectedYear] = useState(filters?.year ?? "");
    const [deleteRow, setDeleteRow] = useState(null);

    const monthRows = productionWeeks?.data ?? [];
    const customerLookup = useMemo(() => {
        return new Map(customers.map((customer) => [
            String(customer.id),
            customer.code,
        ]));
    }, [customers]);

    const getCustomerLabel = (row) => {
        if (row.customer_id === null || row.customer_id === undefined || row.customer_id === "") {
            return "Global";
        }

        const customer = customerLookup.get(String(row.customer_id));
        return customer ?? `#${row.customer_id}`;
    };

    useEffect(() => {
        if (flash?.success || flash?.warning || flash?.error) {
            setAlertType(flash?.success ? "success" : flash?.warning ? "warning" : "error");
            setShowAlert(true);
            const t = setTimeout(() => setShowAlert(false), 4000);
            return () => clearTimeout(t);
        }
    }, [flash]);

    const applyFilter = () => {
        router.get(route("production-week.index"), compactFilters({
            customer_id: selectedCustomer,
            month_number: selectedMonth,
            year: selectedYear,
        }), { preserveState: true, replace: true });
    };

    const clearFilter = () => {
        setSelectedCustomer("");
        setSelectedMonth("");
        setSelectedYear("");
        router.get(route("production-week.index"), {}, { preserveState: true, replace: true });
    };

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
        }));
    };

    const sorted = useMemo(() => {
        const keyword = searchTerm.toLowerCase();
        const filtered = monthRows.filter((w) =>
            (w.month_name ?? "").toLowerCase().includes(keyword) ||
            getCustomerLabel(w).toLowerCase().includes(keyword) ||
            String(w.year ?? "").includes(searchTerm) ||
            String(w.month_number ?? "").includes(searchTerm) ||
            String(w.start_date ?? "").toLowerCase().includes(keyword) ||
            String(w.end_date ?? "").toLowerCase().includes(keyword) ||
            String(w.total_weeks ?? "").includes(searchTerm) ||
            String(w.total_working_days ?? "").includes(searchTerm)
        );

        return [...filtered].sort((a, b) => {
            const av = sortConfig.key === "customer_name" ? getCustomerLabel(a) : a[sortConfig.key] ?? "";
            const bv = sortConfig.key === "customer_name" ? getCustomerLabel(b) : b[sortConfig.key] ?? "";
            const comparison = String(av).localeCompare(String(bv), undefined, { numeric: true });

            return sortConfig.direction === "asc" ? comparison : -comparison;
        });
    }, [monthRows, searchTerm, sortConfig, customerLookup]);

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
        }

        return sortConfig.direction === "asc"
            ? <ArrowUpIcon className="w-4 h-4" style={{ color: COLORS.primary }} />
            : <ArrowDownIcon className="w-4 h-4" style={{ color: COLORS.primary }} />;
    };

    const buildMonthUrl = (action, row) => {
        const params = new URLSearchParams({
            year: String(row.year),
            month: String(row.month_number),
        });

        if (row.customer_id !== null && row.customer_id !== undefined && row.customer_id !== "") {
            params.set("customer_id", String(row.customer_id));
        }

        return `/production-week/${action}?${params.toString()}`;
    };

    const formatDateRange = (startDate, endDate) => {
        if (!startDate || !endDate) return "-";

        const format = (value) => new Date(value).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
        }).replace(" ", "/");

        return `${format(startDate)} ~ ${format(endDate)}`;
    };

    const handleDelete = (row) => {
        setDeleteRow(row);
    };

    const confirmDelete = () => {
        router.delete(buildMonthUrl("delete", deleteRow));
        setDeleteRow(null);
    };

    const handleEdit = (row) => {
        router.get(buildMonthUrl("edit", row));
    };

    const meta = productionWeeks;

    const monthColor = (name) => {
        const idx = MONTH_ORDER.indexOf(name);
        if (idx === -1) return "bg-gray-100 text-gray-600";
        const colors = [
            "bg-blue-50 text-blue-700",
            "bg-emerald-50 text-emerald-700",
            "bg-amber-50 text-amber-700",
            "bg-purple-50 text-purple-700"
        ];
        return colors[Math.floor(idx / 3)] ?? "bg-gray-100 text-gray-600";
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">

                <Breadcrumb items={[{ label: "Masters" }, { label: "Production Weeks" }]} />

                {/* Alert Notifikasi */}
                {showAlert && (
                    <div className="mb-5 animate-slideDown">
                        <div className={`flex items-center gap-3 bg-white p-4 rounded-xl shadow-sm border-l-4 ${
                            alertType === "success"
                                ? "border-l-emerald-500"
                                : alertType === "warning"
                                    ? "border-l-amber-500"
                                    : "border-l-red-500"
                        }`}>
                            <div className={`p-2 rounded-lg ${
                                alertType === "success"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : alertType === "warning"
                                        ? "bg-amber-50 text-amber-600"
                                        : "bg-red-50 text-red-600"
                            }`}>
                                {alertType === "success"
                                    ? <CheckCircleIcon className="w-5 h-5" />
                                    : <ExclamationCircleIcon className="w-5 h-5" />}
                            </div>
                            <p className="flex-1 text-sm text-gray-800">{flash?.success || flash?.warning || flash?.error}</p>
                            <button onClick={() => setShowAlert(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-3">
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Production Week List</h1>
                        <p className="text-sm text-gray-500 mt-1">View and manage monthly production week calendars.</p>
                    </div>

                    {/* Toolbar */}
                    <div className="px-6 pb-4 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Search */}
                            <div className="relative flex-1 max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full h-11 pl-10 pr-10 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                    placeholder="Search month, customer, year, date range..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    onClick={() => setFilterOpen(!filterOpen)}
                                    className={`inline-flex items-center gap-2 h-11 px-4 border rounded-xl text-sm font-medium transition-all ${
                                        filterOpen || filters?.customer_id || filters?.month_number || filters?.year
                                            ? "bg-[#1D6F42]/10 border-[#1D6F42]/30 text-[#1D6F42]"
                                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <FunnelIcon className="w-5 h-5" />
                                    Filter
                                </button>
                                <Link
                                    href={route("production-week.import-page")}
                                    className="inline-flex items-center gap-2 h-11 px-4 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    <ArrowUpTrayIcon className="w-5 h-5" />
                                    Import
                                </Link>
                                <Link
                                    href={route("production-week.create")}
                                    className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition-all shadow-sm active:scale-[0.98]"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Add
                                </Link>
                            </div>
                        </div>

                        {/* Filter Panel */}
                        {filterOpen && (
                            <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-slideDown">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-800">Filter By</h3>
                                    <button
                                        onClick={clearFilter}
                                        className="text-xs text-[#1D6F42] hover:underline"
                                    >
                                        Reset
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-3 items-end">
                                    <div className="min-w-[220px]">
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Customer</label>
                                        <select
                                            value={selectedCustomer}
                                            onChange={e => setSelectedCustomer(e.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                        >
                                            <option value="">All Customers</option>
                                            <option value="global">Global</option>
                                            {customers.map(customer => (
                                                <option key={customer.id} value={customer.id}>
                                                    {customer.code}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="min-w-[180px]">
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Month</label>
                                        <select
                                            value={selectedMonth}
                                            onChange={e => setSelectedMonth(e.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                        >
                                            <option value="">All Months</option>
                                            {MONTH_FILTERS.map(month => (
                                                <option key={month.value} value={month.value}>
                                                    {month.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="min-w-[180px]">
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Year</label>
                                        <select
                                            value={selectedYear}
                                            onChange={e => setSelectedYear(e.target.value)}
                                            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                        >
                                            <option value="">All Years</option>
                                            {availableYears?.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={applyFilter} className="px-4 h-10 bg-[#1D6F42] text-white text-sm font-medium rounded-lg hover:bg-[#185c38]">
                                            Apply
                                        </button>
                                        <button onClick={clearFilter} className="px-4 h-10 bg-white text-gray-600 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50">
                        <table className="w-full min-w-[980px] table-fixed">
                            <colgroup>
                                <col className="w-[6%]" />
                                <col className="w-[13%]" />
                                <col className="w-[11%]" />
                                <col className="w-[18%]" />
                                <col className="w-[19%]" />
                                <col className="w-[9%]" />
                                <col className="w-[12%]" />
                                <col className="w-[12%]" />
                            </colgroup>
                            <thead>
                                <tr className="bg-gray-100/80 border-b border-gray-200">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                        #
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-[#1D6F42] border-r border-gray-200" onClick={() => handleSort("month_number")}>
                                        <div className="flex items-center gap-1.5">Month {getSortIcon("month_number")}</div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-[#1D6F42] border-r border-gray-200" onClick={() => handleSort("year")}>
                                        <div className="flex items-center gap-1.5">Year {getSortIcon("year")}</div>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-[#1D6F42] border-r border-gray-200" onClick={() => handleSort("start_date")}>
                                        <div className="flex items-center gap-1.5">Date Range {getSortIcon("start_date")}</div>
                                    </th>
                                    <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-[#1D6F42] border-r border-gray-200" onClick={() => handleSort("customer_name")}>
                                        <div className="flex items-center gap-1.5">Customer {getSortIcon("customer_name")}</div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">Weeks</th>
                                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">Working Days</th>
                                    <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sorted.length > 0 ? sorted.map((w, index) => (
                                    <tr key={`${w.customer_id ?? "global"}-${w.year}-${w.month_number}`} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium tabular-nums border-r border-gray-100">
                                            {(index + 1).toString().padStart(2, "0")}
                                        </td>
                                        <td className="px-6 py-4 border-r border-gray-100">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${monthColor(w.month_name)}`}>
                                                {w.month_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-gray-700 border-r border-gray-100">{w.year}</td>
                                        <td className="px-4 py-4 text-sm text-gray-600 font-mono border-r border-gray-100">
                                            <span className="block truncate">{formatDateRange(w.start_date, w.end_date)}</span>
                                        </td>
                                        <td className="px-4 py-4 border-r border-gray-100">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-gray-800">{getCustomerLabel(w)}</p>
                                                <p className="mt-0.5 text-xs text-gray-400">{w.customer_id ? "Customer-specific" : "Default calendar"}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center border-r border-gray-100">
                                            <span className="inline-flex min-w-10 justify-center rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-semibold text-gray-700">
                                                {w.total_weeks}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center border-r border-gray-100">
                                            <span className="inline-flex min-w-12 justify-center rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-[#1D6F42]">
                                                {w.total_working_days ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEdit(w)}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-[#1D6F42] hover:border-[#1D6F42]/30 transition-colors"
                                                    title="Edit"
                                                    aria-label={`Edit ${w.month_name} ${w.year}`}
                                                >
                                                    <PencilIcon className="w-4 h-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDeleteRow(w)}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                                                    title="Delete"
                                                    aria-label={`Delete ${w.month_name} ${w.year}`}
                                                >
                                                    <TrashIcon className="w-4 h-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                                                <CalendarDaysIcon className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-800 mb-1">No production weeks found</h3>
                                            <p className="text-sm text-gray-400 mt-1">
                                                {searchTerm ? `No match for "${searchTerm}"` : "Add a production week or import an Excel file to get started."}
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {sorted.length > 0 && meta?.last_page > 1 && (
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm text-gray-500">
                                Showing {sorted.length} of {meta?.total ?? sorted.length} records
                            </div>
                            <div className="flex gap-1">
                                <Link
                                    href={meta?.prev_page_url ?? "#"}
                                    className={`p-2 rounded-lg border text-sm transition-colors ${
                                        meta?.current_page === 1
                                            ? "opacity-40 pointer-events-none border-gray-200 text-gray-400"
                                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                                    }`}
                                >
                                    <ChevronLeftIcon className="w-4 h-4" />
                                </Link>
                                {meta?.links?.filter(l => !["&laquo; Previous","Next &raquo;"].includes(l.label)).map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url ?? "#"}
                                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                            link.active
                                                ? "bg-emerald-600 text-white"
                                                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                                <Link
                                    href={meta?.next_page_url ?? "#"}
                                    className={`p-2 rounded-lg border text-sm transition-colors ${
                                        meta?.current_page === meta?.last_page
                                            ? "opacity-40 pointer-events-none border-gray-200 text-gray-400"
                                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                                    }`}
                                >
                                    <ChevronNext className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slideDown { animation: slideDown 0.25s ease-out; }
            `}</style>

            {/* Delete Modal */}
            {deleteRow && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-96 shadow-xl">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900">
                            Delete Production Week
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete <b>{deleteRow.month_name} {deleteRow.year}</b>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteRow(null)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
