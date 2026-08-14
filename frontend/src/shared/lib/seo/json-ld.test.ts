import { describe, expect, it } from "vitest";
import { blogPostingJsonLd, breadcrumbJsonLd, jsonLdGraph, personId, personJsonLd, serializeJsonLd } from "./json-ld";

const SITE = "https://example.com";

describe("serializeJsonLd", () => {
    it("never lets a closing script tag survive into the output", () => {
        // The real invariant, tested directly rather than through a render
        // — same approach as sanitize-svg.test.ts. A mutant deleting the
        // `.replace()` has to die here.
        const json = serializeJsonLd({ headline: "</script><img onerror=alert(1)>" });

        expect(json).not.toContain("</script>");
        expect(json).not.toContain("<");
        expect(json).toContain("\\u003c");
    });

    it("stays valid JSON that parses back to the original characters", () => {
        const json = serializeJsonLd({ headline: "a < b </script>" });

        expect(JSON.parse(json)).toEqual({ headline: "a < b </script>" });
    });
});

describe("personJsonLd", () => {
    it("emits exactly the Person node, with one site-wide @id", () => {
        // `toEqual`, not `toMatchObject`: this is a document handed to a
        // third-party validator, so an extra or missing property is a
        // behavior change, not an implementation detail.
        expect(personJsonLd({ siteUrl: SITE, name: "Yurii", sameAs: ["https://github.com/x"] })).toEqual({
            "@type": "Person",
            "@id": "https://example.com/#person",
            name: "Yurii",
            url: "https://example.com/",
            sameAs: ["https://github.com/x"],
        });
    });

    it("derives the same @id `blogPostingJsonLd` references", () => {
        expect(personId(SITE)).toBe("https://example.com/#person");
    });
});

describe("blogPostingJsonLd", () => {
    const input = {
        siteUrl: SITE,
        path: "/journal/x",
        headline: "Title",
        description: "Excerpt",
        image: `${ SITE }/journal/x/opengraph-image`,
        datePublished: "2026-01-01T00:00:00.000Z",
        dateModified: "2026-02-02T00:00:00.000Z",
        inLanguage: "en",
    };

    it("emits exactly the recommended Article properties, author included by reference", () => {
        // One `toEqual` over the whole node rather than a handful of spot
        // checks — every property here is something a validator reads, so
        // "image is missing" or "inLanguage changed" has to fail.
        expect(blogPostingJsonLd(input)).toEqual({
            "@type": "BlogPosting",
            "@id": "https://example.com/journal/x#post",
            mainEntityOfPage: "https://example.com/journal/x",
            headline: "Title",
            description: "Excerpt",
            image: ["https://example.com/journal/x/opengraph-image"],
            datePublished: "2026-01-01T00:00:00.000Z",
            dateModified: "2026-02-02T00:00:00.000Z",
            inLanguage: "en",
            // A reference, not a copy: two unconnected nodes with the same
            // name are two entities to a consumer, and it is the
            // consolidated one that carries weight.
            author: { "@id": "https://example.com/#person" },
            publisher: { "@id": "https://example.com/#person" },
        });
    });

    it("omits a date entirely rather than emitting null", () => {
        // A `"datePublished": null` is worse than no property: it is a
        // claim about the page that is not true.
        const node = blogPostingJsonLd({ ...input, datePublished: null, dateModified: null });

        expect(node).not.toHaveProperty("datePublished");
        expect(node).not.toHaveProperty("dateModified");
    });
});

describe("breadcrumbJsonLd", () => {
    it("numbers positions from 1 and resolves every item to an absolute URL", () => {
        expect(breadcrumbJsonLd(SITE, [{ name: "Home", path: "/" }, { name: "Journal", path: "/journal" }])).toEqual({
            // `@type` is asserted here rather than skipped: it is the only
            // thing telling a consumer what this node IS, and a survived
            // mutant proved nothing else was checking it.
            "@type": "BreadcrumbList",
            itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://example.com/" },
                { "@type": "ListItem", position: 2, name: "Journal", item: "https://example.com/journal" },
            ],
        });
    });
});

describe("jsonLdGraph", () => {
    it("wraps nodes in one context-carrying document", () => {
        expect(jsonLdGraph([{ "@type": "Person" }])).toEqual({
            "@context": "https://schema.org",
            "@graph": [{ "@type": "Person" }],
        });
    });
});
