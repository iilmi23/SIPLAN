import { Link } from "@inertiajs/react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

export default function Breadcrumb({ items = [] }) {
    return (
        <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm" aria-label="Breadcrumb">
            <span className="text-gray-600 dark:text-slate-400">Menu</span>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;

                return (
                    <div key={`${item.label}-${index}`} className="flex items-center gap-2">
                        <ChevronRightIcon className="h-4 w-4 text-gray-400 dark:text-slate-600" />
                        {item.href && !isLast ? (
                            <Link href={item.href} className="text-gray-600 transition-colors hover:text-[#1D6F42] dark:text-slate-400 dark:hover:text-emerald-300">
                                {item.label}
                            </Link>
                        ) : (
                            <span className={isLast ? "font-medium text-gray-800 dark:text-slate-100" : "text-gray-600 dark:text-slate-400"}>
                                {item.label}
                            </span>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}
