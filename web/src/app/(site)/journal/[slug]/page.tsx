import { notFound } from "next/navigation";
import { getPostBySlug, getWorkBySlug } from "@portfolio/backend";
import { JournalDetailPage } from "@/views/journal-detail";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    return renderOrServiceUnavailable(
        async () => {
            const post = await getPostBySlug(slug);
            if (!post) {
                notFound();
            }
            const relatedWork = post.relatedWorkSlug ? await getWorkBySlug(post.relatedWorkSlug) : null;
            return { post, relatedWork };
        },
        ({ post, relatedWork }) => <JournalDetailPage post={post} relatedWork={relatedWork} />,
    );
}
