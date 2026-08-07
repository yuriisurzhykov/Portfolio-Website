import * as argon2 from "argon2";

/**
 * Explicit cost parameters, not left as node-argon2's own defaults —
 * pinned during the OWASP audit remediation. Verified live (calling
 * `argon2.hash()` with NO options and inspecting the resulting
 * `$argon2id$v=19$m=...,t=...,p=...$` prefix) that these three numbers are
 * exactly node-argon2's own current defaults, so pinning them changes
 * nothing about today's behavior — the point is to stop a future
 * node-argon2 major version from silently changing the cost profile of
 * every password this app hashes just because it bumped its own default.
 * All three meet or exceed OWASP's Argon2id minimums (memory ≥ 19 MiB,
 * iterations ≥ 2, parallelism ≥ 1).
 */
const ARGON2_MEMORY_COST_KIB = 65536; // 64 MiB
const ARGON2_TIME_COST = 3;
const ARGON2_PARALLELISM = 4;

/**
 * Argon2id — OWASP's current first recommendation for password hashing
 * (winner of the Password Hashing Competition), over bcrypt/PBKDF2. Only
 * ever hashes/verifies actual user-chosen passwords — refresh tokens use a
 * fast hash instead (see tokens.ts), since they're already high-entropy
 * random data, not something a brute-force-resistant hash is protecting
 * against.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
    // Equivalent mutant, verified by hand (not assumed): Stryker's own
    // "emptying this object literal" mutant survives every test here,
    // because `argon2.hash(plainPassword, {})` — called directly, no
    // options at all — produces the exact same "$argon2id$v=19$m=65536,
    // p=4,t=3$..." prefix as this explicit call. node-argon2's own current
    // defaults already match every value pinned below; this object
    // literal exists so a FUTURE node-argon2 major version can't silently
    // change that, not because today's behavior differs from the library
    // default.
    // Stryker disable next-line ObjectLiteral
    return argon2.hash(plainPassword, {
        type: argon2.argon2id,
        memoryCost: ARGON2_MEMORY_COST_KIB,
        timeCost: ARGON2_TIME_COST,
        parallelism: ARGON2_PARALLELISM,
    });
}

export async function verifyPassword(hash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hash, plainPassword);
}
