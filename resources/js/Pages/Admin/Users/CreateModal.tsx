import { useForm } from "@inertiajs/react";
import { type FormEvent, useState, useEffect } from "react";
import {
    ArrowPathIcon,
    EyeIcon,
    EyeSlashIcon,
    UserPlusIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

type Permission = {
    key: string;
    label: string;
};

type PermissionCatalog = Record<string, Permission[]>;
type RoleDefaults = Record<string, string[]>;

type UserForm = {
    name: string;
    email: string;
    role: string;
    permissions: string[];
    password: string;
    password_confirmation: string;
};

type PermissionPanelProps = {
    catalog: PermissionCatalog;
    selected: string[];
    onToggle: (permission: string) => void;
    onReset: () => void;
    errors: Partial<Record<keyof UserForm, string>>;
};

const roles = [
    { value: "ppc", label: "PPC" },
    { value: "admin", label: "Admin" },
];

function PermissionPanel({ catalog, selected, onToggle, onReset, errors }: PermissionPanelProps) {
    const groups = Object.entries(catalog || {});

    return (
        <div>
            <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                    <label className="block text-sm font-semibold text-gray-755">Permissions</label>
                    <p className="text-[11px] text-gray-400 mt-0.5">Controls which sidebar menus this user can access.</p>
                </div>
                <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D6F42] hover:text-[#185c38]">
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    Reset
                </button>
            </div>
            <div className="space-y-3.5 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 max-h-[220px] overflow-y-auto">
                {groups.map(([group, permissions]) => (
                    <div key={group} className="border-b border-gray-150 pb-2.5 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-550">{group}</p>
                            <span className="text-[10px] font-semibold text-gray-400">
                                {permissions.filter((permission) => selected.includes(permission.key)).length}/{permissions.length}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {permissions.map((permission) => (
                                <label key={permission.key} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-750 hover:border-[#1D6F42]/40 transition-all cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selected.includes(permission.key)}
                                        onChange={() => onToggle(permission.key)}
                                        className="rounded border-gray-300 text-[#1D6F42] focus:ring-[#1D6F42] w-3.5 h-3.5"
                                    />
                                    <span className="truncate">{permission.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            {errors.permissions && <p className="mt-1 text-xs text-red-600">{errors.permissions}</p>}
        </div>
    );
}

export default function CreateModal({
    permissionCatalog = {},
    roleDefaults = {},
    onClose,
}: {
    permissionCatalog?: PermissionCatalog;
    roleDefaults?: RoleDefaults;
    onClose: () => void;
}) {
    const { data, setData, post, processing, errors, reset } = useForm<UserForm>({
        name: "",
        email: "",
        role: "ppc",
        permissions: roleDefaults.ppc || [],
        password: "",
        password_confirmation: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(route("users.store"), {
            onSuccess: () => {
                onClose();
                reset();
            },
            preserveScroll: true,
        });
    };

    const togglePermission = (permission: string) => {
        const selected = data.permissions || [];
        setData("permissions", selected.includes(permission)
            ? selected.filter((item) => item !== permission)
            : [...selected, permission]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-[1px]">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slideDown">
                
                {/* Header */}
                <div className="p-5 pb-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#1D6F42]/10 text-[#1D6F42] flex items-center justify-center shrink-0">
                            <UserPlusIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 leading-none">Add New User</h2>
                            <p className="text-xs text-gray-500 mt-1">Create an account and assign sidebar access.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={submit} className="flex-1 min-h-0 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-550 mb-1">Full Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(event) => setData("name", event.target.value)}
                                    className="w-full h-10 px-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                    placeholder="Enter full name"
                                    required
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-550 mb-1">Email Address <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(event) => setData("email", event.target.value)}
                                    className="w-full h-10 px-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                    placeholder="name@example.com"
                                    required
                                />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-550 mb-1">Role <span className="text-red-500">*</span></label>
                            <select
                                value={data.role}
                                onChange={(event) => {
                                    const nextRole = event.target.value;
                                    setData({ ...data, role: nextRole, permissions: roleDefaults[nextRole] || [] });
                                }}
                                className="w-full h-10 px-3.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all bg-white"
                                required
                            >
                                {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                            </select>
                            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                        </div>

                        <PermissionPanel
                            catalog={permissionCatalog}
                            selected={data.permissions || []}
                            onToggle={togglePermission}
                            onReset={() => setData("permissions", roleDefaults[data.role] || [])}
                            errors={errors}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-3.5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-550 mb-1">Password <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={data.password}
                                        onChange={(event) => setData("password", event.target.value)}
                                        className="w-full h-10 px-3.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                        placeholder="Enter password"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 px-3.5 flex items-center text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-550 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={data.password_confirmation}
                                        onChange={(event) => setData("password_confirmation", event.target.value)}
                                        className="w-full h-10 px-3.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] transition-all"
                                        placeholder="Confirm password"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute inset-y-0 right-0 px-3.5 flex items-center text-gray-400 hover:text-gray-600">
                                        {showConfirmPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                                    </button>
                                </div>
                                {errors.password_confirmation && <p className="text-red-500 text-xs mt-1">{errors.password_confirmation}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-5 py-3.5 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="inline-flex items-center justify-center h-10 px-4 text-xs font-semibold rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center justify-center h-10 px-4 bg-[#1D6F42] text-white text-xs font-semibold rounded-xl hover:bg-[#185c38] transition disabled:opacity-50"
                        >
                            {processing ? "Saving..." : "Save User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
