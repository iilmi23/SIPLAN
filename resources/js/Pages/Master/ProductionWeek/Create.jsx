import AdminLayout from "@/Layouts/AdminLayout";
import Breadcrumb from "@/Components/Admin/Breadcrumb";
import { Link, useForm } from "@inertiajs/react";
import { useMemo } from "react";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

const MONTH_MAP = {
    1: "JAN",
    2: "FEB",
    3: "MAR",
    4: "APR",
    5: "MAY",
    6: "JUN",
    7: "JUL",
    8: "AUG",
    9: "SEP",
    10: "OCT",
    11: "NOV",
    12: "DEC",
};

const currentYear = new Date().getFullYear();

export default function Create({ customers = [] }) {
    const { data, setData, post, processing, errors, transform } = useForm({
        customer_id: "",
        year: currentYear,
        month_number: "",
        month_name: "",
        start_date: "",
        end_date: "",
        num_weeks: 4,
        working_days: {},
    });

    const weekPreview = useMemo(() => {
        return buildWeekPreview(data.start_date, data.end_date, data.num_weeks, data.working_days);
    }, [data.start_date, data.end_date, data.num_weeks, data.working_days]);

    const totalWorkingDays = weekPreview.reduce((sum, week) => sum + week.working_days.length, 0);

    const selectedCustomer = customers.find((customer) => String(customer.id) === String(data.customer_id));
    const calendarScope = selectedCustomer ? `${selectedCustomer.code}` : "Global";

    const handleYearChange = (value) => {
        setData((prev) => {
            const previousRange = prev.year && prev.month_number ? buildProductionMonthRange(prev.year, prev.month_number) : null;
            const nextRange = value && prev.month_number ? buildProductionMonthRange(value, prev.month_number) : null;
            const previousAutoStart = previousRange?.start_date ?? "";
            const nextAutoStart = nextRange?.start_date ?? "";
            const previousAutoEnd = previousRange?.end_date ?? "";
            const nextAutoEnd = nextRange?.end_date ?? "";
            const shouldAutoUpdateStart = !prev.start_date || prev.start_date === previousAutoStart;
            const shouldAutoUpdateEnd = !prev.end_date || prev.end_date === previousAutoEnd;

            return {
                ...prev,
                year: value,
                start_date: shouldAutoUpdateStart ? nextAutoStart : prev.start_date,
                end_date: shouldAutoUpdateEnd ? nextAutoEnd : prev.end_date,
                num_weeks: shouldAutoUpdateStart && shouldAutoUpdateEnd && nextRange ? nextRange.num_weeks : prev.num_weeks,
                working_days: {},
            };
        });
    };

    const handleMonthChange = (value) => {
        const monthNumber = parseInt(value, 10);

        setData((prev) => {
            const previousRange = prev.year && prev.month_number ? buildProductionMonthRange(prev.year, prev.month_number) : null;
            const nextRange = prev.year && value ? buildProductionMonthRange(prev.year, value) : null;
            const previousAutoStart = previousRange?.start_date ?? "";
            const nextAutoStart = nextRange?.start_date ?? "";
            const previousAutoEnd = previousRange?.end_date ?? "";
            const nextAutoEnd = nextRange?.end_date ?? "";
            const shouldAutoUpdateStart = !prev.start_date || prev.start_date === previousAutoStart;
            const shouldAutoUpdateEnd = !prev.end_date || prev.end_date === previousAutoEnd;

            return {
                ...prev,
                month_number: value,
                month_name: MONTH_MAP[monthNumber] ?? "",
                start_date: shouldAutoUpdateStart ? nextAutoStart : prev.start_date,
                end_date: shouldAutoUpdateEnd ? nextAutoEnd : prev.end_date,
                num_weeks: shouldAutoUpdateStart && shouldAutoUpdateEnd && nextRange ? nextRange.num_weeks : prev.num_weeks,
                working_days: {},
            };
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        transform((payload) => ({
            ...payload,
            working_days: collectWorkingDays(weekPreview),
        }));
        post(route("production-week.store"));
    };

    const toggleWorkingDay = (weekNo, date) => {
        setData((prev) => {
            const weekKey = String(weekNo);
            const previewWeek = buildWeekPreview(prev.start_date, prev.end_date, prev.num_weeks, prev.working_days)
                .find((week) => week.week_no === weekNo);
            const currentDays = new Set(prev.working_days?.[weekKey] ?? previewWeek?.working_days ?? []);

            currentDays.has(date) ? currentDays.delete(date) : currentDays.add(date);

            return {
                ...prev,
                working_days: {
                    ...(prev.working_days ?? {}),
                    [weekKey]: Array.from(currentDays).sort(),
                },
            };
        });
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50/40 pt-2 pb-8 px-5 md:px-8 font-sans">
                <Breadcrumb items={[{ label: "Masters" }, { label: "Production Weeks", href: route("production-week.index") }, { label: "Create Monthly" }]} />

                <div className="w-full">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                    <CalendarDaysIcon className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-semibold text-gray-900">Create Monthly Production Week</h1>
                                    <p className="text-sm text-gray-500 mt-0.5">Add a monthly production calendar and generate all weeks at once.</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <SummaryPill label="Scope" value={calendarScope} />
                                <SummaryPill label="Weeks" value={String(data.num_weeks || 0)} />
                                <SummaryPill label="Working Days" value={String(totalWorkingDays)} />
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px]">
                                <div className="p-6 lg:p-8 space-y-6">
                                    <div>
                                        <h2 className="text-sm font-semibold text-gray-900">Calendar Information</h2>
                                        <p className="mt-1 text-sm text-gray-500">Choose the scope, period, and first start date for this production month.</p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                        <div className="lg:col-span-2">
                                            <FormField label="Customer" error={errors.customer_id} hint="Leave empty for a global production week.">
                                                <select
                                                    value={data.customer_id}
                                                    onChange={(e) => setData("customer_id", e.target.value)}
                                                    className={inputCls(errors.customer_id)}
                                                >
                                                    <option value="">Global (all customers)</option>
                                                    {customers.map((customer) => (
                                                        <option key={customer.id} value={customer.id}>
                                                            {customer.code}
                                                        </option>
                                                    ))}
                                                </select>
                                            </FormField>
                                        </div>

                                        <FormField label="Year" required error={errors.year}>
                                            <input
                                                type="number"
                                                min={2020}
                                                max={2030}
                                                value={data.year}
                                                onChange={(e) => handleYearChange(e.target.value)}
                                                className={inputCls(errors.year)}
                                            />
                                        </FormField>

                                        <FormField label="Month" required error={errors.month_number}>
                                            <select
                                                value={data.month_number}
                                                onChange={(e) => handleMonthChange(e.target.value)}
                                                className={inputCls(errors.month_number)}
                                            >
                                                <option value="">Select month...</option>
                                                {Object.entries(MONTH_MAP).map(([num, name]) => (
                                                    <option key={num} value={num}>
                                                        {num} - {name}
                                                    </option>
                                                ))}
                                            </select>
                                        </FormField>

                                        <FormField
                                            label="First week start date"
                                            required
                                            error={errors.start_date}
                                            // hint="This date becomes the start date for week 1."
                                        >
                                            <input
                                                type="date"
                                                value={data.start_date}
                                                readOnly
                                                className={inputCls(errors.start_date)}
                                            />
                                        </FormField>

                                        <FormField
                                            label="End Date"
                                            required
                                            error={errors.end_date}
                                            // hint={monthEndDate ? `Default akhir bulan: ${formatDate(monthEndDate)}` : "Tanggal akhir range bulan ini."}
                                        >
                                            <input
                                                type="date"
                                                value={data.end_date}
                                                readOnly
                                                className={inputCls(errors.end_date)}
                                            />
                                        </FormField>

                                        <FormField label="Total weeks in month" required error={errors.num_weeks}>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[3, 4, 5].map((weekCount) => (
                                                    <button
                                                        key={weekCount}
                                                        type="button"
                                                        disabled
                                                        className={`h-10 rounded-lg text-sm font-semibold border transition-all ${
                                                            Number(data.num_weeks) === weekCount
                                                                ? "bg-[#1D6F42] text-white border-[#1D6F42]"
                                                                : "bg-white text-gray-400 border-gray-200"
                                                        }`}
                                                    >
                                                        {weekCount}
                                                    </button>
                                                ))}
                                            </div>
                                        </FormField>
                                    </div>

                                    <div className="border-t border-gray-100 pt-5">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <InfoStrip label="Month" value={data.month_name || "-"} />
                                            <InfoStrip label="End Date" value={data.end_date ? formatDate(data.end_date) : "-"} />
                                            <InfoStrip label="Working Days" value={`${totalWorkingDays} days`} />
                                        </div>
                                    </div>
                                </div>

                                <aside className="border-t xl:border-t-0 xl:border-l border-gray-100 bg-gray-50/70 p-6 lg:p-8">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-sm font-semibold text-gray-900">Preview Week</h2>
                                            <p className="mt-1 text-sm text-gray-500">Cek range yang akan dibuat sebelum menyimpan.</p>
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-2">
                                        {weekPreview.length > 0 ? (
                                            weekPreview.map((week) => (
                                                <div key={week.week_no} className="border-b border-gray-200/70 py-3 last:border-b-0">
                                                    <div className="mb-3 flex items-center justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-[#1D6F42]">Week {week.week_no}</p>
                                                            <p className="text-xs text-gray-500">{week.working_days.length} working days</p>
                                                        </div>
                                                        <p className="text-right text-xs font-mono text-gray-700">
                                                            {formatDate(week.start)}<br />
                                                            {formatDate(week.end)}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {week.days.map((day) => (
                                                            <label
                                                                key={day.date}
                                                                className={`flex cursor-pointer flex-col rounded-lg border px-2 py-1.5 transition-all ${
                                                                    day.checked
                                                                        ? "border-[#1D6F42] bg-emerald-50 text-[#1D6F42]"
                                                                        : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={day.checked}
                                                                    onChange={() => toggleWorkingDay(week.week_no, day.date)}
                                                                    className="sr-only"
                                                                />
                                                                <span className="text-[10px] font-medium uppercase">{day.dayName}</span>
                                                                <span className="mt-0.5 text-sm font-semibold">{day.dayNumber}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-10 text-center">
                                                <CalendarDaysIcon className="w-9 h-9 mx-auto text-gray-300" />
                                                <p className="mt-3 text-sm font-medium text-gray-600">Preview belum tersedia</p>
                                                <p className="mt-1 text-xs text-gray-400">Select a month and start date first.</p>
                                            </div>
                                        )}
                                    </div>
                                </aside>
                            </div>

                            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-6 lg:px-8 py-5 border-t border-gray-100 bg-white">
                                <Link
                                    href={route("production-week.index")}
                                    className="inline-flex justify-center px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex justify-center items-center gap-2 px-6 py-2.5 bg-[#1D6F42] text-white text-sm font-medium rounded-xl hover:bg-[#185c38] disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
                                >
                                    {processing ? "Saving..." : "Save Month"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}

const inputCls = (error) =>
    `w-full h-10 px-3 bg-white border rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 transition-all ${
        error
            ? "border-red-300 focus:ring-red-200 focus:border-red-400"
            : "border-gray-200 focus:ring-[#1D6F42]/20 focus:border-[#1D6F42]"
    }`;

function FormField({ label, required, error, hint, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
            {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}

function SummaryPill({ label, value }) {
    return (
        <div className="min-w-28 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase text-gray-400">{label}</p>
            <p className="mt-0.5 max-w-48 truncate text-sm font-semibold text-gray-900">{value}</p>
        </div>
    );
}

function InfoStrip({ label, value }) {
    return (
        <div className="border-l-2 border-emerald-500 bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-gray-900">{value}</p>
        </div>
    );
}

const pad = (value) => String(value).padStart(2, "0");

const productionMonthStart = (year, month) => {
    const firstOfMonth = new Date(Number(year), Number(month) - 1, 1);
    const start = new Date(firstOfMonth);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() + 1 - day);

    if (start.getMonth() !== firstOfMonth.getMonth()) {
        const previousMonthLastDay = new Date(firstOfMonth.getFullYear(), firstOfMonth.getMonth(), 0).getDate();
        const previousMonthRemainingDays = previousMonthLastDay - start.getDate() + 1;

        if (previousMonthRemainingDays > 1) {
            start.setDate(start.getDate() + 7);
        }
    }

    return start;
};

const buildProductionMonthRange = (year, month) => {
    const start = productionMonthStart(year, month);
    const nextMonth = Number(month) === 12 ? 1 : Number(month) + 1;
    const nextYear = Number(month) === 12 ? Number(year) + 1 : Number(year);
    const nextStart = productionMonthStart(nextYear, nextMonth);
    const end = new Date(nextStart);
    end.setDate(end.getDate() - 1);

    return {
        start_date: toDateInput(start),
        end_date: toDateInput(end),
        num_weeks: Math.round((end - start) / 86400000 / 7) + 1,
    };
};

const addDays = (value, days) => {
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + days);
    return toDateInput(date);
};

const buildWeekPreview = (startDate, endDate, totalWeeks, selectedWorkingDays = {}) => {
    const count = Number(totalWeeks);
    if (!startDate || !count) return [];

    return Array.from({ length: count }, (_, index) => {
        const weekNo = index + 1;
        const start = addDays(startDate, index * 7);
        const end = index === count - 1 && endDate ? endDate : addDays(start, 6);
        const days = datesBetween(start, end);
        const weekKey = String(weekNo);
        const hasCustomSelection = Object.prototype.hasOwnProperty.call(selectedWorkingDays ?? {}, weekKey);
        const selected = new Set(hasCustomSelection ? selectedWorkingDays[weekKey] : days.filter((day) => day.isWeekday).map((day) => day.date));

        return {
            week_no: weekNo,
            start,
            end,
            working_days: days.filter((day) => selected.has(day.date)).map((day) => day.date),
            days: days.map((day) => ({
                ...day,
                checked: selected.has(day.date),
            })),
        };
    });
};

const collectWorkingDays = (weeks) => weeks.reduce((result, week) => ({
    ...result,
    [week.week_no]: week.working_days,
}), {});

const datesBetween = (startDate, endDate) => {
    const dates = [];
    const current = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    while (current <= end) {
        const date = toDateInput(current);
        const day = current.getDay();

        dates.push({
            date,
            dayName: current.toLocaleDateString("id-ID", { weekday: "short" }),
            dayNumber: String(current.getDate()).padStart(2, "0"),
            isWeekday: day >= 1 && day <= 5,
        });

        current.setDate(current.getDate() + 1);
    }

    return dates;
};

const toDateInput = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const formatDate = (value) => {
    if (!value) return "-";

    return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};
