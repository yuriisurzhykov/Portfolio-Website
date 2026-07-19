import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
    it("verifies a matching password against its own hash", async () => {
        const hash = await hashPassword("correct-password-123");
        expect(await verifyPassword(hash, "correct-password-123")).toBe(true);
    });

    it("rejects a non-matching password", async () => {
        const hash = await hashPassword("correct-password-123");
        expect(await verifyPassword(hash, "wrong-password-456")).toBe(false);
    });

    it("produces a different hash for the same password every time (random salt)", async () => {
        const hashA = await hashPassword("same-password");
        const hashB = await hashPassword("same-password");
        expect(hashA).not.toBe(hashB);
        // ...but both must still verify correctly, salts aside.
        expect(await verifyPassword(hashA, "same-password")).toBe(true);
        expect(await verifyPassword(hashB, "same-password")).toBe(true);
    });

    it("produces an argon2id hash (not some other/weaker algorithm by accident)", async () => {
        const hash = await hashPassword("whatever");
        expect(hash.startsWith("$argon2id$")).toBe(true);
    });
});
