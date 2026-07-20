import { prisma } from "../db/client";
import { hashPassword } from "./password";

const MIN_PASSWORD_LENGTH = 12;

export type CreateAdminUserResult =
    | { ok: true; user: { id: string; email: string } }
    | { ok: false; error: string };

function isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Pulled out of scripts/create-admin.ts on purpose: this is the part worth
 * testing directly (call it with fixed arguments, no stdin/readline
 * involved at all), while the CLI script stays a thin interactive wrapper
 * around it. Node's `readline` turned out to be unreliable to drive from a
 * piped/non-interactive stdin for multi-step prompts (see
 * scripts/README.md) — splitting the actual business rule out of the I/O
 * loop sidesteps that class of problem entirely instead of fighting it.
 */
export async function createAdminUser(email: string, password: string): Promise<CreateAdminUserResult> {
    if (!isValidEmail(email)) {
        return {ok: false, error: "That doesn't look like a valid email address."};
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return {ok: false, error: `Password must be at least ${ MIN_PASSWORD_LENGTH } characters.`};
    }

    const existing = await prisma.user.findUnique({where: {email}});
    if (existing) {
        return {ok: false, error: `A user with email "${ email }" already exists.`};
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
        data: {email, passwordHash, role: "admin"},
    });

    return {ok: true, user: {id: user.id, email: user.email}};
}
