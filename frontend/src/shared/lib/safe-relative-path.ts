/**
 * Guards against an open redirect via a `?from=`-style query param —
 * anyone can share a link like `/error/429?from=https://evil.example` (or
 * `//evil.example`, which browsers resolve as protocol-relative — i.e.
 * effectively cross-origin, despite "starting with a slash"), so any
 * caller planning to navigate a visitor to a query-supplied "return to"
 * value must validate it first. Accepts only a same-origin, root-relative
 * path: exactly one leading `/`, never `//` or `/\` (both of which a
 * browser can normalize into a protocol-relative URL).
 */
export function isSafeRelativePath(value: string | null | undefined): value is string {
    return typeof value === "string"
        && value.startsWith("/")
        && !value.startsWith("//")
        && !value.startsWith("/\\");
}
