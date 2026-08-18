import { describe, expect, it } from "vitest";
import { ogAlternateLocales, ogLocale, TWITTER_CARD } from "./open-graph";

describe("ogLocale", () => {
    it("uses an underscore, which is what the OG spec requires", () => {
        // A hyphen here fails silently: validators say nothing, the field
        // is simply ignored. Asserting the exact string is the only way to
        // catch it.
        expect(ogLocale("en")).toBe("en_US");
        expect(ogLocale("ru")).toBe("ru_RU");
    });
});

describe("ogAlternateLocales", () => {
    it("excludes the locale being rendered", () => {
        expect(ogAlternateLocales("en")).toEqual(["ru_RU"]);
        expect(ogAlternateLocales("ru")).toEqual(["en_US"]);
    });
});

describe("TWITTER_CARD", () => {
    it("is the large variant — the small one shows a side thumbnail instead of a full-width image", () => {
        expect(TWITTER_CARD).toBe("summary_large_image");
    });
});
