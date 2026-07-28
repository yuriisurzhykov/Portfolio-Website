import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * A dedicated Vitest config for mutation testing (see stryker.config.mjs) —
 * not vitest.config.ts. Same reasoning as backend/vitest.mutation.config.ts:
 * Stryker's initial "dry run" runs whatever vitest.configFile discovers,
 * exactly like `vitest run` would — not filtered down to `mutate`'s scope.
 * Pointing it at the normal vitest.config.ts would pull in every jsdom
 * component test too, which this mutation-testing scope deliberately
 * excludes (see stryker.config.mjs's comment) for speed/noise reasons.
 *
 * Keep this `include` list in sync with stryker.config.mjs's `mutate` list.
 */
export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        include: [
            "src/shared/lib/date-format.test.ts",
            "src/shared/lib/slugify.test.ts",
            "src/shared/i18n/engine/LocaleRegistry.test.ts",
            "src/shared/i18n/engine/index.test.ts",
            "src/shared/ui/block-editor/convert.test.ts",
        ],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
