import { isValid, toHex } from "khroma";
import { describe, expect, it } from "vitest";
import { createMermaidTheme } from "./mermaid";

// Guards against the real color-mix() bug described in theme/README.md's
// dated entry, using the actual `khroma` package Mermaid depends on.
describe("createMermaidTheme", () => {
    it.each(["dark", "light"] as const)("every %s themeVariables value khroma will touch is a color it can actually parse", (mode) => {
        const { themeVariables } = createMermaidTheme(mode);
        const { background, fontFamily, ...colorVariables } = themeVariables;
        for (const [key, value] of Object.entries(colorVariables)) {
            expect(isValid(value), `themeVariables.${key} = "${value}" is not a color khroma can parse`).toBe(true);
        }
        // background/fontFamily aren't colors — khroma never sees them.
        expect(background).toBe("transparent");
        expect(fontFamily).toBe("'JetBrains Mono', monospace");
    });

    it("interactivePrimarySubtle really is the brand accent at 12% opacity, not just 'some valid color'", () => {
        const { themeVariables } = createMermaidTheme("dark");
        expect(isValid("color-mix(in srgb, hsl(20 94% 61%) 12%, transparent)")).toBe(false);
        expect(themeVariables.tertiaryColor).toBe("hsl(20 94% 61% / 12%)");
        const [, , , , alpha] = toHex(themeVariables.tertiaryColor).match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i) ?? [];
        expect(parseInt(alpha, 16) / 255).toBeCloseTo(0.12, 1);
    });
});
