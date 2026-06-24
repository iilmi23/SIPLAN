import { Head, useForm, Link } from '@inertiajs/react';
import Checkbox from '@/Components/Checkbox';
import { useState } from 'react';
import { asset } from '@/utils';

export default function Login({ status }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const [showPassword, setShowPassword] = useState(false);

    const emailInputClass = `w-full h-11 pl-10 pr-4 bg-slate-50/80 border rounded-lg focus:bg-white focus:ring-4 transition-all duration-200 shadow-sm text-gray-900 text-sm placeholder:text-slate-400/80 focus:outline-none ${errors.email
        ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
        : 'border-slate-200 focus:ring-[#0f4c3a]/15 focus:border-[#0f4c3a]'
        }`;

    const passwordInputClass = `w-full h-11 pl-10 pr-10 bg-slate-50/80 border rounded-lg focus:bg-white focus:ring-4 transition-all duration-200 shadow-sm text-gray-900 text-sm placeholder:text-slate-400/80 focus:outline-none ${errors.password
        ? 'border-red-300 focus:ring-red-500/10 focus:border-red-500'
        : 'border-slate-200 focus:ring-[#0f4c3a]/15 focus:border-[#0f4c3a]'
        }`;

    const submit = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Login SIPLAN" />

            <div className="auth-page min-h-screen lg:h-screen flex flex-col lg:flex-row bg-[#FAFBFC] overflow-y-auto lg:overflow-hidden">

                {/* SISI KIRI: Form Login */}
                <div className="w-full lg:w-1/2 flex flex-col justify-center p-6 sm:p-8 md:p-10 lg:p-10 bg-white shadow-xl relative z-10">

                    {/* Centered Content Wrapper */}
                    <div className="w-full max-w-[360px] mx-auto flex flex-col justify-between min-h-[85vh] lg:min-h-0 lg:h-full">

                        {/* Header: Logos */}
                        <div className="flex justify-between items-center mb-5">
                            <img
                                src={asset('images/jai.jpg')}
                                className="h-9 max-w-[120px] object-contain"
                                alt="JAI Logo"
                            />
                            <img
                                src={asset('images/kampus.png')}
                                className="h-7 max-w-[90px] object-contain opacity-80"
                                alt="Kampus Logo"
                            />
                        </div>

                        {/* Form Container */}
                        <div className="my-auto py-4">
                            <div className="mb-6">
                                <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                                    Welcome Back!
                                </h1>
                                <p className="text-slate-500 text-xs mt-1.5 font-medium">
                                    Please enter your credentials to access SIPLAN
                                </p>
                            </div>

                            {status && (
                                <div className="mb-4 text-xs font-medium text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                    {status}
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-4">
                                {/* EMAIL */}
                                <div>
                                    <label className="text-[10px] text-slate-600 block mb-1.5 font-bold tracking-wider uppercase">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.57 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                                            </svg>
                                        </span>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            className={emailInputClass}
                                            placeholder="Enter your registered email"
                                            autoComplete="username"
                                            required
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="text-red-600 text-xs mt-1 font-medium">{errors.email}</p>
                                    )}
                                </div>

                                {/* PASSWORD */}
                                <div>
                                    <label className="text-[10px] text-slate-600 block mb-1.5 font-bold tracking-wider uppercase">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                            </svg>
                                        </span>

                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            className={passwordInputClass}
                                            placeholder="Enter your security password"
                                            autoComplete="current-password"
                                            required
                                        />

                                        {/* Show/Hide Button */}
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-[#0f4c3a] focus:outline-none transition-colors"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="text-red-600 text-xs mt-1 font-medium">{errors.password}</p>
                                    )}
                                </div>

                                {/* REMEMBER ME & FORGOT PASSWORD */}
                                <div className="flex items-center justify-between pt-0.5">
                                    <label className="flex items-center cursor-pointer select-none">
                                        <Checkbox
                                            checked={data.remember}
                                            onChange={(e) => setData('remember', e.target.checked)}
                                        />
                                        <span className="ml-2 text-xs text-slate-600 font-semibold">
                                            Remember Me
                                        </span>
                                    </label>

                                    <Link
                                        href={route('password.request')}
                                        className="text-[11px] text-[#0f4c3a] hover:text-[#0b382a] font-bold tracking-tight transition-all relative after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#0f4c3a] hover:after:w-full after:transition-all after:duration-200"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>

                                {/* BUTTON LOGIN */}
                                <div className="pt-1">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full h-11 bg-[#0f4c3a] hover:bg-[#0b382a] text-white rounded-lg font-bold transition-all duration-200 disabled:opacity-60 shadow-sm border border-transparent text-sm text-center hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] flex items-center justify-center gap-2 group"
                                    >
                                        {processing ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Signing In...
                                            </span>
                                        ) : (
                                            <>
                                                <span>Sign In</span>
                                                {/* <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4 transition-transform group-hover:translate-x-1">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                                </svg> */}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="text-center mt-auto">
                            <p className="text-[10px] text-slate-400 font-medium">
                                &copy; {new Date().getFullYear()} PT Jatim Autocomp Indonesia. All rights reserved.
                            </p>
                        </div>

                    </div>
                </div>

                {/* SISI KANAN: Visual & Dashboard Preview */}
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
                            {/* <span className="text-[9px] font-bold tracking-widest uppercase text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                Production Information System
                            </span> */}
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
