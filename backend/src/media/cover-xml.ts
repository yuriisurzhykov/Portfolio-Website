/**
 * XML/SVG string-escaping helpers shared by every layer that injects
 * caller-controlled text (a category name, a post title/excerpt) into a
 * hand-built SVG string — extracted out of `cover-composition.ts` (which
 * had its own private copy of the attribute variant) once a second module
 * (`cover-letterform.ts`) needed the same escaping for `<text>` element
 * CONTENT, not just attribute values, which is a different escaping rule
 * (see `escapeXmlText`'s own comment).
 */

/** Escapes a string for safe embedding inside a double-quoted XML/SVG attribute value. */
export function escapeXmlAttribute(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Escapes a string for safe embedding as XML/SVG element TEXT CONTENT
 * (between `<text>...</text>`, say) — no surrounding quotes to protect
 * against breakout, so `"` doesn't need escaping here the way it does for
 * `escapeXmlAttribute`, but `<`/`&` still do (an unescaped `<` would open a
 * new, attacker-controlled element instead of rendering as a literal
 * character).
 */
export function escapeXmlText(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}
