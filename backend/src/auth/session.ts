import type { Session, User } from "@prisma/client";
import { prisma } from "../db/client";
import { generateOpaqueToken, hashToken } from "./tokens";
import { logAuditEvent } from "../audit-log";

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

/** Looks up a session by its raw refresh token regardless of expiry/revocation — the shared read `findValidSession` and `detectReuseAndRevokeFamily` both narrow from. */
async function findSessionRow(refreshToken: string): Promise<(Session & { user: User }) | null> {
    return prisma.session.findUnique({
        where: {refreshTokenHash: hashToken(refreshToken)},
        include: {user: true},
    });
}

/** Looks up a session by its raw refresh token, honoring expiry/revocation. */
async function findValidSession(refreshToken: string): Promise<(Session & { user: User }) | null> {
    const session = await findSessionRow(refreshToken);

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return null;
    }

    return session;
}

/**
 * Refresh-token REUSE detection: a token that was already rotated away
 * (revoked BECAUSE `rotateSession` replaced it — see `replacedBySessionId`
 * on the `Session` model) but is NOT yet expired being presented again is
 * the textbook signal of a stolen refresh token — the legitimate client
 * already moved on to the token rotation issued, so whoever just replayed
 * the old one has a copy they shouldn't. The response is to revoke the
 * ENTIRE session family for that user, not just fail this one request: if
 * an attacker captured one rotation response, they may already hold the
 * CURRENT token too, and that one would still pass `findValidSession` fine
 * on its own.
 *
 * Checks `replacedBySessionId !== null` specifically, NOT just
 * `revokedAt !== null` — a first version of this function used the
 * broader check and broke a pre-existing, deliberate guarantee: replaying
 * a token from a session that was explicitly logged out via
 * `revokeSession` (a normal, non-malicious event — that row's `revokedAt`
 * is set too, but `replacedBySessionId` never is) triggered the SAME mass
 * revocation, collateral-damaging every other active device for that user.
 * Caught by a pre-existing test (`revokeSession`'s "revokes only the
 * targeted session, leaving other sessions ... active") failing, not
 * written in anticipation of this — see session.test.ts.
 *
 * Deliberately excludes a token that's ALSO expired — an old, dead,
 * revoked-AND-expired token being replayed by, say, a client that never
 * came back online carries no real signal worth escalating over.
 *
 * Deliberately excludes an unknown token entirely (no row at all) — that's
 * indistinguishable from a typo/garbage value, not evidence of anything.
 */
async function detectReuseAndRevokeFamily(refreshToken: string): Promise<void> {
    const row = await findSessionRow(refreshToken);
    if (!row) {
        return;
    }

    const isReplayOfARotatedToken = row.revokedAt !== null
        && row.replacedBySessionId !== null
        && row.expiresAt >= new Date();
    if (!isReplayOfARotatedToken) {
        return;
    }

    await revokeAllSessionsForUser(row.userId);
    logAuditEvent("refresh_token_reuse_detected", { userId: row.userId, sessionId: row.id });
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
        await detectReuseAndRevokeFamily(refreshToken);
        return null;
    }

    const issued = await createSession(current.userId, meta);

    // replacedBySessionId is set HERE, on the row being revoked because of
    // rotation specifically — this is the one fact `detectReuseAndRevokeFamily`
    // needs to tell "this token was replayed after a legitimate rotation"
    // (a real theft signal) apart from "this token belongs to a session
    // someone explicitly logged out" (revokeSession/revokeAllSessionsForUser
    // never set this field), which must NOT trigger the same mass revocation.
    await prisma.session.update({
        where: {id: current.id},
        data: {revokedAt: new Date(), replacedBySessionId: issued.session.id},
    });

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

/**
 * A week past its own `expiresAt`, not the moment it expires — an
 * already-expired-but-still-present row is occasionally useful evidence
 * for a few days (e.g. correlating a `refresh_token_reuse_detected` audit
 * entry back to the exact session it was replaying), so this doesn't
 * delete the instant a session goes stale, only once that window has
 * clearly passed.
 */
const EXPIRED_SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Deletes `Session` rows that expired more than a week ago — the table
 * otherwise grows forever (every login/refresh inserts a row; rotation
 * revokes the old one but never removes it). Exposed as a plain function,
 * not a scheduled job of its own: this repo has no background-worker
 * infrastructure (see `backend/src/content/lifecycle.ts`'s own "not doing
 * this now" on auto-publish for the same reasoning), so the actual
 * schedule lives in a cron entry calling `backend/scripts/
 * cleanup-expired-sessions.ts` (see `.scripts/provision/` for the VPS
 * wiring) — this function is just the business rule, independently
 * testable without any of that.
 */
export async function deleteExpiredSessions(): Promise<number> {
    const cutoff = new Date(Date.now() - EXPIRED_SESSION_RETENTION_MS);
    const result = await prisma.session.deleteMany({where: {expiresAt: {lt: cutoff}}});
    return result.count;
}
