import { useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import Sidebar from '@/Components/Admin/Sidebar';
import Topbar from '@/Components/Admin/Topbar';

// Harus sama persis dengan konstanta di Sidebar.jsx
const SIDEBAR_EXPANDED_W  = 240; // px — saat sidebarOpen = true
const SIDEBAR_COLLAPSED_W = 68;  // px — saat sidebarOpen = false

export default function AdminLayout({ title, children }) {
    const { url } = usePage();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const getTitleFromUrl = (url) => {
        if (!url) {
            return null;
        }

        const path = url.split('?')[0];

        if (path === '/dashboard') {
            return 'Dashboard';
        }
        if (path.startsWith('/sr/upload')) {
            return 'Upload SR';
        }
        if (path.includes('/ports')) {
            return 'Ports';
        }
        if (path.startsWith('/ports')) {
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
        if (path.startsWith('/settings')) {
            return 'Settings';
        }
        if (path.startsWith('/profile')) {
            return 'Profile';
        }

        return null;
    };

    const pageTitle = title || getTitleFromUrl(url);
    const headTitle = pageTitle ? `${pageTitle} | SIPLAN` : 'SIPLAN';

    const offset = sidebarOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;

    return (
        <>
            <Head>
                <title>{headTitle}</title>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                <link rel="alternate icon" href="/favicon.ico" />
                <meta name="csrf-token" content={usePage().props.csrf_token} />
            </Head>

            <div className="flex min-h-screen bg-gray-50 text-gray-900 transition-colors duration-300 dark:bg-[#0b1120] dark:text-slate-100">

                {/* Sidebar — fixed, tidak ikut flow */}
                <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                {/* Main Content — diberi margin-left agar tidak tertimpa sidebar */}
                <div
                    className="flex min-w-0 flex-1 flex-col"
                    style={{
                        marginLeft: offset,
                        transition: 'margin-left 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                >
                    {/* Topbar */}
                    <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

                    {/* Page Content */}
                    <main className="flex-1 overflow-auto bg-gray-50 pt-16 transition-colors duration-300 dark:bg-[#0b1120]">
                        {/* Sesuaikan dengan tinggi Topbar */}
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
