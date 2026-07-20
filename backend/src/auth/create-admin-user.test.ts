import { beforeEach, describe, expect, it } from "vitest";
import { resetTestDatabase } from "../test-utils/db";
import { createAdminUser } from "./create-admin-user";
import { verifyPassword } from "./password";
import { prisma } from "../db/client";

beforeEach(async () => {
    await resetTestDatabase();
});

describe("createAdminUser", () => {
    it("creates a user with a hashed (not plaintext) password", async () => {
        const result = await createAdminUser("admin@example.com", "a-real-password-123");
        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const stored = await prisma.user.findUniqueOrThrow({where: {id: result.user.id}});
        expect(stored.passwordHash).not.toBe("a-real-password-123");
        expect(await verifyPassword(stored.passwordHash, "a-real-password-123")).toBe(true);
        expect(stored.role).toBe("admin");
    });

    it("rejects an invalid email", async () => {
        const result = await createAdminUser("not-an-email", "a-real-password-123");
        expect(result).toEqual({ok: false, error: expect.stringContaining("valid email")});
    });

    it("rejects a password shorter than 12 characters", async () => {
        const result = await createAdminUser("admin@example.com", "short");
        expect(result).toEqual({ok: false, error: expect.stringContaining("12 characters")});
    });

    it("rejects a duplicate email", async () => {
        await createAdminUser("admin@example.com", "a-real-password-123");
        const second = await createAdminUser("admin@example.com", "a-different-password-456");
        expect(second).toEqual({ok: false, error: expect.stringContaining("already exists")});
    });
});
