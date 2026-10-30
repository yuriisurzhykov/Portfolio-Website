import { slugify } from "@/shared/lib/slugify";
import type { ContentUrlState, UrlPolicyAction } from "./types";

/** Save/reload is not the freeze boundary; publication history is. Server candidates win on acknowledgement. */
export function reduceUrlPolicy(state: ContentUrlState, action: UrlPolicyAction): ContentUrlState {
    switch (action.type) {
        case "titleChanged":
            return state.mode === "auto" && !state.hasEverBeenPublished
                ? { ...state, draftSlug: slugify(action.title) }
                : state;
        case "manualApplied":
            return { ...state, mode: "manual", draftSlug: action.slug };
        case "saved":
            return action.state;
    }
}

export function isValidDraftSlug(value: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
