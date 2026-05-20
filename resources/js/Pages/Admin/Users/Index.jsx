import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowDownIcon,
    ArrowUpIcon,
    CheckCircleIcon,
    ChevronUpDownIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
    UserGroupIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

const roleBadge = (role) => ({
    admin: "bg-red-50 text-red-700 border-red-100",
    ppc: "bg-blue-50 text-blue-700 border-blue-100",
}[role] || "bg-gray-50 text-gray-700 border-gray-100");

const roleLabel = (role) => ({
    admin: "Admin",
    ppc: "PPC",
}[role] || role);

export default function Index({ users }) {
    const { flash, auth } = usePage().props;
    const [showAlert, setShowAlert] = useState(false);
    const [alertType, setAlertType] = useState("success");
    const [alertMessage, setAlertMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
    const [filterOpen, setFilterOpen] = useState(false);
    const [deleteUser, setDeleteUser] = useState(null);
    const rows = users?.data ?? [];

    useEffect(() => {
        const message = flash?.success || flash?.error || flash?.warning;
        if (!message) return;

        setAlertType(flash?.success ? "success" : flash?.warning ? "warning" : "error");
        setAlertMessage(message);
        setShowAlert(true);

        const timer = setTimeout(() => setShowAlert(false), 3500);
        return () => clearTimeout(timer);
    }, [flash?.success, flash?.error, flash?.warning]);

    const handleSort = (key) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
        }));
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) {
            return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
        }

        return sortConfig.direction === "asc"
            ? <ArrowUpIcon className="w-4 h-4 text-[#1D6F42]" />
            : <ArrowDownIcon className="w-4 h-4 text-[#1D6F42]" />;
    };

    const processedUsers = useMemo(() => {
        const filtered = rows.filter((user) => (
            (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            roleLabel(user.role).toLowerCase().includes(searchTerm.toLowerCase())
        ));

        return filtered.sort((a, b) => {
            const aValue = sortConfig.key === "role" ? roleLabel(a.role) : (a[sortConfig.key] ?? "");
            const bValue = sortConfig.key === "role" ? roleLabel(b.role) : (b[sortConfig.key] ?? "");
            const comparison = String(aValue).localeCompare(String(bValue), undefined, { numeric: true });

            return sortConfig.direction === "asc" ? comparison : -comparison;
        });
    }, [rows, searchTerm, sortConfig]);

    const confirmDelete = () => {
        if (!deleteUser) return;

        router.delete(route("users.destroy", deleteUser.id), { preserveScroll: true });
        setDeleteUser(null);
    };

    return (
        <AdminLayout title="User Management">
            <Head title="User Management | SIPLAN" />
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <Breadcrumb items={[{ label: "System" }, { label: "Users" }]} />

                {showAlert && alertMessage && (
                    <div className="mb-6 animate-slideDown">
                        <div className={`flex items-center gap-3 bg-white p-4 rounded-xl border-l-4 shadow-sm border border-gray-200 ${
                            alertType === "success" ? "border-l-[#1D6F42]" : alertType === "warning" ? "border-l-amber-500" : "border-l-red-500"
                        }`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                alertType === "success" ? "bg-green-50 text-[#1D6F42]" : alertType === "warning" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                            }`}>
                                {alertType === "success" ? <CheckCircleIcon className="w-5 h-5" /> : <ExclamationTriangleIcon className="w-5 h-5" />}
                            </div>
                            <p className="flex-1 text-sm font-medium text-gray-800">{alertMessage}</p>
                            <button onClick={() => setShowAlert(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 pb-3">
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">User Management</h1>
                    </div>

                    <div className="px-6 pb-4 border-b border-gray-100">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full h-11 pl-10 pr-10 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                    placeholder="Search name, email, role..."
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
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
                                {/* <button
                                    onClick={() => setFilterOpen((open) => !open)}
                                    className={`inline-flex items-center gap-2 h-11 px-4 border rounded-xl text-sm font-medium transition-all ${
                                        filterOpen
                                            ? "bg-[#1D6F42]/10 border-[#1D6F42]/30 text-[#1D6F42]"
                                            : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <FunnelIcon className="w-5 h-5" />
                                    Filter
                                    {processedUsers.length !== rows.length && (
                                        <span className="ml-1.5 bg-[#1D6F42]/10 text-[#1D6F42] px-2 py-0.5 rounded-full text-xs font-medium">
                                            {processedUsers.length}
                                        </span>
                                    )}
                                </button> */}

                                <Link
                                    href={route("users.create")}
                                    className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition-all shadow-sm active:scale-[0.98]"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Add User
                                </Link>
                            </div>
                        </div>

                        {filterOpen && (
                            <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-slideDown">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-gray-800">Sort By</h3>
                                    <button
                                        onClick={() => setSortConfig({ key: "name", direction: "asc" })}
                                        className="text-xs text-[#1D6F42] hover:underline"
                                    >
                                        Reset
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { key: "name", label: "Name" },
                                        { key: "email", label: "Email" },
                                        { key: "role", label: "Role" },
                                    ].map((option) => (
                                        <button
                                            key={option.key}
                                            onClick={() => handleSort(option.key)}
                                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                sortConfig.key === option.key
                                                    ? "bg-[#1D6F42] text-white shadow-sm"
                                                    : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
                                            }`}
                                        >
                                            {option.label}
                                            {sortConfig.key === option.key && (
                                                sortConfig.direction === "asc"
                                                    ? <ArrowUpIcon className="w-4 h-4" />
                                                    : <ArrowDownIcon className="w-4 h-4" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-gray-50">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="bg-gray-100/80 border-b border-gray-200">
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-16 border-r border-gray-200">
                                        #
                                    </th>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-[#1D6F42] border-r border-gray-200"
                                        onClick={() => handleSort("name")}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            User
                                            {getSortIcon("name")}
                                        </div>
                                    </th>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-[#1D6F42] border-r border-gray-200"
                                        onClick={() => handleSort("email")}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Email
                                            {getSortIcon("email")}
                                        </div>
                                    </th>
                                    <th
                                        className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:text-[#1D6F42] border-r border-gray-200"
                                        onClick={() => handleSort("role")}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            Role
                                            {getSortIcon("role")}
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                                        Created
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider w-36">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {processedUsers.length > 0 ? (
                                    processedUsers.map((user, index) => (
                                        <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium tabular-nums border-r border-gray-100">
                                                {((users?.from || 1) + index).toString().padStart(2, "0")}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        className="h-9 w-9 rounded-xl"
                                                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1D6F42&color=fff&size=128`}
                                                        alt={user.name}
                                                    />
                                                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 border-r border-gray-100">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${roleBadge(user.role)}`}>
                                                    {roleLabel(user.role)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100">
                                                {new Date(user.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Link
                                                        href={route("users.show", user.id)}
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-[#1D6F42] hover:border-[#1D6F42]/30 transition-colors"
                                                        title="View"
                                                        aria-label={`View ${user.name}`}
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </Link>
                                                    <Link
                                                        href={route("users.edit", user.id)}
                                                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 hover:text-[#1D6F42] hover:border-[#1D6F42]/30 transition-colors"
                                                        title="Edit"
                                                        aria-label={`Edit ${user.name}`}
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </Link>
                                                    {user.id !== auth.user.id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteUser(user)}
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                                                            title="Delete"
                                                            aria-label={`Delete ${user.name}`}
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                                                <UserGroupIcon className="w-8 h-8 text-gray-400" />
                                            </div>
                                            <h3 className="text-base font-semibold text-gray-800 mb-1">No users found</h3>
                                            <p className="text-sm text-gray-500">
                                                {searchTerm ? `No match for "${searchTerm}"` : "No user data yet"}
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

                    {processedUsers.length > 0 && (
                        <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-[#1D6F42] rounded-full animate-pulse" />
                                Showing {processedUsers.length} user{processedUsers.length !== 1 ? "s" : ""}
                            </div>
                            <div>
                                {processedUsers.length !== rows.length && "Filtered results"}
                            </div>
                        </div>
                    )}

                    {users?.links && users.links.length > 3 && (
                        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-1">
                            {users.links.map((link, index) => (
                                link.url ? (
                                    <Link
                                        key={index}
                                        href={link.url}
                                        className={`min-w-9 h-9 px-3 inline-flex items-center justify-center rounded-lg text-sm font-medium border transition ${
                                            link.active ? "bg-[#1D6F42] text-white border-[#1D6F42]" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ) : (
                                    <span key={index} className="min-w-9 h-9 px-3 inline-flex items-center justify-center rounded-lg text-sm font-medium border border-gray-200 bg-gray-50 text-gray-400" dangerouslySetInnerHTML={{ __html: link.label }} />
                                )
                            ))}
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

            {deleteUser && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-96 shadow-xl">
                        <h3 className="text-lg font-semibold mb-2 text-gray-900">Delete User</h3>
                        <p className="text-sm text-gray-600 mb-6">
                            Are you sure you want to delete <b>{deleteUser.name}</b>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteUser(null)}
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
