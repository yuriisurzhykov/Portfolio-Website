import * as argon2 from "argon2";

/**
 * Argon2id — OWASP's current first recommendation for password hashing
 * (winner of the Password Hashing Competition), over bcrypt/PBKDF2. Only
 * ever hashes/verifies actual user-chosen passwords — refresh tokens use a
 * fast hash instead (see tokens.ts), since they're already high-entropy
 * random data, not something a brute-force-resistant hash is protecting
 * against.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, {type: argon2.argon2id});
}

export async function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
}
