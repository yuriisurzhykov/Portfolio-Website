/**
 * Catmull-Rom-to-cubic-Bezier conversion — the one technique that makes
 * `cover-flow.ts` and `cover-wave.ts` read as flowing, organic curves
 * instead of jagged straight segments (the exact complaint that sent the
 * whole cover design back to the drawing board — see the `Generative Cover
 * System v3` plan's "Как мы сюда пришли" section). Shared by both layers
 * rather than duplicated, since it's pure point-list-in, path-string-out
 * geometry with no opinion about what the points MEAN.
 */

export interface Point {
    x: number;
    y: number;
}

/**
 * Builds an SVG `<path>` `d` attribute value that passes smoothly through
 * every point in `points`, in order — a standard centripetal-free Catmull-
 * Rom spline, expressed as a sequence of cubic Bezier segments (the only
 * curve primitive every SVG renderer, including librsvg, supports
 * natively). Fewer than 2 points has no curve to draw, so returns an empty
 * string rather than a malformed/partial path.
 */
export function smoothPath(points: Point[]): string {
    if (points.length < 2) {
        return "";
    }

    let d = `M ${ points[0].x.toFixed(2) } ${ points[0].y.toFixed(2) } `;

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i - 1] ?? points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2] ?? p2;

        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;

        d += `C ${ c1x.toFixed(2) } ${ c1y.toFixed(2) }, ${ c2x.toFixed(2) } ${ c2y.toFixed(2) }, ${ p2.x.toFixed(2) } ${ p2.y.toFixed(2) } `;
    }

    return d.trimEnd();
}
