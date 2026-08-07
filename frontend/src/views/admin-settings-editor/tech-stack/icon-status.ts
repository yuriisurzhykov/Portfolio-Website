import type { TechIcon } from "@portfolio/backend";
import type { TechIconView } from "@/shared/lib/tech-icons";

export interface TechIconStatus {
    /** Short, one-glance label shown next to the row's name. */
    label: string;
    tone: "neutral" | "warning" | "pending";
    /**
     * True when this row resolves to no logo at all — `buildTechStackView`
     * DROPS those rows, so it will not appear on the landing page. This is
     * the single most surprising thing about the tech-stack list, and the
     * one the previous editor gave no hint about whatsoever: you'd add a
     * row, save, and simply never see it on the site.
     */
    hidden: boolean;
}

/**
 * What to tell the admin about one row's logo, given the choice they
 * stored (`icon`) and what that choice actually resolved to (`view`, or
 * `null` while the resolve request is still in flight).
 *
 * Branch order matters: an explicit `type: "none"` and a `"brand"` slug
 * that doesn't exist BOTH resolve to `{ kind: "none" }`, but only the
 * second one is a mistake. "Hidden" is a decision; "No logo" is a
 * problem, and only the latter gets the warning tone.
 */
export function describeIconStatus(icon: TechIcon, view: TechIconView | null): TechIconStatus {
    if (view === null) {
        return { label: "…", tone: "pending", hidden: false };
    }
    if (icon.type === "none") {
        return { label: "Hidden", tone: "neutral", hidden: true };
    }
    if (view.kind === "none") {
        return { label: "No logo", tone: "warning", hidden: true };
    }
    switch (icon.type) {
        case "auto":
            return { label: "Auto", tone: "neutral", hidden: false };
        case "brand":
            return { label: icon.value, tone: "neutral", hidden: false };
        case "url":
            return { label: "Link", tone: "neutral", hidden: false };
        case "svg":
            return { label: "SVG", tone: "neutral", hidden: false };
    }
}
