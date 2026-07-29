import type { ComponentType } from "react";
import { Bug, Compass, Construction, FileWarning, Hourglass, KeyRound, ServerCrash, ShieldAlert } from "lucide-react";

/**
 * The 8 statuses this app deliberately gives a "fun" page to (see
 * shared/ui/status-page/README.md for which of these have a real call
 * site today vs. exist for consistency/future use). Kept as a `const`
 * tuple (not just the `StatusCode` union) so `parseStatusCode` below can
 * validate an arbitrary route param against it at runtime — a union type
 * alone only helps at compile time, and `/error/[code]`'s `code` comes
 * from the URL, which TypeScript can't narrow for us.
 */
export const STATUS_CODES = [400, 401, 403, 404, 429, 500, 501, 503] as const;
export type StatusCode = (typeof STATUS_CODES)[number];

/** Parses a route param (or any string) into a known `StatusCode`, or `null` if it isn't one of the 8 this app has a page for. */
export function parseStatusCode(value: string): StatusCode | null {
    const parsed = Number(value);
    return (STATUS_CODES as readonly number[]).includes(parsed) ? (parsed as StatusCode) : null;
}

export type StatusAction = "retry" | "signIn" | "home";

export interface StatusContent {
    icon: ComponentType<{ className?: string }>;
    /** Maps to `IconBadge`'s tone — `warning` for 4xx (the visitor's request), `error` for 5xx (this app's fault). */
    tone: "warning" | "error";
    action: StatusAction;
}

/**
 * The single source of truth for each status's icon/tone/primary action —
 * `StatusPage` reads this, `status-content.test.ts` asserts every code
 * maps to genuinely distinct content (see that file's comment for why
 * "renders without crashing" isn't enough of an assertion here).
 */
export const STATUS_CONTENT: Record<StatusCode, StatusContent> = {
    400: { icon: FileWarning, tone: "warning", action: "home" },
    401: { icon: KeyRound, tone: "warning", action: "signIn" },
    403: { icon: ShieldAlert, tone: "warning", action: "home" },
    404: { icon: Compass, tone: "warning", action: "home" },
    429: { icon: Hourglass, tone: "warning", action: "retry" },
    500: { icon: Bug, tone: "error", action: "retry" },
    501: { icon: Construction, tone: "error", action: "home" },
    503: { icon: ServerCrash, tone: "error", action: "retry" },
};
