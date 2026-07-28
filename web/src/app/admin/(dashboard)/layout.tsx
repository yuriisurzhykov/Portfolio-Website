import { AdminNav } from "@/widgets/admin-nav";
import { requirePage } from "@/shared/lib/auth/guard";
import { SessionKeepAlive } from "@/shared/lib/session-keepalive";

/**
 * Chrome for every authenticated `/admin/*` page. Route-group name
 * `(dashboard)`, not part of the URL — `/admin/journal` resolves here the
 * same as it would without the group; the group exists purely to give
 * `/admin/login` (a sibling, outside this group) a different layout tree.
 *
 * `requirePage()` is called exactly HERE, once — not repeated in every
 * `page.tsx` under this group. Next.js renders a shared layout for every
 * page beneath it, so this is the one place that's guaranteed to run
 * before ANY of the ~10 pages in this group render, the same "one check,
 * reused everywhere" principle `defineAdminRoute` applies to Route
 * Handlers (see `web/src/shared/lib/auth/guard.ts`). `proxy.ts` no longer
 * makes this decision — see its own top comment for why.
 */
export default async function AdminDashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    await requirePage();

    return (
        <div className="min-h-screen flex flex-col">
            <SessionKeepAlive />
            <AdminNav />
            <div className="flex-1 px-[clamp(16px,4vw,56px)] py-xl max-w-(--layout-content-max-width-wide) w-full mx-auto">
                {children}
            </div>
        </div>
    );
}
