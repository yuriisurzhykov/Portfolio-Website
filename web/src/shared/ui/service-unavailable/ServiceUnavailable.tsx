"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n";

/**
 * Shown instead of crashing when the database is unreachable (see
 * backend/src/errors.ts + db/client.ts, and every `app/**\/page.tsx` that
 * catches `DatabaseUnavailableError`). A Client Component, not a Server
 * Component: it needs `useTranslation()` (Context) for the message and a
 * "Try again" button that re-runs the Server Component above it —
 * `router.refresh()` re-fetches the current route's Server Components
 * without a full page reload, which will show real content again as soon
 * as the database is reachable.
 *
 * Deliberately never shows `error.message`/stack details, even though this
 * component always knows it's specifically a DB-connectivity issue, not
 * some other bug — internal infrastructure details (hosts, ports, driver
 * names) have no reason to ever reach a visitor's browser.
 */
export function ServiceUnavailable() {
    const { ln } = useTranslation();
    const router = useRouter();

    return (
        <main className="min-h-[60vh] flex items-center justify-center px-[clamp(20px,4vw,56px)]">
            <div className="max-w-[480px] text-center flex flex-col items-center gap-md">
                <Text as="h1" variant="h2">
                    {ln("error.serviceUnavailable.title")}
                </Text>
                <Text variant="body" tone="muted">
                    {ln("error.serviceUnavailable.description")}
                </Text>
                <Button variant="secondary" onClick={() => router.refresh()} className="mt-sm">
                    {ln("error.serviceUnavailable.retry")}
                </Button>
            </div>
        </main>
    );
}
