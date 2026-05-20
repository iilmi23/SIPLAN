import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { useMemo, useState } from "react";

export default function SPPShow({ customers, srBatches = [], filters, period, records, summary }) {
    const [customer, setCustomer] = useState(filters.customer || "");
    const [srBatch, setSrBatch] = useState(filters.sr_batch || "");

    const selectedSr = useMemo(() => {
        return srBatches.find((batch) => String(batch.id) === String(srBatch)) || summary.selected_sr || null;
    }, [srBatches, srBatch, summary.selected_sr]);

    const handleFilter = () => {
        router.get(`/spp/${period}`, buildQuery({ customer, sr_batch: srBatch }), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleReset = () => {
        setCustomer("");
        setSrBatch("");
        router.get(`/spp/${period}`, {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout title="SPP Details">
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-6 pb-3">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">SPP Details</h1>
                            <p className="text-sm text-gray-500">Period: {summary.period}</p>
                            <p className="text-sm text-gray-500">
                                SR: {selectedSr ? `${selectedSr.source_file || "-"}${selectedSr.sheet_name ? ` / ${selectedSr.sheet_name}` : ""}` : "Semua upload"}
                            </p>
                        </div>
                    </div>

                    <div className="px-6 pb-6 border-b border-gray-100">
                        <div className="grid gap-4 lg:grid-cols-[1.2fr_1.5fr_1fr] items-end">
                            <div>
                                <label htmlFor="customer" className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                                <select
                                    id="customer"
                                    name="customer"
                                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-900 focus:border-[#1D6F42] focus:ring-[#1D6F42]/20"
                                    value={customer}
                                    onChange={(e) => {
                                        setCustomer(e.target.value);
                                        setSrBatch("");
                                    }}
                                >
                                    <option value="">All Customer</option>
                                    {customers.map((customerItem) => (
                                        <option key={customerItem.code} value={customerItem.code}>
                                            {customerItem.code}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label htmlFor="sr_batch" className="block text-sm font-medium text-gray-700 mb-1">SR Upload</label>
                                <select
                                    id="sr_batch"
                                    name="sr_batch"
                                    className="w-full border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-900 focus:border-[#1D6F42] focus:ring-[#1D6F42]/20"
                                    value={srBatch}
                                    onChange={(e) => setSrBatch(e.target.value)}
                                >
                                    <option value="">Semua SR Upload</option>
                                    {srBatches.map((batch) => (
                                        <option key={batch.id} value={batch.id}>
                                            {batch.label}{batch.uploaded_at ? ` (${batch.uploaded_at})` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-end gap-2">
                                <button
                                    onClick={handleFilter}
                                    className="inline-flex justify-center items-center rounded-lg bg-[#1D6F42] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                                >
                                    Filter
                                </button>
                                <button
                                    onClick={handleReset}
                                    className="inline-flex justify-center items-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-gray-200 bg-green-50 p-4">
                                <p className="text-sm font-medium text-green-900">Records</p>
                                <p className="mt-2 text-3xl font-semibold text-green-950">{summary.total_records}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-green-50 p-4">
                                <p className="text-sm font-medium text-green-900">Total Quantity</p>
                                <p className="mt-2 text-3xl font-semibold text-green-950">{summary.total_qty}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-green-50 p-4">
                                <p className="text-sm font-medium text-green-900">Unique Assy Numbers</p>
                                <p className="mt-2 text-3xl font-semibold text-green-950">{summary.unique_assy_numbers}</p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">No</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Assy Number</th>
                                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">{summary.source === "spp" ? "Period" : "ETA"}</th>
                                        <th className="p-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-6 text-center text-sm text-gray-500">No records found for this period.</td>
                                        </tr>
                                    ) : (
                                        records.map((record, index) => (
                                            <tr key={record.id ?? index} className="border-t border-gray-100">
                                                <td className="p-3 text-gray-600">{index + 1}</td>
                                                <td className="p-3 text-gray-900">{record.customer}</td>
                                                <td className="p-3 text-gray-900">{record.assy_number}</td>
                                                <td className="p-3 text-right text-gray-900">{summary.source === "spp" ? record.period : record.eta}</td>
                                                <td className="p-3 text-right text-gray-900">{record.total_qty ?? record.qty}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

function buildQuery(filters) {
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    );
}
