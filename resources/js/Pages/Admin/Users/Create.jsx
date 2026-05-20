import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Head, Link, useForm } from "@inertiajs/react";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon, UserPlusIcon } from "@heroicons/react/24/outline";

const roles = [
    { value: "ppc", label: "PPC" },
    { value: "admin", label: "Admin" },
];

function PermissionPanel({ catalog, selected, onToggle, errors }) {
    const groups = Object.entries(catalog || {});

    return (
        <div>
            <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                    <label className="block text-sm font-semibold text-gray-700">Permissions</label>
                    <p className="text-xs text-gray-500 mt-1">Controls which sidebar menus this user can access.</p>
                </div>
                <span className="text-xs font-semibold text-gray-500">{selected.length} selected</span>
            </div>
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                {groups.map(([group, permissions]) => (
                    <div key={group}>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{group}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {permissions.map((permission) => (
                                <label key={permission.key} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:border-[#1D6F42]/40">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(permission.key)}
                                        onChange={() => onToggle(permission.key)}
                                        className="rounded border-gray-300 text-[#1D6F42] focus:ring-[#1D6F42]"
                                    />
                                    <span>{permission.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {errors.permissions && <p className="mt-1 text-sm text-red-600">{errors.permissions}</p>}
        </div>
    );
}

export default function Create({ permissionCatalog = {}, roleDefaults = {} }) {
    const { data, setData, post, processing, errors } = useForm({
        name: "",
        email: "",
        role: "ppc",
        permissions: roleDefaults.ppc || [],
        password: "",
        password_confirmation: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit = (event) => {
        event.preventDefault();
        post(route("users.store"));
    };

    const togglePermission = (permission) => {
        const selected = data.permissions || [];
        setData("permissions", selected.includes(permission)
            ? selected.filter((item) => item !== permission)
            : [...selected, permission]
        );
    };

    return (
        <AdminLayout title="Create User">
            <Head title="Create User | SIPLAN" />
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <Breadcrumb items={[{ label: "System" }, { label: "Users", href: route("users.index") }, { label: "Create" }]} />

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden max-w-4xl">
                    <div className="p-6 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#1D6F42]/10 text-[#1D6F42] flex items-center justify-center">
                                <UserPlusIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Add New User</h1>
                                <p className="text-sm text-gray-500 mt-1">Create an account and assign sidebar access.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <form onSubmit={submit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(event) => setData("name", event.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                        placeholder="Enter full name"
                                        required
                                    />
                                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(event) => setData("email", event.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                        placeholder="name@example.com"
                                        required
                                    />
                                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
                                <select
                                    value={data.role}
                                    onChange={(event) => {
                                        const nextRole = event.target.value;
                                        setData({ ...data, role: nextRole, permissions: roleDefaults[nextRole] || [] });
                                    }}
                                    className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    required
                                >
                                    {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                                </select>
                                {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
                            </div>

                            <PermissionPanel
                                catalog={permissionCatalog}
                                selected={data.permissions || []}
                                onToggle={togglePermission}
                                errors={errors}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={data.password}
                                            onChange={(event) => setData("password", event.target.value)}
                                            className="w-full h-11 px-4 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                            placeholder="Enter password"
                                            required
                                        />
                                        <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600">
                                            {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={data.password_confirmation}
                                            onChange={(event) => setData("password_confirmation", event.target.value)}
                                            className="w-full h-11 px-4 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                            placeholder="Confirm password"
                                            required
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600">
                                            {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    {errors.password_confirmation && <p className="text-red-500 text-sm mt-1">{errors.password_confirmation}</p>}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <Link href={route("users.index")} className="inline-flex items-center justify-center h-11 px-5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition">
                                    Cancel
                                </Link>
                                <button type="submit" disabled={processing} className="inline-flex items-center justify-center h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition disabled:opacity-50">
                                    {processing ? "Saving..." : "Save User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
