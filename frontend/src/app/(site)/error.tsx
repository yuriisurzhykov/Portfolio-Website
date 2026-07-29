"use client";

import { StatusPage } from "@/shared/ui/status-page";

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
 * Renders the same `StatusPage` used by `/error/500` and by
 * `global-error.tsx` (see `shared/ui/status-page/README.md`) — `reset()`
 * is wired as `onRetry` so the "try again" action re-renders this segment
 * in place instead of a full navigation to `/error/500`.
 *
 * Deliberately never renders `error.message` — Next.js redacts it in
 * production anyway (a Server Component error's real message never
 * reaches this client boundary outside development), and even in dev,
 * showing raw error internals to whoever's looking at the page isn't a
 * habit worth having on a component that also runs in production.
 */
export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return <StatusPage code={500} onRetry={reset} />;
}
