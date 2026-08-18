/**
 * Process-start hook.
 *
 * Two implementation details, both load-bearing:
 *
 * 1. **This file lives in `src/`, not the package root.** With a `src`
 *    directory present, a production start only picks instrumentation up
 *    from there; a root-level file is silently ignored under `next start`
 *    (while still working in dev with Turbopack). A check that doesn't run
 *    in the environment it was written for is worse than no check.
 * 2. **The real work sits behind a dynamic import, guarded by
 *    `NEXT_RUNTIME`.** Turbopack compiles this module for the Edge runtime
 *    as well, and a literal `process.exit` in this file makes the build
 *    warn about an unsupported Node API even though the guard means it can
 *    never run there. Splitting it out keeps the Edge bundle free of it —
 *    found from a real build's output, not anticipated.
 */
export async function register(): Promise<void> {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    const { registerNodeInstrumentation } = await import("./instrumentation.node");
    await registerNodeInstrumentation();
}
