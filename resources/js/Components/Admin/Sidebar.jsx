import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

// ─────────────────────────────────────────────────────────────
// SVG Icons
// ─────────────────────────────────────────────────────────────
const Icons = {
    Dashboard: () => (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    ),
    Master: () => (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    ),
    // timechart: () => (
    //     <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
    //             d="M8 17H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3m-6 0h6m-6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
    //     </svg>
    // ),
     ProductionWeek: () => (
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M8 17H5a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3m-6 0h6m-6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
        </svg>
    ),
    Customers: () => (
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    Ports: () => (
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 004 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Carline: () => (
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    ),
    Assy: () => (
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    UploadSR: () => (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
    ),
    Summary: () => (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    SPP: () => (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    History: () => (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    // Settings: () => (
    //     <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
    //             d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    //         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
    //             d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    //     </svg>
    // ),
    Users: () => (
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
    ),
};

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
export const SIDEBAR_EXPANDED_W = 240;
export const SIDEBAR_COLLAPSED_W = 68;

const MENU_SECTIONS = [
    {
        label: 'MENU',
        items: [
            {
                name: 'Dashboard',
                icon: 'Dashboard',
                route: 'dashboard',
                permission: 'dashboard.view',
                roles: ['admin', 'ppc'],
            },
            {
                name: 'Masters',
                icon: 'Master',
                permission: 'masters.view',
                roles: ['admin', 'ppc'],
                submenu: [
                    // {
                    //     name: 'Time Chart',
                    //     icon: 'timechart',
                    //     route: 'timechart.index',
                    //     roles: ['admin'],
                    // },
                    {
                        name: 'Customers',
                        icon: 'Customers',
                        route: 'customers.index',
                        permission: 'customers.view',
                        roles: ['admin'],
                    },
                    {
                        name: 'Ports',
                        icon: 'Ports',
                        route: 'ports.index',
                        permission: 'ports.view',
                        roles: ['admin'],
                    },
                    {
                        name: 'SR Templates',
                        icon: 'Summary',
                        route: 'sr-mapping-templates.index',
                        permission: 'sr-templates.view',
                        roles: ['admin'],
                    },
                    {
                       name: 'Week',
                        icon: 'ProductionWeek',
                        route: 'production-week.index',
                        permission: 'production-week.view',
                        roles: ['admin', 'ppc'],
                    },
                    {
                        name: 'Carline',
                        icon: 'Carline',
                        route: 'carline.index',
                        permission: 'carline.view',
                        roles: ['admin', 'ppc'],
                    },
                    {
                        name: 'Assy',
                        icon: 'Assy',
                        route: 'assy.index',
                        permission: 'assy.view',
                        roles: ['admin', 'ppc'],
                    },
                ],
            },
        ],
    },
    {
        label: 'SHIPPING RELEASE',
        items: [
            {
                name: 'Upload SR',
                icon: 'UploadSR',
                route: 'sr.upload.page',
                permission: 'sr.upload',
                roles: ['admin', 'ppc'],
            },
            {
                name: 'Summary',
                icon: 'Summary',
                route: 'summary.index',
                permission: 'summary.view',
                roles: ['admin', 'ppc'],
            },
            {
                name: 'SPP',
                icon: 'SPP',
                route: 'spp',
                permission: 'spp.view',
                roles: ['admin', 'ppc'],
            },
            {
                name: 'History',
                icon: 'History',
                route: 'history',
                permission: 'history.view',
                roles: ['admin', 'ppc'],
            },
        ],
    },
    {
        label: 'SYSTEM',
        items: [
            {
                name: 'Users',
                icon: 'Users',
                route: 'users.index',
                permission: 'users.view',
                roles: ['admin'],
            },
            // {
            //     name: 'Settings',
            //     icon: 'Settings',
            //     route: 'settings',
            //     roles: ['admin'],
            // },
        ],
    },
];

// ─────────────────────────────────────────────────────────────
// Tooltip Component
// ─────────────────────────────────────────────────────────────
function Tooltip({ label }) {
    return (
        <div style={{
            position: 'absolute',
            left: 'calc(100% + 8px)',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#1c1c1e',
            color: '#fff',
            fontSize: '0.72rem',
            fontWeight: 500,
            padding: '5px 10px',
            borderRadius: 7,
            whiteSpace: 'nowrap',
            zIndex: 9999,
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            letterSpacing: '0.02em',
        }}>
            {label}
            <span style={{
                position: 'absolute',
                right: '100%', top: '50%',
                transform: 'translateY(-50%)',
                borderWidth: 5, borderStyle: 'solid',
                borderColor: 'transparent #1c1c1e transparent transparent',
            }} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Main Sidebar
// ─────────────────────────────────────────────────────────────
export default function Sidebar({ sidebarOpen, setSidebarOpen }) {
    const { url, props } = usePage();
    const { isDark } = useTheme();
    const [activeMenu, setActiveMenu] = useState('Dashboard');
    const [openSubmenu, setOpenSubmenu] = useState(null);
    const [hovered, setHovered] = useState(null);
    const user = props.auth?.user;

    // Guard: Jika user undefined (belum login atau auth tidak ter-share), jangan render sidebar
    if (!user) {
        return null;
    }

    const role = user.role ?? 'ppc';
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];

    const canAccess = (item, currentRole) => {
        const roleAllowed = !item.roles || item.roles.includes(currentRole);
        const permissionAllowed = !item.permission || permissions.length === 0 || permissions.includes(item.permission);

        return roleAllowed && permissionAllowed;
    };

    const filterItemsByPermission = (items, currentRole) => {
        return items
            .map((item) => {
                const visible = canAccess(item, currentRole);
                const submenu = item.submenu
                    ? filterItemsByPermission(item.submenu, currentRole)
                    : undefined;

                if (!visible && (!submenu || submenu.length === 0)) {
                    return null;
                }

                return {
                    ...item,
                    submenu,
                };
            })
            .filter(Boolean);
    };

    const menuSections = MENU_SECTIONS
        .map((section) => ({
            ...section,
            items: filterItemsByPermission(section.items, role),
        }))
        .filter((section) => section.items.length > 0);

    // Helper function untuk mendapatkan route URL dengan error handling
    const getRouteUrl = (routeName, params = {}) => {
        try {
            if (!routeName) return '#';
            if (typeof window.route === 'function') {
                return window.route(routeName, params);
            }
            return '#';
        } catch (error) {
            console.warn(`Route "${routeName}" not found:`, error);
            return '#';
        }
    };

    // Helper untuk cek apakah route active
    const isActive = (routeName) => {
        if (!routeName) return false;

        try {
            const currentUrl = url.split('?')[0];
            
            let routeUrl;
            try {
                if (typeof window.route === 'function') {
                    routeUrl = window.route(routeName).split('?')[0];
                } else {
                    return false;
                }
            } catch (e) {
                return false;
            }

            // ========== PERBAIKAN UTAMA ==========
            // Untuk menu Customers - hanya aktif jika URL tepat /customers atau /customers/{id}/edit
            // TIDAK aktif jika URL mengandung /ports
            if (routeName === 'customers.index') {
                // Jika URL mengandung /ports, maka bukan menu Customers yang aktif
                if (currentUrl.includes('/ports')) {
                    return false;
                }
                // Aktif jika URL = /customers atau /customers/{id} atau /customers/{id}/edit
                return currentUrl === '/customers' || 
                       (currentUrl.startsWith('/customers/') && !currentUrl.includes('/ports'));
            }
            
            // Untuk menu Ports - aktif jika URL /ports ATAU URL mengandung /ports (manage ports per customer)
            if (routeName === 'ports.index') {
                // Aktif jika URL = /ports (master data) ATAU URL mengandung /ports (manage ports)
                return currentUrl === '/ports' || currentUrl.includes('/ports');
            }

            // Untuk menu lain (Dashboard, Upload SR, Summary, dll)
            if (currentUrl === routeUrl) {
                return true;
            }

            // Pattern khusus untuk Upload SR
            if (routeName === 'sr.upload.page' && currentUrl.includes('/shipping-release/upload')) {
                return true;
            }

            if (routeUrl !== '/' && currentUrl.startsWith(routeUrl + '/')) {
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error in isActive:', error);
            return false;
        }
    };

    useEffect(() => {
        // Reset active menu based on current URL
        let found = false;

        for (const sec of menuSections) {
            for (const item of sec.items) {
                if (item.route && !item.submenu && isActive(item.route)) {
                    setActiveMenu(item.name);
                    setOpenSubmenu(null);
                    found = true;
                    break;
                }

                if (item.submenu) {
                    for (const sub of item.submenu) {
                        if (isActive(sub.route)) {
                            setActiveMenu(item.name);
                            setOpenSubmenu(item.name);
                            found = true;
                            break;
                        }
                    }
                }
                if (found) break;
            }
            if (found) break;
        }
    }, [url]);

    const toggleSub = (name) => setOpenSubmenu(prev => prev === name ? null : name);
    const sidebarW = sidebarOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W;
    const theme = {
        sidebarBg: isDark ? '#111827' : '#ffffff',
        border: isDark ? 'rgba(148, 163, 184, 0.26)' : '#e8eeea',
        softBorder: isDark ? 'rgba(148, 163, 184, 0.16)' : '#f0f4f2',
        text: isDark ? '#f8fafc' : '#1a1a1a',
        mutedText: isDark ? '#94a3b8' : '#444444',
        subtleText: isDark ? '#64748b' : '#b0b8b4',
        submenuText: isDark ? '#cbd5e1' : '#333333',
        submenuActiveBg: isDark ? 'rgba(52, 211, 153, 0.14)' : '#e8f5ed',
        divider: isDark ? 'linear-gradient(to right, transparent, rgba(148, 163, 184, 0.25), transparent)' : 'linear-gradient(to right, transparent, #dde8e2, transparent)',
        toggleBg: isDark ? '#172033' : '#f7fbf8',
        toggleColor: isDark ? '#34d399' : '#7aaa8a',
        shadow: isDark ? '1px 0 0 rgba(148, 163, 184, 0.16), 8px 0 28px rgba(0,0,0,0.18)' : '1px 0 0 #e8eeea, 4px 0 20px rgba(0,0,0,0.04)',
    };

    // Style helpers
    const itemStyle = (name, extra = {}) => {
        const act = activeMenu === name;
        return {
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: sidebarOpen ? '9px 12px' : '9px 0',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'none',
            fontFamily: 'inherit',
            fontSize: '0.85rem',
            fontWeight: act ? 600 : 400,
            letterSpacing: '0.01em',
            transition: 'background 0.18s, color 0.18s',
            background: act
                ? (isDark ? 'linear-gradient(135deg, #047857 0%, #059669 100%)' : 'linear-gradient(135deg, #1a6338 0%, #22854e 100%)')
                : 'transparent',
            color: act ? '#ffffff' : theme.text,
            boxShadow: act ? (isDark ? '0 8px 22px rgba(5,150,105,0.24)' : '0 3px 12px rgba(26,99,56,0.25)') : 'none',
            ...extra,
        };
    };

    const subItemStyle = (routeName) => {
        const act = isActive(routeName);
        return {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            borderRadius: 8,
            fontSize: '0.8rem',
            fontWeight: act ? 600 : 400,
            color: act ? (isDark ? '#34d399' : '#1a6338') : theme.submenuText,
            background: act ? theme.submenuActiveBg : 'transparent',
            textDecoration: 'none',
            transition: 'background 0.15s, color 0.15s',
            cursor: 'pointer',
        };
    };

    const sectionLabel = {
        display: 'block',
        fontSize: '0.6rem',
        fontWeight: 700,
        color: theme.subtleText,
        letterSpacing: '0.13em',
        textTransform: 'uppercase',
        padding: '0 14px',
        marginBottom: 5,
    };

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(3px)',
                        zIndex: 20,
                    }}
                    className="lg:hidden"
                />
            )}

            <aside className="siplan-sidebar" style={{
                position: 'fixed',
                top: 0, left: 0, bottom: 0,
                width: sidebarW,
                minWidth: sidebarW,
                background: theme.sidebarBg,
                display: 'flex',
                flexDirection: 'column',
                zIndex: 30,
                transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: theme.shadow,
                fontFamily: "'DM Sans','Segoe UI',sans-serif",
                overflowX: 'hidden',
                overflowY: 'auto',
            }}>

                {/* Logo */}
                <div style={{
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: sidebarOpen ? 'flex-start' : 'center',
                    padding: sidebarOpen ? '0 18px' : '0',
                    borderBottom: `1px solid ${theme.softBorder}`,
                    flexShrink: 0,
                }}>
                    <Link href={getRouteUrl('dashboard')} style={{ display: 'flex', alignItems: 'center' }}>
                        {sidebarOpen
                            ? <img src="/images/jai.jpg" alt="SIPLAN" style={{ height: 34, width: 'auto', objectFit: 'contain' }} />
                            : <img src="/images/jai.jpg" alt="SIPLAN" style={{ height: 30, width: 30, objectFit: 'contain' }} />
                        }
                    </Link>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '16px 8px', overflowX: 'hidden' }}>
                    {menuSections.map((sec) => (
                        <div key={sec.label} style={{ marginBottom: 20 }}>

                            {/* Section label */}
                            {sidebarOpen
                                ? <span style={sectionLabel}>{sec.label}</span>
                                : <div style={{
                                    height: 1,
                                    margin: '0 8px 8px',
                                    background: theme.divider,
                                }} />
                            }

                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {sec.items.map((item) => {
                                    const act = activeMenu === item.name;
                                    const hasSub = !!item.submenu;
                                    const subOpen = openSubmenu === item.name;
                                    const itemRoute = item.route ? getRouteUrl(item.route) : '#';

                                    return (
                                        <li key={item.name} style={{ position: 'relative' }}>

                                            {/* Main item */}
                                            {hasSub ? (
                                                <button
                                                    onClick={() => sidebarOpen && toggleSub(item.name)}
                                                    onMouseEnter={() => { if (!sidebarOpen) setHovered(item.name); }}
                                                    onMouseLeave={() => { if (!sidebarOpen) setHovered(null); }}
                                                    style={{
                                                        ...itemStyle(item.name),
                                                        justifyContent: sidebarOpen ? 'space-between' : 'center',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: sidebarOpen ? 10 : 0 }}>
                                                        <span style={{ color: act ? '#fff' : theme.mutedText, display: 'flex' }}>
                                                            {Icons[item.icon]?.()}
                                                        </span>
                                                        {sidebarOpen && <span>{item.name}</span>}
                                                    </div>
                                                    {sidebarOpen && (
                                                        <svg
                                                            style={{
                                                                width: 13, height: 13,
                                                                transform: subOpen ? 'rotate(180deg)' : 'none',
                                                                transition: 'transform 0.2s',
                                                                color: act ? '#fff' : theme.subtleText,
                                                                flexShrink: 0,
                                                            }}
                                                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    )}
                                                </button>
                                            ) : (
                                                <Link
                                                    href={itemRoute}
                                                    onMouseEnter={() => { if (!sidebarOpen) setHovered(item.name); }}
                                                    onMouseLeave={() => { if (!sidebarOpen) setHovered(null); }}
                                                    style={itemStyle(item.name)}
                                                >
                                                    <span style={{ color: act ? '#fff' : theme.mutedText, display: 'flex', flexShrink: 0 }}>
                                                        {Icons[item.icon]?.()}
                                                    </span>
                                                    {sidebarOpen && <span style={{ marginLeft: 10 }}>{item.name}</span>}
                                                </Link>
                                            )}

                                            {/* Tooltip when collapsed */}
                                            {!sidebarOpen && hovered === item.name && (
                                                <Tooltip label={item.name} />
                                            )}

                                            {/* Submenu */}
                                            {hasSub && sidebarOpen && subOpen && (
                                                <ul style={{
                                                    listStyle: 'none',
                                                    margin: '3px 0 3px 0',
                                                    padding: '4px 0 4px 12px',
                                                    borderLeft: `2px solid ${isDark ? 'rgba(52, 211, 153, 0.28)' : '#d4eadc'}`,
                                                    marginLeft: 20,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 2,
                                                }}>
                                                    {item.submenu.map((sub) => {
                                                        const subAct = isActive(sub.route);
                                                        const subRoute = getRouteUrl(sub.route);

                                                        return (
                                                            <li key={sub.name}>
                                                                <Link
                                                                    href={subRoute}
                                                                    style={subItemStyle(sub.route)}
                                                                >
                                                                    <span style={{ color: subAct ? (isDark ? '#34d399' : '#1a6338') : theme.subtleText, display: 'flex', flexShrink: 0 }}>
                                                                        {Icons[sub.icon]?.()}
                                                                    </span>
                                                                    {sub.name}
                                                                    {subAct && (
                                                                        <span style={{
                                                                            marginLeft: 'auto',
                                                                            width: 5, height: 5,
                                                                            borderRadius: '50%',
                                                                            background: isDark ? '#34d399' : '#1a6338',
                                                                            flexShrink: 0,
                                                                        }} />
                                                                    )}
                                                                </Link>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Collapse toggle */}
                <div style={{
                    padding: '12px 8px',
                    borderTop: `1px solid ${theme.softBorder}`,
                    display: 'flex',
                    justifyContent: sidebarOpen ? 'flex-end' : 'center',
                    flexShrink: 0,
                }}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title={sidebarOpen ? 'Collapse' : 'Expand'}
                        style={{
                            width: 30, height: 30,
                            borderRadius: 8,
                            border: `1.5px solid ${theme.border}`,
                            background: theme.toggleBg,
                            color: theme.toggleColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.18s',
                        }}
                    >
                        <svg
                            style={{ width: 13, height: 13, transform: sidebarOpen ? 'none' : 'rotate(180deg)', transition: 'transform 0.28s' }}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                </div>
            </aside>
        </>
    );
}
