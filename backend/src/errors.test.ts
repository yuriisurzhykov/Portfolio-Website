import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { DatabaseUnavailableError, isDatabaseConnectionError, isDatabaseUnavailableError } from "./errors";

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
        expect(isDatabaseUnavailableError(new DatabaseUnavailableError())).toBe(true);
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
