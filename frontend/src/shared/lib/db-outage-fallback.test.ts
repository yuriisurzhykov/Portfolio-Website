import { afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseUnavailableError } from "@portfolio/backend";
import { orDatabaseOutageFallback } from "./db-outage-fallback";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("orDatabaseOutageFallback", () => {
    it("returns the loaded value when nothing fails", async () => {
        await expect(orDatabaseOutageFallback(() => Promise.resolve("real"), "fallback", "ctx")).resolves.toBe("real");
    });

    it("degrades to the fallback when the database is unreachable", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const load = () => Promise.reject(new DatabaseUnavailableError(new Error("ECONNREFUSED")));

        await expect(orDatabaseOutageFallback(load, "fallback", "ctx")).resolves.toBe("fallback");
    });

    it("RETHROWS anything that isn't a database outage", async () => {
        // The whole reason this helper exists. A bare `catch` here turned a
        // TypeError in metadata assembly into a silent `noindex`, and a bug
        // in the sitemap's mapping into a permanently truncated sitemap —
        // both with nothing in the log. If this assertion ever flips to
        // "resolves", that failure mode is back.
        const load = () => Promise.reject(new TypeError("cannot read properties of undefined"));

        await expect(orDatabaseOutageFallback(load, "fallback", "ctx")).rejects.toThrow(TypeError);
    });

    it("does not log when a non-outage error passes through — the thrower reports it", async () => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(orDatabaseOutageFallback(() => Promise.reject(new TypeError("boom")), "fallback", "ctx")).rejects.toThrow();
        expect(logged).not.toHaveBeenCalled();
    });

    it("logs the degraded path with its context, so a silent truncation is visible", async () => {
        const logged = vi.spyOn(console, "error").mockImplementation(() => {});
        const load = () => Promise.reject(new DatabaseUnavailableError(new Error("ECONNREFUSED")));

        await orDatabaseOutageFallback(load, "fallback", "sitemap.xml");

        expect(logged).toHaveBeenCalledOnce();
        expect(String(logged.mock.calls[0][0])).toContain("sitemap.xml");
    });
});
