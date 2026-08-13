/**
 * Four small WebGL1 programs, each named for the pass it renders:
 *
 * - `grid`: procedural background (blueprint dots/lines + the one actual
 *   light patch in the scene) — drawn into the off-screen scene texture.
 * - `edge`: the graph's connection lines — drawn into the same texture.
 * - `blit`: copies the finished scene texture onto the visible canvas
 *   1:1, as the base layer everywhere a lens quad doesn't cover.
 * - `lens`: one node = one quad, sampling that SAME scene texture through
 *   a fake solid-glass-sphere refraction (see `lens`'s fragment shader
 *   comments for the physical derivation — this is the one worth reading
 *   if touching this file).
 *
 * `precision highp float;` is repeated in EVERY stage of every program on
 * purpose, not left to each shader's default: `lens`'s vertex and fragment
 * stages share `uResolution`/`uCenter`/`uRadius`, and ANGLE (Chrome's
 * Windows GL backend) rejects linking two stages that declare a shared
 * uniform at different precisions ("Precisions of uniform '...' differ
 * between VERTEX and FRAGMENT shaders") — found live, not by reading the
 * spec first. Keeping every stage explicit and identical removes the
 * whole bug class instead of fixing it once per uniform.
 */
export const GRID_VERTEX_SHADER = `
    precision highp float;
    attribute vec2 aPos;
    varying vec2 vScreen;
    uniform vec2 uResolution;
    void main() {
        gl_Position = vec4(aPos, 0.0, 1.0);
        vScreen = (aPos * 0.5 + 0.5) * uResolution;
    }
`;

export const GRID_FRAGMENT_SHADER = `
    precision highp float;
    varying vec2 vScreen;
    uniform vec2 uResolution;
    uniform float uCell;
    uniform float uLineOpacity;
    uniform float uDotOpacity;
    uniform vec2 uLightPos;
    uniform vec3 uLightColor;
    uniform float uLightIntensity;
    uniform vec3 uBackground;
    /** Grid line/dot tint — the site's near-white text color in dark theme, near-black in light theme; mixing toward a fixed white would just disappear against a light background. */
    uniform vec3 uInk;
    void main() {
        vec2 g = mod(vScreen, uCell);
        float lineDist = min(min(g.x, uCell - g.x), min(g.y, uCell - g.y));
        float line = smoothstep(1.6, 0.0, lineDist);
        vec2 dg = mod(vScreen - uCell * 0.5, uCell * 0.5);
        float dotDist = length(dg - uCell * 0.25);
        float dotGlow = smoothstep(1.8, 0.0, dotDist);
        vec3 col = uBackground;
        col = mix(col, uInk, line * uLineOpacity);
        col = mix(col, uInk, dotGlow * uDotOpacity);

        // The only actual light source in this scene — every lens's rim
        // "highlight" is a Fresnel reflection of THIS patch, not a
        // separately-coded specular formula with an invisible light
        // direction that corresponds to nothing rendered anywhere.
        vec2 uv = vScreen / uResolution;
        float lightDist = distance(uv, uLightPos);
        float light = smoothstep(0.55, 0.0, lightDist);
        col += uLightColor * light * uLightIntensity;

        gl_FragColor = vec4(col, 1.0);
    }
`;

export const EDGE_VERTEX_SHADER = `
    precision highp float;
    attribute vec2 aPos;
    attribute vec4 aColor;
    uniform vec2 uResolution;
    varying vec4 vColor;
    void main() {
        vec2 clip = vec2((aPos.x / uResolution.x) * 2.0 - 1.0, 1.0 - (aPos.y / uResolution.y) * 2.0);
        gl_Position = vec4(clip, 0.0, 1.0);
        vColor = aColor;
    }
`;

export const EDGE_FRAGMENT_SHADER = `
    precision highp float;
    varying vec4 vColor;
    void main() { gl_FragColor = vColor; }
`;

export const BLIT_VERTEX_SHADER = `
    precision highp float;
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
        gl_Position = vec4(aPos, 0.0, 1.0);
        vUv = aPos * 0.5 + 0.5;
    }
`;

export const BLIT_FRAGMENT_SHADER = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uScene;
    void main() { gl_FragColor = texture2D(uScene, vUv); }
`;

export const LENS_VERTEX_SHADER = `
    precision highp float;
    attribute vec2 aLocal;
    uniform vec2 uResolution;
    uniform vec2 uCenter;
    uniform float uRadius;
    varying vec2 vLocal;
    void main() {
        vec2 worldPx = uCenter + aLocal * uRadius;
        vec2 clip = vec2((worldPx.x / uResolution.x) * 2.0 - 1.0, 1.0 - (worldPx.y / uResolution.y) * 2.0);
        gl_Position = vec4(clip, 0.0, 1.0);
        vLocal = aLocal;
    }
`;

/**
 * A single-surface refraction only ever produces a magnifying/fisheye
 * stretch — the sample ray still points roughly the same direction as the
 * local offset, so the rim just shows further-out content, right-side-up.
 * A real solid sphere refracts TWICE (entering the front, exiting the
 * back); that second crossing is what folds the ray back over itself and
 * actually inverts the image, the way a real lensball does.
 *
 * Exit-point derivation (`t = -2.0 * dot(p1, r1)`): `p1` is already ON the
 * unit sphere (`|p1|=1`) and `r1` is a unit direction. Solving
 * `|p1 + t*r1|^2 = 1` expands to `1 + 2t*dot(p1,r1) + t^2 = 1`, i.e.
 * `t*(t + 2*dot(p1,r1)) = 0` — one root is `t=0` (`p1` itself), the other
 * is `p2`, the far intersection with the same sphere. Closed-form, no
 * ray-marching, because a line through a sphere has exactly two
 * intersections and one is already known.
 *
 * The rim "highlight" is Schlick's approximation of the Fresnel term —
 * how much light reflects vs. transmits at a point, as a function of
 * viewing angle and `uIor` alone — blending a REFLECTED sample of the
 * scene texture with the REFRACTED one above, not a constant white value.
 */
export const LENS_FRAGMENT_SHADER = `
    precision highp float;
    varying vec2 vLocal;
    uniform sampler2D uScene;
    uniform vec2 uResolution;
    uniform vec2 uCenter;
    uniform float uRadius;
    uniform float uIor;
    uniform float uDepth;
    uniform float uReflectionReach;
    uniform float uFresnelBoost;
    uniform float uDim;
    void main() {
        float r2 = dot(vLocal, vLocal);
        if (r2 > 1.0) { discard; }
        float z = sqrt(1.0 - r2);
        vec3 p1 = vec3(vLocal, z);
        vec3 n1 = p1;
        vec3 incident = vec3(0.0, 0.0, -1.0);

        vec3 r1 = refract(incident, n1, 1.0 / uIor);
        float t = -2.0 * dot(p1, r1);
        vec3 p2 = p1 + t * r1;
        vec3 n2 = -p2;
        vec3 r2v = refract(r1, n2, uIor);
        float tir = 1.0 - step(0.001, dot(r2v, r2v));
        r2v = mix(r2v, reflect(r1, n2), tir);
        vec2 exitPx = uCenter + p2.xy * uRadius;
        vec2 refractUv = (exitPx + r2v.xy * uDepth) / uResolution;
        refractUv.y = 1.0 - refractUv.y;
        vec3 refractedColor = texture2D(uScene, clamp(refractUv, 0.0, 1.0)).rgb;

        vec3 reflectDir = reflect(incident, n1);
        vec2 reflectUv = (uCenter + n1.xy * uRadius + reflectDir.xy * uDepth * uReflectionReach) / uResolution;
        reflectUv.y = 1.0 - reflectUv.y;
        vec3 reflectedColor = texture2D(uScene, clamp(reflectUv, 0.0, 1.0)).rgb;

        float f0 = pow((1.0 - uIor) / (1.0 + uIor), 2.0);
        float fresnel = clamp((f0 + (1.0 - f0) * pow(1.0 - z, 5.0)) * uFresnelBoost, 0.0, 1.0);
        fresnel = mix(fresnel, 1.0, tir);

        vec3 col = mix(refractedColor, reflectedColor, fresnel);
        col *= uDim;

        gl_FragColor = vec4(col, 1.0);
    }
`;
