import { createHash, randomBytes } from "node:crypto";

/**
 * Refresh tokens are opaque random strings, not JWTs. A JWT refresh token
 * would still need a database lookup to be revocable (see Session.revokedAt
 * in the schema) — so encoding it as a JWT buys nothing here, only adds
 * size and a second secret to manage. A plain random token, looked up by
 * its hash, is simpler and exactly as secure for something that's always
 * checked against the database anyway.
 */
export function generateOpaqueToken(): string {
    return randomBytes(32).toString("base64url");
}

/**
 * SHA-256, not argon2 — this hashes an already-high-entropy 256-bit random
 * value (not a human-memorable password), so there's no brute-force
 * dictionary to defend against; a fast hash is the right tool. Storing the
 * hash (not the raw token) means a leaked database dump alone can't be
 * replayed as a valid session.
 */
export function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}
