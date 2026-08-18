import { describe, expect, it } from "vitest";
import { describeIconStatus } from "./icon-status";

const resolved = { kind: "path", rawSvg: "M0 0", title: "Docker" } as const;
const unresolved = { kind: "none" } as const;

describe("describeIconStatus", () => {
    it("reports 'pending' — never 'no logo' — while resolution is still in flight", () => {
        // The distinction that matters: an in-flight row must not flash the
        // warning tone, or every freshly pasted list looks broken for a
        // moment.
        expect(describeIconStatus({ type: "auto" }, null)).toEqual({ label: "…", tone: "pending", hidden: false });
    });

    it("calls an explicitly icon-less row 'Hidden', with no warning tone", () => {
        expect(describeIconStatus({ type: "none" }, unresolved)).toEqual({ label: "Hidden", tone: "neutral", hidden: true });
    });

    it("warns when a row wanted a logo but didn't get one", () => {
        expect(describeIconStatus({ type: "auto" }, unresolved)).toEqual({ label: "No logo", tone: "warning", hidden: true });
    });

    it("warns for a 'brand' slug that isn't a real icon, rather than showing the slug as if it worked", () => {
        expect(describeIconStatus({ type: "brand", value: "nope" }, unresolved)).toEqual({
            label: "No logo",
            tone: "warning",
            hidden: true,
        });
    });

    it("shows 'Auto' for a name that resolved on its own", () => {
        expect(describeIconStatus({ type: "auto" }, resolved)).toEqual({ label: "Auto", tone: "neutral", hidden: false });
    });

    it("shows the chosen slug itself for a resolved 'brand' override", () => {
        expect(describeIconStatus({ type: "brand", value: "docker" }, resolved)).toEqual({
            label: "docker",
            tone: "neutral",
            hidden: false,
        });
    });

    it("labels a linked image 'Link'", () => {
        expect(describeIconStatus({ type: "url", value: "https://x/i.svg" }, { kind: "url", src: "https://x/i.svg" })).toEqual({
            label: "Link",
            tone: "neutral",
            hidden: false,
        });
    });

    it("labels pasted markup 'SVG'", () => {
        expect(describeIconStatus({ type: "svg", value: "<svg/>" }, { kind: "svg", markup: "<svg/>" })).toEqual({
            label: "SVG",
            tone: "neutral",
            hidden: false,
        });
    });

    it("marks exactly the rows the landing page drops as hidden, and no others", () => {
        // `hidden` is what the editor's summary line counts, so it has to
        // agree with `buildTechStackView`'s own `icon.kind !== "none"` filter
        // for every variant, not just the obvious two.
        expect(describeIconStatus({ type: "none" }, unresolved).hidden).toBe(true);
        expect(describeIconStatus({ type: "brand", value: "x" }, unresolved).hidden).toBe(true);
        expect(describeIconStatus({ type: "auto" }, resolved).hidden).toBe(false);
        expect(describeIconStatus({ type: "url", value: "u" }, { kind: "url", src: "u" }).hidden).toBe(false);
    });
});
