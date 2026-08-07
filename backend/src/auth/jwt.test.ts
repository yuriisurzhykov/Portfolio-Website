import { afterEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { signAccessToken, TOKEN_AUDIENCE, TOKEN_ISSUER, verifyAccessToken } from "./jwt";

const samplePayload = {sub: "user-123", email: "person@example.com", role: "admin"};

/**
 * Signs a raw JWT bypassing `signAccessToken`'s own claim-setting, so a
 * test can control exactly one claim at a time. Defaults issuer/audience
 * to the REAL constants — a test that wants to isolate one specific wrong
 * claim (e.g. a bad `sub` type) must keep every OTHER claim valid,
 * including `iss`/`aud`, or a passing assertion could be hiding the wrong
 * mechanism (see the "wrong claim type" test below, which used to sign
 * with no issuer/audience at all — once verification started requiring
 * them, that test would have kept passing for the WRONG reason: any of
 * these three tokens would already fail on iss/aud alone, independent of
 * whether the claim-type check the test exists to pin was even present).
 */
async function signRawToken(options: {
    payload?: Record<string, unknown>;
    issuer?: string | null;
    audience?: string | null;
    secret?: string;
} = {}): Promise<string> {
    const secret = new TextEncoder().encode(options.secret ?? process.env.JWT_ACCESS_SECRET);
    const issuer = options.issuer === undefined ? TOKEN_ISSUER : options.issuer;
    const audience = options.audience === undefined ? TOKEN_AUDIENCE : options.audience;
    let builder = new SignJWT(options.payload ?? samplePayload)
        .setProtectedHeader({alg: "HS256"})
        .setIssuedAt()
        .setExpirationTime("15m");
    if (issuer !== null) {
        builder = builder.setIssuer(issuer);
    }
    if (audience !== null) {
        builder = builder.setAudience(audience);
    }
    return builder.sign(secret);
}

describe("jwt", () => {
    it("round-trips a signed token back to its original payload", async () => {
        const token = await signAccessToken(samplePayload);
        const verified = await verifyAccessToken(token);
        expect(verified).toEqual(samplePayload);
    });

    /**
     * Found via a real, intermittent CI failure — not by inspection. This
     * test used to flip the LAST character of the whole token
     * (`token.slice(0, -1) + ...`). Base64url's final character of a byte
     * sequence whose length isn't a multiple of 3 carries FEWER than 6
     * significant bits (the low bits are unused padding a decoder is free
     * to ignore) — a signature's HMAC-SHA256 output is 32 bytes, so its
     * base64url encoding's last character only has 4 significant bits.
     * For roughly 1 in 16 real signatures, flipping that specific
     * character to a fixed 'a'/'b' lands in the same "decodes to the same
     * bits" group as the original, so the DECODED signature bytes (and
     * therefore verification) don't actually change at all — the token
     * silently isn't tampered. Confirmed empirically (~8% failure rate
     * across thousands of independently-signed tokens with fixed test
     * secrets/payloads) before landing this fix — this was a real,
     * reproducible ~1-in-16 flake, not a one-off fluke. Fixed by flipping
     * the FIRST character of the signature segment instead: the first
     * character of any base64 group is always fully 6-bit significant, so
     * this always changes the decoded bytes, no exceptions.
     */
    it("rejects a tampered token", async () => {
        const token = await signAccessToken(samplePayload);
        const [header, payload, signature] = token.split(".");
        const tamperedSignature = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
        const tampered = `${ header }.${ payload }.${ tamperedSignature }`;
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
        const badSub = await signRawToken({payload: {sub: 42, email: samplePayload.email, role: samplePayload.role}});
        const badEmail = await signRawToken({payload: {sub: samplePayload.sub, email: 42, role: samplePayload.role}});
        const badRole = await signRawToken({payload: {sub: samplePayload.sub, email: samplePayload.email, role: 42}});

        expect(await verifyAccessToken(badSub)).toBeNull();
        expect(await verifyAccessToken(badEmail)).toBeNull();
        expect(await verifyAccessToken(badRole)).toBeNull();
    });

    describe("issuer/audience enforcement", () => {
        it("rejects a token with no issuer claim at all", async () => {
            const token = await signRawToken({issuer: null});
            expect(await verifyAccessToken(token)).toBeNull();
        });

        it("rejects a token with the wrong issuer", async () => {
            const token = await signRawToken({issuer: "some-other-app"});
            expect(await verifyAccessToken(token)).toBeNull();
        });

        it("rejects a token with no audience claim at all", async () => {
            const token = await signRawToken({audience: null});
            expect(await verifyAccessToken(token)).toBeNull();
        });

        it("rejects a token with the wrong audience", async () => {
            const token = await signRawToken({audience: "some-other-audience"});
            expect(await verifyAccessToken(token)).toBeNull();
        });

        it("accepts a token when issuer and audience both correctly match (sanity check the helper itself isn't broken)", async () => {
            const token = await signRawToken();
            expect(await verifyAccessToken(token)).toEqual(samplePayload);
        });
    });

    describe("JWT_ACCESS_SECRET minimum length", () => {
        const original = process.env.JWT_ACCESS_SECRET;

        afterEach(() => {
            process.env.JWT_ACCESS_SECRET = original;
        });

        it("rejects a secret shorter than 32 characters when signing", async () => {
            process.env.JWT_ACCESS_SECRET = "short-secret";
            await expect(signAccessToken(samplePayload)).rejects.toThrow(/at least 32 characters/);
        });

        it("rejects a secret shorter than 32 characters when verifying", async () => {
            // Sign with a valid secret first, then shrink it before verifying —
            // the check must run on EVERY call, not just once at import time.
            const token = await signAccessToken(samplePayload);
            process.env.JWT_ACCESS_SECRET = "short-secret";
            await expect(verifyAccessToken(token)).rejects.toThrow(/at least 32 characters/);
        });

        it("accepts a secret exactly 32 characters long (the boundary itself, not just comfortably above/below it)", async () => {
            process.env.JWT_ACCESS_SECRET = "a".repeat(32);
            const token = await signAccessToken(samplePayload);
            expect(await verifyAccessToken(token)).toEqual(samplePayload);
        });

        it("rejects a secret exactly 31 characters long (one under the boundary)", async () => {
            process.env.JWT_ACCESS_SECRET = "a".repeat(31);
            await expect(signAccessToken(samplePayload)).rejects.toThrow(/at least 32 characters/);
        });
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
