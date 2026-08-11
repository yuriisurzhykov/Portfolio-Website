import type { CoverBrief } from "./cover-brief";
import { buildCoverComposition, renderCoverSvg, COVER_HEIGHT, COVER_WIDTH } from "./cover-composition";
import { prngFromSeed } from "./cover-seed";

/**
 * The generator's raw output — bytes and a mime type, NOT an SVG string.
 * See `media/README.md`'s "Шов" entry: the port is shaped by its most
 * demanding future implementation (a Phase 3 AI adapter, which produces
 * real raster bytes straight from an image model), so the CURRENT
 * procedural generator has to meet that shape too, even though it happens
 * to build its bytes from an SVG string internally. `source` carries that
 * SVG markup through anyway (kept in `MediaAsset.generation.svgSource` — see
 * `covers.ts`) purely for debuggability; a generator with no equivalent
 * (a future AI adapter) simply omits it.
 */
export interface GeneratedImage {
    bytes: Buffer;
    mimeType: string;
    width: number;
    height: number;
    source?: string;
    /** Which generator produced this — `"procedural"` today, `"ai"` in Phase 3 — so `covers.ts` can record it in `MediaAsset.generation` without importing (or switching on) any concrete `ImageGenerator` class. */
    generatorId: string;
}

/**
 * The port. Deliberately asynchronous and able to reject, even though
 * today's only real implementation (`ProceduralImageGenerator`) never
 * awaits anything and never throws — see `media/README.md`'s "Шов" entry
 * for why the contract is written to the STRICT future consumer (network
 * calls, timeouts, provider error classification) rather than the current
 * lenient one. A synchronous, infallible interface here would make
 * `AiImageGenerator` (Phase 3) a breaking change instead of a new
 * implementation — this is Liskov substitution in the direction that
 * actually matters: the weak (procedural) implementation can satisfy the
 * strong (async, fallible) contract; the reverse is not generally true.
 */
export interface ImageGenerator {
    generate(brief: CoverBrief, signal?: AbortSignal): Promise<GeneratedImage>;
}

/**
 * Thrown by `FailingImageGenerator` and (in Phase 3) by a real provider
 * adapter on a classified failure — named by `.name`, not `instanceof`, for
 * the same cross-bundle reason as every other domain error in this package
 * (`backend/src/errors.ts`'s own comment on `DatabaseUnavailableError`).
 */
export class ImageGenerationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ImageGenerationError";
    }
}

export function isImageGenerationError(error: unknown): boolean {
    return error instanceof Error && error.name === "ImageGenerationError";
}

/**
 * Today's only real generator — synchronous math wrapped in the port's
 * async signature (see `ImageGenerator`'s own comment for why that
 * asymmetry is deliberate, not accidental). `brief.seed` is combined with
 * `styleVersion`/`variant` before seeding the PRNG, so a style-version bump
 * or a Phase-2 reroll produces a genuinely different layout for the exact
 * same post, not a silent no-op.
 */
export class ProceduralImageGenerator implements ImageGenerator {
    async generate(brief: CoverBrief): Promise<GeneratedImage> {
        const prng = prngFromSeed(`${ brief.seed }:${ brief.styleVersion }:${ brief.variant }`);
        const composition = buildCoverComposition(brief.hue, prng);
        const svg = renderCoverSvg(composition);

        return {
            bytes: Buffer.from(svg, "utf-8"),
            mimeType: "image/svg+xml",
            width: COVER_WIDTH,
            height: COVER_HEIGHT,
            source: svg,
            generatorId: "procedural",
        };
    }
}

/**
 * Always rejects — exists so the error-handling path through `covers.ts`
 * (an admin-triggered "Regenerate cover" call failing gracefully) has
 * something real to exercise in a test, WITHOUT having to wait for Phase 3's
 * real AI adapter to exist first. Also selectable via `IMAGE_GENERATOR=failing`
 * (see `getImageGenerator` below) for a manual end-to-end check of the same
 * path against a real running app.
 */
export class FailingImageGenerator implements ImageGenerator {
    constructor(private readonly reason: string = "Image generation is unavailable.") {}

    async generate(_brief: CoverBrief, _signal?: AbortSignal): Promise<GeneratedImage> {
        throw new ImageGenerationError(this.reason);
    }
}

let cachedGenerator: ImageGenerator | undefined;

/**
 * Env-factory, same shape as `auth/rate-limit.ts`'s `getRateLimiter()` —
 * picking the implementation is an environment-variable read, not a code
 * change, so dev/CI can keep running the free procedural generator while a
 * future production deploy points `IMAGE_GENERATOR` at a real AI adapter,
 * without a redeploy of anything BUT that env var. Defaults to
 * `ProceduralImageGenerator`: unlike `getRateLimiter()`, there is no
 * "misconfigured in production" failure mode to guard here — the
 * procedural generator is a completely legitimate, free, always-available
 * choice for production too (see media/README.md's phase-1 framing:
 * "Законченная фича, а не подготовка").
 */
export function getImageGenerator(): ImageGenerator {
    if (!cachedGenerator) {
        cachedGenerator = process.env.IMAGE_GENERATOR === "failing"
            ? new FailingImageGenerator()
            : new ProceduralImageGenerator();
    }
    return cachedGenerator;
}

/** Test-only escape hatch, same reasoning as `setRateLimiterForTesting`. */
export function setImageGeneratorForTesting(generator: ImageGenerator | undefined): void {
    cachedGenerator = generator;
}
