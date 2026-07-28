import path from "node:path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        // Without this, Vitest's default file-matching glob also picks up
        // tests/e2e/*.spec.ts — Playwright specs meant to run only via
        // `playwright test` (see playwright.config.ts's own `testDir`),
        // never via `vitest run` directly. Run that way, they fail
        // immediately (no page manifest generated, no browser/webServer
        // started) with a misleading-looking "2 failed" in an otherwise
        // green Vitest run — found live in CI (`npm test` inside
        // backend-web-checks.yml), not by inspection. `configDefaults.exclude`
        // must be spread in, not just extended with a bare array — replacing
        // it outright would stop excluding node_modules/dist/.git/etc. too.
        exclude: [...configDefaults.exclude, "tests/e2e/**"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
