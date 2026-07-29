"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/shared/ui/card";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { IconBadge } from "@/shared/ui/icon-badge";
import { Text } from "@/shared/ui/text";
import { Button, LinkButton } from "@/shared/ui/button";
import { useTranslation } from "@/shared/i18n";
import { STATUS_CONTENT, type StatusAction, type StatusCode } from "./status-content";

export interface StatusPageProps {
    code: StatusCode;
    /**
     * Called instead of `router.refresh()` for the "retry" action (429/
     * 500/503 — see `status-content.ts`) — lets an embedded caller (e.g.
     * `ServiceUnavailable`, `(site)/error.tsx`'s `reset()`) retry in place
     * instead of a full navigation. Omit for a standalone `/error/[code]`
     * visit, where a refresh IS the correct retry.
     */
    onRetry?: () => void;
    /** Seconds until a rate limit/outage is expected to clear (429/503 only) — folded into the description as a countdown when known. */
    retryAfterSeconds?: number;
    /** Where to send the visitor after signing in (401 only) — mirrors `requirePage()`'s own `?from=` handling. */
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
    const { ln } = useTranslation();
    const router = useRouter();
    const content = STATUS_CONTENT[code];

    const description = retryAfterSeconds
        ? ln(`error.status.${code}.descriptionWithRetry`, { seconds: retryAfterSeconds })
        : ln(`error.status.${code}.description`);

    return (
        <main className="min-h-[60vh] flex items-center justify-center px-[clamp(20px,4vw,56px)] py-2xl">
            <Card variant="filled" className="w-full max-w-[480px] p-xl flex flex-col items-center text-center gap-md">
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
                        onRetry={() => (onRetry ? onRetry() : router.refresh())}
                        retryLabel={ln("button.tryAgain")}
                        signInLabel={ln("button.signIn")}
                        homeLabel={ln("button.backHome")}
                    />
                    {content.action !== "home" && (
                        <LinkButton href="/" variant="ghost" size="sm">
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
    onRetry: () => void;
    retryLabel: string;
    signInLabel: string;
    homeLabel: string;
}

function PrimaryAction({ action, from, onRetry, retryLabel, signInLabel, homeLabel }: PrimaryActionProps) {
    if (action === "retry") {
        return <Button variant="secondary" onClick={onRetry}>{retryLabel}</Button>;
    }
    if (action === "signIn") {
        const href = from ? `/admin/login?from=${encodeURIComponent(from)}` : "/admin/login";
        return <LinkButton href={href} variant="secondary">{signInLabel}</LinkButton>;
    }
    return <LinkButton href="/" variant="secondary">{homeLabel}</LinkButton>;
}
