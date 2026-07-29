"use client";

import { useRouter } from "next/navigation";
import { StatusPage } from "@/shared/ui/status-page";

/**
 * Shown instead of crashing when the database is unreachable (see
 * backend/src/errors.ts + db/client.ts, and every `app/**\/page.tsx` that
 * catches `DatabaseUnavailableError`). A Client Component, not a Server
 * Component: it needs a "Try again" button that re-runs the Server
 * Component above it — `router.refresh()` re-fetches the current route's
 * Server Components without a full page reload, which will show real
 * content again as soon as the database is reachable.
 *
 * Renders the same `StatusPage` used by `/error/503` (see
 * `shared/ui/status-page/README.md`) — the copy/design lives in exactly
 * one place; this component now only supplies the retry behavior specific
 * to being embedded mid-page rather than visited directly.
 *
 * Deliberately never shows `error.message`/stack details, even though this
 * component always knows it's specifically a DB-connectivity issue, not
 * some other bug — internal infrastructure details (hosts, ports, driver
 * names) have no reason to ever reach a visitor's browser.
 */
export function ServiceUnavailable() {
    const router = useRouter();
    return <StatusPage code={503} onRetry={() => router.refresh()} />;
}
