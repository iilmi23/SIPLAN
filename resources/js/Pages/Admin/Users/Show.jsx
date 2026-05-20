import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Head, Link } from "@inertiajs/react";
import { CalendarDaysIcon, EnvelopeIcon, PencilIcon, ShieldCheckIcon, UserCircleIcon } from "@heroicons/react/24/outline";

const roleBadge = (role) => ({
    admin: "bg-red-50 text-red-700 border-red-100",
    ppc: "bg-blue-50 text-blue-700 border-blue-100",
}[role] || "bg-gray-50 text-gray-700 border-gray-100");

const roleLabel = (role) => ({
    admin: "Admin",
    ppc: "PPC",
}[role] || role);

export default function Show({ user, permissionCatalog = {} }) {
    const selected = user.permissions || [];

    return (
        <AdminLayout title="User Details">
            <Head title="User Details | SIPLAN" />
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <Breadcrumb items={[{ label: "System" }, { label: "Users", href: route("users.index") }, { label: "Details" }]} />

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-5xl">
                    <div className="p-6 pb-4 border-b border-gray-100">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <img
                                    className="h-14 w-14 rounded-2xl"
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1D6F42&color=fff&size=128`}
                                    alt={user.name}
                                />
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{user.name}</h1>
                                    <p className="text-sm text-gray-500 mt-1">User account details and access summary.</p>
                                </div>
                            </div>
                            <Link
                                href={route("users.edit", user.id)}
                                className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition-all shadow-sm active:scale-[0.98]"
                            >
                                <PencilIcon className="w-5 h-5" />
                                Edit User
                            </Link>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
                                    <UserCircleIcon className="w-5 h-5 text-[#1D6F42]" />
                                    Full Name
                                </div>
                                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
                                    <EnvelopeIcon className="w-5 h-5 text-[#1D6F42]" />
                                    Email
                                </div>
                                <p className="text-sm font-semibold text-gray-900 break-all">{user.email}</p>
                            </div>
                            <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
                                    <ShieldCheckIcon className="w-5 h-5 text-[#1D6F42]" />
                                    Role
                                </div>
                                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border ${roleBadge(user.role)}`}>
                                    {roleLabel(user.role)}
                                </span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-sm font-semibold text-gray-900">Permissions</h2>
                                    <p className="text-xs text-gray-500 mt-1">{selected.length} sidebar permissions enabled.</p>
                                </div>
                            </div>
                            <div className="p-5 space-y-5">
                                {Object.entries(permissionCatalog).map(([group, permissions]) => (
                                    <div key={group}>
                                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{group}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {permissions.map((permission) => {
                                                const active = selected.includes(permission.key);
                                                return (
                                                    <span
                                                        key={permission.key}
                                                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                                                            active
                                                                ? "bg-[#1D6F42]/10 text-[#1D6F42] border-[#1D6F42]/20"
                                                                : "bg-gray-50 text-gray-400 border-gray-200"
                                                        }`}
                                                    >
                                                        {permission.label}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
                                <CalendarDaysIcon className="w-5 h-5 text-[#1D6F42]" />
                                Account Created
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                                {new Date(user.created_at).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
