import { useState, useEffect, type ReactNode } from 'react';
import { Head, usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Admin/Sidebar';
import Topbar from '@/Components/Admin/Topbar';
import type { SharedPageProps } from '@/types/global';
import { asset } from '@/utils';

const SIDEBAR_EXPANDED_W = 240;
const SIDEBAR_COLLAPSED_W = 68;

interface AdminLayoutProps {
    title?: string;
    children: ReactNode;
}

const getTitleFromUrl = (url?: string): string | null => {
    if (!url) {
        return null;
    }

    let path = url.split('?')[0];

    const getBasePath = (): string => {
        if (typeof window !== 'undefined') {
            const pathname = window.location.pathname;
            if (pathname.toLowerCase().startsWith('/siplan/public')) {
                return pathname.substring(0, 14);
            }
        }
        return '';
    };

    const base = getBasePath();
    if (base && path.startsWith(base)) {
        path = path.substring(base.length);
    }
    if (!path.startsWith('/')) {
        path = '/' + path;
    }

    if (path === '/dashboard') {
        return 'Dashboard';
    }
    if (path.startsWith('/sr/upload') || path.includes('/shipping-release/upload')) {
        return 'Upload SR';
    }
    if (path.startsWith('/unmapped-assy')) {
        return 'Unmapped Assy';
    }
    if (path.includes('/ports')) {
        return 'Ports';
    }
    if (path.startsWith('/customers')) {
        return 'Customers';
    }
    if (path.startsWith('/carline')) {
        return 'Car Line';
    }
    if (path.startsWith('/summary')) {
        return 'Summary';
    }
    if (path.startsWith('/spp')) {
        return 'SPP';
    }
    if (path.startsWith('/history')) {
        return 'History';
    }
    if (path.startsWith('/profile')) {
        return 'Profile';
    }
    if (path.startsWith('/users')) {
        return 'User Management';
    }
    if (path.startsWith('/sr-mapping-templates')) {
        return 'SR Templates';
    }
    if (path.startsWith('/production-week')) {
        return 'Production Week';
    }
    if (path.startsWith('/assy')) {
        return 'Assy';
    }

    return null;
};

export default function AdminLayout({ title, children }: AdminLayoutProps) {
    const { props, url } = usePage<SharedPageProps>();
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window === 'undefined') return true;
        const saved = localStorage.getItem('sidebarOpen');
        return saved !== null ? saved === 'true' : window.innerWidth >= 1024;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebarOpen', String(sidebarOpen));
        }
    }, [sidebarOpen]);

    const pageTitle = title || getTitleFromUrl(url);
    const headTitle = pageTitle ? `${pageTitle} | SIPLAN` : 'SIPLAN';
    const offset = sidebarOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;

    return (
        <>
            <Head>
                <title>{headTitle}</title>
                <link rel="icon" type="image/svg+xml" href={asset('favicon.svg')} />
                <link rel="alternate icon" href={asset('favicon.ico')} />
                <meta name="csrf-token" content={props.csrf_token ?? ''} />
            </Head>

            <div className="flex min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-[#0b1120] dark:text-slate-100">
                <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                <div
                    className="flex min-w-0 flex-1 flex-col"
                    style={{
                        marginLeft: offset,
                        transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                    <main className="flex-1 overflow-auto bg-gray-50 pt-16 transition-colors duration-300 dark:bg-[#0b1120]">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
