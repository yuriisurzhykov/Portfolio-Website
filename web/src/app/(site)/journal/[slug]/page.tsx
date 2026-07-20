import { notFound } from "next/navigation";
import { getPostBySlug, getWorkBySlug } from "@portfolio/backend";
import { JournalDetailPage } from "@/views/journal-detail";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { getRequestLocale } from "@/shared/lib/get-request-locale";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const locale = await getRequestLocale();

    return renderOrServiceUnavailable(
        async () => {
            const post = await getPostBySlug(slug, locale);
            if (!post) {
                notFound();
            }
            // Related work's own body isn't rendered on this page (see
            // JournalDetailPage — only `summary`/`title`, both plain
            // `pick()`-resolved metadata) — locale doesn't need threading
            // through here at all.
            const relatedWork = post.relatedWorkSlug ? await getWorkBySlug(post.relatedWorkSlug) : null;
            return { post, relatedWork };
        },
        ({ post, relatedWork }) => <JournalDetailPage post={post} relatedWork={relatedWork} />,
    );
}
