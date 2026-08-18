import sharp, { type Sharp } from "sharp";
import { sha256Hex } from "./content-hash";

/** Canonical cover raster width — same 1200 as the OG card (`seo/og/render.tsx`'s `OG_SIZE`), so the two assets share one mental model of "how big is a cover" even though they're rendered by completely different pipelines. */
export const FULL_WIDTH = 1200;
/** Second `srcset` candidate for small viewports — see `CoverImage.tsx`. */
export const NARROW_WIDTH = 640;
const ASPECT_RATIO = 630 / 1200;
const WEBP_QUALITY = 82;
const LQIP_WIDTH = 24;
const LQIP_QUALITY = 40;

/**
 * SVG rasterized at the CSS-default 96dpi comes out visibly softer than a
 * 1200px-wide target deserves — librsvg (sharp's built-in SVG rasterizer)
 * renders at the SVG's own intrinsic pixel size unless told otherwise via
 * `density`. This value was picked empirically (not derived from a formula)
 * to land crisp 1200-wide output without oversampling for no visible
 * benefit; see media/README.md's "Проверить живьену" checklist — the actual
 * sharpness is a "look at it" check, not something a unit test can assert.
 */
const SVG_RASTER_DENSITY = 220;

export interface RasterVariant {
    width: number;
    height: number;
    bytes: Buffer;
    byteSize: number;
}

export interface ProcessedCover {
    /** sha256 of the FULL variant's bytes — what `covers.ts` dedups `MediaAsset` rows on. */
    contentHash: string;
    mimeType: string;
    width: number;
    height: number;
    /** Inline base64 data URI — small enough to store directly on `MediaAsset.placeholder` and use as `CoverImage`'s blur-up with no extra request. */
    placeholder: string;
    full: RasterVariant;
    narrow: RasterVariant;
}

/**
 * Rasterizes one generator's output (today: `ProceduralImageGenerator`'s
 * SVG bytes; Phase 3: real pixel bytes from an AI provider — this function
 * doesn't care which) into everything `covers.ts` needs to persist: the
 * canonical 1200-wide WebP, a 640-wide WebP for `srcset`, and an inline
 * LQIP. `fit: "cover"` on both variants means a source that ISN'T already
 * exactly 1200x630 (a future AI model's native output, say, square) still
 * comes out at the exact declared size — the CLS invariant this feature
 * exists to uphold (see media/README.md) never depends on the generator's
 * own aspect ratio being exactly right.
 */
export async function rasterizeCover(bytes: Buffer, mimeType: string): Promise<ProcessedCover> {
    const source = mimeType === "image/svg+xml" ? sharp(bytes, { density: SVG_RASTER_DENSITY }) : sharp(bytes);

    const full = await toWebpVariant(source, FULL_WIDTH);
    const narrow = await toWebpVariant(source, NARROW_WIDTH);
    const placeholder = await toPlaceholder(source);

    return {
        contentHash: sha256Hex(full.bytes),
        mimeType: "image/webp",
        width: full.width,
        height: full.height,
        placeholder,
        full,
        narrow,
    };
}

async function toWebpVariant(source: Sharp, width: number): Promise<RasterVariant> {
    const height = Math.round(width * ASPECT_RATIO);
    const bytes = await source
        .clone()
        .resize(width, height, { fit: "cover" })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    return { width, height, bytes, byteSize: bytes.length };
}

async function toPlaceholder(source: Sharp): Promise<string> {
    const bytes = await source
        .clone()
        .resize(LQIP_WIDTH)
        .webp({ quality: LQIP_QUALITY })
        .toBuffer();
    return `data:image/webp;base64,${ bytes.toString("base64") }`;
}

/**
 * Shared naming convention between the write side (`covers.ts`, via
 * `MediaStore.put`) and the read side (`coverUrlFor`) — `storageKeyPrefix`
 * (a bare content-hash path, no extension — see `MediaAsset.storageKey`)
 * becomes two real, servable file keys. Defined once here so the two sides
 * can never drift apart on the naming scheme.
 */
export function fullVariantKey(storageKeyPrefix: string): string {
    return `${ storageKeyPrefix }-${ FULL_WIDTH }.webp`;
}

export function narrowVariantKey(storageKeyPrefix: string): string {
    return `${ storageKeyPrefix }-${ NARROW_WIDTH }.webp`;
}
