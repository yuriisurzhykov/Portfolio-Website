import type { ForwardedRef, HTMLAttributes } from "react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface PlaceholderCoverProps extends HTMLAttributes<HTMLDivElement> {
    /** Image path (e.g. "/images/work/navigation-engine.jpg"). Omit to show the striped placeholder. */
    src?: string;
    alt?: string;
    /** Text shown centered inside the striped placeholder when there's no image. */
    label?: string;
}

/**
 * PlaceholderCover
 * -----------------
 * Cover image slot used by work cards / case studies. Renders the real
 * image when `src` is set; otherwise falls back to the diagonal-stripe
 * pattern from the approved design so unfinished content still looks
 * intentional. Swapping an image is: drop the file in
 * `public/images/...` and set `src` — no component change needed.
 */
export const PlaceholderCover = React.forwardRef<HTMLDivElement, PlaceholderCoverProps>(
    function PlaceholderCover(
        { src, alt = "", label, className, style, ...rest }: PlaceholderCoverProps,
        ref: ForwardedRef<HTMLDivElement>,
    ) {
        if (src) {
            return (
                <div ref={ref} className={cn("overflow-hidden", className)} style={style} {...rest}>
                    <img src={src} alt={alt} className="w-full h-full object-cover block" />
                </div>
            );
        }

        return (
            <div
                ref={ref}
                className={cn(
                    "flex items-center justify-center",
                    "font-mono text-micro text-text-faint",
                    className,
                )}
                style={{
                    backgroundImage:
                        "repeating-linear-gradient(135deg, var(--color-surface-placeholder-a), var(--color-surface-placeholder-a) 10px, var(--color-surface-placeholder-b) 10px, var(--color-surface-placeholder-b) 20px)",
                    ...style,
                }}
                {...rest}
            >
                {label}
            </div>
        );
    },
);

PlaceholderCover.displayName = "PlaceholderCover";
