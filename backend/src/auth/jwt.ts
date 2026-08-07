import { errors as joseErrors, jwtVerify, SignJWT } from "jose";

/**
 * `jose`, not `jsonwebtoken` — this project's route protection runs in
 * Next.js `middleware.ts`, which executes on the Edge runtime by default.
 * `jsonwebtoken` depends on Node's `crypto` module directly and does not
 * run on Edge; `jose` uses Web Crypto and works in both Node and Edge —
 * one library for the access-token verification wherever it ends up
 * running, no "swap libraries if the runtime changes later" risk.
 */
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes

/**
 * Bound to a specific issuer/audience pair (not left unset) — belt-and-
 * braces against a token minted for some OTHER purpose but signed with
 * the same secret ever being accepted here. Plain string constants, not
 * env-configurable: there is exactly one issuer and one audience for this
 * app, so making them configurable would only add a way to misconfigure
 * them into not matching each other.
 */
export const TOKEN_ISSUER = "portfolio-admin";
export const TOKEN_AUDIENCE = "portfolio-web";

/**
 * OWASP's minimum for an HS256 secret is 256 bits (32 bytes) of entropy —
 * enforced here as a minimum CHARACTER count, which is a conservative
 * stand-in for entropy (a 32-character secret from a low-entropy alphabet
 * is weaker than 32 truly random bytes, but this can't verify true
 * randomness, only catch the "someone typed a short/guessable string"
 * failure mode `.env.example`'s own generation command already avoids).
 */
const MIN_ACCESS_SECRET_LENGTH = 32;

export interface AccessTokenPayload {
    sub: string; // user id
    email: string;
    role: string;
}

function getAccessSecret(): Uint8Array {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
        throw new Error("JWT_ACCESS_SECRET is not set");
    }
    if (secret.length < MIN_ACCESS_SECRET_LENGTH) {
        throw new Error(`JWT_ACCESS_SECRET must be at least ${ MIN_ACCESS_SECRET_LENGTH } characters (got ${ secret.length }) — a short HS256 secret is brute-forceable offline.`);
    }
    return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({email: payload.email, role: payload.role})
        .setProtectedHeader({alg: "HS256"})
        .setSubject(payload.sub)
        .setIssuer(TOKEN_ISSUER)
        .setAudience(TOKEN_AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(`${ ACCESS_TOKEN_TTL_SECONDS }s`)
        .sign(getAccessSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
        // `algorithms`/`issuer`/`audience` pinned explicitly on verify, not
        // just set on sign — `jose` already rejects `alg: "none"` and an
        // algorithm mismatch for a symmetric key on its own, so this is
        // belt-and-braces against algorithm confusion, not closing a gap
        // that was otherwise open. `issuer`/`audience` DO matter
        // independently: without passing them here, `jose` would accept a
        // correctly-signed token that simply omits (or has the wrong) `iss`/
        // `aud` claims, defeating the point of setting them on sign at all.
        const {payload} = await jwtVerify(token, getAccessSecret(), {
            algorithms: ["HS256"],
            issuer: TOKEN_ISSUER,
            audience: TOKEN_AUDIENCE,
        });
        if (typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.role !== "string") {
            return null;
        }
        return {sub: payload.sub, email: payload.email, role: payload.role};
    } catch (error) {
        // Any rejection from `jose` itself (expired, bad signature,
        // malformed/garbage input that isn't even a well-formed JWS, wrong
        // claim types, ...) means "not a valid access token" — a normal,
        // expected outcome for this function to report as `null`, not an
        // exceptional situation for callers to catch. An earlier version
        // only caught two specific subclasses
        // (JWTExpired/JWSSignatureVerificationFailed) and let everything
        // else — e.g. JWSInvalid, for a garbage/empty string — propagate as
        // an uncaught throw. Caught by a test that verified a plain garbage
        // string, not by manual testing (manual testing only ever tried a
        // *tampered* real token, which happens to hit the one subclass
        // that WAS handled). Only a genuinely unexpected non-JOSE error
        // should still propagate.
        if (error instanceof joseErrors.JOSEError) {
            return null;
        }
        throw error;
    }
}

export { ACCESS_TOKEN_TTL_SECONDS };
