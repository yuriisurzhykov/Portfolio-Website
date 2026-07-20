import { notFound } from "next/navigation";
import { getPostBySlug, getWorkBySlug } from "@portfolio/backend";
import { WorkDetailPage } from "@/views/work-detail";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { getRequestLocale } from "@/shared/lib/get-request-locale";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const locale = await getRequestLocale();

    return renderOrServiceUnavailable(
        async () => {
            const item = await getWorkBySlug(slug, locale);
            if (!item || !item.caseStudy) {
                notFound();
            }
            // Same reasoning as journal/[slug]/page.tsx — the related
            // post's own body isn't rendered here, just its pick()'d title/
            // excerpt, so its body-document locale doesn't matter.
            const relatedPost = item.relatedPostSlug ? await getPostBySlug(item.relatedPostSlug) : null;
            return { item, relatedPost };
        },
        ({ item, relatedPost }) => <WorkDetailPage item={item} relatedPost={relatedPost} />,
    );
}
