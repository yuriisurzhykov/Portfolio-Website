import { expect, it } from "vitest";
import { reduceUrlPolicy } from "./url-policy";
import type { ContentUrlState } from "./types";

const initial: ContentUrlState = {
    canonicalSlug: "first-title",
    draftSlug: "first-title",
    mode: "auto",
    hasEverBeenPublished: false,
};
it("updates an automatic candidate even for a saved draft", () => {
    expect(reduceUrlPolicy(initial, { type: "titleChanged", title: "Second title" }).draftSlug).toBe("second-title");
});
it("preserves manual overrides and publication history across title edits", () => {
    const manual = reduceUrlPolicy(initial, { type: "manualApplied", slug: "custom" });
    expect(reduceUrlPolicy(manual, { type: "titleChanged", title: "Another" }).draftSlug).toBe("custom");
    expect(
        reduceUrlPolicy({ ...initial, hasEverBeenPublished: true }, { type: "titleChanged", title: "Another" })
            .draftSlug,
    ).toBe("first-title");
});
it("accepts the server's collision-resolved candidate on reload", () => {
    expect(reduceUrlPolicy(initial, { type: "saved", state: { ...initial, draftSlug: "taken-2" } }).draftSlug).toBe(
        "taken-2",
    );
});
