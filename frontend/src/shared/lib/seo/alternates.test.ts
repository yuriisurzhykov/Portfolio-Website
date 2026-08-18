import { describe, expect, it } from "vitest";
import { alternatesFor, localizedPath } from "./alternates";

describe("localizedPath", () => {
    it("prefixes /ru for Russian and leaves English untouched", () => {
        expect(localizedPath("/journal/x", "ru")).toBe("/ru/journal/x");
        expect(localizedPath("/journal/x", "en")).toBe("/journal/x");
    });

    it("maps the site root to /ru, never /ru/", () => {
        // A trailing slash here is a DIFFERENT URL from the one the site
        // serves — it showed up in a real sitemap response the first time
        // this mapping was written twice.
        expect(localizedPath("/", "ru")).toBe("/ru");
        expect(localizedPath("/", "en")).toBe("/");
    });
});

describe("alternatesFor", () => {
    it("canonicalizes a translated Russian page to itself", () => {
        expect(alternatesFor("/journal/x", "ru", ["en", "ru"]).canonical).toBe("/ru/journal/x");
    });

    it("canonicalizes an UNTRANSLATED Russian page to the English URL", () => {
        // `/ru/journal/x` renders the English body when no Russian one
        // exists (getPostBySlug's fallback), so it is a duplicate — the
        // canonical is the instruction not to index it separately.
        expect(alternatesFor("/journal/x", "ru", ["en"]).canonical).toBe("/journal/x");
    });

    it("never declares a locale the entity has no version in", () => {
        expect(alternatesFor("/journal/x", "en", ["en"]).languages).toEqual({
            en: "/journal/x",
            "x-default": "/journal/x",
        });
    });

    it("declares every available locale plus x-default", () => {
        expect(alternatesFor("/journal/x", "en", ["en", "ru"]).languages).toEqual({
            en: "/journal/x",
            ru: "/ru/journal/x",
            "x-default": "/journal/x",
        });
    });

    it("keeps the site root as /ru, not /ru/", () => {
        expect(alternatesFor("/", "ru", ["en", "ru"]).canonical).toBe("/ru");
        expect(alternatesFor("/", "en", ["en", "ru"]).languages.ru).toBe("/ru");
    });

    it("points x-default at the English URL even when rendering Russian", () => {
        expect(alternatesFor("/work", "ru", ["en", "ru"]).languages["x-default"]).toBe("/work");
    });
});
