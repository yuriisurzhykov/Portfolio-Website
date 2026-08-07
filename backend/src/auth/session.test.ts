import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { setAuditSinkForTesting } from "../audit-log";
import {
    createSession,
    deleteExpiredSessions,
    revokeAllSessionsForUser,
    revokeSession,
    rotateSession,
} from "./session";

async function makeUser(email = "user@example.com") {
    return prisma.user.create({data: {email, passwordHash: "irrelevant-for-these-tests", role: "admin"}});
}

beforeEach(async () => {
    await resetTestDatabase();
});

describe("createSession", () => {
    it("stores a hash of the refresh token, never the raw token", async () => {
        const user = await makeUser();
        const {refreshToken, session} = await createSession(user.id);

        expect(session.refreshTokenHash).not.toBe(refreshToken);
        const stored = await prisma.session.findUniqueOrThrow({where: {id: session.id}});
        expect(stored.refreshTokenHash).not.toContain(refreshToken);
    });

    it("sets an expiry roughly 30 days out", async () => {
        const user = await makeUser();
        const {session} = await createSession(user.id);
        const daysUntilExpiry = (session.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        expect(daysUntilExpiry).toBeGreaterThan(29);
        expect(daysUntilExpiry).toBeLessThan(31);
    });
});

describe("rotateSession", () => {
    it("issues a new refresh token and revokes the old one", async () => {
        const user = await makeUser();
        const issued = await createSession(user.id);

        const rotated = await rotateSession(issued.refreshToken);
        expect(rotated).not.toBeNull();
        expect(rotated?.refreshToken).not.toBe(issued.refreshToken);
        expect(rotated?.user.id).toBe(user.id);

        const oldSession = await prisma.session.findUniqueOrThrow({where: {id: issued.session.id}});
        expect(oldSession.revokedAt).not.toBeNull();
    });

    it("rejects reusing an already-rotated refresh token — the core anti-replay property", async () => {
        const user = await makeUser();
        const issued = await createSession(user.id);
        await rotateSession(issued.refreshToken);

        // Replaying the original token a second time must fail, even though
        // it was valid a moment ago — this is what makes stolen-token replay
        // detectable instead of silently working forever.
        const secondAttempt = await rotateSession(issued.refreshToken);
        expect(secondAttempt).toBeNull();
    });

    it("rejects an unknown refresh token", async () => {
        expect(await rotateSession("this-token-was-never-issued")).toBeNull();
    });

    it("rejects a revoked session's refresh token", async () => {
        const user = await makeUser();
        const issued = await createSession(user.id);
        await revokeSession(issued.refreshToken);

        expect(await rotateSession(issued.refreshToken)).toBeNull();
    });

    it("rejects an expired session's refresh token", async () => {
        const user = await makeUser();
        const issued = await createSession(user.id);
        await prisma.session.update({
            where: {id: issued.session.id},
            data: {expiresAt: new Date(Date.now() - 1000)},
        });

        expect(await rotateSession(issued.refreshToken)).toBeNull();
    });

    /**
     * The actual security property reuse detection exists to guarantee:
     * replaying an already-rotated (but not yet expired) refresh token
     * must revoke EVERY session for that user, not just fail the one
     * replay attempt — because an attacker who captured one rotation
     * response may already hold the token the legitimate client rotated
     * TO, which would otherwise still pass `rotateSession` fine on its
     * own. A weaker test that only asserted "the replay itself returns
     * null" (already covered above) would pass even if this whole
     * defensive response were deleted.
     */
    it("on replay of an already-rotated token, revokes every OTHER active session for that user too", async () => {
        const user = await makeUser();
        const originallyIssued = await createSession(user.id);
        const rotated = await rotateSession(originallyIssued.refreshToken);
        expect(rotated).not.toBeNull();

        const unrelatedSession = await createSession(user.id);

        // Replay the token that was already rotated away above.
        await rotateSession(originallyIssued.refreshToken);

        // The legitimate client's own current token (issued by the
        // rotation) must now be dead too — not just the replayed one.
        expect(await rotateSession(rotated!.refreshToken)).toBeNull();
        // So must a completely unrelated session for the same user.
        expect(await rotateSession(unrelatedSession.refreshToken)).toBeNull();
    });

    it("does NOT revoke other sessions when the replayed token is merely unknown (never issued)", async () => {
        const user = await makeUser();
        const legitSession = await createSession(user.id);

        await rotateSession("this-token-was-never-issued");

        // An unknown token carries no signal — it must not nuke a real,
        // still-valid session for anyone.
        expect(await rotateSession(legitSession.refreshToken)).not.toBeNull();
    });

    it("does NOT revoke other sessions when the replayed token is revoked AND expired (stale, not a live replay signal)", async () => {
        const user = await makeUser();
        const staleSession = await createSession(user.id);
        await revokeSession(staleSession.refreshToken);
        await prisma.session.update({
            where: {id: staleSession.session.id},
            data: {expiresAt: new Date(Date.now() - 1000)},
        });
        const otherSession = await createSession(user.id);

        await rotateSession(staleSession.refreshToken);

        expect(await rotateSession(otherSession.refreshToken)).not.toBeNull();
    });

    it("logs a structured audit event when reuse is detected", async () => {
        const entries: unknown[] = [];
        setAuditSinkForTesting((entry) => entries.push(entry));

        try {
            const user = await makeUser();
            const issued = await createSession(user.id);
            await rotateSession(issued.refreshToken);
            await rotateSession(issued.refreshToken);

            expect(entries).toEqual([
                expect.objectContaining({ event: "refresh_token_reuse_detected", userId: user.id }),
            ]);
        } finally {
            setAuditSinkForTesting(undefined);
        }
    });
});

describe("deleteExpiredSessions", () => {
    it("deletes a session that expired more than 7 days ago", async () => {
        const user = await makeUser();
        const session = await createSession(user.id);
        await prisma.session.update({
            where: {id: session.session.id},
            data: {expiresAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)},
        });

        const deletedCount = await deleteExpiredSessions();

        expect(deletedCount).toBe(1);
        expect(await prisma.session.findUnique({where: {id: session.session.id}})).toBeNull();
    });

    it("does NOT delete a session that expired less than 7 days ago (retention window)", async () => {
        const user = await makeUser();
        const session = await createSession(user.id);
        await prisma.session.update({
            where: {id: session.session.id},
            data: {expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)},
        });

        expect(await deleteExpiredSessions()).toBe(0);
        expect(await prisma.session.findUnique({where: {id: session.session.id}})).not.toBeNull();
    });

    it("does NOT delete a still-active session", async () => {
        const user = await makeUser();
        const session = await createSession(user.id);

        expect(await deleteExpiredSessions()).toBe(0);
        expect(await prisma.session.findUnique({where: {id: session.session.id}})).not.toBeNull();
    });
});

describe("revokeSession", () => {
    it("revokes only the targeted session, leaving other sessions for the same user active", async () => {
        const user = await makeUser();
        const sessionA = await createSession(user.id);
        const sessionB = await createSession(user.id);

        await revokeSession(sessionA.refreshToken);

        expect(await rotateSession(sessionA.refreshToken)).toBeNull();
        expect(await rotateSession(sessionB.refreshToken)).not.toBeNull();
    });
});

describe("revokeAllSessionsForUser", () => {
    it("revokes every active session for that user in one call", async () => {
        const user = await makeUser();
        const sessionA = await createSession(user.id);
        const sessionB = await createSession(user.id);

        await revokeAllSessionsForUser(user.id);

        expect(await rotateSession(sessionA.refreshToken)).toBeNull();
        expect(await rotateSession(sessionB.refreshToken)).toBeNull();
    });

    it("does not affect another user's sessions", async () => {
        const userA = await makeUser("a@example.com");
        const userB = await makeUser("b@example.com");
        const sessionB = await createSession(userB.id);

        await revokeAllSessionsForUser(userA.id);

        expect(await rotateSession(sessionB.refreshToken)).not.toBeNull();
    });
});
