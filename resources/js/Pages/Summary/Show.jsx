import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { useState, useMemo } from "react";
import {
    ArrowDownTrayIcon,
    ChevronRightIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    CalendarIcon,
    TableCellsIcon,
    ListBulletIcon,
} from "@heroicons/react/24/outline";

// ─── Helper ───────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
    if (!d) return "-";
    const p = new Date(d);
    if (isNaN(p.getTime())) return "-";
    return `${p.getMonth() + 1}/${p.getDate()}`;
};

const normalizeWeek = (week) => {
    if (week === null || typeof week === "undefined" || week === "") return "";
    if (week === "TOT") return "TOT";
    const match = String(week).match(/\d+/);
    return match ? Number(match[0]) : week;
};

const periodKey = (etd, eta, week) => `${etd || ""}|${eta || ""}|${normalizeWeek(week)}`;
const ynaPeriodKey = (etd) => `${etd || ""}`;
const hasFallbackEta = (item) => item?.extra?.eta_fallback === true;

const parseDateOnly = (value) => {
    if (!value) return null;
    const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
};

const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

const addMonthsNoOverflow = (date, months) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months, 1);
    return next;
};

const daysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

const startOfMondayWeek = (date) => {
    const day = date.getDay() || 7;
    return addDays(date, 1 - day);
};

const diffDays = (start, end) => Math.round((end - start) / 86400000);

const calculateYNAWeek = (etd) => {
    const date = parseDateOnly(etd);
    if (!date) return "";

    const weekMonday = startOfMondayWeek(date);
    const remainingDaysInMonth = daysInMonth(weekMonday) - weekMonday.getDate() + 1;
    const weekMonthDate = remainingDaysInMonth <= 1 ? addMonthsNoOverflow(weekMonday, 1) : new Date(weekMonday);
    const targetYear = weekMonthDate.getFullYear();
    const targetMonth = weekMonthDate.getMonth();

    const firstOfMonth = new Date(targetYear, targetMonth, 1);
    let firstMonday = startOfMondayWeek(firstOfMonth);

    if (firstMonday.getMonth() !== targetMonth) {
        const prevMonthRemaining = daysInMonth(firstMonday) - firstMonday.getDate() + 1;
        if (prevMonthRemaining > 1) {
            firstMonday = addDays(firstMonday, 7);
        }
    }

    const weekNumber = Math.floor(diffDays(firstMonday, weekMonday) / 7) + 1;
    return Math.min(weekNumber, 5);
};

const displayWeek = (item, isYNAFormat) => isYNAFormat ? calculateYNAWeek(item.etd) : normalizeWeek(item.week);
const monthKeyFromDate = (value) => value ? String(value).slice(0, 7) : "unknown";
const ynaMonthKey = (item) => monthKeyFromDate(item.etd || item.eta || item.month);
const ynaPeriodValue = (qty, period, periods) => {
    if (period.isPad) return 0;
    if (!period.isTotal) return qty[period.key] || 0;

    return periods
        .filter((item) => item.month === period.month && !item.isPad && !item.isTotal)
        .reduce((sum, item) => sum + (qty[item.key] || 0), 0);
};

// ─── Excel-Like Pivot Preview ─────────────────────────────────────────────────
function PivotPreview({ data, customer }) {
    // Determine format based on customer
    const isYNAFormat = customer?.toUpperCase() === 'YNA';
    const periodsPerMonth = customer?.toUpperCase() === 'SAI' ? 15 : 5;
    // Build sorted unique periods. YNA follows SR columns, so ETD is the key.
    const periods = useMemo(() => {
        const byMonth = {};
        data.forEach((item) => {
            const month = ynaMonthKey(item);
            const key = ynaPeriodKey(item.etd);
            byMonth[month] = byMonth[month] || {};
            if (!byMonth[month][key]) {
                byMonth[month][key] = {
                    key,
                    month,
                    etd: item.etd,
                    eta: isYNAFormat && hasFallbackEta(item) ? "" : item.eta,
                    week: displayWeek(item, isYNAFormat),
                    etdFmt: fmtDate(item.etd),
                    etaFmt: isYNAFormat && hasFallbackEta(item) ? "" : fmtDate(item.eta),
                };
            } else if (!byMonth[month][key].eta && item.eta && !hasFallbackEta(item)) {
                byMonth[month][key].eta = item.eta;
                byMonth[month][key].etaFmt = fmtDate(item.eta);
            }
        });

        return Object.keys(byMonth).sort().flatMap((month) => {
            const actualPeriods = Object.values(byMonth[month]).sort((a, b) => (a.etd || "").localeCompare(b.etd || ""));
            const paddedPeriods = [...actualPeriods];

            while (paddedPeriods.length < 5) {
                paddedPeriods.push({
                    key: `pad|${month}|${paddedPeriods.length + 1}`,
                    month,
                    etd: "",
                    eta: "",
                    week: paddedPeriods.length + 1,
                    etdFmt: "",
                    etaFmt: "",
                    isPad: true,
                });
            }

            paddedPeriods.push({
                key: `tot|${month}`,
                month,
                etd: "",
                eta: "",
                week: "TOT",
                etdFmt: "TOT",
                etaFmt: "",
                isTotal: true,
            });

            return paddedPeriods;
        });
    }, [data, isYNAFormat]);

    // Group by assy_number → { assyNumber: { "etd|eta": qty } }
    const grouped = useMemo(() => {
        const g = {};
        data.forEach((item) => {
            const pn = item.assy_number || "-";
            if (!g[pn]) g[pn] = { meta: item, qty: {} };
            const key = isYNAFormat ? ynaPeriodKey(item.etd) : periodKey(item.etd, item.eta, item.week);
            g[pn].qty[key] = (g[pn].qty[key] || 0) + Number(item.qty || 0);
        });
        // Sort by assy_number
        return Object.entries(g).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
    }, [data, isYNAFormat]);

    // Column totals
    const colTotals = useMemo(() => { 
        const totals = {};
        periods.forEach((p) => {
            totals[p.key] = grouped.reduce((sum, [, v]) => sum + ynaPeriodValue(v.qty, p, periods), 0);
        });
        return totals;
    }, [periods, grouped]);

    const grandTotal = Object.values(colTotals).reduce((s, v) => s + v, 0);

    if (grouped.length === 0) {
        return <div className="p-8 text-center text-gray-400 text-sm">No data</div>;
    }

    // YNA format: Simple pivot table
    if (isYNAFormat) {
        return (
            <div className="relative overflow-auto rounded-xl border border-[#b7d9c4]" style={{ maxHeight: "640px" }}>
                <table className="border-separate border-spacing-0 text-[11px] font-mono" style={{ minWidth: `${180 + periods.length * 64}px` }}>
                    {/* ── THEAD ── */}
                    <thead className="sticky top-0 z-50">
                        {/* Row 1 — ETD */}
                        <tr>
                            {/* Fixed left cols */}
                            <th
                                rowSpan={3}
                                    className="sticky left-0 z-50 border border-[#145233] px-2 py-2 text-center text-white text-[10px] tracking-wider"
                                    style={{ background: "#1D4D2A", minWidth: 32 }}
                            >
                                NO
                            </th>
                            <th
                                rowSpan={3}
                                    className="sticky z-50 border border-[#145233] px-3 py-2 text-center text-white text-[10px] tracking-wider"
                                    style={{ background: "#1D4D2A", minWidth: 160, left: 32 }}
                            >
                                ASSY NO
                            </th>
                            <th
                                    className="sticky z-40 border border-[#145233] px-2 py-1.5 text-center text-white text-[10px] tracking-wider"
                                    style={{ background: "#1D6F42", left: 192, minWidth: 44 }}
                            >
                                ETD
                            </th>
                            {periods.map((p) => (
                                <th
                                    key={`etd-${p.key || `${p.etd}|${p.eta}|${p.week}`}`}
                                    className="sticky z-30 border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                    style={{ background: p.isTotal ? "#2D5A3D" : "#1D6F42", minWidth: 60 }}
                                >
                                    {p.etdFmt}
                                </th>
                            ))}
                        </tr>
                        {/* Row 2 — ETA */}
                        <tr>
                            <th
                                className="sticky z-40 border border-[#145233] px-2 py-1.5 text-center text-white text-[10px] tracking-wider"
                                style={{ background: "#2E9E5E", left: 192, minWidth: 44 }}
                            >
                                ETA
                            </th>
                            {periods.map((p) => (
                                <th
                                    key={`eta-${p.key || `${p.etd}|${p.eta}|${p.week}`}`}
                                    className="sticky z-30 border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                    style={{ background: p.isTotal ? "#2D5A3D" : "#2E9E5E", minWidth: 60 }}
                                >
                                    {p.etaFmt}
                                </th>
                            ))}
                        </tr>
                        {/* Row 3 — WEEK */}
                        <tr>
                            <th
                                className="sticky z-40 border border-[#145233] px-2 py-1.5 text-center text-white text-[10px] tracking-wider"
                                style={{ background: "#237A50", left: 192, minWidth: 44 }}
                            >
                                WEEK
                            </th>
                            {periods.map((p) => (
                                <th
                                    key={`week-${p.key || `${p.etd}|${p.eta}|${p.week}`}`}
                                    className="sticky z-30 border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                    style={{ background: p.isTotal ? "#2D5A3D" : "#237A50", minWidth: 60 }}
                                >
                                    {p.isTotal ? "" : (p.week || "-")}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* ── TBODY ── */}
                    <tbody>
                        {grouped.map(([assyNumber, { qty }], idx) => {
                            const rowBg = idx % 2 === 0 ? "#EAF5EF" : "#C6E8D4";
                            return (
                                <tr key={assyNumber} style={{ background: rowBg }}>
                                    {/* NO */}
                                    <td
                                        className="sticky left-0 z-20 border border-[#334155] px-2 py-1.5 text-center font-bold text-white"
                                        style={{ background: "#2D5A3D", minWidth: 32 }}
                                    >
                                        {idx + 1}
                                    </td>
                                    {/* ASSY NO */}
                                    <td
                                        className="sticky z-20 border border-[#334155] px-3 py-1.5 font-bold text-white truncate"
                                        style={{ background: "#2D5A3D", left: 32, maxWidth: 160 }}
                                        title={assyNumber}
                                    >
                                        {assyNumber}
                                    </td>
                                    {/* QTY label */}
                                    <td
                                        className="sticky z-20 border border-[#334155] px-2 py-1.5 text-center text-[10px]"
                                        style={{ background: "#3A6B4E", color: "#D4EDE0", left: 192 }}
                                    >
                                        QTY
                                    </td>
                                    {/* Values */}
                                    {periods.map((p) => {
                                        const val = ynaPeriodValue(qty, p, periods);
                                        return (
                                            <td
                                                key={p.key}
                                                className="border px-2 py-1.5 text-right"
                                                style={{
                                                    borderColor: "#8FC9A8",
                                                    color: val === 0 ? "#AABFB0" : "#0D4F2C",
                                                    fontWeight: p.isTotal || val !== 0 ? 700 : 400,
                                                    background: p.isTotal ? (idx % 2 === 0 ? "#98D9C0" : "#7ECFB5") : rowBg,
                                                }}
                                            >
                                                {val.toLocaleString()}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>

                    {/* ── TFOOT — TOTAL ROW ── */}
                    <tfoot>
                        <tr>
                            <td
                                className="sticky left-0 z-20 border border-[#2E7D52] px-2 py-2 text-center text-white font-bold"
                                style={{ background: "#0F3320" }}
                            />
                            <td
                                className="sticky z-20 border border-[#2E7D52] px-3 py-2 text-left text-white font-bold"
                                style={{ background: "#0F3320", left: 32 }}
                            >
                                TOTAL
                            </td>
                            <td
                                className="sticky z-20 border border-[#2E7D52] px-2 py-2"
                                style={{ background: "#0F3320", left: 192 }}
                            />
                            {periods.map((p) => {
                                const val = colTotals[p.key] || 0;
                                return (
                                    <td
                                        key={p.key}
                                        className="border border-[#2E7D52] px-2 py-2 text-right font-bold text-white"
                                        style={{ background: "#0F3320" }}
                                    >
                                        {val.toLocaleString()}
                                    </td>
                                );
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    }

    // Default format: With FIRM/FORECAST groups and TOT columns
    const periodsWithTotals = useMemo(() => {
        const byTypeMonth = {};

        data.forEach((item) => {
            const type = (item.order_type || 'FORECAST').toUpperCase();
            const month = item.month || (item.eta ? new Date(item.eta).toISOString().slice(0, 7) : 'unknown');
            const key = periodKey(item.etd, item.eta, item.week);

            byTypeMonth[type] = byTypeMonth[type] || {};
            byTypeMonth[type][month] = byTypeMonth[type][month] || {};

            if (!byTypeMonth[type][month][key]) {
                byTypeMonth[type][month][key] = {
                    type,
                    month,
                    week: normalizeWeek(item.week),
                    etd: item.etd ? fmtDate(item.etd) : '',
                    eta: item.eta ? fmtDate(item.eta) : '',
                    etd_raw: item.etd || '',
                    eta_raw: item.eta || '',
                };
            }
        });

        const sortedTypes = ['FIRM', 'FORECAST'].filter((t) => byTypeMonth[t]);
        const result = [];

        sortedTypes.forEach((type) => {
            const months = Object.keys(byTypeMonth[type]).sort();
            months.forEach((month) => {
                const periods = Object.values(byTypeMonth[type][month]).sort((a, b) => (a.etd_raw || '').localeCompare(b.etd_raw || ''));
                let weekCount = 0;

                periods.forEach((period) => {
                    result.push(period);
                    weekCount += 1;
                });

                while (weekCount < periodsPerMonth) {
                    result.push({
                        type,
                        month,
                        week: weekCount + 1,
                        etd: '',
                        eta: '',
                        etd_raw: '',
                        eta_raw: '',
                    });
                    weekCount += 1;
                }

                result.push({
                    type,
                    month,
                    week: 'TOT',
                    etd: '',
                    eta: '',
                    etd_raw: '',
                    eta_raw: '',
                });
            });
        });

        return result;
    }, [data, periodsPerMonth]);

    const groups = useMemo(() => {
        const result = [];
        let current = null;

        periodsWithTotals.forEach((p, idx) => {
            const key = `${p.type}|${p.month}`;
            const colIndex = idx + 4;

            if (!current || current.key !== key) {
                if (current) result.push(current);
                current = { key, type: p.type, start: colIndex, end: colIndex };
            } else {
                current.end = colIndex;
            }
        });

        if (current) result.push(current);
        return result;
    }, [periodsWithTotals]);

    const groupedDefault = useMemo(() => {
        const g = {};
        data.forEach((item) => {
            const pn = item.assy_number || '-';
            if (!g[pn]) g[pn] = { qty: {} };
            const key = periodKey(item.etd, item.eta, item.week);
            g[pn].qty[key] = (g[pn].qty[key] || 0) + Number(item.qty || 0);
        });
        return Object.entries(g).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
    }, [data]);

    const colTotalsDefault = useMemo(() => {
        const totals = {};
        periodsWithTotals.forEach((p) => {
            if (p.week === 'TOT') return;
            const key = periodKey(p.etd_raw, p.eta_raw, p.week);
            totals[key] = groupedDefault.reduce((sum, [, v]) => sum + (v.qty[key] || 0), 0);
        });
        return totals;
    }, [periodsWithTotals, groupedDefault]);

    return (
        <div className="relative overflow-auto rounded-xl border border-[#b7d9c4]" style={{ maxHeight: "640px" }}>
            <table className="border-separate border-spacing-0 text-[11px] font-mono" style={{ minWidth: `${240 + periodsWithTotals.length * 64}px` }}>
                {/* ── THEAD ── */}
                <thead className="sticky top-0 z-50">
                    {/* Row 1 — Group headers */}
                    <tr>
                        <th
                            rowSpan={4}
                            className="sticky left-0 z-50 border border-[#145233] px-2 py-2 text-center text-white text-[10px] tracking-wider"
                            style={{ background: "#1D4D2A", minWidth: 32 }}
                        >
                            NO
                        </th>
                        <th
                            rowSpan={4}
                            className="sticky z-50 border border-[#145233] px-3 py-2 text-center text-white text-[10px] tracking-wider"
                            style={{ background: "#1D4D2A", minWidth: 160, left: 32 }}
                        >
                            ASSY NO
                        </th>
                        <th
                            className="sticky z-50 border border-[#145233] px-3 py-2 text-center text-white text-[10px] tracking-wider"
                            style={{ background: "#1D4D2A", minWidth: 80, left: 192 }}
                        >
                            Order Type
                        </th>
                        {groups.map((group, idx) => (
                            <th
                                key={`group-${idx}`}
                                colSpan={group.end - group.start + 1}
                                className="sticky z-30 border border-[#145233] px-2 py-1.5 text-center text-white text-[10px] font-semibold"
                                style={{
                                    background: group.type === 'FIRM' ? '#FFFF00' : '#F4B183',
                                    color: '#000000',
                                }}
                            >
                                {group.type}
                            </th>
                        ))}
                    </tr>
                    {/* Row 2 — ETD */}
                    <tr>
                        <th
                            className="sticky z-40 border border-[#145233] px-2 py-1.5 text-center text-white text-[10px] tracking-wider"
                            style={{ background: "#1D4D2A", left: 192, minWidth: 80 }}
                        >
                            ETD
                        </th>
                        {periodsWithTotals.map((p, idx) => (
                            <th
                                key={`etd-${idx}`}
                                className="sticky z-30 border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                style={{ background: p.week === 'TOT' ? '#2D5A3D' : '#1D6F42', minWidth: 60 }}
                            >
                                {p.week === 'TOT' ? '' : p.etd}
                            </th>
                        ))}
                    </tr>
                    {/* Row 3 — ETA */}
                    <tr>
                        <th
                            className="sticky z-40 border border-[#145233] px-2 py-1.5 text-center text-white text-[10px] tracking-wider"
                            style={{ background: "#1D4D2A", left: 192, minWidth: 80 }}
                        >
                            ETA
                        </th>
                        {periodsWithTotals.map((p, idx) => (
                            <th
                                key={`eta-${idx}`}
                                className="sticky z-30 border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                style={{ background: p.week === 'TOT' ? '#2D5A3D' : '#2E9E5E', minWidth: 60 }}
                            >
                                {p.week === 'TOT' ? '' : p.eta}
                            </th>
                        ))}
                    </tr>
                    {/* Row 4 — Week */}
                    <tr>
                        <th
                            className="sticky z-40 border border-[#145233] px-2 py-1.5 text-center text-white text-[10px] tracking-wider"
                            style={{ background: "#1D4D2A", left: 192, minWidth: 80 }}
                        >
                            Week
                        </th>
                        {periodsWithTotals.map((p, idx) => (
                            <th
                                key={`week-${idx}`}
                                className="sticky z-30 border border-[#145233] px-1 py-1.5 text-center text-white text-[10px] font-semibold"
                                style={{ background: p.week === 'TOT' ? '#2D5A3D' : '#237A50', minWidth: 60 }}
                            >
                                {p.week}
                            </th>
                        ))}
                    </tr>
                </thead>

                {/* ── TBODY ── */}
                <tbody>
                    {groupedDefault.map(([assyNumber, { qty }], idx) => {
                        const rowBg = idx % 2 === 0 ? '#EAF5EF' : '#C6E8D4';
                        return (
                            <tr key={assyNumber} style={{ background: rowBg }}>
                                <td
                                    className="sticky left-0 z-20 border border-[#334155] px-2 py-1.5 text-center font-bold text-white"
                                    style={{ background: '#2D5A3D', minWidth: 32 }}
                                >
                                    {idx + 1}
                                </td>
                                <td
                                    className="sticky z-20 border border-[#334155] px-3 py-1.5 font-bold text-white truncate"
                                    style={{ background: '#2D5A3D', left: 32, maxWidth: 160 }}
                                    title={assyNumber}
                                >
                                    {assyNumber}
                                </td>
                                <td
                                    className="sticky z-20 border border-[#334155] px-3 py-1.5 text-center text-[10px] font-bold"
                                    style={{ background: '#3A6B4E', color: '#D4EDE0', left: 192 }}
                                >
                                    QTY
                                </td>
                                {periodsWithTotals.map((p, idx) => {
                                    const key = periodKey(p.etd_raw, p.eta_raw, p.week);
                                    const val = p.week === 'TOT'
                                        ? Object.keys(qty).reduce((sum, k) => {
                                            const [etdRaw] = k.split('|');
                                            const month = etdRaw ? new Date(etdRaw).toISOString().slice(0, 7) : 'unknown';
                                            return month === p.month ? sum + (qty[k] || 0) : sum;
                                        }, 0)
                                        : (qty[key] || 0);

                                    return (
                                        <td
                                            key={`${key}-${idx}`}
                                            className="border px-2 py-1.5 text-right"
                                            style={{
                                                borderColor: '#8FC9A8',
                                                color: val === 0 ? '#AABFB0' : '#0D4F2C',
                                                fontWeight: val === 0 ? 400 : 700,
                                                background: rowBg,
                                            }}
                                        >
                                            {val.toLocaleString()}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>

                {/* ── TFOOT — TOTAL ROW ── */}
                <tfoot>
                    <tr>
                        <td
                            className="sticky left-0 z-20 border border-[#2E7D52] px-2 py-2 text-center text-white font-bold"
                            style={{ background: "#0F3320" }}
                        />
                        <td
                            className="sticky z-20 border border-[#2E7D52] px-3 py-2 text-left text-white font-bold"
                            style={{ background: "#0F3320", left: 32 }}
                        >
                            TOTAL
                        </td>
                        <td
                            className="sticky z-20 border border-[#2E7D52] px-2 py-2"
                            style={{ background: "#0F3320", left: 192 }}
                        />
                        {periodsWithTotals.map((p) => {
                            const val = p.week === 'TOT'
                                ? groupedDefault.reduce((sum, [, { qty }]) => {
                                    return sum + Object.keys(qty).reduce((monthSum, k) => {
                                        const [etdRaw] = k.split('|');
                                        const month = etdRaw ? new Date(etdRaw).toISOString().slice(0, 7) : 'unknown';
                                        return month === p.month ? monthSum + (qty[k] || 0) : monthSum;
                                    }, 0);
                                }, 0)
                                : groupedDefault.reduce((sum, [, { qty }]) => {
                                    const key = periodKey(p.etd_raw, p.eta_raw, p.week);
                                    return sum + (qty[key] || 0);
                                }, 0);

                            return (
                                <td
                                    key={`total-${p.type}-${p.month}-${p.week}-${p.etd_raw}-${p.eta_raw}`}
                                    className="border border-[#2E7D52] px-2 py-2 text-right font-bold text-white"
                                    style={{ background: "#0F3320" }}
                                >
                                    {val.toLocaleString()}
                                </td>
                            );
                        })}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

// ─── Original List View (unchanged) ──────────────────────────────────────────
function ListView({ filteredData, totalQty, resetFilters, activeFiltersCount, customer }) {
    const isYNAFormat = customer?.toUpperCase() === "YNA";
    const formatDate = (date) => {
        if (!date) return "-";
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) return "-";
        return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
    };

    return (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            {filteredData.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                    <p>No data found</p>
                    {activeFiltersCount > 0 && (
                        <button onClick={resetFilters} className="mt-2 text-blue-600 hover:text-blue-800 text-sm">
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="p-3 bg-[#f4faf6] border-b border-gray-200 text-sm text-gray-600">
                        Tampilan list detail per baris. Gunakan tab <strong>Excel Preview</strong> untuk tampilan pivot.
                    </div>
                    <div className="overflow-auto" style={{ maxHeight: "620px" }}>
                        <table className="min-w-[1200px] border-collapse border border-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    {["No","Assy Number","Car Model","Family","Week","Order Type","ETD","ETA","Qty"].map((h) => (
                                        <th key={h} className="sticky top-0 z-10 border border-slate-200 bg-slate-50 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {filteredData.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="border border-slate-200 px-3 py-2 text-slate-600">{index + 1}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-800 font-medium">{item.assy_number || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.model || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.family || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{normalizeWeek(item.week) || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                                (item.order_type || "").toUpperCase() === "FIRM"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : "bg-orange-100 text-orange-700"
                                            }`}>
                                                {item.order_type || "-"}
                                            </span>
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{formatDate(item.etd)}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">
                                            {isYNAFormat && hasFallbackEta(item) ? "-" : formatDate(item.eta)}
                                        </td>
                                        <td className="border border-slate-200 px-3 py-2 text-right font-semibold text-slate-900">{Number(item.qty || 0).toLocaleString()}</td>
                                        {/* <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.route || "-"}</td> */}
                                        {/* <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.port || "-"}</td>
                                        <td className="border border-slate-200 px-3 py-2 text-slate-700">{item.month || "-"}</td> */}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 font-semibold">
                                <tr>
                                    <td colSpan="8" className="border border-slate-200 px-3 py-2 text-right text-sm text-slate-900">Total Qty</td>
                                    <td className="border border-slate-200 px-3 py-2 text-right text-sm text-slate-900">{totalQty.toLocaleString()}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SummaryShow({ sr, data }) {
    const [searchAssyNumber, setSearchAssyNumber] = useState("");
    const [orderTypeFilter, setOrderTypeFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [weekFilter, setWeekFilter] = useState("");
    const [viewMode, setViewMode] = useState("excel"); // "excel" | "list"

    const handleBack = () => router.get("/summary");

    const filteredData = useMemo(() => {
        let filtered = [...data];

        const parseWeek = (w) => Number(normalizeWeek(w)) || 0;
        const typeRank  = (t) => { const u = (t || "").toUpperCase(); return u === "FIRM" ? 0 : u === "FORECAST" ? 1 : 2; };

        if (searchAssyNumber)
            filtered = filtered.filter((i) => i.assy_number?.toLowerCase().includes(searchAssyNumber.toLowerCase()));

        if (orderTypeFilter)
            filtered = filtered.filter((i) => (i.order_type || "").toUpperCase() === orderTypeFilter.toUpperCase());

        if (startDate && endDate) {
            filtered = filtered.filter((i) => {
                const etdOk = i.etd && i.etd >= startDate && i.etd <= endDate;
                const etaOk = i.eta && i.eta >= startDate && i.eta <= endDate;
                return etdOk || etaOk;
            });
        } else if (startDate) {
            filtered = filtered.filter((i) => (i.etd && i.etd >= startDate) || (i.eta && i.eta >= startDate));
        } else if (endDate) {
            filtered = filtered.filter((i) => (i.etd && i.etd <= endDate) || (i.eta && i.eta <= endDate));
        }

        if (weekFilter) filtered = filtered.filter((i) => parseWeek(i.week) === Number(weekFilter));

        return filtered.sort((a, b) => {
            const pn = (a.assy_number || "").localeCompare(b.assy_number || "", undefined, { numeric: true });
            if (pn !== 0) return pn;
            const tr = typeRank(a.order_type) - typeRank(b.order_type);
            if (tr !== 0) return tr;
            const wr = parseWeek(a.week) - parseWeek(b.week);
            if (wr !== 0) return wr;
            return (a.etd || "").localeCompare(b.etd || "");
        });
    }, [data, searchAssyNumber, orderTypeFilter, startDate, endDate, weekFilter]);

    const totalQty         = filteredData.reduce((s, i) => s + Number(i.qty || 0), 0);
    const totalFirmQty     = filteredData.filter((i) => (i.order_type || "").toUpperCase() === "FIRM").reduce((s, i) => s + Number(i.qty || 0), 0);
    const totalForecastQty = filteredData.filter((i) => (i.order_type || "").toUpperCase() === "FORECAST").reduce((s, i) => s + Number(i.qty || 0), 0);
    const originalTotalItems = data.length;
    const originalTotalQty   = data.reduce((s, i) => s + Number(i.qty || 0), 0);

    const resetFilters = () => { setSearchAssyNumber(""); setOrderTypeFilter(""); setStartDate(""); setEndDate(""); setWeekFilter(""); };

    const activeFiltersCount = [searchAssyNumber, orderTypeFilter, startDate, endDate, weekFilter].filter(Boolean).length;

    const uniqueWeeks = useMemo(() => {
        const set = new Set();
        data.forEach((i) => {
            const n = normalizeWeek(i.week);
            if (n !== "") set.add(String(n));
        });
        return Array.from(set).sort((a, b) => {
            const na = a === 'TOT' ? 99 : Number(a);
            const nb = b === 'TOT' ? 99 : Number(b);
            return na - nb;
        });
    }, [data]);

    return (
        <AdminLayout title="Summary Detail">
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
                    <span>Menu</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span>Shipping Release</span>
                    <ChevronRightIcon className="w-4 h-4" />
                    <button onClick={handleBack} className="hover:text-gray-900">Summary</button>
                    <ChevronRightIcon className="w-4 h-4" />
                    <span className="text-gray-900 font-medium">Detail</span>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <button onClick={handleBack} className="text-[#1D6F42] hover:text-green-800 mb-2 inline-flex items-center gap-1 text-sm">
                                    ← Back to Summary List
                                </button>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Summary Detail — {sr.source_file || sr.sr_number}
                                </h1>
                                <div className="text-sm text-gray-500 mt-1">
                                    Customer: {sr.customer} | Port: {sr.port || "-"} | Sheet: {sr.sheet_name || "-"} | Month: {sr.month || "-"} | Upload: {new Date(sr.upload_date).toLocaleString()}
                                </div>
                            </div>
                            <a
                                href={`/summary/${sr.id}/export`}
                                className="bg-[#1D6F42] text-white px-4 py-2 rounded-lg hover:bg-green-700 inline-flex items-center gap-2 transition-colors"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                <span>Export Excel</span>
                            </a>
                        </div>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Filter Section */}
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-56">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Assy Number</label>
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Assy Number or Assy No...."
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                        value={searchAssyNumber}
                                        onChange={(e) => setSearchAssyNumber(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="w-28">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={orderTypeFilter}
                                    onChange={(e) => setOrderTypeFilter(e.target.value)}
                                >
                                    <option value="">All</option>
                                    <option value="FIRM">FIRM</option>
                                    <option value="FORECAST">FORECAST</option>
                                </select>
                            </div>

                            <div className="w-28">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Week</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    value={weekFilter}
                                    onChange={(e) => setWeekFilter(e.target.value)}
                                >
                                    <option value="">All</option>
                                    {uniqueWeeks.map((w) => <option key={w} value={w}>{w}</option>)}
                                </select>
                            </div>

                            <div className="flex-1 min-w-[320px]">
                                <label className="block text-xs font-medium text-gray-700 mb-1">ETD / ETA Range</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="date" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                    </div>
                                    <span className="text-gray-400 self-center">-</span>
                                    <div className="relative flex-1">
                                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input type="date" className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {activeFiltersCount > 0 && (
                                <button onClick={resetFilters} className="h-10 px-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1" title="Reset filters">
                                    <XMarkIcon className="w-5 h-5" />
                                    <span className="text-sm">Reset</span>
                                </button>
                            )}
                        </div>

                        {/* Active filter badges */}
                        {activeFiltersCount > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="text-xs text-gray-500">Active filters:</span>
                                {searchAssyNumber && <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">Assy Number: {searchAssyNumber}</span>}
                                {orderTypeFilter  && <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">{orderTypeFilter}</span>}
                                {weekFilter       && <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">Week: {weekFilter}</span>}
                                {(startDate || endDate) && <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">Date: {startDate || "..."} - {endDate || "..."}</span>}
                            </div>
                        )}


                        {/* View Mode Toggle */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 mr-1">View:</span>
                            <button
                                onClick={() => setViewMode("excel")}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    viewMode === "excel"
                                        ? "bg-[#1D6F42] text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                <TableCellsIcon className="w-4 h-4" />
                                Excel Preview
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    viewMode === "list"
                                        ? "bg-[#1D6F42] text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                <ListBulletIcon className="w-4 h-4" />
                                List Detail
                            </button>
                        </div>

                        {/* Table */}
                        {viewMode === "excel" ? (
                            <PivotPreview data={filteredData} customer={sr.customer} />
                        ) : (
                            <ListView
                                filteredData={filteredData}
                                totalQty={totalQty}
                                resetFilters={resetFilters}
                                activeFiltersCount={activeFiltersCount}
                                customer={sr.customer}
                            />
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
