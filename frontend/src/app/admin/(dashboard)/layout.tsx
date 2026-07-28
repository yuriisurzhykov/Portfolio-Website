import { AdminNav } from "@/widgets/admin-nav";
import { requirePage } from "@/shared/lib/auth/guard";
import { SessionKeepAlive } from "@/shared/lib/session-keepalive";

/**
 * Chrome for every authenticated `/admin/*` page. Route-group name
 * `(dashboard)`, not part of the URL — `/admin/journal` resolves here the
 * same as it would without the group; the group exists purely to give
 * `/admin/login` (a sibling, outside this group) a different layout tree.
 *
 * `requirePage()` is called here for the common case — a fresh/full page
 * load, where it redirects before any of the shared chrome (`AdminNav`,
 * `SessionKeepAlive`) even renders, avoiding a flash of protected UI.
 *
 * WRONG FIRST HYPOTHESIS, corrected after a real PR review comment: this
 * comment used to claim this was the ONE place the check needed to live,
 * since a shared layout supposedly re-runs before every page beneath it.
 * That's not true for CLIENT-SIDE navigation — Next.js's App Router
 * deliberately does NOT re-render a shared layout on every navigation
 * between sibling pages under it (that persistence is the whole point of
 * nested layouts). If a session is invalidated after the initial render,
 * clicking a `Link` to another page in this group can reach that page's
 * Server Component — several of which call `@portfolio/backend` functions
 * directly (`getPostForAdmin`, `getWorkBySlug`, ...) — without this
 * layout re-running at all. Fixed by applying the SAME "each protected
 * access point defends itself" principle `defineAdminRoute` already uses
 * for every `/api/admin/**` route (see `guard.ts`'s own comment): every
 * `page.tsx` under this group that reads admin/unpublished data now also
 * calls `requirePage()` itself — that per-page call, not this one, is the
 * real security boundary. This one stays only for the fast-redirect UX.
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
