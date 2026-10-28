import sharp from "sharp";
import { prisma } from "../db/client";
import { isUniqueConstraintError } from "../errors";
import { sha256Hex } from "../media/content-hash";
import { getMediaStore } from "../media/media-store";
import { LinkFetchError, safeFetch, type SafeFetchOptions } from "./safe-fetch";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** Same 1200×630 frame the site's own covers and OG cards use (`media/image-processing.ts`). */
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const ICON_SIZE = 64;
const WEBP_QUALITY = 82;
const LQIP_WIDTH = 24;
/** Decompression-bomb guard: a 5 MB PNG can still claim to be 100 000 × 100 000 pixels. */
const MAX_INPUT_PIXELS = 40_000_000;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif"]);

export type LinkImageKind = "link-image" | "link-favicon";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

/**
 * Most `/favicon.ico` files are an ICO container sharp can't read. Modern
 * ones embed PNG frames, which it can — this pulls out the largest PNG
 * frame. A BMP-only ICO returns `null` (the card then shows its letter
 * tile instead of an icon), which is cheaper than a BMP decoder.
 */
export function pngFromIco(bytes: Buffer): Buffer | null {
    if (bytes.length < 6 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1) {
        return null;
    }
    const count = bytes.readUInt16LE(4);
    let best: { size: number; data: Buffer } | null = null;
    for (let index = 0; index < count; index++) {
        const entry = 6 + index * 16;
        if (entry + 16 > bytes.length) {
            break;
        }
        const width = bytes[entry] || 256;
        const length = bytes.readUInt32LE(entry + 8);
        const offset = bytes.readUInt32LE(entry + 12);
        const data = bytes.subarray(offset, offset + length);
        if (data.length === length && data.subarray(0, 4).equals(PNG_SIGNATURE) && (!best || width > best.size)) {
            best = { size: width, data };
        }
    }
    return best?.data ?? null;
}

/** Text-looking bytes are refused before sharp ever sees them — that's SVG (or an HTML error page), and untrusted SVG is never rasterized. */
function looksLikeMarkup(bytes: Buffer): boolean {
    return /^\s*</.test(bytes.subarray(0, 256).toString("latin1"));
}

interface Processed {
    bytes: Buffer;
    mimeType: string;
    extension: string;
    width: number;
    height: number;
    placeholder: string;
}

async function process(bytes: Buffer, kind: LinkImageKind): Promise<Processed> {
    const source = sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, animated: false });
    const metadata = await source.metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
        throw new LinkFetchError("Unsupported image format.");
    }

    if (kind === "link-favicon") {
        const icon = await source
            .clone()
            .resize(ICON_SIZE, ICON_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
        return { bytes: icon, mimeType: "image/png", extension: "png", width: ICON_SIZE, height: ICON_SIZE, placeholder: "" };
    }

    const card = await source.clone().resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" }).webp({ quality: WEBP_QUALITY }).toBuffer();
    const lqip = await source.clone().resize(LQIP_WIDTH).webp({ quality: 40 }).toBuffer();
    return {
        bytes: card,
        mimeType: "image/webp",
        extension: "webp",
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        placeholder: `data:image/webp;base64,${ lqip.toString("base64") }`,
    };
}

/**
 * Downloads one og:image or favicon through `safeFetch`, re-encodes it and
 * stores it as a `MediaAsset` (content-addressed, so the same favicon
 * linked from ten posts is one file). Returns the asset id, or `null` on
 * any failure — a missing picture never fails the whole preview, the card
 * just renders without it.
 *
 * Re-encoding is the point, not a side effect: what reaches readers is a
 * fresh WebP/PNG produced by sharp from decoded pixels, served from this
 * site's own `/media/…` — never the remote bytes, never a remote `<img>`.
 */
export async function storeLinkImage(url: string, kind: LinkImageKind, fetchOptions: Partial<SafeFetchOptions> = {}): Promise<string | null> {
    try {
        const response = await safeFetch(url, { ...fetchOptions, maxBytes: MAX_IMAGE_BYTES, accept: "image/*" });
        if (response.status >= 400 || response.truncated || looksLikeMarkup(response.body)) {
            return null;
        }
        const raw = pngFromIco(response.body) ?? response.body;
        const processed = await process(raw, kind);
        const contentHash = sha256Hex(processed.bytes);

        const existing = await prisma.mediaAsset.findUnique({ where: { contentHash }, select: { id: true } });
        if (existing) {
            return existing.id;
        }

        const storageKey = `links/${ contentHash }.${ processed.extension }`;
        await getMediaStore().put(storageKey, processed.bytes, processed.mimeType);
        // Two previews of the same site refreshing in parallel can both get
        // here for one favicon — the loser of the unique-hash race reuses
        // the winner's row (same bytes, same file) instead of failing.
        const asset = await prisma.mediaAsset.create({
            data: {
                contentHash,
                storageKey,
                mimeType: processed.mimeType,
                width: processed.width,
                height: processed.height,
                byteSize: processed.bytes.length,
                placeholder: processed.placeholder,
                kind,
                generation: { source: "link-preview", sourceUrl: url },
            },
        }).catch(async (error: unknown) => {
            if (!isUniqueConstraintError(error)) {
                throw error;
            }
            return prisma.mediaAsset.findUniqueOrThrow({ where: { contentHash }, select: { id: true } });
        });
        return asset.id;
    } catch {
        return null;
    }
}
