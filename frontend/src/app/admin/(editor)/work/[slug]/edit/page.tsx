import { notFound } from "next/navigation";
import { getPostsForAdmin, getSiteContent, getWorkDetailForAdmin } from "@portfolio/backend";
import { WorkEditorPage } from "@/views/admin-work-editor";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { requirePage } from "@/shared/lib/auth/guard";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * Calls `getWorkDetailForAdmin`, not the public `getWorkBySlug` — see
 * admin-work.ts's top-of-file comment. Used to reuse the public function
 * directly (no admin-only read existed for `Work`); no longer valid since
 * the content lifecycle state machine (2026-07-31) made the public
 * function filter out DRAFT items, which would 404 this very page for
 * any work item not yet published. `requirePage()` still runs here
 * regardless — see `journal/[slug]/edit/page.tsx`'s comment for why the
 * shared layout's own check alone isn't enough (client-side navigation
 * between sibling pages doesn't guarantee the layout re-renders).
 */
export default async function Page({ params }: PageProps) {
    await requirePage();
    const { slug } = await params;

    return renderOrServiceUnavailable(
        async () => {
            const item = await getWorkDetailForAdmin(slug);
            if (!item) {
                notFound();
            }
            const [techStack, posts] = await Promise.all([getSiteContent("techStack"), getPostsForAdmin()]);
            return { item, techStack, posts };
        },
        ({ item, techStack, posts }) => (
            <WorkEditorPage
                initialWork={item}
                techStackSuggestions={techStack.map((tech) => tech.name)}
                postOptions={posts.map((post) => ({ slug: post.slug, label: post.title.en }))}
            />
        ),
    );
}
