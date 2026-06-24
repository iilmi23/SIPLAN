export const asset = (path: string): string => {
    if (typeof window === 'undefined') {
        return path;
    }
    const pathname = window.location.pathname;
    const base = pathname.toLowerCase().startsWith('/siplan/public') ? pathname.substring(0, 14) : '';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
};
