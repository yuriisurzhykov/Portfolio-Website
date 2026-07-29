import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatusPage } from "@/shared/ui/status-page";
import { parseStatusCode } from "@/shared/ui/status-page/status-content";

interface PageProps {
    params: Promise<{ code: string }>;
    searchParams: Promise<{ retryAfter?: string; from?: string }>;
}

/**
 * Standalone landing spot for every "fun" status page (400/401/403/429/
 * 500/501/503 — see `shared/ui/status-page/README.md`). `proxy.ts`
 * redirects real browser navigations here on a 429; the rest (400/401/
 * 403/501, plus a direct visit to /error/429 or /error/503) are only
 * reachable by navigating here directly today — intentional, see that
 * README for which statuses have a live call site.
 *
 * Outside the `(site)` route group on purpose, matching `/admin/login` —
 * a full-bleed take on the design without the site's own Nav/Footer
 * competing for attention on what's meant to be a dead end, not a page
 * within the normal site structure.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { code } = await params;
    const parsed = parseStatusCode(code);
    return { title: parsed ? `${ parsed } — Error` : "Error" };
}

export default async function Page({ params, searchParams }: PageProps) {
    const { code } = await params;
    const parsedCode = parseStatusCode(code);
    if (!parsedCode) {
        notFound();
    }

    const { retryAfter, from } = await searchParams;
    const retryAfterSeconds = retryAfter ? Number(retryAfter) : undefined;

    return (
        <StatusPage
            code={parsedCode}
            retryAfterSeconds={Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined}
            from={from}
        />
    );
}
