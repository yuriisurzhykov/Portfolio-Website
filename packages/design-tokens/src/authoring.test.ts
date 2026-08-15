import { describe, expect, it } from "vitest";
import { defineComponentTokens, defineComposite, defineContract, definePrimitives, defineTheme } from "./authoring";

describe("definePrimitives", () => {
    it("tags the tree __kind: primitive and preserves every key", () => {
        const primitives = definePrimitives({ neutral: { 950: "hsl(219 25% 5%)" } });
        expect(primitives.__kind).toBe("primitive");
        expect(primitives.neutral).toEqual({ 950: "hsl(219 25% 5%)" });
    });

    it("has no contract at all — arbitrary extra scales are just accepted (extension is zero-ceremony)", () => {
        const primitives = definePrimitives({ neutral: {}, teal: { 500: "hsl(180 60% 50%)" } });
        expect(primitives.teal).toEqual({ 500: "hsl(180 60% 50%)" });
    });
});

describe("defineContract", () => {
    it("is the one place the required-key list lives", () => {
        const contract = defineContract({ category: "color", required: ["surfacePrimary", "interactivePrimary"] });
        expect(contract).toEqual({ category: "color", required: ["surfacePrimary", "interactivePrimary"] });
    });
});

describe("defineTheme", () => {
    const contract = defineContract({ category: "color", required: ["surfacePrimary", "interactivePrimary"] });

    it("succeeds and tags the result when every required key is present", () => {
        const theme = defineTheme(contract, { surfacePrimary: "{color.neutral.950}", interactivePrimary: "{color.brand.500}" });
        expect(theme.__kind).toBe("semantic");
        expect(theme.__category).toBe("color");
    });

    it("allows extra optional keys beyond the required set", () => {
        const theme = defineTheme(contract, {
            surfacePrimary: "{color.neutral.950}",
            interactivePrimary: "{color.brand.500}",
            decorativeAccent: "{color.accent.purple}",
        });
        expect((theme as Record<string, unknown>).decorativeAccent).toBe("{color.accent.purple}");
    });

    it("throws DS005 the moment a required key is missing — at construction, not a later separate step", () => {
        expect(() => defineTheme(contract, { surfacePrimary: "{color.neutral.950}" } as never)).toThrow(/DS005/);
    });

    it("throws DS004 when a role references another semantic role instead of a primitive", () => {
        expect(() =>
            defineTheme(contract, {
                surfacePrimary: "{color.neutral.950}",
                interactivePrimary: "{theme.color.surfacePrimary}",
            }),
        ).toThrow(/DS004/);
    });
});

describe("defineComponentTokens", () => {
    it("tags the tree with __kind: component and its namespace, no contract required", () => {
        const codeBlock = defineComponentTokens("codeBlock", { keyword: "{color.accent.purple}" });
        expect(codeBlock.__kind).toBe("component");
        expect(codeBlock.__namespace).toBe("codeBlock");
    });

    it("does not require any specific key — an empty component token object is valid", () => {
        expect(() => defineComponentTokens("empty", {})).not.toThrow();
    });
});

describe("defineComposite", () => {
    it("tags the tree with __kind: composite and its kind, and allows theme/semantic references (unlike defineTheme)", () => {
        const gradients = defineComposite("gradient", { glow: { stops: [{ color: "{theme.color.interactivePrimaryHover}" }] } });
        expect(gradients.__kind).toBe("composite");
        expect(gradients.__compositeKind).toBe("gradient");
    });
});