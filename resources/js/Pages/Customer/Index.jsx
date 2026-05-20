import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Link, router } from "@inertiajs/react";
import { useEffect, useState, useMemo } from "react";
import {
    MagnifyingGlassIcon,
    XMarkIcon,
    CheckCircleIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    UserGroupIcon,
    FunnelIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ChevronUpDownIcon
} from "@heroicons/react/24/outline";

export default function Index({ customers, flash }) {
    const [showAlert, setShowAlert] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [filterOpen, setFilterOpen] = useState(false);
    const [deleteCustomer, setDeleteCustomer] = useState(null);

    useEffect(() => {
        if (flash?.success) {
            setShowAlert(true);
            const timer = setTimeout(() => setShowAlert(false), 3500);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const handleDelete = (customer) => {
        setDeleteCustomer(customer);
    };

    const confirmDelete = () => {
        router.delete(`/customers/${deleteCustomer.id}`);
        setDeleteCustomer(null);
    };

    const handleSort = (key) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
        }
        return sortConfig.direction === 'asc' 
            ? <ArrowUpIcon className="w-4 h-4 text-[#1D6F42]" />
            : <ArrowDownIcon className="w-4 h-4 text-[#1D6F42]" />;
    };

    const processedCustomers = useMemo(() => {
        if (!customers) return [];

        let filtered = customers.filter(c =>
            (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.code || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key] ?? '';
                let bVal = b[sortConfig.key] ?? '';
                const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }

        return filtered;
    }, [customers, searchTerm, sortConfig]);

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <Breadcrumb items={[{ label: "Masters" }, { label: "Customers" }]} />

                {/* Alert */}
                {showAlert && (
                    <div className="mb-6 animate-slideDown">
                        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border-l-4 border-[#1D6F42] shadow-sm border border-gray-200">
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-[#1D6F42] flex-shrink-0">
                                <CheckCircleIcon className="w-5 h-5" />
                            </div>
                            <p className="flex-1 text-sm font-medium text-gray-800">{flash?.success}</p>
                            <button
                                onClick={() => setShowAlert(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 pb-3">
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Customer List</h1>
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
                                    placeholder="Search name, code, description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm("")}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                                <button
                                    onClick={() => setFilterOpen(!filterOpen)}
                                    className={`inline-flex items-center gap-2 h-11 px-4 border rounded-xl text-sm font-medium transition-all ${
                                        filterOpen
                                            ? 'bg-[#1D6F42]/10 border-[#1D6F42]/30 text-[#1D6F42]'
                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    <FunnelIcon className="w-5 h-5" />
                                    Filter
                                    {processedCustomers.length !== (customers?.length || 0) && (
                                        <span className="ml-1.5 bg-[#1D6F42]/10 text-[#1D6F42] px-2 py-0.5 rounded-full text-xs font-medium">
                                            {processedCustomers.length}
                                        </span>
                                    )}
                                </button>

                                <Link
                                    href="/customers/create"
                                    className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition-all shadow-sm active:scale-[0.98]"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Add Customer
                                </Link>
                            </div>
                        </div>

                        {/* Filter Panel */}
                        {filterOpen && (
                            <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-slideDown">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-800">Sort By</h3>
                                    <button
                                        onClick={() => setSortConfig({ key: 'name', direction: 'asc' })}
                                        className="text-xs text-[#1D6F42] hover:underline"
                                    >
                                        Reset
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { key: 'name', label: 'Name' },
                                        { key: 'code', label: 'Code' }
                                    ].map((opt) => (
                                        <button
                                            key={opt.key}
                                            onClick={() => handleSort(opt.key)}
                                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                sortConfig.key === opt.key
                                                    ? 'bg-[#1D6F42] text-white shadow-sm'
                                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            {opt.label}
                                            {sortConfig.key === opt.key && (
                                                sortConfig.direction === 'asc' 
                                                    ? <ArrowUpIcon className="w-4 h-4" />
                                                    : <ArrowDownIcon className="w-4 h-4" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-100/80 border-b border-gray-200">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16 border-r border-gray-200">
                                        #
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-[#1D6F42] border-r border-gray-200"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Customer
                                            {getSortIcon('name')}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-[#1D6F42] border-r border-gray-200"
                                        onClick={() => handleSort('code')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Code
                                            {getSortIcon('code')}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-44">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {processedCustomers.length > 0 ? (
                                    processedCustomers.map((customer, index) => (
                                        <tr key={customer.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium tabular-nums border-r border-gray-100">
                                                {(index + 1).toString().padStart(2, '0')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {customer.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {customer.code?.trim() ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-50 text-[#1D6F42] text-xs font-medium border border-green-100">
                                                        {customer.code}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/customers/${customer.id}/edit`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-[#1D6F42] hover:border-[#1D6F42]/30 transition-colors"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeleteCustomer(customer)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="py-16 text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                                                <UserGroupIcon className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-800 mb-1">No customers found</h3>
                                            <p className="text-sm text-gray-500">
                                                {searchTerm ? `No match for "${searchTerm}"` : 'No customer data yet'}
                                            </p>
                                            {searchTerm && (
                                                <button
                                                    onClick={() => setSearchTerm("")}
                                                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
                                                >
                                                    <XMarkIcon className="w-4 h-4" />
                                                    Clear search
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    {processedCustomers.length > 0 && (
                        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#1D6F42] rounded-full animate-pulse" />
                                Showing {processedCustomers.length} customer{processedCustomers.length !== 1 ? 's' : ''}
                            </div>
                            <div>
                                {processedCustomers.length !== (customers?.length || 0) && 'Filtered results'}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .animate-slideDown {
                    animation: slideDown 0.25s ease-out;
                }
            `}</style>

            {/* Delete Modal */}
            {deleteCustomer && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-96 shadow-xl">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900">
                            Delete Customer
                        </h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete <b>{deleteCustomer.name}</b>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteCustomer(null)}
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
