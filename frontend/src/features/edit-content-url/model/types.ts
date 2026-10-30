export type UrlMode = "auto" | "manual";
export interface ContentUrlState {
    canonicalSlug: string | null;
    draftSlug: string;
    mode: UrlMode;
    hasEverBeenPublished: boolean;
}
export type UrlPolicyAction =
    | { type: "titleChanged"; title: string }
    | { type: "manualApplied"; slug: string }
    | { type: "saved"; state: ContentUrlState };
