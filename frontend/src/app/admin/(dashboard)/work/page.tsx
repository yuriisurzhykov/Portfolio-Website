import { getWorkForAdmin } from "@portfolio/backend";
import { AdminWorkListPage } from "@/views/admin-work-list";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { requirePage } from "@/shared/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * `requirePage()` here, not just in the shared layout — see
 * `journal/[slug]/edit/page.tsx`'s comment for why. `getWorkForAdmin()`,
 * not the public `getAllWork()` — same reasoning as `journal/page.tsx`.
 */
export default async function Page() {
    await requirePage();
    return renderOrServiceUnavailable(
        () => getWorkForAdmin(),
        (items) => <AdminWorkListPage items={items} />,
    );
}
