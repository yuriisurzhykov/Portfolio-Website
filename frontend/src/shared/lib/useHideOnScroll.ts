"use client";

import * as React from "react";

const DEFAULT_REVEAL_THRESHOLD_PX = 120;

/**
 * `true` once the visitor has scrolled down past `revealThresholdPx` AND
 * their most recent movement was downward; flips back to `false` the
 * moment they scroll up at all, or return near the top of the page.
 *
 * Will this be reused? Yes — deliberately extracted (unlike this file's
 * neighbors `useUrlHash`/`useScrollToLocation`, which stay local to their
 * one call site per YAGNI, see widgets/nav/README.md) because it's used by
 * BOTH the sticky header (hides itself) and the "back to top" button
 * (shows itself) — the exact inverse of the same condition, computed the
 * same way in two different components.
 */
export function useHideOnScroll(revealThresholdPx: number = DEFAULT_REVEAL_THRESHOLD_PX): boolean {
    const [hidden, setHidden] = React.useState(false);
    const lastScrollY = React.useRef(0);

    React.useEffect(() => {
        lastScrollY.current = window.scrollY;

        let rafId: number | null = null;

        // rAF-throttled: `scroll` can fire many times per frame — without
        // this, every one of those triggers a full `setHidden` + re-render
        // instead of at most once per painted frame.
        const handleScroll = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                const currentScrollY = window.scrollY;
                const scrolledDown = currentScrollY > lastScrollY.current;

                if (currentScrollY < revealThresholdPx) {
                    setHidden(false); // still in/near the hero — always visible
                } else {
                    setHidden(scrolledDown);
                }

                lastScrollY.current = currentScrollY;
            });
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [revealThresholdPx]);

    return hidden;
}
