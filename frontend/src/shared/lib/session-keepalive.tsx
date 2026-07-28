"use client";

import * as React from "react";
import { adminApi } from "@/shared/lib/admin-api";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes — well inside the 15-minute access-token TTL (backend/src/auth/jwt.ts).

/**
 * Mounted once in `app/admin/(dashboard)/layout.tsx`, so it runs for every
 * signed-in admin page. Proactively refreshes the session so an admin
 * mid-edit almost never sees the access token actually expire — the
 * reactive retry-once in `admin-api.ts`'s `request()` is the fallback for
 * whatever this misses (see its own comment).
 *
 * Deliberately gated on tab visibility, not a bare `setInterval` — a
 * refresh should only happen while the admin genuinely has the page open
 * and in front of them, not for a tab minimized/backgrounded for hours or
 * days: (1) truer to what "the session is in active use" actually means,
 * and (2) a forgotten background tab shouldn't be able to keep extending a
 * session indefinitely just by existing.
 */
export function useSessionKeepAlive(): void {
    // `null`, not `Date.now()` — a ref initializer runs during render,
    // where calling an impure function like `Date.now()` isn't allowed
    // (see the `react-hooks/purity` rule). The real starting timestamp is
    // set inside the effect below instead, which is exactly what effects
    // are for.
    const lastRefreshAtRef = React.useRef<number | null>(null);
    const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        lastRefreshAtRef.current ??= Date.now();

        async function refresh() {
            try {
                await adminApi.refresh();
                if (!cancelled) {
                    lastRefreshAtRef.current = Date.now();
                }
            } catch {
                // The refresh token itself is gone (expired/revoked) — no
                // amount of retrying helps. Sending the admin back to sign
                // in from exactly where they are, combined with autosave
                // (Phase 3 of the plan), is what makes "pick up right where
                // you left off" possible instead of just losing the moment.
                if (!cancelled) {
                    window.location.assign(`/admin/login?from=${ encodeURIComponent(window.location.pathname) }`);
                }
            }
        }

        function stopTimer() {
            if (timerRef.current !== null) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        function startTimer() {
            stopTimer();
            timerRef.current = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "hidden") {
                stopTimer();
                return;
            }
            const elapsedMs = Date.now() - (lastRefreshAtRef.current ?? 0);
            if (elapsedMs > REFRESH_INTERVAL_MS) {
                void refresh();
            }
            startTimer();
        }

        if (document.visibilityState === "visible") {
            startTimer();
        }
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            cancelled = true;
            stopTimer();
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);
}

/** Thin component form of `useSessionKeepAlive` — lets the (async, Server Component) dashboard layout mount it as plain JSX without itself needing to be a Client Component. */
export function SessionKeepAlive() {
    useSessionKeepAlive();
    return null;
}
