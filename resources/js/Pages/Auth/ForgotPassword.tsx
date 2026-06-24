import { Head, useForm, Link } from '@inertiajs/react';
import { asset } from '@/utils';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <>
            <Head title="Forgot Password - SIPLAN" />

            <div className="auth-page min-h-screen lg:h-screen flex overflow-hidden bg-[#0a3728]">

                {/* ─── LEFT PANEL: Forgot Password Form ─── */}
                <div className="w-full lg:w-[44%] flex flex-col bg-white relative z-10 shadow-2xl">
                    <div className="flex flex-col h-full px-10 py-8 max-w-[420px] mx-auto w-full">

                        {/* Logos */}
                        <div className="flex items-center justify-between mb-auto pb-6">
                            <img src={asset('images/jai.jpg')} className="h-8 object-contain" alt="JAI Logo" />
                            <img src={asset('images/kampus.png')} className="h-8 object-contain" alt="Kampus Logo" />
                        </div>

                        {/* Form Section */}
                        <div className="my-auto py-4">

                            {/* Back to Login */}
                            <Link
                                href={route('login')}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-emerald-700 transition-colors mb-6 group"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                                </svg>
                                Back to Login
                            </Link>

                            {/* Heading */}
                            <div className="mb-7">
                                <span className="text-[9px] font-bold tracking-widest uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                    Account Recovery
                                </span>
                                <h1 className="text-[22px] font-extrabold tracking-tight text-slate-800 mt-3 mb-1.5 leading-tight">
                                    Forgot Password?
                                </h1>
                                <p className="text-slate-500 text-[12px] leading-relaxed">
                                    Enter your registered email address and we'll send you a secure reset link.
                                </p>
                            </div>

                            {/* Status / Success Message */}
                            {status && (
                                <div className="mb-5 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium p-3 rounded-xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {status}
                                </div>
                            )}

                            {/* Info Banner */}
                            {!status && (
                                <div className="mb-5 flex items-start gap-2.5 bg-slate-50 border border-slate-200 text-slate-600 text-[11px] p-3 rounded-xl">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5 text-slate-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                    </svg>
                                    You'll receive an email with a reset link. Check your spam folder if you don't see it.
                                </div>
                            )}

                            <form onSubmit={submit} className="flex flex-col gap-4">
                                {/* Email Field */}
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="email" className="text-[11px] font-semibold text-slate-600 tracking-wide">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.57 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                            </svg>
                                        </span>
                                        <input
                                            id="email"
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            className="w-full pl-10 pr-4 py-[11px] text-[12px] bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all shadow-sm placeholder:text-slate-300 text-slate-800"
                                            placeholder="your@email.com"
                                            autoComplete="email"
                                            required
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-red-500 text-[10px] mt-0.5 flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                            </svg>
                                            {errors.email}
                                        </p>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="group w-full bg-[#0f4c3a] hover:bg-[#0a3728] text-white py-[11px] rounded-xl font-semibold text-[12px] tracking-wide transition-all disabled:opacity-60 shadow-md shadow-emerald-900/20 mt-1 flex items-center justify-center gap-2"
                                >
                                    {processing ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending...
                                        </span>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                            </svg>
                                            Send Reset Link
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-auto pt-6">
                            <p className="text-[10px] text-slate-400 font-medium">
                                &copy; {new Date().getFullYear()} PT Jatim Autocomp Indonesia. All rights reserved.
                            </p>
                        </div>

                    </div>
                </div>

                {/* ─── RIGHT PANEL: Exact copy from Login ─── */}
                <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#06241b] via-[#0f4c3a] to-[#14664f] text-white flex-col justify-between p-10 relative overflow-hidden">

                    {/* High-tech Grid Overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

                    {/* Floating Background Squares (Top Right) */}
                    <div className="absolute top-6 right-6 flex flex-col gap-1.5 opacity-[0.06] pointer-events-none rotate-12">
                        <div className="flex gap-1.5">
                            <div className="w-6 h-6 bg-white rounded-md" />
                            <div className="w-9 h-9 bg-white rounded-lg" />
                            <div className="w-5 h-5 bg-white rounded-md mt-3" />
                        </div>
                        <div className="flex gap-1.5 pl-3">
                            <div className="w-8 h-8 bg-white rounded-lg" />
                            <div className="w-6 h-6 bg-white rounded-md" />
                        </div>
                    </div>

                    {/* Floating Background Squares (Bottom Left) */}
                    <div className="absolute bottom-10 left-6 flex gap-2.5 opacity-[0.05] pointer-events-none -rotate-12">
                        <div className="w-8 h-8 bg-white rounded-lg" />
                        <div className="w-11 h-11 bg-white rounded-xl mt-5" />
                        <div className="w-6 h-6 bg-white rounded-md" />
                    </div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        {/* Upper layout: System title and subtitle */}
                        <div className="max-w-md pt-[14%]">
                            <h2 className="text-2xl font-extrabold tracking-tight text-white mt-3 mb-2">
                                Production Planning System
                            </h2>
                            <p className="text-emerald-100/70 leading-relaxed text-xs">
                                A centralized platform for uploading and managing SR Summary and SPP documents. Monitor document status, manage production planning data, and ensure data accuracy in real-time.
                            </p>
                        </div>

                        {/* Interactive Tilted Mock Dashboard Screen */}
                        <div className="absolute right-[-18%] bottom-[-20%] w-[95%] bg-white rounded-tl-2xl shadow-[-24px_24px_48px_rgba(0,0,0,0.35)] border border-slate-100/50 p-5 flex gap-4 transform -rotate-[10deg] skew-x-[-3deg] select-none pointer-events-none text-gray-800" style={{ height: '78%' }}>

                            {/* Mock Sidebar */}
                            <div className="w-[26%] border-r border-slate-100 pr-3 flex flex-col gap-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-md bg-[#0f4c3a] flex items-center justify-center text-white text-[8px] font-bold">
                                        S
                                    </div>
                                    <span className="font-extrabold text-[9px] text-gray-800 tracking-tight">SIPLAN</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="h-5 w-full bg-[#0f4c3a]/10 border-l-2 border-[#0f4c3a] rounded-r px-2 flex items-center">
                                        <div className="h-[3px] w-10 bg-[#0f4c3a] rounded" />
                                    </div>
                                    <div className="h-5 w-full px-2 flex items-center">
                                        <div className="h-[3px] w-8 bg-slate-200 rounded" />
                                    </div>
                                    <div className="h-5 w-full px-2 flex items-center">
                                        <div className="h-[3px] w-9 bg-slate-200 rounded" />
                                    </div>
                                    <div className="h-5 w-full px-2 flex items-center">
                                        <div className="h-[3px] w-7 bg-slate-200 rounded" />
                                    </div>
                                </div>
                            </div>

                            {/* Mock Dashboard Main Area */}
                            <div className="flex-1 flex flex-col gap-3">
                                {/* Mock Header */}
                                <div className="h-6 w-full bg-slate-50 border border-slate-100 rounded flex items-center px-2.5 justify-between">
                                    <div className="h-[3px] w-14 bg-slate-200 rounded" />
                                    <div className="h-2.5 w-2.5 bg-slate-200 rounded-full" />
                                </div>

                                {/* Mock Top Grid Cards - skeleton style */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="border border-slate-100/80 rounded-lg p-2.5 flex justify-between items-start bg-white shadow-sm">
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            <div className="h-[3px] w-10 bg-slate-200 rounded" />
                                            <div className="h-[3px] w-7 bg-slate-200 rounded" />
                                            <div className="h-[3px] w-8 bg-slate-200 rounded" />
                                        </div>
                                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-400 flex-shrink-0 rotate-45" />
                                    </div>
                                    <div className="border border-slate-100/80 rounded-lg p-2.5 flex justify-between items-start bg-white shadow-sm">
                                        <div className="flex flex-col gap-1.5 flex-1">
                                            <div className="h-[3px] w-12 bg-slate-200 rounded" />
                                            <div className="h-[3px] w-8 bg-slate-200 rounded" />
                                            <div className="h-[3px] w-6 bg-slate-200 rounded" />
                                        </div>
                                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-400 border-r-slate-400 flex-shrink-0" />
                                    </div>
                                </div>

                                {/* Mock Main Analytics & Scheduling Card */}
                                <div className="border border-slate-100 rounded-lg p-2.5 flex-1 flex flex-col gap-2 shadow-sm bg-white min-h-0 overflow-hidden">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[7px] font-extrabold text-slate-400 uppercase tracking-wider">Output</span>
                                        <span className="text-[6.5px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">+12.3%</span>
                                    </div>

                                    {/* Line Chart */}
                                    <div className="h-[48px] relative flex items-end">
                                        <svg className="w-full h-full" viewBox="0 0 300 70" preserveAspectRatio="none">
                                            <defs>
                                                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#0f4c3a" stopOpacity="0.08" />
                                                    <stop offset="100%" stopColor="#0f4c3a" stopOpacity="0" />
                                                </linearGradient>
                                            </defs>
                                            {/* Grid lines */}
                                            <line x1="0" y1="15" x2="300" y2="15" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                                            <line x1="0" y1="35" x2="300" y2="35" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                                            <line x1="0" y1="55" x2="300" y2="55" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                                            {/* Chart Areas & Paths */}
                                            <path d="M 0,55 Q 50,25 100,45 T 200,20 T 300,10 L 300,70 L 0,70 Z" fill="url(#chartAreaGradient)" />
                                            {/* Secondary line */}
                                            <path d="M 0,60 Q 50,40 100,50 T 200,30 T 300,20" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2,2" />
                                            {/* Primary green line */}
                                            <path d="M 0,55 Q 50,25 100,45 T 200,20 T 300,10" fill="none" stroke="#0f4c3a" strokeWidth="2" strokeLinecap="round" />
                                            <circle cx="200" cy="20" r="3" fill="#0f4c3a" stroke="white" strokeWidth="1.5" />
                                        </svg>
                                    </div>

                                    {/* Mini Gantt Schedule Mockup */}
                                    <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-100">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[5.5px] font-bold text-slate-500 w-7 truncate">LINE A</span>
                                            <div className="flex-1 h-2.5 bg-slate-50 rounded border border-slate-100/60 relative overflow-hidden flex items-center">
                                                <div className="absolute left-[5%] w-[42%] h-2 bg-[#0f4c3a] rounded-sm text-[4px] text-white flex items-center justify-center font-bold">RUN-104</div>
                                                <div className="absolute left-[52%] w-[40%] h-2 bg-[#14664f] rounded-sm text-[4px] text-white flex items-center justify-center font-bold">RUN-105</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[5.5px] font-bold text-slate-500 w-7 truncate">LINE B</span>
                                            <div className="flex-1 h-2.5 bg-slate-50 rounded border border-slate-100/60 relative overflow-hidden flex items-center">
                                                <div className="absolute left-[10%] w-[32%] h-2 bg-[#0f4c3a] rounded-sm text-[4px] text-white flex items-center justify-center font-bold font-mono">RUN-201</div>
                                                <div className="absolute left-[47%] w-[45%] h-2 bg-amber-600/10 border border-amber-600/20 rounded-sm text-[4px] text-amber-800 flex items-center justify-center font-bold">MAINTENANCE</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>

            </div>
        </>
    );
}