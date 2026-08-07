"use client";

import * as React from "react";
import type { TechIcon } from "@portfolio/backend";
import type { TechIconView } from "@/shared/lib/tech-icons";
import { adminApi } from "@/shared/lib/admin-api";

export interface ResolvableTech {
    name: string;
    icon: TechIcon;
}

const DEBOUNCE_MS = 250;

/**
 * Everything — and ONLY what — a row's resolved logo actually depends on.
 * `name` is part of the key just for `type: "auto"`, because that's the
 * one variant `resolveTechIcon` guesses a slug from; renaming a row that
 * already has an explicit `brand`/`url`/`svg` icon can't change its logo,
 * so it must not trigger a re-resolve. Every `type: "none"` row shares one
 * key, so the whole list costs one lookup no matter how many there are.
 */
function resolutionKey({ name, icon }: ResolvableTech): string {
    switch (icon.type) {
        case "auto":
            return `auto:${ name.trim().toLowerCase() }`;
        case "none":
            return "none:";
        default:
            return `${ icon.type }:${ icon.value }`;
    }
}

export interface ResolvedTechIcons {
    /** Parallel to the input list. `null` means "not resolved yet" — deliberately distinct from `{ kind: "none" }` ("resolved, and there is no logo"), which is what the UI turns into a warning. */
    views: (TechIconView | null)[];
    /** At least one resolve request failed. The affected rows stay `null` (unknown) rather than being mislabelled as logo-less. */
    failed: boolean;
}

/**
 * Resolves every visible row's logo in ONE debounced request, and
 * remembers the answers for the lifetime of the page.
 *
 * Why a round-trip at all: `resolveTechIcon` reaches the `simple-icons`
 * catalog (~3450 icons, several MB), which must never enter a client
 * bundle — see `shared/lib/tech-icons/README.md`. Resolving through the
 * server is also what guarantees the editor's preview is literally the
 * same computation the public page runs, not a re-implementation that
 * can drift.
 *
 * Why it's still cheap while typing: the cache is keyed by
 * `resolutionKey` above, and only genuinely unknown keys are ever sent —
 * so editing one row's name in a 30-row list sends one item, not 30, and
 * only after the admin stops typing for {@link DEBOUNCE_MS}.
 *
 * A failed request marks its keys as attempted and does NOT retry: the
 * alternative is an error loop against a server that's already unhappy,
 * for a preview. Reloading the page retries.
 */
export function useResolvedTechIcons(items: readonly ResolvableTech[]): ResolvedTechIcons {
    const [resolved, setResolved] = React.useState<ReadonlyMap<string, TechIconView>>(() => new Map());
    const [failed, setFailed] = React.useState(false);
    const attempted = React.useRef(new Set<string>());

    // The effect reads the CURRENT items when its debounce finally fires,
    // not the ones from the render that scheduled it — a row edited twice
    // in quick succession should resolve its latest name, not its first.
    const itemsRef = React.useRef(items);
    itemsRef.current = items;

    const pendingSignature = [...new Set(items.map(resolutionKey))]
        .filter((key) => !resolved.has(key) && !attempted.current.has(key))
        .join("\u0000");

    React.useEffect(() => {
        if (!pendingSignature) {
            return;
        }
        const timeout = setTimeout(() => {
            const wanted = new Map<string, ResolvableTech>();
            for (const item of itemsRef.current) {
                const key = resolutionKey(item);
                if (!resolved.has(key) && !attempted.current.has(key)) {
                    wanted.set(key, item);
                }
            }
            if (wanted.size === 0) {
                return;
            }
            const keys = [...wanted.keys()];
            // Marked before the request, not in its `.then` — a re-render
            // while it's in flight recomputes `pendingSignature`, and
            // without this the same keys would be requested again.
            for (const key of keys) {
                attempted.current.add(key);
            }
            adminApi
                .resolveTechIcons([...wanted.values()].map(({ name, icon }) => ({ name, icon })))
                .then(({ views }) => {
                    setResolved((previous) => {
                        const next = new Map(previous);
                        keys.forEach((key, index) => {
                            const view = views[index];
                            if (view) {
                                next.set(key, view);
                            }
                        });
                        return next;
                    });
                })
                .catch(() => setFailed(true));
        }, DEBOUNCE_MS);
        // Only the timer is cancelled here, never an in-flight response —
        // dropping a response whose keys are already marked "attempted"
        // would leave those rows stuck on `null` forever.
        return () => clearTimeout(timeout);
    }, [pendingSignature, resolved]);

    return {
        views: items.map((item) => resolved.get(resolutionKey(item)) ?? null),
        failed,
    };
}
