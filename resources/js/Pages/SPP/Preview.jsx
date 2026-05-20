import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowDownTrayIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    TableCellsIcon,
} from "@heroicons/react/24/outline";

export default function SPPPreview({ sr, summary = {}, months = [], rows = [] }) {
    const isCombined = sr?.is_combined === true;
    const sourceBatchIds = sr?.source_batch_ids || [];
    const storageKey = `spp-draft-${isCombined ? sr.upload_batch : sr.id}`;
    const [editableRows, setEditableRows] = useState(rows);
    const [saved, setSaved] = useState(false);
    const [isSavingFixed, setIsSavingFixed] = useState(false);
    const [notice, setNotice] = useState("");

    useEffect(() => {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setEditableRows(parsed);
        } catch {
            window.localStorage.removeItem(storageKey);
        }
    }, [storageKey]);

    const totals = useMemo(() => {
        return Object.fromEntries(
            months.map((month) => {
                const total = editableRows.reduce((sum, row) => sum + toNumber(row.months?.[month.period]?.del), 0);
                return [month.period, { bal: 0, del: total, prod: total }];
            })
        );
    }, [editableRows, months]);

    const grandTotal = useMemo(
        () => Object.values(totals).reduce((sum, item) => sum + toNumber(item.del), 0),
        [totals]
    );

    const updateMeta = (rowIndex, field, value) => {
        setEditableRows((current) => current.map((row, index) => (
            index === rowIndex ? { ...row, [field]: value } : row
        )));
        setSaved(false);
    };

    const updateQty = (rowIndex, period, field, value) => {
        setEditableRows((current) => current.map((row, index) => {
            if (index !== rowIndex) return row;

            const nextMonths = {
                ...row.months,
                [period]: {
                    ...(row.months?.[period] || {}),
                    [field]: toNumber(value),
                },
            };

            if (field === "del") {
                nextMonths[period].prod = toNumber(value);
            }

            return {
                ...row,
                months: nextMonths,
                total_qty: Object.values(nextMonths).reduce((sum, cell) => sum + toNumber(cell.del), 0),
            };
        }));
        setSaved(false);
    };

    const saveDraft = () => {
        window.localStorage.setItem(storageKey, JSON.stringify(editableRows));
        setSaved(true);
        setNotice("");
    };

    const saveFixed = () => {
        setIsSavingFixed(true);
        setNotice("");

        router.post(isCombined ? route("spp.storeCombined") : route("spp.store", sr.id), {
            months,
            rows: editableRows,
            source_batch_ids: sourceBatchIds,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                window.localStorage.removeItem(storageKey);
                setSaved(false);
                setNotice("SPP fixed berhasil disimpan ke database.");
            },
            onError: () => {
                setNotice("SPP fixed gagal disimpan. Cek data lalu coba lagi.");
            },
            onFinish: () => setIsSavingFixed(false),
        });
    };

    const resetDraft = () => {
        window.localStorage.removeItem(storageKey);
        setEditableRows(rows);
        setSaved(false);
    };

    const exportCsv = () => {
        const header = [
            "TYPE",
            "HARNESS No.",
            "LEVEL",
            "ASSY CODE",
            "Carline",
            "STD PACK",
            ...months.flatMap((month) => [`${month.label} BAL`, `${month.label} DEL`, `${month.label} PROD`]),
            "TOTAL",
        ];

        const csvRows = editableRows.map((row) => [
            row.type,
            row.assy_number,
            row.level,
            row.assy_code,
            row.carline,
            row.std_pack,
            ...months.flatMap((month) => {
                const cell = row.months?.[month.period] || {};
                return [cell.bal || 0, cell.del || 0, cell.prod || 0];
            }),
            row.total_qty || 0,
        ]);

        const csv = [header, ...csvRows].map((line) => line.map(csvCell).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `SPP_${safeName(sr.source_file || sr.id)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <AdminLayout title="SPP Preview">
            <div className="min-h-screen bg-[#e9eef0] px-4 pb-8 pt-2 font-sans md:px-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => router.get(route("spp"))}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Back to SPP List
                    </button>

                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={resetDraft} className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                            <ArrowPathIcon className="h-4 w-4" />
                            Reset
                        </button>
                        <button type="button" onClick={saveDraft} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#1D6F42] px-4 text-sm font-semibold text-white hover:bg-[#185c38]">
                            <CheckCircleIcon className="h-4 w-4" />
                            Save Draft
                        </button>
                        <button type="button" onClick={saveFixed} disabled={isSavingFixed || editableRows.length === 0} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f3320] px-4 text-sm font-semibold text-white hover:bg-[#174b2e] disabled:cursor-not-allowed disabled:opacity-50">
                            <CheckCircleIcon className="h-4 w-4" />
                            {isSavingFixed ? "Saving..." : "Save Fixed"}
                        </button>
                        <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#1D6F42]/30 bg-white px-4 text-sm font-semibold text-[#1D6F42] hover:bg-green-50">
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Export Fixed
                        </button>
                    </div>
                </div>

                {saved && (
                    <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                        Draft adjustment tersimpan di browser untuk upload ini.
                    </div>
                )}

                {notice && (
                    <div className="mb-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
                        {notice}
                    </div>
                )}

                <div className="border border-slate-400 bg-white shadow-sm">
                    <div className="grid grid-cols-[220px_1fr_240px] border-b border-slate-400 bg-white text-[11px] text-slate-900">
                        <div className="border-r border-slate-400 p-2">
                            <div className="font-semibold">TOTAL 6 BULAN</div>
                            <div className="mt-1 text-base font-bold">{formatNumber(grandTotal)}</div>
                            <div className="mt-1 text-slate-500">Raw qty: {formatNumber(summary.total_qty)}</div>
                        </div>
                        <div className="p-3 text-center">
                            <h1 className="text-xl font-bold tracking-wide">SIX MONTH PRODUCTION PLAN ( QTY )</h1>
                            <div className="mt-1 text-sm font-semibold">{sr.customer || "ALL CUSTOMER"}</div>
                            <div className="mt-1">Periode : {summary.period_range}</div>
                            <div className="mt-1 text-xs font-semibold text-[#0f5132]">
                            {isCombined ? "Combined SR" : "SR"}: {sr.source_file || "-"}{sr.sheet_name ? ` / ${sr.sheet_name}` : ""}
                        </div>
                        {isCombined && Array.isArray(sr.source_batches) && sr.source_batches.length > 0 && (
                            <div className="mt-2 text-[11px] text-slate-600">
                                {sr.source_batches.length} uploads combined: {sr.source_batches.map((batch) => batch.source_file).join(" | ")}
                            </div>
                        )}
                        </div>
                        <div className="border-l border-slate-400 p-2 text-right">
                            <div>Print Date :</div>
                            <div className="font-semibold">{new Date().toLocaleDateString()}</div>
                            <div className="mt-2 text-slate-500">Records: {formatNumber(summary.total_records)}</div>
                            <div className="text-slate-500">Assy Numbers: {formatNumber(summary.unique_assy_numbers)}</div>
                        </div>
                    </div>

                    <div className="overflow-auto bg-white" style={{ maxHeight: "calc(100vh - 220px)" }}>
                        <table className="border-collapse text-[11px]" style={{ minWidth: `${620 + months.length * 156}px` }}>
                            <thead>
                                <tr>
                                    <ExcelTh rowSpan={3} sticky left={0} width={82}>TYPE</ExcelTh>
                                    <ExcelTh rowSpan={3} sticky left={82} width={170}>HARNESS No.</ExcelTh>
                                    <ExcelTh rowSpan={3} sticky left={252} width={84}>LEVEL</ExcelTh>
                                    <ExcelTh rowSpan={3} sticky left={336} width={86}>ASSY CODE</ExcelTh>
                                    <ExcelTh rowSpan={3} sticky left={422} width={58}>Carline</ExcelTh>
                                    <ExcelTh rowSpan={3} sticky left={480} width={70}>Std pack</ExcelTh>
                                    {months.map((month) => (
                                        <th key={`month-${month.period}`} colSpan={3} className={`sticky top-0 z-20 border border-slate-600 px-2 py-1.5 text-center font-bold text-slate-950 ${month.bucket === "firm" ? "bg-[#fff200]" : "bg-[#f4b183]"}`}>
                                            {month.label}
                                        </th>
                                    ))}
                                    <ExcelTh rowSpan={3} width={76}>TOTAL</ExcelTh>
                                </tr>
                                <tr>
                                    {months.map((month) => (
                                        <th key={`range-${month.period}`} colSpan={3} className="sticky top-[25px] z-20 border border-slate-600 bg-[#d9ead3] px-2 py-1 text-center font-semibold">
                                            {month.range_label || `${month.bucket === "firm" ? "ORDER" : "ESTIMATE"} ${month.year}`}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {months.flatMap((month) => ["BAL", "DEL", "PROD"].map((label) => (
                                        <th key={`${month.period}-${label}`} className="sticky top-[47px] z-20 border border-slate-600 bg-[#1f4e3d] px-2 py-1 text-center font-bold text-white" style={{ minWidth: 52 }}>
                                            {label}
                                        </th>
                                    )))}
                                </tr>
                            </thead>
                            <tbody>
                                {editableRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7 + months.length * 3} className="border border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                                            Tidak ada data SPP untuk upload ini.
                                        </td>
                                    </tr>
                                ) : editableRows.map((row, index) => (
                                    <tr key={`${row.assy_number}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-[#eef7f1]"}>
                                        <EditableSticky value={row.type || row.carline || ""} left={0} width={82} onChange={(value) => updateMeta(index, "type", value)} />
                                        <StickyTd left={82} width={170} className="font-bold text-[#0f5132]">{row.assy_number}</StickyTd>
                                        <EditableSticky value={row.level || ""} left={252} width={84} onChange={(value) => updateMeta(index, "level", value)} />
                                        <EditableSticky value={row.assy_code || ""} left={336} width={86} onChange={(value) => updateMeta(index, "assy_code", value)} />
                                        <EditableSticky value={row.cct || ""} left={422} width={58} onChange={(value) => updateMeta(index, "carline", value)} />
                                        <EditableSticky value={row.std_pack || ""} left={480} width={70} align="right" onChange={(value) => updateMeta(index, "std_pack", value)} />
                                        {months.flatMap((month) => {
                                            const cell = row.months?.[month.period] || {};
                                            return [
                                                <QtyInput key={`${row.assy_number}-${month.period}-bal`} value={cell.bal} onChange={(value) => updateQty(index, month.period, "bal", value)} muted />,
                                                <QtyInput key={`${row.assy_number}-${month.period}-del`} value={cell.del} onChange={(value) => updateQty(index, month.period, "del", value)} strong />,
                                                <QtyInput key={`${row.assy_number}-${month.period}-prod`} value={cell.prod} onChange={(value) => updateQty(index, month.period, "prod", value)} />,
                                            ];
                                        })}
                                        <td className="border border-slate-300 bg-[#ddebf7] px-2 py-1 text-right font-bold text-slate-950">
                                            {formatNumber(row.total_qty)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={6} className="sticky bottom-0 left-0 z-30 border border-slate-700 bg-[#0f3320] px-3 py-2 text-right font-bold text-white">
                                        TOTAL
                                    </td>
                                    {months.flatMap((month) => {
                                        const total = totals[month.period] || {};
                                        return [
                                            <TotalTd key={`${month.period}-total-bal`} value={total.bal} />,
                                            <TotalTd key={`${month.period}-total-del`} value={total.del} />,
                                            <TotalTd key={`${month.period}-total-prod`} value={total.prod} />,
                                        ];
                                    })}
                                    <td className="sticky bottom-0 z-20 border border-slate-700 bg-[#0f3320] px-2 py-2 text-right font-bold text-white">
                                        {formatNumber(grandTotal)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="flex items-center gap-2 border-t border-slate-300 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                        <TableCellsIcon className="h-4 w-4" />
                        Klik cell putih untuk adjustment. Kolom DEL otomatis menyamakan PROD agar total fixed tetap terbaca.
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

function ExcelTh({ children, rowSpan, sticky = false, left = 0, width = 80 }) {
    return (
        <th rowSpan={rowSpan} className={`border border-slate-600 bg-[#1f4e3d] px-2 py-1 text-center font-bold text-white ${sticky ? "sticky z-30" : "sticky top-0 z-20"}`} style={{ left: sticky ? left : undefined, top: 0, minWidth: width, width }}>
            {children}
        </th>
    );
}

function StickyTd({ children, left, width, align = "left", className = "" }) {
    return (
        <td className={`sticky z-10 border border-slate-300 bg-inherit px-2 py-1 text-${align} ${className}`} style={{ left, minWidth: width, width }}>
            {children || "-"}
        </td>
    );
}

function EditableSticky({ value, onChange, left, width, align = "left" }) {
    return (
        <td className="sticky z-10 border border-slate-300 bg-inherit p-0" style={{ left, minWidth: width, width }}>
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className={`h-7 w-full bg-transparent px-2 text-${align} text-[11px] outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-[#1D6F42]`}
            />
        </td>
    );
}

function QtyInput({ value, onChange, strong = false, muted = false }) {
    return (
        <td className="border border-slate-300 p-0">
            <input
                type="number"
                value={toNumber(value) || ""}
                onChange={(event) => onChange(event.target.value)}
                className={`h-7 w-[52px] bg-transparent px-1 text-right text-[11px] outline-none focus:bg-yellow-50 focus:ring-1 focus:ring-[#1D6F42] ${strong ? "font-bold text-slate-950" : "text-slate-800"} ${muted ? "text-slate-400" : ""}`}
            />
        </td>
    );
}

function TotalTd({ value }) {
    return (
        <td className="sticky bottom-0 z-20 border border-slate-700 bg-[#0f3320] px-2 py-2 text-right font-bold text-white">
            {formatNumber(value)}
        </td>
    );
}

function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
    const number = toNumber(value);
    if (!number) return "";
    return number.toLocaleString("en-US");
}

function csvCell(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function safeName(value) {
    return String(value).replace(/[^a-z0-9_-]+/gi, "_").replace(/^_+|_+$/g, "");
}
