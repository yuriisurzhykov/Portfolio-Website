import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig, devices } from "@playwright/test";

// `.env.test`, NOT `.env` — this suite runs against `backend/.env.test`'s `portfolio_test`
// database, seeded with a small, fixed, known set of content by
// `backend/scripts/seed-e2e-fixtures.ts` (chained in front of `playwright test` by every
// test:e2e*/test:visual/test:a11y npm script — see package.json), NEVER the real dev database.
// Dev content changes constantly as the real site evolves — depending on it would make this
// suite's results depend on whatever happened to be there at the moment someone ran it, which
// defeats the entire point of a regression suite. See tests/README.md's dated correction entry
// for why an earlier version of this file loaded `.env` instead, and why that was wrong.
//
// This load matters for TWO separate things that both need to agree on the same database:
// generate-pages-manifest.ts (which does its own, identical load — see its own comment) builds
// the page list BEFORE Playwright starts, and the `webServer` below spawns `next build && next
// start`, which inherits `process.env` from this config-loading process — so setting it here,
// once, is what keeps the manifest and the actual server under test reading the same data.
loadEnv({ path: path.resolve(__dirname, "..", "backend", ".env.test") });

// 3100, not Next's default 3000 — so this suite never collides with an already-running
// `npm run dev` (which defaults to 3000) on the same machine.
const PORT = 3100;
const LOCAL_BASE_URL = `http://localhost:${ PORT }`;

/**
 * Optional escape hatch: point the suite at an already-deployed URL instead of building +
 * starting the Next.js app locally. See tests/README.md, section 3, for details. Unset by
 * default.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? LOCAL_BASE_URL;

export default defineConfig({
    testDir: "./tests/e2e",

    // Default (30s) is too tight on resource-constrained runners for the heavier pages (hero
    // section's gradient/glow background) combined with the 15s screenshot-stability timeout
    // below — give the whole test more headroom rather than fighting CPU contention.
    timeout: 60_000,

    // Baselines are stored one folder per page (see tests/README.md, section 4), named
    // `<theme>-<projectName>.png` inside it. Deliberately does NOT include the OS/platform in the
    // filename: baselines are Linux-only by convention (section 2/6) and mixing in a platform
    // suffix would let a local Windows run silently create a second, divergent set of "baselines"
    // instead of failing loudly.
    snapshotDir: "./tests/visual-snapshots",
    snapshotPathTemplate: "{snapshotDir}/{arg}-{projectName}{ext}",

    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 4 : undefined,

    reporter: process.env.CI
        ? [
            ["html", {outputFolder: "playwright-report", open: "never"}],
            ["./tests/e2e/reporters/summary-reporter.ts"],
            ["github"],
        ]
        : [
            ["list"],
            ["html", {outputFolder: "playwright-report", open: "never"}],
            ["./tests/e2e/reporters/summary-reporter.ts"],
        ],

    use: {
        baseURL,
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },

    expect: {
        // Default (5s) is too tight on resource-constrained runners (hit consistently in a
        // Docker container on first-run cold start, ~5 of 30 tests in the original frontend/
        // suite) — Playwright retries the screenshot comparison until two consecutive captures
        // are stable or this elapses, so a slow/CPU-throttled first paint just needs more
        // headroom, not a real fix. Set here (not inside `toHaveScreenshot` below) because
        // `PlaywrightTestConfig["expect"]["toHaveScreenshot"]["timeout"]` doesn't exist at the
        // root-config level in this Playwright version — only per-PROJECT `expect.toHaveScreenshot`
        // has its own `timeout` field (confirmed against @playwright/test's own .d.ts, not
        // assumed — a first draft that mirrored frontend/tests/'s exact structure failed `next
        // build`'s typecheck with "'timeout' does not exist" here). This suite's only other
        // `expect()` call (`a11y.spec.ts`'s synchronous `toEqual([])`) is effectively instant, so
        // widening the timeout to every matcher, not just screenshots, is harmless.
        timeout: 15_000,
        toHaveScreenshot: {
            // Small tolerance for sub-pixel anti-aliasing noise; real layout/color regressions
            // are almost always far above this threshold.
            maxDiffPixelRatio: 0.02,
            animations: "disabled",
        },
    },

    projects: [
        {
            name: "Desktop",
            use: {...devices["Desktop Chrome"], viewport: {width: 1440, height: 900}},
            // No testMatch restriction: this is the only project a11y.spec.ts runs under
            // (contrast/DOM checks don't depend on viewport size, so running them 3x would be
            // pure waste), and it also runs the full visual.spec.ts suite.
        },
        {
            // NOTE: deliberately NOT using the built-in `devices["iPad (gen 7)"]` preset here.
            // Playwright's Apple-branded device presets (iPad */iPhone *) default to the WebKit
            // engine to emulate Safari — since this suite is Chromium-only by design, using them
            // as-is makes every Tablet/Mobile test try to launch a WebKit binary that was never
            // installed, failing with "Executable doesn't exist". Instead, take the Chromium
            // engine from "Desktop Chrome" and just override the viewport/touch metrics.
            name: "Tablet",
            use: {...devices["Desktop Chrome"], viewport: {width: 834, height: 1194}, isMobile: true, hasTouch: true},
            testMatch: /visual\.spec\.ts/,
        },
        {
            name: "Mobile",
            use: {...devices["Desktop Chrome"], viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true},
            testMatch: /visual\.spec\.ts/,
        },
    ],

    // Skipped entirely when PLAYWRIGHT_BASE_URL is set, so the suite can target a deployed URL
    // without spinning up a local server. `next start` (unlike Vite's `preview`) needs `next
    // build` to have already produced a `.next/` — chained here the same way the frontend/
    // version chained `vite build && vite preview`.
    webServer: process.env.PLAYWRIGHT_BASE_URL
        ? undefined
        : {
            command: `npm run build && npm run start -- -p ${ PORT }`,
            url: LOCAL_BASE_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
});
