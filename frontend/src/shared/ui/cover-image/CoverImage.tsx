import type { ImgHTMLAttributes } from "react";
import { cn } from "@/shared/lib/utils";

export interface CoverImageProps extends Omit<ImgHTMLAttributes<HTMLDivElement>, "src" | "width" | "height" | "placeholder"> {
    /** Canonical 1200-wide URL — `PostSummary.cover.src` (see `@portfolio/backend`'s `coverUrlFor`). */
    src: string;
    /** 640-wide `srcset` candidate for small viewports. Omit to render a plain single-source `<img>`. */
    srcNarrow?: string;
    /** Inline base64 data URI shown as the container's background until the real image paints over it — no JS, no load event, no layout component: an opaque WebP simply occludes it once loaded. */
    placeholder?: string;
    width: number;
    height: number;
    /** `"high"` for a detail page's hero (LCP candidate); left at the browser default (`"auto"`) for list/preview cards below the fold. */
    fetchPriority?: "high" | "low" | "auto";
    loading?: "eager" | "lazy";
}

/**
 * Post cover renderer — blur-up from an inline placeholder, explicit
 * `width`/`height` (zero CLS), a two-width `srcset`, and a plain `<img>`
 * rather than `next/image`: the optimizer's on-demand resize/reencode is
 * real CPU this app's 1-2 core VPS shouldn't spend on every request when
 * every size that will ever be needed is already pre-generated server-side
 * (see `backend/src/media/image-processing.ts`).
 *
 * `alt=""` + `role="presentation"` — deliberately decorative, the exact
 * opposite of `ImageBlock` (a post body image), where `alt` is required.
 * A generated mesh-gradient cover carries no information a screen reader
 * should announce.
 */
export function CoverImage({
    src,
    srcNarrow,
    placeholder,
    width,
    height,
    fetchPriority = "auto",
    loading = "lazy",
    className,
    ...rest
}: CoverImageProps) {
    return (
        <div
            className={cn("overflow-hidden bg-cover bg-center", className)}
            style={placeholder ? { backgroundImage: `url(${ placeholder })` } : undefined}
            {...rest}
        >
            <img
                src={src}
                srcSet={srcNarrow ? `${ srcNarrow } 640w, ${ src } 1200w` : undefined}
                sizes={srcNarrow ? "(max-width: 640px) 640px, 1200px" : undefined}
                width={width}
                height={height}
                alt=""
                role="presentation"
                loading={loading}
                fetchPriority={fetchPriority}
                decoding="async"
                className="block h-full w-full object-cover"
            />
        </div>
    );
}
