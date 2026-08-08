import { describe, expect, it } from "vitest";
import { resolveTechIcon } from "./resolve-tech-icon";

describe("resolveTechIcon", () => {
    it("returns kind: 'none' for icon.type 'none'", () => {
        expect(resolveTechIcon({ name: "Kotlin", icon: { type: "none" } })).toEqual({ kind: "none" });
    });

    it("returns kind: 'url' with the configured src for icon.type 'url'", () => {
        const result = resolveTechIcon({ name: "Custom", icon: { type: "url", value: "https://example.com/icon.svg" } });
        expect(result).toEqual({ kind: "url", src: "https://example.com/icon.svg" });
    });

    it("returns kind: 'svg' with the raw, UNSANITIZED markup for icon.type 'svg'", () => {
        // Deliberately proves this function does NOT sanitize — it can't
        // (no DOM on the server); sanitization is `TechIcon.tsx`'s job at
        // render time, verified separately in that component's own test.
        const malicious = "<svg><script>alert(1)</script></svg>";
        const result = resolveTechIcon({ name: "Custom", icon: { type: "svg", value: malicious } });
        expect(result).toEqual({ kind: "svg", markup: malicious });
    });

    it("resolves a real brand slug for icon.type 'brand' to its path", () => {
        const result = resolveTechIcon({ name: "Anything", icon: { type: "brand", value: "docker" } });
        expect(result.kind).toBe("path");
        expect(result).toMatchObject({ title: "Docker" });
    });

    it("falls back to 'none' for an unrecognized brand slug, rather than throwing", () => {
        const result = resolveTechIcon({ name: "Anything", icon: { type: "brand", value: "not-a-real-brand" } });
        expect(result).toEqual({ kind: "none" });
    });

    it("resolves icon.type 'auto' by deriving a Simple Icons slug from the name", () => {
        const result = resolveTechIcon({ name: "Kotlin", icon: { type: "auto" } });
        expect(result.kind).toBe("path");
        expect(result).toMatchObject({ title: "Kotlin" });
    });

    it("uses the alias table for a name whose slug isn't mechanically derivable ('C++')", () => {
        const result = resolveTechIcon({ name: "C++", icon: { type: "auto" } });
        expect(result.kind).toBe("path");
        expect(result).toMatchObject({ title: "C++" });
    });

    it("falls back to 'none' for icon.type 'auto' when the derived slug matches no real icon", () => {
        const result = resolveTechIcon({ name: "Coroutines & Flow", icon: { type: "auto" } });
        expect(result).toEqual({ kind: "none" });
    });
});
