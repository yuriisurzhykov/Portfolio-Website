import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signAccessToken, verifyAccessToken } from "./jwt";

const samplePayload = {sub: "user-123", email: "person@example.com", role: "admin"};

describe("jwt", () => {
    it("round-trips a signed token back to its original payload", async () => {
        const token = await signAccessToken(samplePayload);
        const verified = await verifyAccessToken(token);
        expect(verified).toEqual(samplePayload);
    });

    it("rejects a tampered token", async () => {
        const token = await signAccessToken(samplePayload);
        const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
        expect(await verifyAccessToken(tampered)).toBeNull();
    });

    it("rejects a garbage string", async () => {
        expect(await verifyAccessToken("not-a-jwt-at-all")).toBeNull();
    });

    it("rejects an empty string", async () => {
        expect(await verifyAccessToken("")).toBeNull();
    });

    /**
     * Found by mutation testing, not code review: a validly-signed token
     * whose payload has the wrong claim SHAPES (not just wrong VALUES) was
     * never exercised — every other test signs via `signAccessToken`, which
     * always produces the right shape. Bypasses it, directly via `jose`, to
     * sign tokens with one claim at a time wrong.
     *
     * Testing only "all three wrong at once" survived several
     * AND/OR-swapped mutants of the three-part `||` condition — with every
     * clause true, `&&` and `||` combinations agree, so they're
     * indistinguishable that way. Flipping exactly one claim at a time
     * (the other two staying valid) is what actually pins down that all
     * three are joined with OR, not some AND/OR mix.
     */
    it("returns null when the payload's sub/email/role claims individually have the wrong type", async () => {
        const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
        const signRaw = (payload: Record<string, unknown>) =>
            new SignJWT(payload)
                .setProtectedHeader({alg: "HS256"})
                .setIssuedAt()
                .setExpirationTime("15m")
                .sign(secret);

        const badSub = await signRaw({sub: 42, email: samplePayload.email, role: samplePayload.role});
        const badEmail = await signRaw({sub: samplePayload.sub, email: 42, role: samplePayload.role});
        const badRole = await signRaw({sub: samplePayload.sub, email: samplePayload.email, role: 42});

        expect(await verifyAccessToken(badSub)).toBeNull();
        expect(await verifyAccessToken(badEmail)).toBeNull();
        expect(await verifyAccessToken(badRole)).toBeNull();
    });

    /**
     * Also found by mutation testing: nothing forced a non-JOSEError down
     * the `catch` branch, so a mutant that always returned `null` there
     * (instead of rethrowing anything that isn't a JOSE error) survived.
     * Unsetting the secret makes `getAccessSecret()` throw a plain `Error`
     * from inside the `try` block, before `jose` is even involved.
     */
    it("propagates a non-jose error instead of swallowing it as an invalid token", async () => {
        // A real, easy-to-miss bug found while writing THIS test (not in
        // the source): forgetting `await` on the `.rejects.toThrow(...)`
        // assertion let the `finally` block restore the env var before the
        // assertion had actually settled, turning this into an unhandled
        // promise rejection that surfaced later, attributed to a
        // completely unrelated mutant/test run under Stryker instead of
        // failing loudly here.
        const original = process.env.JWT_ACCESS_SECRET;
        delete process.env.JWT_ACCESS_SECRET;
        try {
            await expect(verifyAccessToken("irrelevant-because-secret-lookup-throws-first")).rejects.toThrow(
                "JWT_ACCESS_SECRET is not set",
            );
        } finally {
            process.env.JWT_ACCESS_SECRET = original;
        }
    });
});
