import { describe, expect, it } from "vitest";
import type { BlockInput } from "../content/blocks";
import { collectLinkUrls, parseInternalTarget, smartLinkUrlsInMarkdown } from "./collect-urls";

describe("smartLinkUrlsInMarkdown", () => {
    it("finds only links titled \"smart\"", () => {
        const text = 'See [repo](https://github.com/a/b "smart"), [docs](https://kotlinlang.org) and [x](https://x.dev "other").';
        expect(smartLinkUrlsInMarkdown(text)).toEqual(["https://github.com/a/b"]);
    });

    it("handles escaped brackets in the label and angle-bracket destinations", () => {
        expect(smartLinkUrlsInMarkdown('[a \\] b](<https://a.dev/x> "smart")')).toEqual(["https://a.dev/x"]);
    });
});

describe("collectLinkUrls", () => {
    it("collects linkCard URLs and smart links from every text-bearing block, nested list blocks included, deduplicated", () => {
        const blocks: BlockInput[] = [
            { type: "paragraph", text: '[one](https://one.dev "smart") and [one again](https://one.dev "smart")' },
            { type: "linkCard", data: { url: "https://two.dev", view: "card" } },
            {
                type: "list",
                data: {
                    ordered: false,
                    items: [{ text: '[three](https://three.dev "smart")', blocks: [{ type: "linkCard", data: { url: "/work/portfolio", view: "row" } }] }],
                },
            },
            { type: "quote", text: '[four](https://four.dev "smart")' },
        ];
        expect(collectLinkUrls(blocks)).toEqual(["https://one.dev", "https://two.dev", "https://three.dev", "/work/portfolio", "https://four.dev"]);
    });
});

describe("parseInternalTarget", () => {
    it("recognizes own work/journal paths, localized too", () => {
        expect(parseInternalTarget("/work/design-tokens")).toEqual({ kind: "work", slug: "design-tokens" });
        expect(parseInternalTarget("/ru/journal/theme-flash")).toEqual({ kind: "post", slug: "theme-flash" });
    });

    it("recognizes absolute URLs on SITE_URL's origin only", () => {
        expect(parseInternalTarget("https://me.dev/work/a?x=1", "https://me.dev")).toEqual({ kind: "work", slug: "a" });
        expect(parseInternalTarget("https://other.dev/work/a", "https://me.dev")).toBeNull();
        expect(parseInternalTarget("https://me.dev/work/a", undefined)).toBeNull();
    });

    it("ignores other own paths", () => {
        expect(parseInternalTarget("/journal")).toBeNull();
        expect(parseInternalTarget("/about")).toBeNull();
    });
});
