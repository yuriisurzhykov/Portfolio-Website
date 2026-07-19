import { AdminNav } from "@/widgets/admin-nav";

/**
 * Chrome for every authenticated `/admin/*` page. Route-group name
 * `(dashboard)`, not part of the URL — `/admin/journal` resolves here the
 * same as it would without the group; the group exists purely to give
 * `/admin/login` (a sibling, outside this group) a different layout tree.
 */
export default function AdminDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className="min-h-screen flex flex-col">
            <AdminNav />
            <div className="flex-1 px-[clamp(16px,4vw,56px)] py-xl max-w-(--layout-content-max-width-wide) w-full mx-auto">
                {children}
            </div>
        </div>
    );
}
