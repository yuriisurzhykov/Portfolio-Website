"use client";

import * as React from "react";

/**
 * `false` on the very first render, on both server and client — same
 * hydration-safety reasoning as `usePrefersReducedMotion`/
 * `theme.context.tsx`'s `getInitialPreference`: reading `window.matchMedia`
 * during render itself would make the server's render and the client's
 * first render disagree the moment the query is actually true. The effect
 * below corrects it immediately after mount, client-only, and keeps
 * listening for the viewport crossing the query's threshold afterward —
 * `matchMedia`'s own `"change"` event already fires on live window
 * resizing, not just on load, so no separate `resize` listener is needed.
 *
 * Exists specifically so a component that's genuinely expensive to even
 * MOUNT (WebGL context, `requestAnimationFrame` loop, a `d3-force`
 * simulation — see `shared/ui/project-graph`) can be gated on the actual
 * viewport instead of only hidden with CSS: `className="hidden lg:block"`
 * alone still mounts the component and pays its full JS/GPU/battery cost
 * against a zero-sized, invisible container on every mobile visitor.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = React.useState(false);

    React.useEffect(() => {
        const media = window.matchMedia(query);

        const handleChange = () => setMatches(media.matches);
        handleChange();

        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, [query]);

    return matches;
}
