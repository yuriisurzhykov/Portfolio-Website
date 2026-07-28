import { getAllWork } from "@portfolio/backend";
import { AdminWorkListPage } from "@/views/admin-work-list";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";
import { requirePage } from "@/shared/lib/auth/guard";

export const dynamic = "force-dynamic";

/** `requirePage()` here, not just in the shared layout — see `journal/[slug]/edit/page.tsx`'s comment for why. */
export default async function Page() {
    await requirePage();
    return renderOrServiceUnavailable(
        () => getAllWork(),
        (items) => <AdminWorkListPage items={items} />,
    );
}
