import { getAllWork, getSiteContent } from "@portfolio/backend";
import { WorkListPage } from "@/views/work-list";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

// See app/(site)/page.tsx's comment — same reasoning, this list page would
// otherwise be baked in at build time and miss new work items until a redeploy.
export const dynamic = "force-dynamic";

export default async function Page() {
    return renderOrServiceUnavailable(
        () => Promise.all([getAllWork(), getSiteContent("workPage")]),
        ([items, workPage]) => <WorkListPage items={items} workPage={workPage} />,
    );
}
