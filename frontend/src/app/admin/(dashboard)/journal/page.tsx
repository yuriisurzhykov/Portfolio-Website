import { getPostsForAdmin } from "@portfolio/backend";
import { AdminJournalListPage } from "@/views/admin-journal-list";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { requirePage } from "@/shared/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * `requirePage()` here, not just in the shared layout — see
 * `journal/[slug]/edit/page.tsx`'s comment for why. `getPostsForAdmin()`,
 * not the public `getJournalEntries()` — this list needs BOTH lifecycle
 * states (Draft/Published tabs, see `AdminJournalListPage`), while the
 * public function only ever returns PUBLISHED posts.
 */
export default async function Page() {
    await requirePage();
    return renderOrServiceUnavailable(
        () => getPostsForAdmin(),
        (entries) => <AdminJournalListPage entries={entries} />,
    );
}
