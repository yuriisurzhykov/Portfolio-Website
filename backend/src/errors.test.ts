import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
    DatabaseUnavailableError,
    formatValidationError,
    isDatabaseConnectionError,
    isDatabaseUnavailableError,
    isSlugAlreadyExistsError,
    isUniqueConstraintError,
    isValidationError,
    SlugAlreadyExistsError,
} from "./errors";

describe("isDatabaseConnectionError", () => {
    it("recognizes PrismaClientInitializationError as a connection error", () => {
        const error = new Prisma.PrismaClientInitializationError("Can't reach database server", "7.8.0");
        expect(isDatabaseConnectionError(error)).toBe(true);
    });

    it("recognizes PrismaClientKnownRequestError with code P1001 as a connection error", () => {
        const error = new Prisma.PrismaClientKnownRequestError("Can't reach database server at 127.0.0.1:5432", {
            code: "P1001",
            clientVersion: "7.8.0",
        });
        expect(isDatabaseConnectionError(error)).toBe(true);
    });

    it("does NOT treat a different PrismaClientKnownRequestError code as a connection error", () => {
        // P2002 = unique constraint violation — a real application-level
        // error (e.g. duplicate slug), not an outage. Must not be
        // mistaken for "database unreachable" — that would hide a real bug
        // behind a "please try again" message that will never resolve it.
        const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "7.8.0",
        });
        expect(isDatabaseConnectionError(error)).toBe(false);
    });

    it("does not treat a plain Error as a connection error", () => {
        expect(isDatabaseConnectionError(new Error("something else"))).toBe(false);
    });

    it("does not treat a non-Error value as a connection error", () => {
        expect(isDatabaseConnectionError("just a string")).toBe(false);
        expect(isDatabaseConnectionError(null)).toBe(false);
        expect(isDatabaseConnectionError(undefined)).toBe(false);
    });
});

describe("isDatabaseUnavailableError", () => {
    it("recognizes a real DatabaseUnavailableError instance", () => {
        const error = new DatabaseUnavailableError();
        expect(isDatabaseUnavailableError(error)).toBe(true);
        // Found by mutation testing: nothing checked the actual message
        // text shown to a user via the fallback UI (see web/README.md).
        expect(error.message).toBe("The database is temporarily unavailable.");
    });

    /**
     * The actual bug this guards against: Next.js/Turbopack compiles
     * `@portfolio/backend` separately per execution context (Server
     * Components vs. Route Handlers), so `error instanceof
     * DatabaseUnavailableError` can be `false` for an error that
     * unmistakably IS one — found via a live request against
     * /api/auth/login with the database stopped, not by any type check
     * (the types looked completely correct). Simulating a
     * "different-class-identity, same shape" error here, rather than
     * actually spinning up two Next.js compilation contexts in a unit
     * test, to pin down the exact property this function must check
     * instead of `instanceof`.
     */
    it("recognizes an error with the right name even if it isn't `instanceof` the same class reference", () => {
        class DatabaseUnavailableError extends Error {
            constructor() {
                super("a differently-identified copy of the same class");
                this.name = "DatabaseUnavailableError";
            }
        }

        const fromADifferentModuleInstance = new DatabaseUnavailableError();
        expect(isDatabaseUnavailableError(fromADifferentModuleInstance)).toBe(true);
    });

    it("does not treat an unrelated error as database-unavailable", () => {
        expect(isDatabaseUnavailableError(new Error("some other failure"))).toBe(false);
    });

    it("does not treat a non-Error value as database-unavailable", () => {
        expect(isDatabaseUnavailableError("just a string")).toBe(false);
        expect(isDatabaseUnavailableError(null)).toBe(false);
    });
});

describe("isSlugAlreadyExistsError", () => {
    it("recognizes a real SlugAlreadyExistsError instance", () => {
        const error = new SlugAlreadyExistsError("my-slug");
        expect(isSlugAlreadyExistsError(error)).toBe(true);
        // Found by mutation testing: nothing checked the actual message
        // text this 409 response body sends back to the admin UI.
        expect(error.message).toBe('A record with slug "my-slug" already exists.');
    });

    it("does not treat an unrelated error as a slug conflict", () => {
        expect(isSlugAlreadyExistsError(new Error("some other failure"))).toBe(false);
    });
});

describe("isUniqueConstraintError", () => {
    // Found by mutation testing: this function had zero tests at all before —
    // every mutant on it showed as "NoCoverage", not "Survived".
    it("recognizes a PrismaClientKnownRequestError with code P2002", () => {
        const error = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
            code: "P2002",
            clientVersion: "7.8.0",
        });
        expect(isUniqueConstraintError(error)).toBe(true);
    });

    it("does not treat a different PrismaClientKnownRequestError code as a unique constraint violation", () => {
        const error = new Prisma.PrismaClientKnownRequestError("Can't reach database server", {
            code: "P1001",
            clientVersion: "7.8.0",
        });
        expect(isUniqueConstraintError(error)).toBe(false);
    });

    it("does not treat an unrelated error as a unique constraint violation", () => {
        expect(isUniqueConstraintError(new Error("some other failure"))).toBe(false);
    });
});

describe("isValidationError / formatValidationError", () => {
    const schema = z.object({ slug: z.string().min(1), readMins: z.number().int() });

    it("recognizes a real ZodError thrown by .parse()", () => {
        try {
            schema.parse({ slug: "", readMins: "not a number" });
            expect.unreachable("schema.parse should have thrown");
        } catch (error) {
            expect(isValidationError(error)).toBe(true);
        }
    });

    it("formats every issue into a readable, path-prefixed message", () => {
        const result = schema.safeParse({ slug: "", readMins: "not a number" });
        expect(result.success).toBe(false);
        const message = formatValidationError(result.error);
        expect(message).toContain("slug:");
        expect(message).toContain("readMins:");
    });

    it("does not treat an unrelated error as a validation error", () => {
        expect(isValidationError(new Error("some other failure"))).toBe(false);
        expect(formatValidationError(new Error("some other failure"))).toBe("Invalid input.");
    });

    /**
     * Found by mutation testing: every prior test either passed a real
     * ZodError or an unrelated Error — nothing exercised `null`/a primitive
     * (where the `typeof`/`!== null` guards matter, since `"issues" in
     * error` throws on those otherwise) or an object that structurally
     * has `issues` but where it isn't an array.
     */
    it("safely rejects null, primitives, and an object with a non-array issues property", () => {
        expect(isValidationError(null)).toBe(false);
        expect(isValidationError(undefined)).toBe(false);
        expect(isValidationError("just a string")).toBe(false);
        expect(isValidationError({ issues: "not-an-array" })).toBe(false);
    });

    /**
     * Found by mutation testing: the existing format test only checked
     * single-segment paths (`slug`, `readMins`) and only that the output
     * `.toContain()`s each field name — neither distinguishes `.join(".")`
     * from `.join("")` (identical for a 1-element path), nor `.join("; ")`
     * from `.join("")` between issues (never checked the literal
     * separator), nor the `"(root)"` fallback for a path-less issue.
     */
    it("joins a multi-segment path with dots, not by concatenation", () => {
        const nestedSchema = z.object({ profile: z.object({ name: z.string().min(1) }) });
        const result = nestedSchema.safeParse({ profile: { name: "" } });
        expect(result.success).toBe(false);
        expect(formatValidationError(result.error).startsWith("profile.name:")).toBe(true);
    });

    it("falls back to (root) for a path-less (schema-level) issue", () => {
        const rootSchema = z.object({ a: z.string() }).refine(() => false, { message: "root-level failure" });
        const result = rootSchema.safeParse({ a: "ok" });
        expect(result.success).toBe(false);
        expect(formatValidationError(result.error).startsWith("(root):")).toBe(true);
    });

    it("joins multiple issues with '; ', not by concatenation", () => {
        const result = schema.safeParse({ slug: "", readMins: "not a number" });
        expect(result.success).toBe(false);
        expect(formatValidationError(result.error).split("; ")).toHaveLength(2);
    });
});
