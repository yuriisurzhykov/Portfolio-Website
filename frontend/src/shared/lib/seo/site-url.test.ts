import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Both exports are module-level constants read from `process.env` at import
 * time, so every case here needs a fresh module registry — `vi.resetModules()`
 * plus a dynamic `import()`, not a top-level one.
 */
async function load(env: Record<string, string | undefined>) {
    vi.resetModules();
    for (const [key, value] of Object.entries(env)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
    return import("./site-url");
}

const ORIGINAL = { SITE_URL: process.env.SITE_URL, SEO_INDEXABLE: process.env.SEO_INDEXABLE };

beforeEach(() => {
    delete process.env.SITE_URL;
    delete process.env.SEO_INDEXABLE;
});

afterEach(() => {
    process.env.SITE_URL = ORIGINAL.SITE_URL;
    process.env.SEO_INDEXABLE = ORIGINAL.SEO_INDEXABLE;
});

describe("IS_INDEXABLE", () => {
    it("is false when the variable is absent — indexing is opt-in", () => {
        return load({}).then(({ IS_INDEXABLE }) => expect(IS_INDEXABLE).toBe(false));
    });

    it("is false for anything other than the exact string \"true\"", async () => {
        // "1", "TRUE" and "yes" are all typos as far as this is concerned.
        // Being strict is what makes a misconfigured deployment noindex
        // rather than accidentally live.
        for (const value of ["1", "TRUE", "yes", ""]) {
            const { IS_INDEXABLE } = await load({ SEO_INDEXABLE: value });
            expect(IS_INDEXABLE, `SEO_INDEXABLE=${ value }`).toBe(false);
        }
    });

    it("is true only for \"true\"", async () => {
        const { IS_INDEXABLE } = await load({ SEO_INDEXABLE: "true" });
        expect(IS_INDEXABLE).toBe(true);
    });
});

describe("SITE_URL", () => {
    it("is an empty string when unset, never undefined", async () => {
        const { SITE_URL } = await load({});
        expect(SITE_URL).toBe("");
    });

    it("strips trailing slashes so callers can concatenate a path directly", async () => {
        const { SITE_URL } = await load({ SITE_URL: "https://example.com///" });
        expect(SITE_URL).toBe("https://example.com");
    });

    it("leaves an already-clean origin alone", async () => {
        const { SITE_URL } = await load({ SITE_URL: "https://example.com" });
        expect(SITE_URL).toBe("https://example.com");
    });
});
