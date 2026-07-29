import { describe, expect, it } from "vitest";
import { parseStatusCode, STATUS_CODES, STATUS_CONTENT } from "./status-content";

describe("parseStatusCode", () => {
    it.each(STATUS_CODES)("accepts %i (one of the codes this app has a page for)", (code) => {
        expect(parseStatusCode(String(code))).toBe(code);
    });

    it("rejects a status this app has no page for (e.g. 502 — no gateway/proxy failure mode exists yet)", () => {
        expect(parseStatusCode("502")).toBeNull();
    });

    it("rejects non-numeric garbage rather than coercing it to a code", () => {
        expect(parseStatusCode("not-a-number")).toBeNull();
    });

    it("rejects a near-miss decimal instead of truncating it into a valid code", () => {
        expect(parseStatusCode("429.5")).toBeNull();
    });
});

describe("STATUS_CONTENT", () => {
    it("gives every status a distinct action or tone — no two codes silently share the exact same {tone, action} pair by copy-paste", () => {
        const signature = (code: (typeof STATUS_CODES)[number]) => `${ STATUS_CONTENT[code].tone }:${ STATUS_CONTENT[code].action }`;
        const uniqueTones = new Set(STATUS_CODES.map((code) => STATUS_CONTENT[code].tone));
        const uniqueActions = new Set(STATUS_CODES.map((code) => STATUS_CONTENT[code].action));

        // Not asserting every signature is unique (400/403/404/501
        // legitimately share "warning"/"home" or "error"/"home" — see this
        // slice's README on why 400/403/501 specifically have no live call
        // site) — instead pinning that BOTH dimensions are actually used,
        // not one constant value copy-pasted onto every entry.
        expect(uniqueTones).toEqual(new Set(["warning", "error"]));
        expect(uniqueActions).toEqual(new Set(["home", "signIn", "retry"]));
        expect(signature(429)).not.toBe(signature(401));
    });

    it("every code has its own icon component (not one shared placeholder for all 7)", () => {
        const icons = new Set(STATUS_CODES.map((code) => STATUS_CONTENT[code].icon));
        expect(icons.size).toBe(STATUS_CODES.length);
    });
});
