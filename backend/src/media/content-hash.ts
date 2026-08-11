import { createHash } from "node:crypto";

/**
 * sha256 of arbitrary bytes, as a lowercase hex string — the one hashing
 * primitive both `MediaAsset.contentHash` (schema.prisma) and its
 * content-addressed storage key (`covers/<hash>`, see `covers.ts`) build
 * on. Content-addressed naming is what makes regenerating a
 * byte-for-byte-identical cover (same slug, hue, styleVersion, variant) a
 * free dedup — a second `contentHash` lookup finds the existing row instead
 * of writing a second copy of the same pixels under a different `id`.
 *
 * Not cryptographically sensitive here (nothing secret is being hidden or
 * authenticated) — sha256 is used purely for its collision resistance at
 * this data's realistic scale, not as a security boundary.
 */
export function sha256Hex(bytes: Buffer | Uint8Array): string {
    return createHash("sha256").update(bytes).digest("hex");
}
