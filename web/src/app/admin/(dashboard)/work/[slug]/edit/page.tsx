import { notFound } from "next/navigation";
import { getWorkBySlug } from "@portfolio/backend";
import { WorkEditorPage } from "@/views/admin-work-editor";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ slug: string }>;
}

/** Reuses the public `getWorkBySlug` directly — see admin-work.ts's top-of-file comment on why `Work` has no separate admin-only read function. */
export default async function Page({ params }: PageProps) {
    const { slug } = await params;

    return renderOrServiceUnavailable(
        async () => {
            const item = await getWorkBySlug(slug);
            if (!item) {
                notFound();
            }
            return item;
        },
        (item) => <WorkEditorPage initialWork={item} />,
    );
}
