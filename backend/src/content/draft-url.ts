import { z } from "zod";
import { generateUniqueSlug } from "./slug";

export const urlModeSchema = z.enum(["auto", "manual"]);
export type UrlMode = z.infer<typeof urlModeSchema>;

export interface AdminUrlState { draftSlug: string; urlMode: UrlMode; hasUnpublishedChanges: boolean }

export function storedUrlMode(value: unknown): UrlMode { return value === "auto" ? "auto" : "manual"; }

/** Canonical identity never changes during autosave; only the pending address is resolved here. */
export async function resolveDraftUrl(
    current: { slug: string; draftSlug: string; urlMode: UrlMode; publishedAt: Date | null },
    input: { title: string; slug?: string; urlMode?: UrlMode },
    isTaken: (slug: string) => Promise<boolean>,
): Promise<{ slug: string; urlMode: UrlMode }> {
    const explicitManual = input.urlMode === "manual" || (input.urlMode === undefined && input.slug !== undefined && input.slug !== current.draftSlug);
    if (current.publishedAt !== null) {
        return { slug: explicitManual ? input.slug ?? current.draftSlug : current.draftSlug, urlMode: "manual" };
    }
    const mode = input.urlMode ?? (explicitManual ? "manual" : current.urlMode);
    if (mode === "manual") return { slug: input.slug ?? current.draftSlug, urlMode: mode };
    const slug = await generateUniqueSlug(input.title, candidate => candidate === current.slug ? Promise.resolve(false) : isTaken(candidate));
    return { slug, urlMode: "auto" };
}
