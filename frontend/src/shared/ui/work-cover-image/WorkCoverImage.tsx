import * as React from "react";
import type { CoverImageData } from "@portfolio/backend";
import { CoverImage } from "@/shared/ui/cover-image";
import { PlaceholderCover } from "@/shared/ui/placeholder-cover";

export interface WorkCoverImageProps {
    /**
     * A manual URL override — `Work.coverImage` for the landing-card/ledger
     * slot, `CaseStudy.heroImage` for the hero slot — wins over the
     * generated cover when set, per the plan's `override ?? generated`
     * precedence rule for both slots (see `media/README.md`'s cover-usage
     * table). Not full `CoverImageData`: a manually-pasted URL has no
     * placeholder/width/height metadata to blur-up with, so it renders
     * through `PlaceholderCover`'s plain `<img>` path instead of
     * `CoverImage`'s.
     */
    override: string | null;
    /** The procedurally generated cover, used when `override` is unset. */
    cover: CoverImageData | null;
    /** Only used for the `override`/no-cover placeholder paths — the generated cover is always decorative (`alt=""`), same convention as a Post's cover (see `CoverImage`'s own comment). */
    alt: string;
    /** Shown centered inside the striped placeholder when NEITHER `override` nor `cover` exists. */
    label: string;
    className?: string;
    fetchPriority?: "high" | "low" | "auto";
    loading?: "eager" | "lazy";
}

/**
 * The one place `Work`'s three-way cover precedence (manual override, then
 * the generated procedural cover, then a plain decorative placeholder) is
 * decided — added 2026-08-11 (Work Item Covers & Unified Identity Hue) so
 * `SelectedWork`'s landing card, `WorkListPage`'s ledger thumbnail, and
 * `WorkDetailPage`'s case-study hero don't each reimplement the same
 * three-way branch with slightly different code.
 */
export function WorkCoverImage({ override, cover, alt, label, className, fetchPriority, loading }: WorkCoverImageProps) {
    if (override) {
        return <PlaceholderCover src={override} alt={alt} label={label} className={className} />;
    }
    if (cover) {
        return <CoverImage {...cover} className={className} fetchPriority={fetchPriority} loading={loading} />;
    }
    return <PlaceholderCover label={label} className={className} />;
}
