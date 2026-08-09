import { AdminNav } from "@/widgets/admin-nav";
import { requirePage } from "@/shared/lib/auth/guard";
import { SessionKeepAlive } from "@/shared/lib/session-keepalive";

// No `metadata` here: `app/admin/layout.tsx` declares `NOINDEX` for the
// whole /admin subtree, including `/admin/login`, which this route group
// deliberately does not cover.

/**
 * Chrome for every authenticated `/admin/*` page. Route-group name
 * `(dashboard)`, not part of the URL — `/admin/journal` resolves here the
 * same as it would without the group; the group exists purely to give
 * `/admin/login` (a sibling, outside this group) a different layout tree.
 *
 * `requirePage()` here only covers a fresh/full page load (fast redirect,
 * no flash of protected chrome) — it does NOT re-run on client-side
 * navigation between sibling pages (Next.js doesn't re-render a shared
 * layout for that). The real security boundary is per-page `requirePage()`
 * calls, added after a PR review caught pages reading admin data directly
 * without one — see `frontend/src/shared/lib/auth/README.md`.
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
