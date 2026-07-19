import type { Session, User } from "@prisma/client";
import { prisma } from "../db/client";
import { generateOpaqueToken, hashToken } from "./tokens";

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionMetadata {
    userAgent?: string;
    ip?: string;
}

export interface IssuedSession {
    refreshToken: string;
    session: Session;
}

export async function createSession(userId: string, meta: SessionMetadata = {}): Promise<IssuedSession> {
    const refreshToken = generateOpaqueToken();

    const session = await prisma.session.create({
        data: {
            userId,
            refreshTokenHash: hashToken(refreshToken),
            userAgent: meta.userAgent,
            ip: meta.ip,
            expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        },
    });

    return {refreshToken, session};
}

/** Looks up a session by its raw refresh token, honoring expiry/revocation. */
async function findValidSession(refreshToken: string): Promise<(Session & { user: User }) | null> {
    const session = await prisma.session.findUnique({
        where: {refreshTokenHash: hashToken(refreshToken)},
        include: {user: true},
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return null;
    }

    return session;
}

export interface RotatedSession {
    user: User;
    refreshToken: string;
    session: Session;
}

/**
 * Refresh token ROTATION: every successful refresh revokes the token that
 * was just used and issues a brand new one, rather than reusing the same
 * refresh token until it expires. This bounds the damage of a stolen
 * refresh token to a single use — if it's ever replayed after the
 * legitimate client already rotated past it, this lookup fails (the old
 * token is revoked), which is itself a detectable signal of compromise.
 */
export async function rotateSession(refreshToken: string, meta: SessionMetadata = {}): Promise<RotatedSession | null> {
    const current = await findValidSession(refreshToken);
    if (!current) {
        return null;
    }

    await prisma.session.update({
        where: {id: current.id},
        data: {revokedAt: new Date()},
    });

    const issued = await createSession(current.userId, meta);

    return {user: current.user, refreshToken: issued.refreshToken, session: issued.session};
}

/** Logout for one device — revokes only the session tied to this refresh token. */
export async function revokeSession(refreshToken: string): Promise<void> {
    await prisma.session.updateMany({
        where: {refreshTokenHash: hashToken(refreshToken)},
        data: {revokedAt: new Date()},
    });
}

/** "Sign out everywhere" — revokes every active session for a user. */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
    await prisma.session.updateMany({
        where: {userId, revokedAt: null},
        data: {revokedAt: new Date()},
    });
}
