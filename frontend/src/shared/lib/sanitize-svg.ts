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
 * `USE_PROFILES: { svg: true, svgFilters: true, html: true }` scopes
 * DOMPurify's allow-list to SVG-shaped markup (paths, text, gradients,
 * filters) PLUS ordinary HTML elements (`div`/`span`/...), rather than
 * either DOMPurify default profile alone — see the dated comment below on
 * why `html` had to be added alongside `svg`/`svgFilters`: Mermaid nests
 * real HTML inside SVG `<foreignObject>` elements for its labels, and
 * without the `html` profile too, that nested HTML gets silently stripped
 * even once `foreignObject` itself is allowed through. `<script>` tags and
 * `on*` event-handler attributes are always stripped regardless of
 * profile — that's DOMPurify's core job.
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
    //
    // 2026-08-10 — found live (real bug report: every Mermaid diagram on
    // the site rendered with missing or wrong-colored label text).
    // WRONG first hypothesis: assumed the `svg`/`svgFilters` profiles
    // already covered `<foreignObject>` the same way they cover `<text>`,
    // since the earlier `<foreignObject><iframe>` test above passes either
    // way. That test only proves the ATTACK payload's `<iframe>` is gone —
    // it never asserted whether legitimate content nested one level deeper
    // inside a real `<foreignObject>` (an admin-authored SVG's actual
    // label markup) survives at all. It doesn't, in this installed
    // DOMPurify version: `foreignObject` was removed from DOMPurify's
    // default list of HTML entry points in 3.1.7, and 3.2.0 changed the
    // opt-out into an explicit opt-in
    // (https://github.com/cure53/DOMPurify/issues/1002,
    // https://github.com/cure53/DOMPurify/issues/1040) — a mXSS hardening
    // measure, not a bug in DOMPurify. Mermaid renders most node/edge
    // labels (flowcharts and most other diagram types since Mermaid v10's
    // `htmlLabels: true` default — see `shared/ui/diagram/MermaidDiagram.tsx`)
    // as `<foreignObject><div>...<span class="nodeLabel">TEXT</span></div>
    // </foreignObject>`, so without this opt-in, `sanitizeSvg` silently
    // deleted the HTML subtree carrying every one of those labels —
    // "missing text" for diagrams where labels are entirely foreignObject,
    // "wrong color" for diagrams where a class-based `<style>` rule (also
    // Mermaid-generated) ends up with nothing left in the DOM to apply to.
    //
    // `ADD_TAGS`/`HTML_INTEGRATION_POINTS` below restore that entry point
    // WITHOUT reopening the hole the `<foreignObject><iframe>` test guards:
    // they only tell DOMPurify to sanitize the nested content AS HTML
    // (still stripping `<script>`/`<iframe>`/`on*`/`javascript:` the usual
    // way) instead of deleting the whole subtree outright — verified live
    // by that same pre-existing test still passing unchanged after this
    // change.
    //
    // WRONG second hypothesis, also found live: `ADD_TAGS`/
    // `HTML_INTEGRATION_POINTS` alone keep the `<foreignObject>` tag AND
    // its plain text, but still silently strip the `<div>`/`<span>` HTML
    // elements Mermaid wraps that text in (and their `class`/`style`
    // attributes with them) — because `USE_PROFILES: { svg, svgFilters }`
    // scopes DOMPurify's allow-list to SVG-only tags, and `div`/`span`
    // simply aren't on that list regardless of the entry-point config.
    // The practical effect: label text reappears, but as a bare, unclassed
    // text node — exactly the "wrong color" half of the bug report, since
    // Mermaid colors labels via a CSS class on that now-missing `<span>`,
    // not via a fill/color attribute the SVG-only profile would have kept.
    // This is the same fix DOMPurify's own maintainers point to for this
    // exact shape of report (cure53/DOMPurify#1088): also allow the `html`
    // profile so the HTML elements *inside* the entry point survive, not
    // just the entry point itself.
    // Stryker disable next-line ObjectLiteral
    return DOMPurify.sanitize(svg, {
        USE_PROFILES: { svg: true, svgFilters: true, html: true },
        ADD_TAGS: ["foreignObject"],
        HTML_INTEGRATION_POINTS: { foreignobject: true },
    });
}
