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

describe("LocaleRegistry.lnFor — the stateless lookup I18nContext uses instead of setLocale()+ln()", () => {
    it("resolves a locale passed explicitly, without ever calling setLocale", () => {
        const registry = new LocaleRegistry({ en: { greeting: "Hello" }, ru: { greeting: "Привет" } }, "en");
        expect(registry.lnFor("ru", "greeting")).toBe("Привет");
        // currentLocale (read via the stateful ln()) must be untouched.
        expect(registry.ln("greeting")).toBe("Hello");
    });

    it("interleaved calls for two different locales never contaminate each other — no shared mutable state to race on", () => {
        const registry = new LocaleRegistry({ en: { greeting: "Hello" }, ru: { greeting: "Привет" } }, "en");
        expect(registry.lnFor("en", "greeting")).toBe("Hello");
        expect(registry.lnFor("ru", "greeting")).toBe("Привет");
        expect(registry.lnFor("en", "greeting")).toBe("Hello");
    });

    it("falls back to the raw key for a locale that was never bundled, rather than throwing", () => {
        const registry = new LocaleRegistry({ en: { greeting: "Hello" } }, "en");
        expect(registry.lnFor("fr", "greeting")).toBe("greeting");
    });
});
