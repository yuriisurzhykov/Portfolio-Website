"use client";

import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { sanitizeSvg } from "@/shared/lib/sanitize-svg";
import type { TechIconProps } from "./TechIcon.types";

/**
 * tech-icon
 * ---------
 * Renders an already-resolved `TechIconView` (`shared/lib/tech-icons`) —
 * never resolves anything itself, so it never touches `simple-icons`
 * (only a type-only import of `TechIconView` crosses that boundary, which
 * TypeScript erases at compile time — see that slice's README for why the
 * resolution step has to stay server-side).
 *
 * `kind: "path"` renders `fill="currentColor"` on purpose, not the
 * brand's own hex color — every Simple Icons path is monochrome-ready by
 * construction, so `text-*` utilities on an ancestor (hover/active/focus
 * accent states) apply directly to the logo with no extra machinery.
 * `kind: "svg"` (raw, admin-pasted markup) is NOT recolored this way —
 * respects whatever colors the pasted markup already has, same as
 * `kind: "url"` (an external image can't be recolored via `currentColor`
 * either). `kind: "none"` renders nothing (`null`), not an empty
 * placeholder box — callers (`TechStack.tsx`) filter these out before
 * ever building a list item, so this case is mostly defensive.
 *
 * Every branch defaults to `w-full h-full` — size this component by
 * wrapping it in a sized element (a `<span className="w-8 h-8">`, or a
 * parent that's already sized, like `TechStack.tsx`'s `Link`/`span`), NOT
 * by passing a width/height utility through `className` here. Found live:
 * `cn()` (`shared/lib/utils.ts`) is a plain `clsx`, not `tailwind-merge`
 * — passing e.g. `className="w-8 h-8"` doesn't override the internal
 * `w-full`/`h-full`, it sits ALONGSIDE it in the class list, and whichever
 * of the two conflicting utilities happens to come later in the compiled
 * stylesheet wins the cascade — not whichever was more "specific" or
 * intended as an override. `className` is still fine for anything that
 * doesn't collide (`text-*` color utilities, since `kind: "path"` reads
 * `currentColor`).
 */
export function TechIcon({ icon, className }: TechIconProps) {
    if (icon.kind === "none") {
        return null;
    }

    if (icon.kind === "url") {
        return (
            // eslint-disable-next-line @next/next/no-img-element -- admin-supplied, arbitrary-domain icon URL, same convention as IconRefPreview.tsx.
            <img src={icon.src} alt="" className={cn("w-full h-full object-contain", className)} />
        );
    }

    if (icon.kind === "svg") {
        return <SanitizedSvg markup={icon.markup} className={className} />;
    }

    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn("w-full h-full", className)} aria-hidden>
            <path d={icon.d} />
        </svg>
    );
}

/**
 * Split out from `TechIcon` itself because `dompurify` needs a real DOM
 * (`window`) to sanitize with — unavailable during SSR. Verified live, not
 * assumed: a plain `require("dompurify")` call in a bare Node process (no
 * jsdom) throws `DOMPurify.sanitize is not a function` — there's no window
 * for it to bind to automatically. Same "render a deterministic default on
 * the very first render (server AND client both agree: nothing yet), then
 * correct it in a `useEffect` after mount" pattern this repo's hydration
 * lesson already established for `localStorage`-dependent initial state —
 * NOT a `typeof window === "undefined"` branch in the render body, which
 * that same lesson found causes a hydration mismatch (server and the
 * client's OWN first render would disagree on which branch to take).
 *
 * Practical effect: a `kind: "svg"` logo pops in a frame or two after
 * hydration instead of being present in the initial HTML — an acceptable
 * trade for the rare, admin-pasted-markup fallback case (`type: "auto"`/
 * `"brand"` icons, the common path, render immediately as inline
 * `<path>`, untouched by this).
 */
function SanitizedSvg({ markup, className }: { markup: string; className?: string }) {
    const [sanitized, setSanitized] = React.useState<string | null>(null);

    React.useEffect(() => {
        setSanitized(sanitizeSvg(markup));
    }, [markup]);

    if (!sanitized) {
        return null;
    }

    return (
        <span
            className={cn("inline-block w-full h-full [&_svg]:w-full [&_svg]:h-full", className)}
            // eslint-disable-next-line react/no-danger -- `sanitized` just came out of DOMPurify's SVG profile above; this is the one place that markup is ever rendered.
            dangerouslySetInnerHTML={{ __html: sanitized }}
        />
    );
}
