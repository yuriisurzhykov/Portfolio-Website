import { describe, expect, it } from "vitest";
import type { TechStackContent } from "@portfolio/backend";
import { buildTechStackView } from "./tech-stack-view";

function techStackItem(name: string, icon: TechStackContent[number]["icon"]): TechStackContent[number] {
    return { name, note: { en: "", ru: "" }, icon };
}

describe("buildTechStackView", () => {
    it("drops an item whose icon doesn't resolve to a real logo", () => {
        const view = buildTechStackView([techStackItem("Coroutines & Flow", { type: "auto" })], []);
        expect(view).toEqual([]);
    });

    it("keeps an item whose name auto-resolves to a real Simple Icons logo", () => {
        const view = buildTechStackView([techStackItem("Kotlin", { type: "auto" })], []);
        expect(view).toHaveLength(1);
        expect(view[0]).toMatchObject({ name: "Kotlin", slug: "kotlin", hasProjects: false });
        expect(view[0].icon.kind).toBe("path");
    });

    it("marks hasProjects true when the item's slug is in publishedTechSlugs, false otherwise", () => {
        const view = buildTechStackView(
            [techStackItem("Kotlin", { type: "auto" }), techStackItem("Python", { type: "auto" })],
            ["kotlin"],
        );
        expect(view.find((item) => item.name === "Kotlin")?.hasProjects).toBe(true);
        expect(view.find((item) => item.name === "Python")?.hasProjects).toBe(false);
    });

    it("keeps an item with a hand-pasted 'svg' icon even though its name has no real Simple Icons match", () => {
        const view = buildTechStackView(
            [techStackItem("Coroutines & Flow", { type: "svg", value: "<svg><path d=\"M0 0\"/></svg>" })],
            [],
        );
        expect(view).toHaveLength(1);
        expect(view[0].icon).toEqual({ kind: "svg", markup: "<svg><path d=\"M0 0\"/></svg>" });
    });

    it("resolves a manually-picked brand slug even when the name itself wouldn't auto-resolve", () => {
        const view = buildTechStackView([techStackItem("Android Open Source", { type: "brand", value: "android" })], []);
        expect(view).toHaveLength(1);
        expect(view[0].icon).toMatchObject({ kind: "path", title: "Android" });
    });

    it("returns an empty array for an empty techStack", () => {
        expect(buildTechStackView([], [])).toEqual([]);
    });
});
