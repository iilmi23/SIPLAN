import { Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { MoonIcon, SunIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/ThemeContext';

const SIDEBAR_EXPANDED_W = 240;
const SIDEBAR_COLLAPSED_W = 68;

export default function Topbar({ sidebarOpen, setSidebarOpen }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef();
    const user = usePage().props.auth?.user;
    const { isDark, toggleTheme } = useTheme();
    const leftOffset = sidebarOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;
    const headerStyle = {
        left: leftOffset,
        transition: 'left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
    };

    useEffect(() => {
        function handleClick(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (!user) {
        return (
            <header
                className="fixed right-0 top-0 z-50 h-16 border-b border-gray-200 bg-white transition-colors duration-300 dark:border-slate-700/40 dark:bg-[#111827]"
                style={headerStyle}
            >
                <div className="flex h-full items-center justify-between px-5 md:px-6">
                    <div className="text-gray-700 dark:text-slate-200">Loading...</div>
                </div>
            </header>
        );
    }

    const roleLabel = {
        admin: 'Admin',
        ppc: 'PPC',
    }[user.role] ?? 'User';

    return (
        <header
            className="fixed right-0 top-0 z-50 h-16 border-b border-gray-200 bg-white transition-colors duration-300 dark:border-slate-700/40 dark:bg-[#111827]"
            style={headerStyle}
        >
            <div className="flex h-full items-center justify-between px-5 md:px-6">
                <div className="flex items-center gap-5">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="text-gray-600 hover:text-[#1D6F42] dark:text-slate-300 dark:hover:text-emerald-400 md:hidden"
                        aria-label="Toggle sidebar"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-colors hover:border-[#1D6F42]/30 hover:bg-gray-50 hover:text-[#1D6F42] dark:border-slate-700/60 dark:bg-[#172033] dark:text-slate-200 dark:hover:border-emerald-400/40 dark:hover:bg-slate-700 dark:hover:text-emerald-300"
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        title={isDark ? 'Light mode' : 'Dark mode'}
                    >
                        {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                    </button>

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setOpen(!open)}
                            className="flex items-center gap-3 rounded-xl px-3 py-1.5 transition-all hover:bg-gray-50 dark:hover:bg-[#172033]"
                        >
                            <div className="relative">
                                <img
                                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'User')}&background=1D6F42&color=fff&size=128`}
                                    alt={user?.name ?? 'User'}
                                    className="h-10 w-10 rounded-full border-2 border-gray-200 object-cover dark:border-slate-700"
                                />
                                <UserCircleIcon className="absolute inset-0 h-10 w-10 text-[#1D6F42]/30 opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>

                            <div className="hidden flex-col items-start md:flex">
                                <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">{user?.name ?? 'User'}</span>
                                <span className="text-xs text-gray-500 dark:text-slate-400">{roleLabel}</span>
                            </div>

                            <svg
                                className={`h-4 w-4 text-gray-500 transition-transform dark:text-slate-400 ${open ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {open && (
                            <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-slate-700/60 dark:bg-[#111827]">
                                <div className="bg-[#1D6F42] p-5 text-white">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'User')}&background=1D6F42&color=fff&size=128`}
                                            alt={user?.name ?? 'User'}
                                            className="h-12 w-12 rounded-full border-2 border-white/30"
                                        />
                                        <div>
                                            <p className="font-semibold">{user?.name ?? 'User'}</p>
                                            <p className="mt-0.5 text-xs text-green-100">{user?.email ?? ''}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-2">
                                    <Link
                                        href={route('profile.edit')}
                                        className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-gray-700 transition-colors hover:bg-gray-50 hover:text-[#1D6F42] dark:text-slate-200 dark:hover:bg-[#172033] dark:hover:text-emerald-300"
                                    >
                                        <UserCircleIcon className="h-5 w-5" />
                                        <span>Profile</span>
                                    </Link>

                                    <div className="my-2 border-t border-gray-100 dark:border-slate-700/40"></div>

                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        <span>Logout</span>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
