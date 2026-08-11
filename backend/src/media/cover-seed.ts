/**
 * Deterministic PRNG seeded from an arbitrary string — no `Math.random`
 * anywhere in the cover-generation pipeline, so the exact same input (a
 * post's slug, plus styleVersion/variant — see `image-generator.ts`)
 * produces byte-for-byte the same "random" sequence in every process, on
 * every rebuild, forever (see `media/README.md`'s determinism invariant).
 *
 * Two small, well-known public-domain algorithms (both from
 * https://github.com/bryc/code, released public domain — not worth an npm
 * dependency for ~20 lines of bit-twiddling):
 *
 * - cyrb128: a fast, well-distributed string hash, used only to turn an
 *   arbitrary-length string into four 32-bit seed integers.
 * - sfc32: a small, fast 32-bit PRNG taking those four integers as its
 *   internal state.
 *
 * Neither is cryptographic, deliberately — nothing here needs to resist an
 * adversary choosing slugs to attack the layout; the only requirement is
 * "deterministic, and looks reasonably random across a handful of covers."
 */

/** cyrb128 — hashes an arbitrary string to four 32-bit integers. */
function cyrb128(value: string): [number, number, number, number] {
    let h1 = 1779033703;
    let h2 = 3144134277;
    let h3 = 1013904242;
    let h4 = 2773480762;
    for (let i = 0; i < value.length; i++) {
        const k = value.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= h2 ^ h3 ^ h4;
    h2 ^= h1;
    h3 ^= h1;
    h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** One PRNG draw, in `[0, 1)` — call repeatedly for a sequence, same contract as `Math.random`. */
export type Prng = () => number;

/** sfc32 — a small, fast 32-bit PRNG seeded by four integers. */
function sfc32(seedA: number, seedB: number, seedC: number, seedD: number): Prng {
    let a = seedA;
    let b = seedB;
    let c = seedC;
    let d = seedD;
    return function next(): number {
        a >>>= 0;
        b >>>= 0;
        c >>>= 0;
        d >>>= 0;
        let t = (a + b) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        d = (d + 1) | 0;
        t = (t + d) | 0;
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
    };
}

/**
 * The pipeline's single entry point: string in, deterministic PRNG out.
 * Every other pure module in this slice (`cover-palette.ts`,
 * `cover-composition.ts`) takes a `Prng`, never a raw string — this is the
 * only place that knows how a string becomes randomness.
 */
export function prngFromSeed(seed: string): Prng {
    const [a, b, c, d] = cyrb128(seed);
    return sfc32(a, b, c, d);
}

/** One draw in `[min, max)`. */
export function randomInRange(prng: Prng, min: number, max: number): number {
    return min + prng() * (max - min);
}

/** One INTEGER draw in `[min, max]` (inclusive on both ends). */
export function randomInt(prng: Prng, min: number, max: number): number {
    return Math.floor(randomInRange(prng, min, max + 1));
}
