import type { ContentLocale } from "../content/locale";

/**
 * Bumped only when the RENDERING ALGORITHM changes in a way that should be
 * visible in `MediaAsset.generation` (see schema.prisma) — e.g. adopting a
 * new mesh-gradient technique. NOT bumped for a routine reroll (that's
 * `variant`, see below) or a category's hue changing (that's carried
 * separately, via `CoverBrief.hue`). Read by `covers.ts` when deciding
 * whether an existing `MediaAsset` can be reused, and folded into the PRNG
 * seed (`image-generator.ts`) so a style-version bump naturally produces a
 * different layout even for an unchanged slug.
 */
export const CURRENT_COVER_STYLE_VERSION = 1;

/**
 * What a cover generator needs to know about a post — described by the
 * MOST DEMANDING future implementation (a text-to-image AI adapter, Phase
 * 3), not the current procedural one. See `media/README.md`'s "Шов" entry
 * for why this shape is deliberate: `ProceduralImageGenerator` only reads
 * `seed`/`hue`/`variant`/`styleVersion`; a future `AiImageGenerator` reads
 * `title`/`sourceText`/`category`/`locale` instead. Neither implementation
 * breaks when the OTHER's fields are added or renamed, and adding the AI
 * adapter later never has to change this interface.
 */
export interface CoverBrief {
    /** What the PRNG is seeded from — a post's slug, optionally combined with `variant` (see `image-generator.ts`) so a reroll produces a different-but-still-deterministic layout. */
    seed: string;
    title: string;
    /** Plain-text excerpt/summary a future AI adapter would compress into a visual prompt — unused by `ProceduralImageGenerator` today, present because the port is shaped by its most demanding consumer, not its current one. */
    sourceText: string;
    /** English category name — hue lookup (`covers.ts`'s `resolveCategoryHue`) always happens on this, never the localized value; see that function's own comment for why. */
    category: string;
    /** Degrees, 0-360 — this category's assigned tone (`cover-hue.ts`'s `hueForOrdinal`), resolved by the caller before building the brief. */
    hue: number;
    locale: ContentLocale;
    styleVersion: number;
    /** Which layout attempt this is for an otherwise-unchanged post — incremented by a Phase 2 reroll action, defaults to 1 for a brand-new post. */
    variant: number;
}

export interface CoverBriefInput {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    hue: number;
    locale?: ContentLocale;
    variant?: number;
}

/** Assembles a `CoverBrief` from primitive fields already resolved by the caller (`covers.ts`) — this function does no I/O and knows nothing about `Post`/Prisma, only about the shape a generator needs. */
export function buildCoverBrief(input: CoverBriefInput): CoverBrief {
    return {
        seed: input.slug,
        title: input.title,
        sourceText: input.excerpt,
        category: input.category,
        hue: input.hue,
        locale: input.locale ?? "en",
        styleVersion: CURRENT_COVER_STYLE_VERSION,
        variant: input.variant ?? 1,
    };
}
