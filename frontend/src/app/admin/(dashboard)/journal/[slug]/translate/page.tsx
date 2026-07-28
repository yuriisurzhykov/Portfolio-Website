import { notFound } from "next/navigation";
import { getPostTranslationForAdmin } from "@portfolio/backend";
import { PostTranslatePage } from "@/views/admin-post-translate";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
    const { slug } = await params;

    return renderOrServiceUnavailable(
        async () => {
            const translation = await getPostTranslationForAdmin(slug);
            if (!translation) {
                notFound();
            }
            return translation;
        },
        (translation) => <PostTranslatePage translation={translation} />,
    );
}
