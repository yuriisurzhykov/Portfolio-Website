import { filterWorkByTechSlug, findTechDisplayName, getAllWork, getSiteContent } from "@portfolio/backend";
import { WorkListPage } from "@/views/work-list";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

// See app/(site)/page.tsx's comment — same reasoning, this list page would
// otherwise be baked in at build time and miss new work items until a redeploy.
export const dynamic = "force-dynamic";

interface PageProps {
    /** Next.js 16 route props: `searchParams` is a Promise, same as `params` elsewhere in this app. */
    searchParams: Promise<{ tech?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
    const { tech } = await searchParams;

    return renderOrServiceUnavailable(
        () => Promise.all([getAllWork(), getSiteContent("workPage")]),
        ([allItems, workPage]) => {
            // Filtering client-side over an already-fetched, already-small
            // list (see tech-slug.ts's own comment on `filterWorkByTechSlug`)
            // — no second query, `tech` is just a JS-level view of the same
            // `allItems` this page already loaded.
            const items = tech ? filterWorkByTechSlug(allItems, tech) : allItems;
            const activeTech = tech ? { slug: tech, label: findTechDisplayName(allItems, tech) ?? tech } : null;

            return <WorkListPage items={items} workPage={workPage} activeTech={activeTech} />;
        },
    );
}
