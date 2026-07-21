import { z } from "zod";
import { prisma } from "../db/client";
import { localizedTextSchema } from "./localized-text";
import { SITE_CONTENT_DEFAULTS } from "./site-content-defaults";

/**
 * Same reasoning as `localizedTextSchema` (`localized-text.ts`), just with
 * a non-string payload per language — `hero.chips` and `workPage.heading`
 * are each "a short ordered list of lines," localized as a whole list per
 * language (not one `{en, ru}` pair per line item — there's no stable id
 * to pair a Russian line to an English one across independent edits).
 */
function localizedArrayOf<T extends z.ZodTypeAny>(itemSchema: T) {
    return z.object({ en: z.array(itemSchema), ru: z.array(itemSchema) });
}

const heroContentSchema = z.object({
    headline: z.array(z.string()),
    subhead: localizedTextSchema,
    chips: localizedArrayOf(z.string()),
    graphNodes: z.array(
        z.object({
            label: z.string(),
            sublabel: localizedTextSchema,
            highlighted: z.boolean().optional(),
        }),
    ),
});

const contactContentSchema = z.object({
    heading: localizedTextSchema,
    description: localizedTextSchema,
});

/**
 * A per-item icon, shared across any list-shaped section that ever wants
 * one (currently just `principles`) — named `IconRef` rather than e.g.
 * `PrincipleIcon` for exactly that reason. `"none"` is a real, explicit
 * variant rather than an absent/optional `icon` key, so every call site
 * (the admin form, the landing card) switches on one closed set of three
 * states instead of also having to handle "key is missing" as a fourth,
 * implicit case.
 *
 * `"url"` is a plain string, not `z.string().url()` — same convention
 * `configContentSchema`'s `email`/`social.github`/`social.linkedin` below
 * already use (stricter format validation isn't worth the false negatives
 * on the handful of real-world URL shapes `.url()` rejects, e.g. some
 * relative paths a self-hosted admin might legitimately want).
 *
 * `"icon"`'s `value` is a kebab-case name meant to be validated against
 * `lucide-react/dynamic`'s real `iconNames` list on the frontend (see
 * `web/src/shared/ui/icon-picker/README.md`) — this schema deliberately
 * does NOT re-validate it against that list here. Baking a snapshot of
 * lucide's icon names into backend validation would silently go stale
 * every time the pinned `lucide-react` version changes, rejecting
 * perfectly valid new icon names for no real reason; an unrecognized name
 * degrades gracefully to the existing placeholder on render (see
 * `IconRefPreview`), which is a cheap enough failure mode not to need a
 * second source of truth to prevent.
 */
export const iconRefSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("none") }),
    z.object({ type: z.literal("url"), value: z.string() }),
    z.object({ type: z.literal("icon"), value: z.string() }),
]);

export type IconRef = z.infer<typeof iconRefSchema>;

const principlesContentSchema = z.array(
    z.object({
        title: localizedTextSchema,
        description: localizedTextSchema,
        // `.default(...)` (not `.optional()`) means a row already sitting in
        // the database from before this field existed — whose JSON simply
        // has no `icon` key at all — keeps parsing successfully as "no icon
        // set yet" with zero migration/backfill needed, the same reasoning
        // `getSiteContent` below already applies one level up (a missing
        // *row* falls back to `SITE_CONTENT_DEFAULTS`; this is a missing
        // *key inside* a row falling back the same way).
        icon: iconRefSchema.default({ type: "none" }),
    }),
);

const techStackContentSchema = z.array(
    z.object({
        name: z.string(),
        note: localizedTextSchema,
    }),
);

const configContentSchema = z.object({
    name: z.string(),
    initials: z.string(),
    role: localizedTextSchema,
    email: z.string(),
    availability: z.enum(["available", "engaged", "limited"]),
    social: z.object({
        github: z.string(),
        linkedin: z.string(),
    }),
});

const journalPageContentSchema = z.object({
    heading: localizedTextSchema,
    description: localizedTextSchema,
});

const workPageContentSchema = z.object({
    heading: localizedArrayOf(z.string()),
    description: localizedTextSchema,
});

/**
 * One entry per section named in the migration plan's Phase 5. Adding an
 * 8th section later is a new schema here (plus a default below and a
 * small admin form, `web/src/views/admin-settings-editor`) — no other
 * function in this file changes, and no new Prisma migration is needed
 * (`SiteContent.data` is already a generic `Json` column).
 */
export const siteContentSchemas = {
    hero: heroContentSchema,
    contact: contactContentSchema,
    principles: principlesContentSchema,
    techStack: techStackContentSchema,
    config: configContentSchema,
    journalPage: journalPageContentSchema,
    workPage: workPageContentSchema,
} as const;

export type SiteContentKey = keyof typeof siteContentSchemas;

export const SITE_CONTENT_KEYS = Object.keys(siteContentSchemas) as SiteContentKey[];

export type SiteContentDataMap = {
    [K in SiteContentKey]: z.infer<(typeof siteContentSchemas)[K]>;
};

export type HeroContent = SiteContentDataMap["hero"];
export type ContactContent = SiteContentDataMap["contact"];
export type PrinciplesContent = SiteContentDataMap["principles"];
export type TechStackContent = SiteContentDataMap["techStack"];
export type ConfigContent = SiteContentDataMap["config"];
export type JournalPageContent = SiteContentDataMap["journalPage"];
export type WorkPageContent = SiteContentDataMap["workPage"];

export function isSiteContentKey(value: string): value is SiteContentKey {
    return (SITE_CONTENT_KEYS as string[]).includes(value);
}

/**
 * Falls back to `SITE_CONTENT_DEFAULTS[key]` when no row exists yet for
 * `key` — a missing row means "nobody has customized this section since
 * the last migration/seed," not "this section doesn't exist" (unlike a
 * `Post`/`Work` slug lookup, every `SiteContentKey` is a fixed, known set
 * declared above). This is what lets the public site render correctly
 * before `seed-site-content.ts` has ever run, and stay correct if a row
 * is ever deleted by hand. A genuinely unreachable database still throws
 * `DatabaseUnavailableError` (via `db/client.ts`'s query extension) —
 * this fallback only covers "the query succeeded and found nothing."
 */
export async function getSiteContent<K extends SiteContentKey>(key: K): Promise<SiteContentDataMap[K]> {
    // `key: K` (a generic type parameter), not the concrete `SiteContentKey`
    // union, is what defeats both Prisma's own generated overload
    // resolution on `where` and TypeScript's ability to narrow
    // `SiteContentDataMap[K]` from a per-key lookup below — a known
    // generic-indexed-access limitation, not a real type-safety gap: every
    // caller of `getSiteContent(key)` still gets the correctly narrowed
    // `SiteContentDataMap[K]` return type inferred from the literal `key`
    // they passed in, which is what actually matters.
    const row = await prisma.siteContent.findUnique({ where: { key: key as SiteContentKey } });
    const raw = row?.data ?? SITE_CONTENT_DEFAULTS[key];
    return siteContentSchemas[key].parse(raw) as SiteContentDataMap[K];
}

/**
 * Always an upsert, never a plain `update` — the row backing `key` might
 * not exist yet (nobody has customized it since the last seed/migration,
 * see `getSiteContent` above), and the admin settings form has no reason
 * to care about that distinction: "save this section" should just work
 * either way.
 */
export async function updateSiteContent<K extends SiteContentKey>(
    key: K,
    data: SiteContentDataMap[K],
): Promise<SiteContentDataMap[K]> {
    // Same generic-indexed-access limitation as `getSiteContent` above —
    // `parsed`'s real runtime shape is exactly `SiteContentDataMap[K]`
    // (it's whatever `siteContentSchemas[key]` validated `data` against),
    // TypeScript just can't express that across a generic `key` without
    // this cast.
    const parsed = siteContentSchemas[key].parse(data) as SiteContentDataMap[K];
    await prisma.siteContent.upsert({
        where: { key: key as SiteContentKey },
        create: { key, data: parsed },
        update: { data: parsed },
    });
    return parsed;
}
