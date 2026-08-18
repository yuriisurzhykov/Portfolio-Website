function toKebabCase(value: string): string {
    return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/_/g, "-").toLowerCase();
}

export { toKebabCase };

/**
 * Walks a resolved tree, returning every leaf as (kebab-case path segments,
 * value). Skips `__`-prefixed authoring tags explicitly — `resolveTree`
 * already drops them for a tagged layer, but this also runs directly on
 * PRIMITIVE trees (never passed through `resolveTree`), which still carry
 * their own `__kind` tag.
 */
export function flattenScalars(node: unknown, path: readonly string[] = []): Array<[string[], string | number]> {
    if (typeof node === "string" || typeof node === "number") return [[[...path], node]];
    if (!node || typeof node !== "object" || Array.isArray(node)) return [];
    return Object.entries(node)
        .filter(([key]) => !key.startsWith("__"))
        .flatMap(([key, value]) => flattenScalars(value, [...path, toKebabCase(key)]));
}

/** Every part is kebab-cased here (not left to callers) — a component `__namespace` like "codeBlock" must become "code-block" exactly once, in one place, not by convention at every call site. */
export function cssVariableName(prefix: readonly string[], path: readonly string[]): string {
    return `--ds-${[...prefix, ...path].map(toKebabCase).join("-")}`;
}

// --- HSL string <-> RGB — needed ONLY by non-CSS adapters (Mermaid/OG/WebGL
// can't resolve a CSS custom property, they need a plain, already-computed
// value; every resolved color in this system is an hsl() string or a
// color-mix(...) by construction). color-mix() results can't feed these —
// there is no general "flatten a color-mix() back to sRGB" math, so a
// non-CSS adapter needs a plain hsl() step, not an alpha()'d one, for
// anything it resolves through this path. ---
const HSL_PATTERN = /^hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*(?:\/\s*([\d.]+)%\s*)?\)$/;

export function parseHslString(hsl: string): { h: number; s: number; l: number; a: number } {
    const match = hsl.match(HSL_PATTERN);
    if (!match) {
        throw new Error(`Not a resolvable hsl() string: "${hsl}" (a color-mix() result can't feed a WebGL/Mermaid adapter — resolve to a plain step instead)`);
    }
    const [, h, s, l, a] = match;
    return { h: Number(h), s: Number(s), l: Number(l), a: a === undefined ? 1 : Number(a) / 100 };
}

export function hslStringToRgb01(hsl: string): readonly [number, number, number] {
    const { h, s, l } = parseHslString(hsl);
    const hue = (((h % 360) + 360) % 360) / 360;
    const sat = Math.min(1, Math.max(0, s / 100));
    const light = Math.min(1, Math.max(0, l / 100));
    if (sat === 0) return [light, light, light];
    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
    const p = 2 * light - q;
    const hueToChannel = (t: number): number => {
        let tt = t;
        if (tt < 0) tt += 1;
        if (tt > 1) tt -= 1;
        if (tt < 1 / 6) return p + (q - p) * 6 * tt;
        if (tt < 1 / 2) return q;
        if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
        return p;
    };
    return [hueToChannel(hue + 1 / 3), hueToChannel(hue), hueToChannel(hue - 1 / 3)];
}

export function hslStringToRgbString(hsl: string): string {
    const { a } = parseHslString(hsl);
    const [r, g, b] = hslStringToRgb01(hsl).map((c) => Math.round(c * 255));
    return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
}
