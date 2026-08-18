import { describe, expect, it } from "vitest";
import { DEFAULT_ADMIN_LANDING, resolveRedirectTarget } from "./redirect-target";

describe("resolveRedirectTarget", () => {
    it("returns a normal admin destination unchanged", () => {
        expect(resolveRedirectTarget("/admin/work/navigation-engine/edit")).toBe("/admin/work/navigation-engine/edit");
    });

    it("falls back to the default landing when there is no `from`", () => {
        expect(resolveRedirectTarget(null)).toBe(DEFAULT_ADMIN_LANDING);
        expect(resolveRedirectTarget(undefined)).toBe(DEFAULT_ADMIN_LANDING);
        expect(resolveRedirectTarget("")).toBe(DEFAULT_ADMIN_LANDING);
    });

    it("REFUSES the login page itself — the bug that made a successful sign-in look broken", () => {
        // A `from` pointing back at the sign-in form meant signing in
        // correctly navigated straight back to the sign-in form.
        expect(resolveRedirectTarget("/admin/login")).toBe(DEFAULT_ADMIN_LANDING);
        expect(resolveRedirectTarget("/admin/login?from=%2Fadmin%2Flogin")).toBe(DEFAULT_ADMIN_LANDING);
    });

    it("refuses an off-site destination, including the protocol-relative form", () => {
        // `?from=` is attacker-supplied by construction — anyone can send
        // a link. `//evil.example` starts with a slash but a browser
        // resolves it cross-origin.
        expect(resolveRedirectTarget("https://evil.example")).toBe(DEFAULT_ADMIN_LANDING);
        expect(resolveRedirectTarget("//evil.example")).toBe(DEFAULT_ADMIN_LANDING);
        expect(resolveRedirectTarget("/\\evil.example")).toBe(DEFAULT_ADMIN_LANDING);
    });

    it("refuses a path outside /admin", () => {
        expect(resolveRedirectTarget("/journal/flowbus")).toBe(DEFAULT_ADMIN_LANDING);
    });
});
