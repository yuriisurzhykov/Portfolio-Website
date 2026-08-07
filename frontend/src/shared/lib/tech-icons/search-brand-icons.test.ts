import { describe, expect, it } from "vitest";
import { matches, rank, searchBrandIcons } from "./search-brand-icons";

describe("matches", () => {
    it("matches via the slug alone", () => {
        expect(matches({ slug: "docker", title: "Something Else" }, "dock")).toBe(true);
    });

    it("matches via the title alone, case-insensitively", () => {
        expect(matches({ slug: "abc", title: "Docker" }, "dock")).toBe(true);
    });

    it("does not require BOTH slug and title to match — either one is enough", () => {
        // Pins the `||`, not `&&`: a fake icon whose slug matches but whose
        // title does not (and vice versa) must still be a match.
        expect(matches({ slug: "docker-thing", title: "Completely Unrelated" }, "docker")).toBe(true);
        expect(matches({ slug: "unrelated", title: "Docker Desktop" }, "docker")).toBe(true);
    });

    it("returns false when neither slug nor title contains the query", () => {
        expect(matches({ slug: "kubernetes", title: "Kubernetes" }, "docker")).toBe(false);
    });
});

describe("rank", () => {
    // A real Simple Icons query ("git") happens to have every startsWith
    // sibling's title already sort alphabetically after "Git" itself, so a
    // test using only real catalog data can't distinguish "exact match
    // correctly returns 0" from "exact match wrongly falls through to the
    // startsWith check" — both produce the same final order by accident.
    // Hand-built fake icons sidestep that: no real-data quirk to hunt for.
    it("ranks an exact slug match as 0", () => {
        expect(rank({ slug: "docker", title: "Docker" }, "docker")).toBe(0);
    });

    it("ranks a slug-prefix match (not exact) as 1", () => {
        expect(rank({ slug: "dockerdesktop", title: "Docker Desktop" }, "docker")).toBe(1);
    });

    it("ranks a title-prefix match as 1 even when the slug itself doesn't start with the query", () => {
        // Isolates the title-based half of the rank-1 OR condition — a
        // slug that DOESN'T start with the query at all.
        expect(rank({ slug: "ddkr", title: "Docker" }, "docker")).toBe(1);
    });

    it("does not require BOTH slug and title to start with the query for rank 1 — either is enough", () => {
        // Pins the `||`, not `&&`, in the rank-1 condition specifically
        // (as opposed to `matches`' own `||`, tested separately above).
        expect(rank({ slug: "dockerdesktop", title: "Completely Unrelated" }, "docker")).toBe(1);
        expect(rank({ slug: "unrelated", title: "Docker Desktop" }, "docker")).toBe(1);
    });

    it("the title-prefix check is case-insensitive (lowercases the title, not the query)", () => {
        // A query already lowercase; only mutating `.toLowerCase()` to
        // `.toUpperCase()` on the title breaks this — kills that specific
        // mutation without also being sensitive to a query-casing mutation.
        expect(rank({ slug: "ddkr", title: "DOCKER" }, "docker")).toBe(1);
    });

    it("ranks a match that's neither exact nor a prefix (substring-only) as 2", () => {
        expect(rank({ slug: "mydockertool", title: "My Docker Tool" }, "docker")).toBe(2);
    });
});

describe("searchBrandIcons", () => {
    it("returns an empty array for an empty or whitespace-only query", () => {
        expect(searchBrandIcons("")).toEqual([]);
        expect(searchBrandIcons("   ")).toEqual([]);
    });

    it("finds a well-known brand by an exact slug match, returning exactly {slug, title, path} (no extra SimpleIcon fields leaking through)", () => {
        const results = searchBrandIcons("docker");
        expect(results[0]).toEqual({ slug: "docker", title: "Docker", path: expect.stringMatching(/^M/) });
    });

    it("is case-insensitive", () => {
        expect(searchBrandIcons("DOCKER").some((r) => r.slug === "docker")).toBe(true);
    });

    it("trims surrounding whitespace around an otherwise-real query", () => {
        expect(searchBrandIcons("  docker  ").some((r) => r.slug === "docker")).toBe(true);
    });

    it("respects the limit parameter", () => {
        const results = searchBrandIcons("a", 3);
        expect(results.length).toBeLessThanOrEqual(3);
    });

    it("returns an empty array for a query matching no real brand", () => {
        expect(searchBrandIcons("this-is-definitely-not-a-brand-name-xyz")).toEqual([]);
    });

    it("re-sorts a worse-ranked candidate that appears FIRST in catalog order behind a better one — proves sorting actually runs against real data too", () => {
        // "cloud66"/"cloudfoundry" etc. all rank 1 (slug startsWith "cloud")
        // for this query; their natural catalog order is NOT alphabetical
        // by title (verified: unsorted order starts with "alibabacloud"),
        // so this exact sequence can only come from the real rank+sort.
        const results = searchBrandIcons("cloud", 6).map((r) => r.slug);
        expect(results).toEqual(["cloud66", "cloudfoundry", "cloudnativebuild", "cloudbees", "cloudcannon", "cloudera"]);
    });
});
