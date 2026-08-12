import { notFound } from "next/navigation";
import { getDistinctPostCategories, getPostForAdmin, getWorkForAdmin } from "@portfolio/backend";
import { PostEditorPage } from "@/views/admin-post-editor";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { requirePage } from "@/shared/lib/auth/guard";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * `requirePage()` here too, not just in the shared layout — Next.js
 * preserves a shared layout across client-side navigation between
 * sibling pages under it, so the layout's own check isn't guaranteed to
 * re-run before THIS page's Server Component does (found via a real PR
 * review comment, not hypothetically). Same "each protected access point
 * defends itself" principle `defineAdminRoute` already applies to every
 * `/api/admin/**` route — see `guard.ts`'s own comment.
 */
export default async function Page({ params }: PageProps) {
    await requirePage();
    const { slug } = await params;

    return renderOrServiceUnavailable(
        async () => {
            const post = await getPostForAdmin(slug);
            if (!post) {
                notFound();
            }
            const [existingCategories, work] = await Promise.all([getDistinctPostCategories(), getWorkForAdmin()]);
            const workOptions = work.map((item) => ({ slug: item.slug, label: item.title.en }));
            return { post, existingCategories, workOptions };
        },
        ({ post, existingCategories, workOptions }) => <PostEditorPage initialPost={post} existingCategories={existingCategories} workOptions={workOptions} />,
    );
}
