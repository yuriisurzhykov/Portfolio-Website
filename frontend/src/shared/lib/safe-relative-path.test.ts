import { describe, expect, it } from "vitest";
import { isSafeRelativePath } from "./safe-relative-path";

describe("isSafeRelativePath", () => {
    it("accepts a plain root-relative path", () => {
        expect(isSafeRelativePath("/journal")).toBe(true);
    });

    it("accepts a root-relative path carrying its own query string", () => {
        expect(isSafeRelativePath("/journal?page=2")).toBe(true);
    });

    it("rejects an absolute URL (a shared link could point anywhere)", () => {
        expect(isSafeRelativePath("https://evil.example/phish")).toBe(false);
    });

    it("rejects a protocol-relative URL — browsers treat // as cross-origin despite the leading slash", () => {
        expect(isSafeRelativePath("//evil.example")).toBe(false);
    });

    it("rejects the backslash variant some browsers also normalize into a protocol-relative URL", () => {
        expect(isSafeRelativePath("/\\evil.example")).toBe(false);
    });

    it("rejects a path with no leading slash at all", () => {
        expect(isSafeRelativePath("journal")).toBe(false);
    });

    it("rejects undefined/null (the common 'no from param was supplied' case)", () => {
        expect(isSafeRelativePath(undefined)).toBe(false);
        expect(isSafeRelativePath(null)).toBe(false);
    });
});
