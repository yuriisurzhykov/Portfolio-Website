import { notFound } from "next/navigation";
import { getWorkTranslationForAdmin } from "@portfolio/backend";
import { WorkTranslatePage } from "@/views/admin-work-translate";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
    const { slug } = await params;

    return renderOrServiceUnavailable(
        async () => {
            const translation = await getWorkTranslationForAdmin(slug);
            if (!translation) {
                notFound();
            }
            return translation;
        },
        (translation) => <WorkTranslatePage translation={translation} />,
    );
}
