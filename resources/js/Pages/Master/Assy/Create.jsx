import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Link, useForm } from "@inertiajs/react";

export default function Create({ carlines }) {
    const { data, setData, post, processing, errors } = useForm({
        carline_id: "",
        assy_number: "",
        assy_code: "",
        level: "",
        type: "",
        umh: "",
        std_pack: "",
        is_active: true,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("assy.store"));
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">

                <Breadcrumb items={[{ label: "Masters" }, { label: "Assy", href: route("assy.index") }, { label: "Create" }]} />

                {/* Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-gray-100">
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                            Add Assy Master
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Add a new part/assy to the master list. This data is required for SPP generation.
                        </p>
                    </div>

                    {/* Form */}
                    <div className="p-6">
                        <form onSubmit={submit} className="space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* Car Line */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Car Line <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.carline_id}
                                        onChange={(e) => setData("carline_id", e.target.value)}
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42] bg-white"
                                    >
                                        <option value="">Select Car Line</option>
                                        {carlines.map((carLine) => (
                                            <option key={carLine.id} value={carLine.id}>
                                                {carLine.code} - {carLine.name}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.carline_id && (
                                        <p className="text-red-500 text-sm mt-1">{errors.carline_id}</p>
                                    )}
                                </div>

                                {/* Assy Number */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Assy Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.assy_number}
                                        onChange={(e) => setData("assy_number", e.target.value)}
                                        placeholder="e.g., 82115-0E440"
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                        autoFocus
                                    />
                                    {errors.assy_number && (
                                        <p className="text-red-500 text-sm mt-1">{errors.assy_number}</p>
                                    )}
                                </div>

                                {/* Assy Code */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Assy Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.assy_code}
                                        onChange={(e) => setData("assy_code", e.target.value)}
                                        placeholder="e.g., DSY3, DZ02"
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                    {errors.assy_code && (
                                        <p className="text-red-500 text-sm mt-1">{errors.assy_code}</p>
                                    )}
                                </div>

                                {/* Level */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Level <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.level}
                                        onChange={(e) => setData("level", e.target.value)}
                                        placeholder="e.g., J 0101, K 0001"
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                    {errors.level && (
                                        <p className="text-red-500 text-sm mt-1">{errors.level}</p>
                                    )}
                                </div>

                                {/* Type */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Type
                                    </label>
                                    <input
                                        type="text"
                                        value={data.type}
                                        onChange={(e) => setData("type", e.target.value)}
                                        placeholder="e.g., GAS, HEV"
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                    {errors.type && (
                                        <p className="text-red-500 text-sm mt-1">{errors.type}</p>
                                    )}
                                </div>

                                {/* UMH */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        UMH <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={data.umh}
                                        onChange={(e) => setData("umh", e.target.value)}
                                        placeholder="e.g., 4.96"
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                    {errors.umh && (
                                        <p className="text-red-500 text-sm mt-1">{errors.umh}</p>
                                    )}
                                </div>

                                {/* Std Pack */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Std Pack <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        value={data.std_pack}
                                        onChange={(e) => setData("std_pack", e.target.value)}
                                        placeholder="e.g., 4"
                                        className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    />
                                    {errors.std_pack && (
                                        <p className="text-red-500 text-sm mt-1">{errors.std_pack}</p>
                                    )}
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Status
                                    </label>
                                    <div className="flex items-center gap-4 h-11">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={data.is_active === true}
                                                onChange={() => setData("is_active", true)}
                                                className="w-4 h-4 text-[#1D6F42]"
                                            />
                                            <span className="text-sm">Active</span>
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={data.is_active === false}
                                                onChange={() => setData("is_active", false)}
                                                className="w-4 h-4 text-gray-400"
                                            />
                                            <span className="text-sm">Inactive</span>
                                        </label>
                                    </div>
                                </div>

                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <Link
                                    href={route("assy.index")}
                                    className="inline-flex items-center justify-center h-11 px-5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition disabled:opacity-50"
                                >
                                    {processing ? "Saving..." : "Save Assy Master"}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
