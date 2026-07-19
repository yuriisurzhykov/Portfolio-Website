import { getJournalEntries } from "@portfolio/backend";
import { JournalListPage } from "@/views/journal-list";
import { renderOrServiceUnavailable } from "@/shared/lib/render-with-fallback";

// See app/(site)/page.tsx's comment — same reasoning, this list page would
// otherwise be baked in at build time and miss new posts until a redeploy.
export const dynamic = "force-dynamic";

export default async function Page() {
    return renderOrServiceUnavailable(
        () => getJournalEntries(),
        (entries) => <JournalListPage entries={entries} />,
    );
}
