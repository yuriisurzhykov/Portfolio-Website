import { notFound } from "next/navigation";
import { listPostRevisions } from "@portfolio/backend";
import { PostHistoryPage } from "@/views/admin-post-history";
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
            const revisions = await listPostRevisions(slug);
            if (!revisions) {
                notFound();
            }
            return revisions;
        },
        (revisions) => <PostHistoryPage slug={slug} revisions={revisions} />,
    );
}
