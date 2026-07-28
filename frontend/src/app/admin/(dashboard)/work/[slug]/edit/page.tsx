import { notFound } from "next/navigation";
import { getWorkBySlug } from "@portfolio/backend";
import { WorkEditorPage } from "@/views/admin-work-editor";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { requirePage } from "@/shared/lib/auth/guard";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ slug: string }>;
}

/**
 * Reuses the public `getWorkBySlug` directly — see admin-work.ts's
 * top-of-file comment on why `Work` has no separate admin-only read
 * function. `requirePage()` still runs here regardless — see
 * `journal/[slug]/edit/page.tsx`'s comment for why the shared layout's
 * own check alone isn't enough (client-side navigation between sibling
 * pages doesn't guarantee the layout re-renders).
 */
export default async function Page({ params }: PageProps) {
    await requirePage();
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
