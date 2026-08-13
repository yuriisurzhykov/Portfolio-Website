import {
    BLIT_FRAGMENT_SHADER,
    BLIT_VERTEX_SHADER,
    EDGE_FRAGMENT_SHADER,
    EDGE_VERTEX_SHADER,
    GRID_FRAGMENT_SHADER,
    GRID_VERTEX_SHADER,
    LENS_FRAGMENT_SHADER,
    LENS_VERTEX_SHADER,
} from "./shaders";
import { computeIdleFloatOffset } from "./idleFloat";

export interface RenderableGraphNode {
    id: string;
    x: number;
    y: number;
    r: number;
}

export interface RenderableGraphEdge {
    sourceId: string;
    targetId: string;
}

export interface GraphSceneOptions {
    /** 0..1 RGB — used for both the connection lines and, tinted, the scene's one light patch. */
    accentColor: readonly [number, number, number];
    /** 0..1 RGB — the scene's own clear color / grid base. MUST track the site's current theme (`tokens.ts`'s `background.app`) — a canvas that always clears to the dark-theme color looks like a broken opaque box dropped onto a light page. */
    backgroundColor: readonly [number, number, number];
    /** 0..1 RGB — grid line/dot tint, contrasted against `backgroundColor` (near-white on dark, near-black on light) — see `gl/shaders.ts`'s own comment on `uInk`. */
    inkColor: readonly [number, number, number];
    /** Normalized 0..1 within the CANVAS's own bounds, not the page — see project-graph/README.md for why the position matters. */
    lightPosition: { x: number; y: number };
    lightIntensity: number;
    indexOfRefraction: number;
    lensDepth: number;
    reflectionReach: number;
    fresnelBoost: number;
    gridCellPx: number;
    gridLineOpacity: number;
    gridDotOpacity: number;
    /** Idle per-node "breathing" offset — purely cosmetic, layered on top of whatever x/y `renderFrame` is given, never fed back into it. */
    idleFloat: boolean;
}

interface ProgramHandle {
    program: WebGLProgram;
    attribs: Record<string, number>;
    uniforms: Record<string, WebGLUniformLocation | null>;
}

interface SceneFramebuffer {
    framebuffer: WebGLFramebuffer;
    texture: WebGLTexture;
    width: number;
    height: number;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string, label: string, diagnostics: string[]): WebGLShader {
    const shader = gl.createShader(type);
    if (!shader) throw new Error(`[GraphScene] gl.createShader returned null for ${ label }`);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        diagnostics.push(`[${ label }] ${ gl.getShaderInfoLog(shader) }`);
    }
    return shader;
}

function createProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string, label: string, diagnostics: string[]): WebGLProgram {
    const program = gl.createProgram();
    if (!program) throw new Error(`[GraphScene] gl.createProgram returned null for ${ label }`);
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource, `${ label } vertex`, diagnostics));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, `${ label } fragment`, diagnostics));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        diagnostics.push(`[${ label } link] ${ gl.getProgramInfoLog(program) }`);
    }
    return program;
}

function locate(gl: WebGLRenderingContext, program: WebGLProgram, attribs: string[], uniforms: string[]): ProgramHandle {
    const attribLocations: Record<string, number> = {};
    const uniformLocations: Record<string, WebGLUniformLocation | null> = {};
    for (const name of attribs) attribLocations[name] = gl.getAttribLocation(program, name);
    for (const name of uniforms) uniformLocations[name] = gl.getUniformLocation(program, name);
    return {program, attribs: attribLocations, uniforms: uniformLocations};
}

/**
 * Renders the project graph via WebGL1: the whole scene (grid + edges) is
 * drawn once per frame into an off-screen texture, then every node is a
 * quad that samples THAT texture through a fake glass-sphere refraction —
 * see `gl/shaders.ts`'s `LENS_FRAGMENT_SHADER` comment for the physics.
 * Deliberately has no idea React exists: `renderFrame` is a plain function
 * call driven by whoever owns the animation loop (`useGraphScene`), and
 * `dispose()` frees every GL resource explicitly — required because a
 * component using this can mount/unmount many times in one session (route
 * changes, React Strict Mode's double-invoke in dev), and browsers cap the
 * number of live WebGL contexts a page can hold at once.
 */
export class GraphScene {
    private readonly gl: WebGLRenderingContext;
    /**
     * NOT readonly on purpose — `setOptions` below replaces this reference live, whenever the owning
     * component's derived options change (idle-motion correcting itself after mount, a theme toggle, ...).
     * Every draw call already reads `this.options.*` fresh each frame, so swapping the reference is enough;
     * nothing needs recompiling.
     * */
    private options: GraphSceneOptions;
    private readonly quadBuffer: WebGLBuffer;
    private readonly edgeBuffer: WebGLBuffer;
    private readonly gridProgram: ProgramHandle;
    private readonly edgeProgram: ProgramHandle;
    private readonly blitProgram: ProgramHandle;
    private readonly lensProgram: ProgramHandle;
    private sceneFbo: SceneFramebuffer | null = null;
    private disposed = false;

    /**
     * Non-empty only if a shader failed to compile/link — surfaced so a caller can show it instead of
     * silently rendering nothing (see project-graph/README.md's "diagnostics" entry for why this was
     * worth adding).
     * */
    readonly diagnostics: string[] = [];

    constructor(canvas: HTMLCanvasElement, options: GraphSceneOptions) {
        const gl = canvas.getContext("webgl", {antialias: true, preserveDrawingBuffer: false});
        if (!gl) throw new Error("[GraphScene] WebGL is unavailable in this browser");
        this.gl = gl;
        this.options = options;

        this.quadBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        this.edgeBuffer = gl.createBuffer()!;

        this.gridProgram = locate(
            gl,
            createProgram(gl, GRID_VERTEX_SHADER, GRID_FRAGMENT_SHADER, "grid", this.diagnostics),
            ["aPos"],
            ["uResolution", "uCell", "uLineOpacity", "uDotOpacity", "uLightPos", "uLightColor", "uLightIntensity", "uBackground", "uInk"],
        );
        this.edgeProgram = locate(gl, createProgram(gl, EDGE_VERTEX_SHADER, EDGE_FRAGMENT_SHADER, "edge", this.diagnostics), ["aPos", "aColor"], ["uResolution"]);
        this.blitProgram = locate(gl, createProgram(gl, BLIT_VERTEX_SHADER, BLIT_FRAGMENT_SHADER, "blit", this.diagnostics), ["aPos"], ["uScene"]);
        this.lensProgram = locate(
            gl,
            createProgram(gl, LENS_VERTEX_SHADER, LENS_FRAGMENT_SHADER, "lens", this.diagnostics),
            ["aLocal"],
            ["uResolution", "uCenter", "uRadius", "uIor", "uDepth", "uReflectionReach", "uFresnelBoost", "uDim"],
        );
    }

    /**
     * Updates every future `renderFrame`/`drawGrid`/`drawLens` call without
     * recreating the canvas, programs, or FBO — nothing in
     * `GraphSceneOptions` affects shader compilation, only the uniform
     * values fed into an already-linked program each frame. The one thing
     * a caller must NOT expect this to fix on its own: idle-motion or
     * palette that had already been baked into a couple of frames before
     * this call lands just carries on correctly from here — there's no
     * retroactive re-render of frames already drawn, which is fine, since
     * the visible effect is "corrects within one frame," not a rewind.
     */
    setOptions(options: GraphSceneOptions): void {
        this.options = options;
    }

    /**
     * `cssWidth`/`cssHeight` in CSS pixels — this multiplies by `devicePixelRatio` itself, matching
     * every other pixel value `renderFrame` is given (also CSS px; see that method's own note).
     * */
    resize(cssWidth: number, cssHeight: number): void {
        const gl = this.gl;
        const dpr = window.devicePixelRatio || 1;
        const pxWidth = Math.max(1, Math.round(cssWidth * dpr));
        const pxHeight = Math.max(1, Math.round(cssHeight * dpr));
        if (this.sceneFbo && this.sceneFbo.width === pxWidth && this.sceneFbo.height === pxHeight) return;

        (gl.canvas as HTMLCanvasElement).width = pxWidth;
        (gl.canvas as HTMLCanvasElement).height = pxHeight;

        if (this.sceneFbo) {
            gl.deleteTexture(this.sceneFbo.texture);
            gl.deleteFramebuffer(this.sceneFbo.framebuffer);
        }
        const texture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, pxWidth, pxHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const framebuffer = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.sceneFbo = {framebuffer, texture, width: pxWidth, height: pxHeight};
    }

    /**
     * `nodes[].x/y/r` are CSS pixels relative to the canvas's own top-left
     * corner (NOT the page) — `useGraphScene` is responsible for that
     * coordinate space, this class only ever multiplies by
     * `devicePixelRatio` internally to reach the texture's real pixel grid.
     * `timeSeconds` drives idle floating only; physics/drag positions are
     * entirely the caller's responsibility (see this class's own doc
     * comment for why floating specifically lives here and not there).
     */
    renderFrame(nodes: RenderableGraphNode[], edges: RenderableGraphEdge[], hoveredId: string | null, timeSeconds: number): void {
        if (this.disposed || !this.sceneFbo || this.diagnostics.length > 0) return;
        const gl = this.gl;
        const dpr = window.devicePixelRatio || 1;
        const canvas = gl.canvas as HTMLCanvasElement;
        const fbo = this.sceneFbo;

        const positioned = nodes.map((node) => ({
            node,
            x: node.x + computeIdleFloatOffset(node.id, timeSeconds, this.options.idleFloat, "x"),
            y: node.y + computeIdleFloatOffset(node.id, timeSeconds, this.options.idleFloat, "y"),
        }));
        // The hovered node (also true while it's being dragged — see
        // `useGraphScene`) draws last, i.e. on top of anything it visually
        // overlaps, instead of whatever the array's incidental order was.
        if (hoveredId) {
            positioned.sort((a, b) => (a.node.id === hoveredId ? 1 : 0) - (b.node.id === hoveredId ? 1 : 0));
        }
        const byId = new Map(positioned.map((p) => [p.node.id, p]));

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
        gl.viewport(0, 0, fbo.width, fbo.height);
        gl.clearColor(...this.options.backgroundColor, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.drawGrid(fbo.width, fbo.height);
        this.drawEdges(edges, byId, hoveredId, fbo.width, fbo.height, dpr);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.drawBlit(fbo.texture);
        for (const {node, x, y} of positioned) {
            this.drawLens(node, x, y, hoveredId, edges, canvas.width, canvas.height, dpr, fbo.texture);
        }
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        const gl = this.gl;
        gl.deleteBuffer(this.quadBuffer);
        gl.deleteBuffer(this.edgeBuffer);
        for (const handle of [this.gridProgram, this.edgeProgram, this.blitProgram, this.lensProgram]) {
            gl.deleteProgram(handle.program);
        }
        if (this.sceneFbo) {
            gl.deleteTexture(this.sceneFbo.texture);
            gl.deleteFramebuffer(this.sceneFbo.framebuffer);
            this.sceneFbo = null;
        }
    }

    private drawGrid(fboWidth: number, fboHeight: number): void {
        const gl = this.gl;
        const {attribs, uniforms, program} = this.gridProgram;
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(attribs.aPos);
        gl.vertexAttribPointer(attribs.aPos, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(uniforms.uResolution, fboWidth, fboHeight);
        gl.uniform1f(uniforms.uCell, this.options.gridCellPx * (window.devicePixelRatio || 1));
        gl.uniform1f(uniforms.uLineOpacity, this.options.gridLineOpacity);
        gl.uniform1f(uniforms.uDotOpacity, this.options.gridDotOpacity);
        gl.uniform2f(uniforms.uLightPos, this.options.lightPosition.x, this.options.lightPosition.y);
        gl.uniform3f(uniforms.uLightColor, ...this.options.accentColor);
        gl.uniform1f(uniforms.uLightIntensity, this.options.lightIntensity);
        gl.uniform3f(uniforms.uBackground, ...this.options.backgroundColor);
        gl.uniform3f(uniforms.uInk, ...this.options.inkColor);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    private drawEdges(
        edges: RenderableGraphEdge[],
        byId: Map<string, { node: RenderableGraphNode; x: number; y: number }>,
        hoveredId: string | null,
        fboWidth: number,
        fboHeight: number,
        dpr: number,
    ): void {
        const gl = this.gl;
        const {attribs, uniforms, program} = this.edgeProgram;
        const data = new Float32Array(edges.length * 12);
        const [r, g, b] = this.options.accentColor;
        edges.forEach((edge, i) => {
            const source = byId.get(edge.sourceId);
            const target = byId.get(edge.targetId);
            if (!source || !target) return;
            const touchesHovered = hoveredId !== null && (edge.sourceId === hoveredId || edge.targetId === hoveredId);
            const alpha = hoveredId === null ? 0.18 : touchesHovered ? 0.85 : 0.03;
            const base = i * 12;
            data[base + 0] = source.x * dpr;
            data[base + 1] = source.y * dpr;
            data[base + 2] = r;
            data[base + 3] = g;
            data[base + 4] = b;
            data[base + 5] = alpha;
            data[base + 6] = target.x * dpr;
            data[base + 7] = target.y * dpr;
            data[base + 8] = r;
            data[base + 9] = g;
            data[base + 10] = b;
            data[base + 11] = alpha;
        });

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.edgeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        const stride = 6 * 4;
        gl.enableVertexAttribArray(attribs.aPos);
        gl.vertexAttribPointer(attribs.aPos, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(attribs.aColor);
        gl.vertexAttribPointer(attribs.aColor, 4, gl.FLOAT, false, stride, 2 * 4);
        gl.uniform2f(uniforms.uResolution, fboWidth, fboHeight);
        gl.drawArrays(gl.LINES, 0, edges.length * 2);
    }

    private drawBlit(sceneTexture: WebGLTexture): void {
        const gl = this.gl;
        const {attribs, uniforms, program} = this.blitProgram;
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(attribs.aPos);
        gl.vertexAttribPointer(attribs.aPos, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
        gl.uniform1i(uniforms.uScene, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    private drawLens(
        node: RenderableGraphNode,
        x: number,
        y: number,
        hoveredId: string | null,
        edges: RenderableGraphEdge[],
        canvasWidth: number,
        canvasHeight: number,
        dpr: number,
        sceneTexture: WebGLTexture,
    ): void {
        const gl = this.gl;
        const {attribs, uniforms, program} = this.lensProgram;
        const isDimmed = hoveredId !== null && node.id !== hoveredId && !this.isConnectedTo(node.id, hoveredId, edges);

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(attribs.aLocal);
        gl.vertexAttribPointer(attribs.aLocal, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
        gl.uniform1i(uniforms.uScene, 0);
        gl.uniform2f(uniforms.uResolution, canvasWidth, canvasHeight);
        gl.uniform2f(uniforms.uCenter, x * dpr, y * dpr);
        gl.uniform1f(uniforms.uRadius, node.r * dpr);
        gl.uniform1f(uniforms.uIor, this.options.indexOfRefraction);
        gl.uniform1f(uniforms.uDepth, this.options.lensDepth * dpr);
        gl.uniform1f(uniforms.uReflectionReach, this.options.reflectionReach);
        gl.uniform1f(uniforms.uFresnelBoost, this.options.fresnelBoost);
        gl.uniform1f(uniforms.uDim, isDimmed ? 0.35 : 1.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    private isConnectedTo(nodeId: string, otherId: string, edges: RenderableGraphEdge[]): boolean {
        return edges.some((edge) => (edge.sourceId === nodeId && edge.targetId === otherId) || (edge.targetId === nodeId && edge.sourceId === otherId));
    }
}
