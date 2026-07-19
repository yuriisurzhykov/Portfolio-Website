import { notFound } from "next/navigation";
import { getPostBySlug, getWorkBySlug } from "@portfolio/backend";
import { WorkDetailPage } from "@/views/work-detail";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;

    return renderOrServiceUnavailable(
        async () => {
            const item = await getWorkBySlug(slug);
            if (!item || !item.caseStudy) {
                notFound();
            }
            const relatedPost = item.relatedPostSlug ? await getPostBySlug(item.relatedPostSlug) : null;
            return { item, relatedPost };
        },
        ({ item, relatedPost }) => <WorkDetailPage item={item} relatedPost={relatedPost} />,
    );
}
