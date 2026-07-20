import { prisma } from "../db/client";
import { hashPassword, verifyPassword } from "./password";
import { signAccessToken } from "./jwt";
import { createSession, revokeSession, rotateSession, type SessionMetadata } from "./session";

export interface AuthenticatedUser {
    id: string;
    email: string;
    role: string;
}

export interface AuthResult {
    user: AuthenticatedUser;
    accessToken: string;
    refreshToken: string;
}

/**
 * Hashed once per process and reused, so every login attempt — whether the
 * email exists or not — pays the same argon2 cost. Without this, a caller
 * could tell "email exists, wrong password" apart from "email doesn't
 * exist" purely by response time (no user row means no hash to verify
 * against, which returns almost instantly compared to a real argon2
 * verify) — a classic account-enumeration side channel.
 */
let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
    if (!dummyHashPromise) {
        dummyHashPromise = hashPassword("timing-attack-mitigation-placeholder");
    }
    return dummyHashPromise;
}

function toAuthenticatedUser(user: { id: string; email: string; role: string }): AuthenticatedUser {
    return {id: user.id, email: user.email, role: user.role};
}

export async function login(email: string, password: string, meta: SessionMetadata = {}): Promise<AuthResult | null> {
    const user = await prisma.user.findUnique({where: {email}});
    const passwordHash = user?.passwordHash ?? await getDummyHash();
    const isValid = await verifyPassword(passwordHash, password);

    if (!user || !isValid) {
        return null;
    }

    const {refreshToken} = await createSession(user.id, meta);
    const accessToken = await signAccessToken({sub: user.id, email: user.email, role: user.role});

    return {user: toAuthenticatedUser(user), accessToken, refreshToken};
}

export async function refreshSession(refreshToken: string, meta: SessionMetadata = {}): Promise<AuthResult | null> {
    const rotated = await rotateSession(refreshToken, meta);
    if (!rotated) {
        return null;
    }

    const accessToken = await signAccessToken({
        sub: rotated.user.id,
        email: rotated.user.email,
        role: rotated.user.role,
    });

    return {user: toAuthenticatedUser(rotated.user), accessToken, refreshToken: rotated.refreshToken};
}

export async function logout(refreshToken: string): Promise<void> {
    await revokeSession(refreshToken);
}
