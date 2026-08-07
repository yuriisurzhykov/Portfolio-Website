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

    /**
     * Pins the actual cost parameters ENCODED IN THE HASH, not just "it's
     * argon2id" — the previous test would pass unchanged even if
     * `memoryCost`/`timeCost`/`parallelism` were silently weakened (or
     * dropped back to relying on a future node-argon2 default), since
     * those numbers live inside the `$m=...,t=...,p=...$` segment, not in
     * the algorithm name. Meets or exceeds OWASP's Argon2id minimums
     * (memory ≥ 19 MiB / 19456 KiB, iterations ≥ 2, parallelism ≥ 1).
     */
    it("encodes the expected memory/time/parallelism cost parameters in the hash", async () => {
        const hash = await hashPassword("whatever");
        // node-argon2 encodes params as "m=...,p=...,t=..." (alphabetical,
        // NOT m/t/p in that order — verified against a real hash) — matched
        // independently by name rather than assuming a fixed order.
        const memoryCost = Number(hash.match(/m=(\d+)/)?.[1]);
        const parallelism = Number(hash.match(/p=(\d+)/)?.[1]);
        const timeCost = Number(hash.match(/t=(\d+)/)?.[1]);

        expect(memoryCost).toBe(65536);
        expect(timeCost).toBe(3);
        expect(parallelism).toBe(4);
        expect(memoryCost).toBeGreaterThanOrEqual(19456);
        expect(timeCost).toBeGreaterThanOrEqual(2);
        expect(parallelism).toBeGreaterThanOrEqual(1);
    });
});
