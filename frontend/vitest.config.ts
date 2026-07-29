import path from "node:path";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        // tests/e2e/*.spec.ts are Playwright specs, not Vitest ones — exclude them
        // (spread configDefaults.exclude, don't replace it, or node_modules etc.
        // stop being excluded too).
        exclude: [...configDefaults.exclude, "tests/e2e/**"],
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
