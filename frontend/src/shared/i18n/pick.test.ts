import { describe, expect, it } from "vitest";
import { pickFor } from "./pick";

describe("pickFor", () => {
    it("returns the requested language when it has a value", () => {
        expect(pickFor({ en: "Journal", ru: "Журнал" }, "ru")).toBe("Журнал");
    });

    it("falls back to English on an EMPTY STRING, not just on a missing value", () => {
        // The whole reason this function uses `||` instead of `??`: an
        // untranslated field is stored as `ru: ""` (see
        // backend/src/content/localized-text.ts). `??` would return the
        // empty string, rendering a blank title. This test is what makes a
        // future "modernization" to `??` fail instead of shipping.
        expect(pickFor({ en: "Journal", ru: "" }, "ru")).toBe("Journal");
    });

    it("returns English unchanged when English itself is the requested language", () => {
        expect(pickFor({ en: "Journal", ru: "Журнал" }, "en")).toBe("Journal");
    });

    it("works for non-string payloads", () => {
        expect(pickFor({ en: ["a", "b"], ru: ["а", "б"] }, "ru")).toEqual(["а", "б"]);
    });
});
