import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        setupFiles: ["./vitest.setup.ts"],
        // argon2 hashing + real Postgres round-trips in the integration tests
        // are slower than the 5s default, especially on CI runners.
        testTimeout: 15000,
        // Integration tests share one Postgres connection pool (see
        // src/test-utils/db.ts) and reset tables between tests — running
        // files in parallel workers would race on that shared state.
        fileParallelism: false,
    },
});
