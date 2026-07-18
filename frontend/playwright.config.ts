import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const LOCAL_BASE_URL = `http://localhost:${ PORT }`;

/**
 * Optional escape hatch: point the suite at an already-deployed URL instead of building +
 * previewing locally. See tests/README.md, section 3, for details. Unset by default.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? LOCAL_BASE_URL;

export default defineConfig({
    testDir: "./tests/e2e",

    // Default (30s) is too tight on resource-constrained runners for the heavier pages (hero
    // section's gradient/glow background) combined with the 15s screenshot-stability timeout
    // above — give the whole test more headroom rather than fighting CPU contention.
    timeout: 60_000,

    // Baselines are stored flat, one folder for the whole repo (the "references" folder from
    // the original requirement), named `<screenshot-name>-<projectName>.png`. Deliberately does
    // NOT include the OS/platform in the filename: baselines are Linux-only by convention (see
    // guide section 2/6) and mixing in a platform suffix would let a local Windows run silently
    // create a second, divergent set of "baselines" instead of failing loudly.
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
        toHaveScreenshot: {
            // Small tolerance for sub-pixel anti-aliasing noise; real layout/color regressions
            // are almost always far above this threshold.
            maxDiffPixelRatio: 0.02,
            animations: "disabled",
            // Default (5s) is too tight on resource-constrained runners (hit consistently in a
            // Docker container on first-run cold start, ~5 of 30 tests) — Playwright retries the
            // screenshot comparison until two consecutive captures are stable or this elapses, so
            // a slow/CPU-throttled first paint just needs more headroom, not a real fix.
            timeout: 15_000,
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
    // without spinning up a local server.
    webServer: process.env.PLAYWRIGHT_BASE_URL
        ? undefined
        : {
            command: `npm run build && npm run preview -- --port ${ PORT } --strictPort`,
            url: LOCAL_BASE_URL,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
        },
});
