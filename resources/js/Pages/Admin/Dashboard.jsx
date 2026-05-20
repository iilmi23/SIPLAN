import AdminLayout from '@/Layouts/AdminLayout';
import { Link, usePage } from '@inertiajs/react';
import { useTheme } from '@/contexts/ThemeContext';
import { FaArrowDown, FaArrowRight, FaArrowUp, FaChartLine, FaCheckCircle, FaCogs, FaExclamationTriangle, FaShip, FaUsers } from 'react-icons/fa';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const ROLE_LABELS = {
    admin: 'Administrator',
    ppc: 'PPC',
};

const CHART_COLORS = ['#1D6F42', '#2563eb', '#dc2626', '#7c3aed', '#ea580c', '#0891b2', '#4d7c0f', '#be123c'];

const formatNumber = (value) => Number(value || 0).toLocaleString();

const formatSigned = (value) => {
    const number = Number(value || 0);
    const formatted = Math.abs(number).toLocaleString();

    if (number > 0) return `+${formatted}`;
    if (number < 0) return `-${formatted}`;
    return '0';
};

const statusClass = (status) => ({
    normal: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
    moderate: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
    critical: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
}[status] || 'border-gray-100 bg-gray-50 text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300');

const StatCard = ({ stat, index }) => (
    <Link
        href={stat.link}
        className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-xl dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
        style={{ animationDelay: `${index * 80}ms` }}
    >
        <div
            className="absolute left-0 right-0 top-0 h-1 opacity-80"
            style={{ background: stat.gradient }}
        />
        <div
            className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.12]"
            style={{ background: stat.gradient }}
        />

        <div className="relative p-5">
            <div
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm text-white"
                style={{ background: stat.gradient }}
            >
                {stat.icon}
            </div>

            <div className="mb-1">
                <span className="text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
                    {Number(stat.value || 0).toLocaleString()}
                </span>
            </div>

            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-500">
                {stat.title}
            </p>

            <div className="absolute bottom-4 right-4 translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                <FaArrowRight className="text-xs text-gray-300 dark:text-slate-600" />
            </div>
        </div>
    </Link>
);

const VarianceKpi = ({ label, value, tone, icon: Icon }) => {
    const classes = {
        neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
        up: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
        down: 'border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
        critical: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
    }[tone] || 'border-slate-200 bg-slate-50 text-slate-700';

    return (
        <div className={`rounded-lg border px-4 py-3 ${classes}`}>
            <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-wide opacity-75">{label}</p>
                <Icon className="h-4 w-4 shrink-0" />
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-950 dark:text-slate-50">{formatNumber(value)}</p>
        </div>
    );
};

const Section = ({ title, action, children }) => (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">{title}</h2>
            {action}
        </div>
        <div className="p-4">{children}</div>
    </section>
);

const VarianceTrendChart = ({ trend }) => {
    const customers = trend?.customers || [];
    const points = trend?.points || [];
    const { isDark } = useTheme();
    const axisColor = isDark ? '#94a3b8' : '#6b7280';
    const gridColor = isDark ? '#334155' : '#e5e7eb';

    if (!customers.length || !points.length) {
        return <EmptyState message="Need at least two completed SR batches to show variance trend" />;
    }

    return (
        <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: axisColor }} axisLine={{ stroke: gridColor }} tickLine={{ stroke: gridColor }} />
                    <YAxis tick={{ fontSize: 11, fill: axisColor }} tickFormatter={formatSigned} width={72} axisLine={{ stroke: gridColor }} tickLine={{ stroke: gridColor }} />
                    <Tooltip
                        formatter={(value) => [formatSigned(value), 'Variance']}
                        labelFormatter={(label, rows) => rows?.[0]?.payload?.label || label}
                        contentStyle={{
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#e5e7eb',
                            color: isDark ? '#e2e8f0' : '#111827',
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} />
                    {customers.map((customer, index) => (
                        <Line
                            key={customer}
                            type="monotone"
                            dataKey={customer}
                            stroke={CHART_COLORS[index % CHART_COLORS.length]}
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            connectNulls
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

const TopChangesTable = ({ rows }) => {
    if (!rows?.length) {
        return <EmptyState message="No variance changes in the latest completed batches" />;
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-800">
            <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                    <tr>
                        <th className="px-3 py-3 text-left">Assy Number</th>
                        <th className="px-3 py-3 text-right">Previous Qty</th>
                        <th className="px-3 py-3 text-right">Current Qty</th>
                        <th className="px-3 py-3 text-right">Variance Qty</th>
                        <th className="px-3 py-3 text-left">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {rows.slice(0, 10).map((row, index) => {
                        const delta = Number(row.variance_qty || 0);

                        return (
                            <tr key={`${row.customer}-${row.assy_number}-${index}`} className="bg-white dark:bg-slate-900">
                                <td className="px-3 py-3">
                                    <p className="font-bold text-gray-900 dark:text-slate-100">{row.assy_number || '-'}</p>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">{row.customer || '-'}</p>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-slate-300">{formatNumber(row.previous_qty)}</td>
                                <td className="px-3 py-3 text-right font-mono text-gray-700 dark:text-slate-300">{formatNumber(row.current_qty)}</td>
                                <td className={`px-3 py-3 text-right font-mono font-bold ${delta >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                                    {formatSigned(delta)}
                                </td>
                                <td className="px-3 py-3">
                                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-bold uppercase ${statusClass(row.classification)}`}>
                                        {row.classification || 'normal'}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const RecentActivity = ({ rows }) => {
    if (!rows?.length) {
        return <EmptyState message="No recent variance activity" />;
    }

    return (
        <div className="space-y-2">
            {rows.slice(0, 8).map((row, index) => {
                const delta = Number(row.variance_qty || 0);

                return (
                    <div key={`${row.assy_number}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/70">
                        <p className="min-w-0 truncate text-sm font-semibold text-gray-800 dark:text-slate-200">{row.message}</p>
                        <span className={`font-mono text-sm font-bold ${delta >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}>
                            {formatSigned(delta)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

const EmptyState = ({ message }) => (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm font-semibold text-gray-400 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-500">
        {message}
    </div>
);

const GreetingBanner = ({ name, role }) => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f5132] via-[#1D6F42] to-[#2d9b5e] px-6 py-5">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-8 right-16 h-24 w-24 rounded-full bg-white/5" />
            <div className="absolute right-32 top-2 h-10 w-10 rounded-full bg-white/10" />

            <div className="relative flex items-center justify-between">
                <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-200">
                        {greeting}
                    </p>
                    <h1 className="text-xl font-bold tracking-tight text-white">
                        {name || 'SIPLAN'}
                    </h1>
                    <p className="mt-1 text-sm font-medium text-emerald-100/80">
                        Welcome to <span className="font-bold text-white">SIPLAN</span>. Here's an overview of your data.
                    </p>
                </div>
                <div className="hidden items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm sm:flex">
                    <FaChartLine className="text-sm text-emerald-200" />
                    <span className="text-xs font-semibold text-white">{role}</span>
                </div>
            </div>
        </div>
    );
};

const VarianceDashboard = ({ data }) => {
    const kpis = data?.kpis || {};

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-950 dark:text-slate-50">Variance Monitoring</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400">Latest completed SR batch compared with previous batch</p>
                </div>
                <a
                    href="/variance/export"
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                    Export Excel
                </a>
            </div>

            {/* <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <VarianceKpi label="Total Changed Assy" value={kpis.changed_assy_count} tone="neutral" icon={FaChartLine} />
                <VarianceKpi label="Increase Count" value={kpis.increase_count} tone="up" icon={FaArrowUp} />
                <VarianceKpi label="Decrease Count" value={kpis.decrease_count} tone="down" icon={FaArrowDown} />
                <VarianceKpi label="Critical Count" value={kpis.critical_count} tone="critical" icon={FaExclamationTriangle} />
            </div> */}

            <Section title="Customer Variance Trend">
                <VarianceTrendChart trend={data?.trend} />
            </Section>

            <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
                {/* <Section title="Top Changes">
                    <TopChangesTable rows={data?.top_changes || []} />
                </Section>
                <Section title="Recent Activity">
                    <RecentActivity rows={data?.recent_activity || []} />
                </Section> */}
            </div>
        </div>
    );
};

export default function Dashboard({ stats, varianceDashboard, error }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const roleName = ROLE_LABELS[user?.role] ?? 'User';
    const isAdmin = user?.role === 'admin';
    const errorMessage = error || flash?.error;

    const statsData = [
        {
            title: 'Customers',
            value: stats?.total_customers || 0,
            icon: <FaUsers />,
            gradient: 'linear-gradient(135deg, #f97316, #ef4444)',
            link: '/customers',
            adminOnly: true,
        },
        {
            title: 'Carlines',
            value: stats?.total_carlines || 0,
            icon: <FaCheckCircle />,
            gradient: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
            link: '/carline',
            adminOnly: true,
        },
        {
            title: 'Assy',
            value: stats?.total_assy || 0,
            icon: <FaCogs />,
            gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            link: '/assy',
            adminOnly: true,
        },
        {
            title: 'SR',
            value: stats?.total_sr || 0,
            icon: <FaShip />,
            gradient: 'linear-gradient(135deg, #10b981, #059669)',
            link: '/sr/upload',
        },
    ].filter((item) => !item.adminOnly || isAdmin);

    return (
        <AdminLayout title="Dashboard">
            <div className="min-h-screen bg-[#f6f8fb] px-5 pb-10 pt-4 transition-colors duration-300 dark:bg-slate-950 md:px-8">
                {errorMessage && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/60 dark:bg-red-950/40">
                        <p className="text-sm font-medium text-red-600 dark:text-red-300">{errorMessage}</p>
                    </div>
                )}

                <GreetingBanner name={user?.name} role={roleName} />

                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {statsData.map((stat, index) => (
                        <StatCard key={stat.title} stat={stat} index={index} />
                    ))}
                </div>

                <VarianceDashboard data={varianceDashboard || {}} />
            </div>
        </AdminLayout>
    );
}
