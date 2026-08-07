import { toTechSlug, type TechStackContent } from "@portfolio/backend";
import { resolveTechIcon, type TechIconView } from "@/shared/lib/tech-icons";

export interface TechStackItemView {
    name: string;
    slug: string;
    icon: TechIconView;
    /** Whether any PUBLISHED work item's `stack` matches this tech's slug — decides whether the landing logo links to `/work?tech=...` or renders as inert (no point linking to a filter with zero results). */
    hasProjects: boolean;
}

/**
 * Maps the admin-edited `techStack` list into what the landing page's logo
 * row actually renders. Icon resolution (`resolveTechIcon`) and the
 * `?tech=` filter slug (`toTechSlug` — the exact same function `/work`'s
 * filter uses, see `backend/src/content/tech-slug.ts`) both happen HERE,
 * once, inside `app/(site)/page.tsx`'s Server Component — `TechStack.tsx`
 * (a Client Component, for `useTranslation()`) only ever receives the
 * already-resolved result, never the raw `TechIcon`/`simple-icons`
 * catalog. This file has no `"use client"` marker and is never imported
 * from one — `resolveTechIcon` transitively reaches `simple-icons`, which
 * must stay server-only (see `shared/lib/tech-icons/README.md`).
 *
 * Items whose icon didn't resolve to a real logo (`icon.kind === "none"`)
 * are dropped entirely, not kept as a bare/placeholder box. This row is
 * now a row of LOGOS — the whole point of this redesign — and a visible
 * gap where a logo should be would read as broken, not as an acceptable
 * "nothing set yet" the way `IconRefPreview`'s neutral placeholder box is
 * elsewhere. A technology with no real brand mark in Simple Icons (e.g.
 * "Coroutines & Flow") only ends up here if the admin also never gave it
 * a `"url"`/`"svg"` fallback — `type: "svg"` (a hand-pasted, sanitized
 * vector) exists specifically for this case, so "no Simple Icons match"
 * no longer forces "no logo at all" the way it did before that variant
 * existed.
 */
export function buildTechStackView(techStack: TechStackContent, publishedTechSlugs: readonly string[]): TechStackItemView[] {
    const publishedSlugs = new Set(publishedTechSlugs);
    return techStack
        .map((item) => {
            const slug = toTechSlug(item.name);
            return {
                name: item.name,
                slug,
                icon: resolveTechIcon(item),
                hasProjects: publishedSlugs.has(slug),
            };
        })
        .filter((item) => item.icon.kind !== "none");
}
