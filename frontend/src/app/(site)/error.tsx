"use client";

import * as React from "react";
import { Text } from "@/shared/ui/text";
import { Button } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n";

/**
 * Next.js's error boundary convention for this route segment — catches
 * anything that escapes rendering `/`, `/journal(/...)`, `/work(/...)`
 * that ISN'T the specific "database unreachable" case (that one is caught
 * earlier, per-page, via renderOrServiceUnavailable — see
 * shared/lib/render-with-fallback.tsx — and shows <ServiceUnavailable/>
 * directly without ever reaching this boundary). This is the generic
 * safety net for genuine bugs, so a real bug still shows a styled page
 * instead of Next's default error screen, and the ancestor layout
 * (Nav/Footer from app/(site)/layout.tsx) keeps rendering around it —
 * error.tsx only replaces the segment's own content, not its parents.
 *
 * Deliberately never renders `error.message` — Next.js redacts it in
 * production anyway (a Server Component error's real message never
 * reaches this client boundary outside development), and even in dev,
 * showing raw error internals to whoever's looking at the page isn't a
 * habit worth having on a component that also runs in production.
 */
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const { ln } = useTranslation();

    return (
        <main className="min-h-[60vh] flex items-center justify-center px-[clamp(20px,4vw,56px)]">
            <div className="max-w-[480px] text-center flex flex-col items-center gap-md">
                <Text as="h1" variant="h2">
                    {ln("error.generic.title")}
                </Text>
                <Text variant="body" tone="muted">
                    {ln("error.generic.description")}
                </Text>
                <Button variant="secondary" onClick={() => reset()} className="mt-sm">
                    {ln("error.generic.retry")}
                </Button>
            </div>
        </main>
    );
}
