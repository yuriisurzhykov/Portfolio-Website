import { resolved } from "../generated/resolved";

export type MermaidThemeMode = "dark" | "light";

/**
 * Mermaid's "base" theme runs every `themeVariables` value through its own
 * color-math library, which parses the literal string as a real CSS color
 * — it has no access to the browser's CSS engine, so a `var(--foo)`
 * reference fails with "Unsupported color format." Real, already-resolved
 * color VALUES from `generated/resolved.ts` are exactly what it needs —
 * this reads that file only, never the compiler or the raw theme source
 * (see the plan's "adapters shouldn't re-run the compiler at runtime"
 * finding).
 */
export function createMermaidTheme(mode: MermaidThemeMode) {
    const c = resolved[mode].color;
    return {
        theme: "base" as const,
        themeVariables: {
            background: "transparent",
            primaryColor: c.surfaceRaised,
            primaryTextColor: c.textPrimary,
            primaryBorderColor: c.borderDefault,
            lineColor: c.borderStrong,
            secondaryColor: c.surfaceElevated,
            tertiaryColor: c.interactivePrimarySubtle,
            fontFamily: "'JetBrains Mono', monospace",
            edgeLabelBackground: c.surfaceElevated,
        },
    };
}
