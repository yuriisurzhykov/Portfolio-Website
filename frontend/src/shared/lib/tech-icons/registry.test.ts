import { describe, expect, it } from "vitest";
import { getAllSimpleIcons, getSimpleIconBySlug } from "./registry";

describe("getSimpleIconBySlug", () => {
    it("finds a well-known icon by its real slug", () => {
        const docker = getSimpleIconBySlug("docker");
        expect(docker?.title).toBe("Docker");
        expect(docker?.path).toMatch(/^M/);
    });

    it("returns undefined for a slug that doesn't exist in the catalog", () => {
        expect(getSimpleIconBySlug("this-brand-does-not-exist")).toBeUndefined();
    });

    it("indexes by the icon's own slug, not a mechanical export-name guess (e.g. an underscore-containing slug)", () => {
        // `siHive_blockchain`'s export name doesn't follow the plain
        // PascalCase pattern most exports do — proves the index is built
        // from `.slug`, not from reconstructing the export name.
        expect(getSimpleIconBySlug("hive_blockchain")?.title).toBe("Hive");
    });
});

describe("getAllSimpleIcons", () => {
    it("returns a large, real catalog containing well-known brands", () => {
        const all = getAllSimpleIcons();
        expect(all.length).toBeGreaterThan(1000);
        expect(all.some((icon) => icon.slug === "kotlin")).toBe(true);
    });
});
