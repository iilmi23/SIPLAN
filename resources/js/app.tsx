import '../css/app.css';
import './bootstrap';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './contexts/ThemeContext';
import type { RouteHelper, RouteParams } from './types/global';

const appName = import.meta.env.VITE_APP_NAME || 'SIPLAN';

createInertiaApp({
    title: (title) => title,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ThemeProvider>
                <App {...props} />
            </ThemeProvider>
        );
    },
    progress: {
        color: '#1D6F42',
    },
});

const ROUTES = {
    'sanctum.csrf-cookie': '/sanctum/csrf-cookie',
    dashboard: '/dashboard',
    shipments: '/shipments',
    'customers.index': '/customers',
    'customers.create': '/customers/create',
    'customers.store': '/customers',
    'customers.show': '/customers/{customer}',
    'customers.edit': '/customers/{customer}/edit',
    'customers.update': '/customers/{customer}',
    'customers.destroy': '/customers/{customer}',
    'customers.ports.index': '/customers/{customer}/ports',
    'customers.ports.create': '/customers/{customer}/ports/create',
    'customers.ports.store': '/customers/{customer}/ports',
    'customers.ports.show': '/customers/{customer}/ports/{port}',
    'customers.ports.edit': '/customers/{customer}/ports/{port}/edit',
    'customers.ports.update': '/customers/{customer}/ports/{port}',
    'customers.ports.destroy': '/customers/{customer}/ports/{port}',
    'sr-mapping-templates.index': '/sr-mapping-templates',
    'sr-mapping-templates.create': '/sr-mapping-templates/create',
    'sr-mapping-templates.store': '/sr-mapping-templates',
    'sr-mapping-templates.edit': '/sr-mapping-templates/{sr_mapping_template}/edit',
    'sr-mapping-templates.update': '/sr-mapping-templates/{sr_mapping_template}',
    'sr-mapping-templates.destroy': '/sr-mapping-templates/{sr_mapping_template}',
    'sr-mapping-templates.preview-excel': '/sr-mapping-templates/preview-excel',
    'sr-mapping-templates.validate-preview': '/sr-mapping-templates/validate-preview',
    'ports.index': '/ports',
    'carline.index': '/carline',
    'carline.importPage': '/carline/import',
    'carline.download-template': '/carline/download-template',
    'carline.getSheets': '/carline/get-sheets',
    'carline.previewSheet': '/carline/preview-sheet',
    'carline.import': '/carline/import',
    'carline.sync-sirep': '/carline/sync-sirep',
    'carline.create': '/carline/create',
    'carline.store': '/carline',
    'carline.show': '/carline/{carline}',
    'carline.edit': '/carline/{carline}/edit',
    'carline.update': '/carline/{carline}',
    'carline.destroy': '/carline/{carline}',
    'production-week.index': '/production-week',
    'production-week.create': '/production-week/create',
    'production-week.import-page': '/production-week/import',
    'production-week.store': '/production-week',
    'production-week.download-template': '/production-week/download-template',
    'production-week.import': '/production-week/import',
    'production-week.show': '/production-week/{week}',
    'production-week.edit': '/production-week/edit',
    'production-week.update': '/production-week/update',
    'production-week.destroy': '/production-week/delete',
    'assy.index': '/assy',
    'assy.importPage': '/assy/import',
    'assy.create': '/assy/create',
    'assy.store': '/assy',
    'assy.show': '/assy/{assy}',
    'assy.edit': '/assy/{assy}/edit',
    'assy.update': '/assy/{assy}',
    'assy.destroy': '/assy/{assy}',
    'assy.upload': '/assy/upload',
    'assy.toggle-status': '/assy/{assy}/toggle-status',
    'assy.download-template': '/assy/download-template/{carline_id}',
    'assy.download': '/assy/download/{assy}',
    'assy.getSheets': '/assy/get-sheets',
    'assy.previewSheet': '/assy/preview-sheet',
    'assy.import': '/assy/import-data',
    'assy.sync-sirep': '/assy/sync-sirep',
    'assy.quick-store': '/assy/quick-store',
    'assy.bulk-store': '/assy/bulk-store',
    'sr.upload.page': '/sr/upload',
    'sr.preview': '/preview',
    'sr.upload': '/sr/upload',
    'unmapped-assy.index': '/unmapped-assy',
    'unmapped-assy.remap': '/unmapped-assy/remap',
    'summary.index': '/summary',
    'summary.exportAll': '/summary/export',
    'summary.show': '/summary/{id}',
    'summary.data': '/summary/{id}/data',
    'summary.export': '/summary/{id}/export',
    'summary.rows.update': '/summary-rows/{summary}',
    'summary.periods.update': '/summary-periods',
    'summary.destroy': '/summary/{id}',
    'variance.index': '/variance',
    spp: '/spp',
    'spp.preview': '/spp/preview/{id}',
    'spp.store': '/spp/preview/{id}',
    'spp.exportDraftDirect': '/spp/export-draft/{id}',
    'spp.storeDirect': '/spp/store-direct/{id}',
    'spp.show': '/spp/{period}',
    'spp.export': '/spp/{period}/export',
    'spp.exportDraft': '/spp/export-draft',
    history: '/history',
    settings: '/settings',
    'profile.edit': '/profile',
    'profile.update': '/profile',
    'profile.destroy': '/profile',
    register: '/register',
    login: '/login',
    'password.request': '/forgot-password',
    'password.email': '/forgot-password',
    'password.reset': '/reset-password/{token}',
    'password.store': '/reset-password',
    'verification.notice': '/verify-email',
    'verification.verify': '/verify-email/{id}/{hash}',
    'verification.send': '/email/verification-notification',
    'password.confirm': '/confirm-password',
    'password.update': '/password',
    logout: '/logout',
    'users.index': '/users',
    'users.create': '/users/create',
    'users.store': '/users',
    'users.show': '/users/{user}',
    'users.edit': '/users/{user}/edit',
    'users.update': '/users/{user}',
    'users.destroy': '/users/{user}',
} as const;

type RouteName = keyof typeof ROUTES;

const getBasePath = (): string => {
    if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        if (pathname.toLowerCase().startsWith('/siplan/public')) {
            return pathname.substring(0, 14);
        }
    }
    return '';
};

const routeHelper = ((name?: string, params: RouteParams = {}, absolute = false) => {
    if (!name) {
        return routeHelper;
    }

    const uri = ROUTES[name as RouteName];
    if (!uri) {
        throw new Error(`Route "${name}" is not defined.`);
    }

    let url: string = uri;

    if (typeof params === 'string' || typeof params === 'number') {
        const placeholder = url.match(/{([^}]+)}/);
        if (placeholder) {
            url = url.replace(`{${placeholder[1]}}`, encodeURIComponent(params));
        }
    } else if (Array.isArray(params)) {
        let index = 0;
        url = url.replace(/{([^}]+)}/g, (_, key) => {
            const value = params[index++];
            if (value === undefined) {
                throw new Error(`Missing route parameter "${key}" for route "${name}".`);
            }
            return encodeURIComponent(value);
        });
    } else {
        url = url.replace(/{([^}]+)}/g, (_, key) => {
            if (params[key] === undefined) {
                throw new Error(`Missing route parameter "${key}" for route "${name}".`);
            }
            return encodeURIComponent(params[key]);
        });
    }

    const base = getBasePath();
    const resolvedUrl = `${base}${url}`;

    if (absolute) {
        return `${window.location.origin}${resolvedUrl}`;
    }

    return resolvedUrl;
}) as RouteHelper;

routeHelper.current = (name?: string) => {
    if (!name) {
        return false;
    }

    const currentPath = window.location.pathname;
    const targetPath = routeHelper(name);
    return currentPath === targetPath;
};

if (typeof window !== 'undefined') {
    window.route = routeHelper;
}
