import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Link, useForm } from "@inertiajs/react";

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        name: "",
        code: "",
    });

    const submit = (e) => {
        e.preventDefault();
        post("/customers");
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">

                <Breadcrumb items={[{ label: "Masters" }, { label: "Customers", href: "/customers" }, { label: "Create" }]} />

                {/* Card - Full Width */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

                    {/* Header */}
                    <div className="p-6 pb-4 border-b border-gray-100">
                        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
                            Add Customer
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Add a new customer to the master list.
                        </p>
                    </div>

                    {/* Form */}
                    <div className="p-6">
                        <form onSubmit={submit} className="space-y-6">

                            {/* Customer Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Customer Name <span className="text-red-500">*</span>
                                </label>

                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData("name", e.target.value)}
                                    placeholder="Enter customer name"
                                    className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                    autoFocus
                                />

                                {errors.name && (
                                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                                )}
                            </div>

                            {/* Customer Code */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Customer Code
                                </label>

                                <input
                                    type="text"
                                    value={data.code}
                                    onChange={(e) => setData("code", e.target.value)}
                                    placeholder="Enter customer code"
                                    className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-2">

                                <Link
                                    href="/customers"
                                    className="inline-flex items-center justify-center h-11 px-5 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition"
                                >
                                    Back
                                </Link>

                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center justify-center h-11 px-5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] transition disabled:opacity-50"
                                >
                                    {processing ? "Saving..." : "Save Customer"}
                                </button>

                            </div>

                        </form>
                    </div>

                </div>

            </div>
        </AdminLayout>
    );
}
