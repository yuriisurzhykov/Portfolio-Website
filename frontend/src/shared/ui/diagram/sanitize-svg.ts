import DOMPurify from "dompurify";

/**
 * Sanitizes SVG markup before it's ever handed to `dangerouslySetInnerHTML`
 * (see DiagramSurface.tsx, the one place both the thumbnail and the
 * lightbox get their `svg` string from). Diagram source is admin-authored,
 * but the SVG itself is produced by a rendering ENGINE the admin doesn't
 * fully control the output of — Mermaid, running entirely client-side, or
 * a self-hosted PlantUML server reached over `/api/diagrams/plantuml/...`
 * (see that route's own comment). Mermaid 11 already defaults its own
 * `securityLevel` to `"strict"` (verified: no `<script>`/event-handler
 * output from a hand-crafted malicious node label), and `MermaidDiagram.tsx`
 * now pins that explicitly rather than relying on a dependency default that
 * could change in a future major version — but a rendering engine's OWN
 * default is exactly the kind of thing this repo's methodology says not to
 * trust silently forever, and PlantUML's output is one more hop removed
 * from this app's own control. Sanitizing the final SVG string here, in the
 * one shared place both diagram engines' output funnels through, is a
 * second, independent layer that holds even if Mermaid's or a future
 * engine's default ever regresses.
 *
 * `USE_PROFILES: { svg: true, svgFilters: true }` scopes DOMPurify's
 * allow-list to SVG-shaped markup (paths, text, gradients, filters — what
 * Mermaid/PlantUML actually emit) instead of DOMPurify's default HTML
 * profile, which would strip legitimate SVG-only elements it doesn't
 * recognize. `<script>` tags and `on*` event-handler attributes are always
 * stripped regardless of profile — that's DOMPurify's core job.
 */
export function sanitizeDiagramSvg(svg: string): string {
    return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}
