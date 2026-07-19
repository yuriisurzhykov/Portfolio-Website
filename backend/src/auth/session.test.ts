import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { prisma } from "../db/client";
import { createSession, revokeAllSessionsForUser, revokeSession, rotateSession } from "./session";

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
