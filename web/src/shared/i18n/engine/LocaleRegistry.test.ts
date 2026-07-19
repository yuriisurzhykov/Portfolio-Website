import { describe, expect, it } from "vitest";
import { LocaleRegistry } from "./LocaleRegistry";

describe("LocaleRegistry", () => {
    it("resolves a known key in the default locale immediately — no setup call needed after construction", () => {
        const registry = new LocaleRegistry({ en: { greeting: "Hello" }, ru: { greeting: "Привет" } }, "en");
        expect(registry.ln("greeting")).toBe("Hello");
    });

    it("switches the active locale via setLocale", () => {
        const registry = new LocaleRegistry({ en: { greeting: "Hello" }, ru: { greeting: "Привет" } }, "en");
        registry.setLocale("ru");
        expect(registry.ln("greeting")).toBe("Привет");
    });

    it("falls back to returning the raw key when it's missing from the dictionary", () => {
        const registry = new LocaleRegistry({ en: {} }, "en");
        expect(registry.ln("some.missing.key")).toBe("some.missing.key");
    });

    it("interpolates {vars} into the template", () => {
        const registry = new LocaleRegistry({ en: { "journal.readMins": "{count} min read" } }, "en");
        expect(registry.ln("journal.readMins", { count: 5 })).toBe("5 min read");
    });

    it("throws when switching to a locale that wasn't bundled, instead of silently doing nothing", () => {
        const registry = new LocaleRegistry({ en: {} }, "en");
        expect(() => registry.setLocale("fr")).toThrow();
    });
});
