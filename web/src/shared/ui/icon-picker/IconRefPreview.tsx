"use client";

import * as React from "react";
import { DynamicIcon } from "lucide-react/dynamic";
import { cn } from "@/shared/lib/utils";
import type { IconRef } from "@portfolio/backend";
import { isKnownLucideIconName } from "./lucide-icon-names";

export interface IconRefPreviewProps {
    icon: IconRef | undefined;
    className?: string;
}

/**
 * The one place that decides "does this `IconRef` actually render" —
 * shared verbatim by the public landing card and the admin form's live
 * preview (`IconPickerField`), so the two can never silently disagree
 * about whether a given value shows up. That's the direct fix for the bug
 * this feature exists for: before, nothing rendered anything, so nobody
 * could tell "no icon configured" apart from "icon configured but broken."
 *
 * Every branch that can't confidently render something real — `type:
 * "none"`, a missing `icon` (legacy content; belt-and-suspenders on top
 * of the schema's own `.default()`), a `type: "url"` whose image fails to
 * load, or a `type: "icon"` name that isn't a real Lucide icon (typo, or
 * one Lucide has since renamed/removed) — falls back to the same neutral
 * box this section rendered before this feature existed, never a broken
 * image glyph or a crash.
 */
export function IconRefPreview({ icon, className }: IconRefPreviewProps) {
    const urlValue = icon?.type === "url" ? icon.value : undefined;
    const [urlFailed, setUrlFailed] = React.useState(false);
    // React's own "adjust state when a prop changes" pattern (setState
    // during render, guarded by comparing against the previous render's
    // value in a ref) — not a `useEffect`, on purpose: an effect-based
    // reset here would set state *after* an extra render has already
    // painted with the stale `urlFailed`, and lint (`react-hooks/set-state-
    // in-effect`) flags exactly that as an avoidable cascading render.
    // Resets the "did this URL fail" flag whenever the URL itself changes
    // (including switching away from "url" mode entirely) — otherwise a
    // previously-broken URL would keep suppressing the image forever, even
    // after the admin corrects it to a working one.
    const lastUrlValueRef = React.useRef(urlValue);
    if (lastUrlValueRef.current !== urlValue) {
        lastUrlValueRef.current = urlValue;
        if (urlFailed) {
            setUrlFailed(false);
        }
    }

    const showImage = !!urlValue && !urlFailed;
    const iconName = icon?.type === "icon" && isKnownLucideIconName(icon.value) ? icon.value : null;

    return (
        <div className={cn("bg-surface-icon rounded-md flex items-center justify-center overflow-hidden shrink-0", className)}>
            {showImage && (
                // eslint-disable-next-line @next/next/no-img-element -- admin-supplied, arbitrary-domain icon URL; matches the existing `<img>` convention used for admin-authored content elsewhere (see ContentBlocks.tsx), not an asset next/image can optimize.
                <img src={urlValue} alt="" className="w-full h-full object-contain" onError={() => setUrlFailed(true)} />
            )}
            {!showImage && iconName && <DynamicIcon name={iconName} className="w-1/2 h-1/2 text-text-primary" />}
        </div>
    );
}
