import { notFound } from "next/navigation";
import { getWorkTranslationForAdmin } from "@portfolio/backend";
import { WorkTranslatePage } from "@/views/admin-work-translate";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { requirePage } from "@/shared/lib/auth/guard";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ slug: string }>;
}

/** `requirePage()` here, not just in the shared layout — see `journal/[slug]/edit/page.tsx`'s comment for why. */
export default async function Page({ params }: PageProps) {
    await requirePage();
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
