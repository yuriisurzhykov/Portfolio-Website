import type { ReactNode } from "react";
import { isDatabaseUnavailableError } from "@portfolio/backend";
import { ServiceUnavailable } from "@/shared/ui/service-unavailable";

/**
 * Every `app/**\/page.tsx` that fetches content needs the exact same
 * shape: fetch, render on success, show <ServiceUnavailable/> if (and only
 * if) the database was unreachable, otherwise let the error propagate to
 * the nearest error.tsx (a real bug, not an expected outage). Reused by
 * all 5 content-fetching pages — worth one shared helper instead of
 * copy-pasting the same try/catch into each route file.
 *
 * `isDatabaseUnavailableError(error)`, not `error instanceof
 * DatabaseUnavailableError` — see backend/src/errors.ts. Route Handlers
 * (web/src/shared/lib/api-error-response.ts) turned out to need this same
 * fix after `instanceof` silently failed there (different Next.js
 * compilation context than Server Components); using the name-based check
 * here too, even though `instanceof` happened to work in this context
 * during testing, so both call sites rely on the same robust check
 * instead of one being "correct by accident."
 */
export async function renderOrServiceUnavailable<T>(
    fetchData: () => Promise<T>,
    render: (data: T) => ReactNode,
): Promise<ReactNode> {
    try {
        const data = await fetchData();
        return render(data);
    } catch (error) {
        if (isDatabaseUnavailableError(error)) {
            return <ServiceUnavailable />;
        }
        throw error;
    }
}
