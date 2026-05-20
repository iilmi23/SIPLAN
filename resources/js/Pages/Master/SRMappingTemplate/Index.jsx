import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Link, router } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import {
    CheckCircleIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

export default function Index({ templates = [], flash }) {
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        if (flash?.success) {
            setShowAlert(true);
            const timer = setTimeout(() => setShowAlert(false), 3500);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const activeCount = useMemo(
        () => templates.filter((template) => template.is_active).length,
        [templates]
    );

    const handleDelete = (template) => {
        if (confirm(`Delete template "${template.name}"?`)) {
            router.delete(route("sr-mapping-templates.destroy", template.id));
        }
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 px-5 py-6 md:px-8">
                <Breadcrumb items={[{ label: "Masters" }, { label: "SR Templates" }]} />

                {showAlert && (
                    <div className="mb-5 flex items-center gap-3 rounded-xl border border-green-100 bg-white p-4 shadow-sm">
                        <CheckCircleIcon className="h-5 w-5 text-[#1D6F42]" />
                        <p className="flex-1 text-sm font-medium text-gray-800">{flash.success}</p>
                        <button onClick={() => setShowAlert(false)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                            <XMarkIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900">SR Mapping Templates</h1>
                            <p className="mt-1 text-sm text-gray-500">
                                Template ini dipakai untuk customer baru yang belum punya mapper khusus.
                            </p>
                        </div>
                        <Link
                            href={route("sr-mapping-templates.create")}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1D6F42] px-5 text-sm font-medium text-white hover:bg-[#185c38]"
                        >
                            <PlusIcon className="h-5 w-5" />
                            Add Template
                        </Link>
                    </div>

                    <div className="grid gap-3 border-b border-gray-100 px-6 py-4 text-sm text-gray-600 sm:grid-cols-3">
                        <div>Total templates: <span className="font-semibold text-gray-900">{templates.length}</span></div>
                        <div>Active templates: <span className="font-semibold text-gray-900">{activeCount}</span></div>
                        <div>Mode: <span className="font-semibold text-gray-900">Vertical / Horizontal</span></div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead className="bg-gray-100/80">
                                <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-700">
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Template</th>
                                    <th className="px-6 py-4">Mode</th>
                                    <th className="px-6 py-4">Rows</th>
                                    <th className="px-6 py-4">Columns</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {templates.length > 0 ? templates.map((template) => (
                                    <tr key={template.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                            {template.customer?.code} - {template.customer?.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{template.name}</td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-medium uppercase text-gray-700">
                                                {template.orientation}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            Header {template.header_row || "-"}, Data {template.data_start_row}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            Assy {template.assy_number_column}, Qty {template.qty_column || `${template.qty_start_column}-${template.qty_end_column}`}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${template.is_active ? "bg-green-50 text-[#1D6F42]" : "bg-gray-100 text-gray-500"}`}>
                                                {template.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={route("sr-mapping-templates.edit", template.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(template)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-16 text-center text-sm text-gray-500">
                                            Belum ada template. Tambahkan template untuk customer baru sebelum upload SR.
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
