import { describe, expect, it } from "vitest";
import { isSafeHref, safeHrefSchema } from "./safe-href";

describe("isSafeHref", () => {
    /**
     * The actual invariant this exists to guarantee: a value that ends up
     * in a public <a href>/<img src> must never be a javascript: URL — the
     * classic stored-XSS-via-config vector this repo's OWASP audit found
     * in Footer.tsx's social links. Not just "returns false for one
     * example" — every scheme this app doesn't explicitly allow.
     */
    it("rejects javascript: URLs", () => {
        expect(isSafeHref("javascript:alert(document.cookie)")).toBe(false);
    });

    it("rejects data: URLs", () => {
        expect(isSafeHref("data:text/html,<script>alert(1)</script>")).toBe(false);
    });

    it("rejects vbscript: URLs", () => {
        expect(isSafeHref("vbscript:msgbox(1)")).toBe(false);
    });

    it("rejects protocol-relative URLs (// resolves to the page's own scheme, not a safe relative path)", () => {
        expect(isSafeHref("//evil.example/x")).toBe(false);
    });

    it("accepts https URLs", () => {
        expect(isSafeHref("https://github.com/example")).toBe(true);
    });

    it("accepts http URLs", () => {
        expect(isSafeHref("http://example.com")).toBe(true);
    });

    it("accepts mailto: URLs", () => {
        expect(isSafeHref("mailto:someone@example.com")).toBe(true);
    });

    it("accepts a same-origin relative path", () => {
        expect(isSafeHref("/img.png")).toBe(true);
    });

    it("rejects an unparseable string", () => {
        expect(isSafeHref("not a url")).toBe(false);
    });
});

describe("safeHrefSchema", () => {
    it("fails validation (does not throw a TypeError) for a javascript: URL", () => {
        const result = safeHrefSchema.safeParse("javascript:alert(1)");
        expect(result.success).toBe(false);
    });

    it("passes validation for a real https URL", () => {
        const result = safeHrefSchema.safeParse("https://example.com");
        expect(result.success).toBe(true);
    });
});
