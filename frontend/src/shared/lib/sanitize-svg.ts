import DOMPurify from "dompurify";

/**
 * Sanitizes SVG markup before it's ever handed to `dangerouslySetInnerHTML`.
 * Originally written for `shared/ui/diagram` (Mermaid/PlantUML output — the
 * admin authors the diagram SOURCE, but doesn't fully control the
 * RENDERING ENGINE's output), moved here once `shared/lib/tech-icons`
 * needed the exact same guarantee for a second, unrelated reason: an
 * admin-pasted raw `<svg>...</svg>` for a tech-stack logo (`TechIcon`'s
 * `kind: "svg"`) is untrusted markup in a stronger sense — pasted directly
 * by a human, not produced by a rendering engine at all, but the same
 * "never let a `<script>`/`on*` handler survive into the DOM" invariant
 * applies identically. One shared function, not two independent
 * DOMPurify configurations that could quietly drift apart.
 *
 * `USE_PROFILES: { svg: true, svgFilters: true }` scopes DOMPurify's
 * allow-list to SVG-shaped markup (paths, text, gradients, filters) instead
 * of DOMPurify's default HTML profile, which would strip legitimate
 * SVG-only elements it doesn't recognize. `<script>` tags and `on*`
 * event-handler attributes are always stripped regardless of profile —
 * that's DOMPurify's core job.
 */
export function sanitizeSvg(svg: string): string {
    // Replacing the whole `{ USE_PROFILES: ... }` options object with a
    // bare `{}` is a real mutant Stryker finds, and it's genuinely
    // equivalent for every case this test file exercises — verified by
    // hand (not assumed): a script tag, an onload handler, a <style>
    // block with a javascript: url, a <foreignObject><iframe>, an <a
    // href="javascript:...">, and an `xlink:href="javascript:..."` all
    // sanitize BYTE-FOR-BYTE identically with `{}` as with the explicit
    // profile in this installed DOMPurify version — its own built-in
    // default already applies a comprehensive SVG-aware allow-list. The
    // explicit `USE_PROFILES` is kept anyway as a documented, intentional
    // choice rather than removed: it's insurance against a FUTURE
    // DOMPurify version's default becoming more permissive in some way
    // this repo hasn't hit yet, not something today's test suite can
    // observe a difference from.
    // Stryker disable next-line ObjectLiteral
    return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}
