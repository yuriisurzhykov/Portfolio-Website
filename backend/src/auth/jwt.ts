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
    return new TextEncoder().encode(secret);
}

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({email: payload.email, role: payload.role})
        .setProtectedHeader({alg: "HS256"})
        .setSubject(payload.sub)
        .setIssuedAt()
        .setExpirationTime(`${ ACCESS_TOKEN_TTL_SECONDS }s`)
        .sign(getAccessSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
    try {
        const {payload} = await jwtVerify(token, getAccessSecret());
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
