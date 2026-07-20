import { getAllWork } from "@portfolio/backend";
import { AdminWorkListPage } from "@/views/admin-work-list";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

export const dynamic = "force-dynamic";

export default async function Page() {
    return renderOrServiceUnavailable(
        () => getAllWork(),
        (items) => <AdminWorkListPage items={items} />,
    );
}
