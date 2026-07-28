import { getJournalEntries } from "@portfolio/backend";
import { AdminJournalListPage } from "@/views/admin-journal-list";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

export const dynamic = "force-dynamic";

export default async function Page() {
    return renderOrServiceUnavailable(
        () => getJournalEntries(),
        (entries) => <AdminJournalListPage entries={entries} />,
    );
}
