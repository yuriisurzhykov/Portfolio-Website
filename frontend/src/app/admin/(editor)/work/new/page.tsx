import { getPostsForAdmin, getSiteContent } from "@portfolio/backend";
import { WorkEditorPage } from "@/views/admin-work-editor";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
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
    // `techStack` names feed the Stack field's fuzzy-search suggestions
    // (`TokenCombobox`) — not required for the page to function (an admin
    // can still type free text with zero suggestions), so a DB outage here
    // shows the normal service-unavailable fallback rather than silently
    // rendering the editor with no suggestions at all.
    return renderOrServiceUnavailable(
        async () => {
            const [techStack, posts] = await Promise.all([getSiteContent("techStack"), getPostsForAdmin()]);
            return { techStack, posts };
        },
        ({ techStack, posts }) => (
            <WorkEditorPage
                techStackSuggestions={techStack.map((item) => item.name)}
                postOptions={posts.map((post) => ({ slug: post.slug, label: post.title.en }))}
            />
        ),
    );
}
