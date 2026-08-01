import { WorkEditorPage } from "@/views/admin-work-editor";
import { requirePage } from "@/shared/lib/auth/guard";

export const dynamic = "force-dynamic";

/**
 * `requirePage()` here, not just in the shared layout — see
 * `journal/[slug]/edit/page.tsx`'s comment for why. Missing until
 * 2026-07-31 (Phase 3 cleanup): this page previously relied entirely on
 * the shared `(dashboard)/layout.tsx` check, unlike its `journal/new`
 * sibling — an inconsistency, not a deliberate exception, fixed here.
 */
export default async function Page() {
    await requirePage();
    return <WorkEditorPage />;
}
