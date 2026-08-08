import { toSimpleIconSlug, type TechIcon } from "@portfolio/backend";
import { getSimpleIconBySlug } from "./registry";

/**
 * What a tech-stack row's icon actually resolved to, ready to render —
 * `TechIcon` (backend) is the admin's STORED CHOICE (`auto`/`none`/
 * `brand`/`url`/`svg`); this is the outcome of actually looking that
 * choice up against the real, installed icon catalog. `"path"` always
 * carries a `24x24` viewBox path (every Simple Icons entry shares that
 * viewBox), so `TechIcon`'s renderer (`shared/ui/tech-icon`) never needs
 * to know which variant produced it. `"svg"` carries RAW, unsanitized
 * markup — `resolveTechIcon` runs on the server (no DOM available to
 * sanitize with); `shared/ui/tech-icon/TechIcon.tsx` is the one place
 * that sanitizes it, client-side, right before rendering.
 */
export type TechIconView =
    | { kind: "path"; d: string; title: string }
    | { kind: "url"; src: string }
    | { kind: "svg"; markup: string }
    | { kind: "none" };

export interface TechStackIconInput {
    name: string;
    icon: TechIcon;
}

/**
 * The one place that turns a tech-stack row's stored `icon` choice into
 * something renderable — shared by the landing page's logo row and (via
 * the same `name`+`icon` shape) any future consumer, so a resolution rule
 * only ever lives here once. Every branch that can't confidently produce a
 * real logo — `"none"`, a `"brand"`/`"auto"` slug that isn't a real,
 * installed Simple Icon — degrades to `{ kind: "none" }` rather than a
 * broken image or a thrown error, the same "never crash, never show a
 * broken glyph" contract `IconRefPreview` already established for
 * `IconRef`.
 */
export function resolveTechIcon({ name, icon }: TechStackIconInput): TechIconView {
    switch (icon.type) {
        case "none":
            return { kind: "none" };
        case "url":
            return { kind: "url", src: icon.value };
        case "svg":
            return { kind: "svg", markup: icon.value };
        case "brand": {
            const found = getSimpleIconBySlug(icon.value);
            return found ? { kind: "path", d: found.path, title: found.title } : { kind: "none" };
        }
        case "auto": {
            const found = getSimpleIconBySlug(toSimpleIconSlug(name));
            return found ? { kind: "path", d: found.path, title: found.title } : { kind: "none" };
        }
    }
}
