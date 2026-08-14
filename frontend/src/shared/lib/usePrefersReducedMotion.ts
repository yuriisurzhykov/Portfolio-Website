"use client";

import * as React from "react";

/**
 * `false` on the very first render, on both server and client — same
 * hydration-safety reasoning as `theme.context.tsx`'s `getInitialPreference`:
 * branching on `window.matchMedia` during render itself (not inside an
 * effect) would make the server's render and the client's first render
 * disagree the moment a visitor's OS actually has reduced motion enabled,
 * which is exactly the shape of bug React's hydration-mismatch warning
 * exists to catch. The effect below corrects it immediately after mount,
 * client-only, and keeps listening for the setting changing mid-session.
 */
export function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

    React.useEffect(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");

        const handleChange = () => setPrefersReducedMotion(media.matches);
        handleChange();

        media.addEventListener("change", handleChange);
        return () => media.removeEventListener("change", handleChange);
    }, []);

    return prefersReducedMotion;
}
