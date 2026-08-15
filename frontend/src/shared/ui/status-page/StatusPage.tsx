"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/shared/ui/card";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { IconBadge } from "@/shared/ui/icon-badge";
import { Text } from "@/shared/ui/text";
import { Button, LinkButton } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n";
import { isSafeRelativePath } from "@/shared/lib";
import { RU_PREFIX } from "@/shared/lib/locale-constants";
import { STATUS_CONTENT, type StatusAction, type StatusCode } from "./status-content";

export interface StatusPageProps {
    code: StatusCode;
    /**
     * Called instead of navigating for the "retry" action (429/500/503 —
     * see `status-content.ts`) — lets an embedded caller (e.g.
     * `ServiceUnavailable`, `(site)/error.tsx`'s `reset()`) retry in place
     * instead of a full navigation. Omit for a standalone `/error/[code]`
     * visit, where retrying means navigating to `from` (see below) if
     * it's known, or a plain refresh otherwise.
     */
    onRetry?: () => void;
    /** Seconds until a rate limit/outage is expected to clear (429/503 only) — folded into the description as a countdown when known. */
    retryAfterSeconds?: number;
    /**
     * The page the visitor was actually trying to reach — `/admin/login`
     * gets it as `?from=` for the "signIn" action (401, mirroring
     * `requirePage()`'s own handling), and the "retry" action (429)
     * navigates to it directly instead of just refreshing the exempt
     * `/error/[code]` route itself (found live: without this, "Try
     * again" on a standalone `/error/429` visit refreshed the SAME error
     * page forever, even long after the rate limit had actually reset).
     * Always arrives via a URL query string (`proxy.ts`'s redirect, or a
     * direct/shared link) — validated with `isSafeRelativePath` before
     * ever being used as a navigation target, since a shared link means
     * this value is attacker-controllable, regardless of who originally
     * put it there.
     */
    from?: string;
}

/**
 * The one shared visual for every "fun" HTTP status page — one `Card`
 * layout, driven entirely by `STATUS_CONTENT[code]`, reused across every
 * call site: standalone (`app/error/[code]/page.tsx`), Next.js's own
 * `not-found.tsx`/`(site)/not-found.tsx` convention for 404, and embedded
 * in place of a page's own content (`ServiceUnavailable` for 503,
 * `(site)/error.tsx` for 500) — so the design/copy lives in exactly one
 * place instead of being copy-pasted per call site. See this slice's
 * README.md for why 400/401/403/501 only exist at `/error/<code>` and
 * aren't wired into a live redirect the way 404/429/500/503 are.
 */
export function StatusPage({ code, onRetry, retryAfterSeconds, from }: StatusPageProps) {
    const { ln, language } = useTranslation();
    const router = useRouter();
    const content = STATUS_CONTENT[code];

    const description = retryAfterSeconds
        ? ln(`error.status.${code}.descriptionWithRetry`, { seconds: retryAfterSeconds })
        : ln(`error.status.${code}.description`);

    // NOT a hardcoded "/" — found live (a Russian 404, `/ru/journal/x`,
    // renders this page in Russian, but a plain "/" home link would drop
    // the `/ru` prefix the moment it's followed, silently switching the
    // visitor back to English). Mirrors `LanguageSegmentedToggle`'s own
    // `RU_PREFIX`-based href construction for the same reason.
    const homeHref = language === "ru" ? RU_PREFIX : "/";

    function handleRetry() {
        if (onRetry) {
            onRetry();
            return;
        }
        if (isSafeRelativePath(from)) {
            router.push(from);
            return;
        }
        router.refresh();
    }

    return (
        <main className="h-full flex-1 flex items-center justify-center px-[clamp(20px,4vw,56px)] py-2xl">
            <Card variant="filled" className="w-full max-w-120 p-xl flex flex-col items-center text-center gap-md">
                <IconBadge icon={content.icon} tone={content.tone} size="lg" />
                <Eyebrow tone="accent">
                    {`HTTP ${code} · ${ln(`error.status.${code}.caption`)}`}
                </Eyebrow>
                <Text as="h1" variant="h2">
                    {ln(`error.status.${code}.title`)}
                </Text>
                <Text variant="body" tone="muted">
                    {description}
                </Text>
                <div className="flex flex-col items-center gap-sm mt-sm">
                    <PrimaryAction
                        action={content.action}
                        from={from}
                        homeHref={homeHref}
                        onRetry={handleRetry}
                        retryLabel={ln("button.tryAgain")}
                        signInLabel={ln("button.signIn")}
                        homeLabel={ln("button.backHome")}
                    />
                    {content.action !== "home" && (
                        <LinkButton href={homeHref} variant="ghost" size="sm">
                            {ln("button.backHome")}
                        </LinkButton>
                    )}
                </div>
            </Card>
        </main>
    );
}

interface PrimaryActionProps {
    action: StatusAction;
    from?: string;
    homeHref: string;
    onRetry: () => void;
    retryLabel: string;
    signInLabel: string;
    homeLabel: string;
}

function PrimaryAction({ action, from, homeHref, onRetry, retryLabel, signInLabel, homeLabel }: PrimaryActionProps) {
    if (action === "retry") {
        return <Button variant="secondary" onClick={onRetry}>{retryLabel}</Button>;
    }
    if (action === "signIn") {
        const href = from ? `/admin/login?from=${encodeURIComponent(from)}` : "/admin/login";
        return <LinkButton href={href} variant="secondary">{signInLabel}</LinkButton>;
    }
    return <LinkButton href={homeHref} variant="secondary">{homeLabel}</LinkButton>;
}
