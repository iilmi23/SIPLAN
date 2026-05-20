import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Link, router } from "@inertiajs/react";
import { useState, useMemo, useEffect } from "react";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    CheckCircleIcon
} from "@heroicons/react/24/outline";

export default function Index({ customer, ports, flash = {} }) {
    const [search, setSearch] = useState("");
    const [sortDir, setSortDir] = useState("asc");
    const [deletePort, setDeletePort] = useState(null);
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        if (flash?.success) {
            setShowAlert(true);
            const timer = setTimeout(() => setShowAlert(false), 3500);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const processedPorts = useMemo(() => {
        let filtered = ports.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );

        filtered.sort((a, b) => {
            const comp = a.name.localeCompare(b.name);
            return sortDir === "asc" ? comp : -comp;
        });

        return filtered;
    }, [ports, search, sortDir]);

    const confirmDelete = () => {
        router.delete(`/customers/${customer.id}/ports/${deletePort.id}`);
        setDeletePort(null);
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <Breadcrumb items={[{ label: "Masters" }, { label: "Ports", href: "/ports" }, { label: `Manage ${customer.name}` }]} />

                {/* Alert */}
                {showAlert && (
                    <div className="mb-6 animate-slideDown">
                        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border-l-4 border-[#1D6F42] shadow-sm border border-gray-200">
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-[#1D6F42] flex-shrink-0">
                                <CheckCircleIcon className="w-5 h-5" />
                            </div>
                            <p className="flex-1 text-sm font-medium text-gray-800">{flash.success}</p>
                            <button
                                onClick={() => setShowAlert(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 flex justify-between items-center border-b border-gray-100">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                                Manage Ports
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Customer: {customer.name}
                            </p>
                        </div>

                        <Link
                            href={`/customers/${customer.id}/ports/create`}
                            className="inline-flex items-center gap-2 h-11 px-5 bg-[#1D6F42] text-white rounded-xl hover:bg-[#185c38] transition-all shadow-sm active:scale-[0.98]"
                        >
                            <PlusIcon className="w-5 h-5" />
                            Add Port
                        </Link>
                    </div>

                    {/* Search + Sort */}
                    <div className="px-6 pb-4 pt-4 flex gap-3">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                            <input
                                type="text"
                                placeholder="Search ports..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full h-11 pl-10 pr-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                            className="px-4 border border-gray-200 rounded-xl flex items-center gap-1 text-sm hover:bg-gray-50 transition-colors"
                        >
                            Sort
                            {sortDir === "asc"
                                ? <ArrowUpIcon className="w-4" />
                                : <ArrowDownIcon className="w-4" />}
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-100/80 border-b border-gray-200">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16">#</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Port</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-44">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {processedPorts.length > 0 ? (
                                    processedPorts.map((port, index) => (
                                        <tr key={port.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium tabular-nums border-r border-gray-100">
                                                {(index + 1).toString().padStart(2, '0')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                {port.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={`/customers/${customer.id}/ports/${port.id}/edit`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:text-[#1D6F42] hover:border-[#1D6F42]/30 transition-colors"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                        Edit
                                                    </Link>
                                                    <button
                                                        onClick={() => setDeletePort(port)}
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
                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-800 mb-1">No ports found</h3>
                                            <p className="text-sm text-gray-500">
                                                {search ? `No match for "${search}"` : 'No ports available for this customer'}
                                            </p>
                                            {search && (
                                                <button
                                                    onClick={() => setSearch("")}
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
                    {processedPorts.length > 0 && (
                        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#1D6F42] rounded-full animate-pulse" />
                                Showing {processedPorts.length} port{processedPorts.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete Modal */}
                {deletePort && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-xl w-96 shadow-xl">
                            <h3 className="text-lg font-semibold mb-2 text-gray-900">
                                Delete Port
                            </h3>
                            <p className="text-sm text-gray-600 mb-6">
                                Are you sure you want to delete <b>{deletePort.name}</b>?
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDeletePort(null)}
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
        </AdminLayout>
    );
}
