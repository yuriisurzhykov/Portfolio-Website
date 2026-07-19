import { describe, expect, it } from "vitest";
import { ln, setLocale } from "./index";

/**
 * The direct regression test for the FOUC bug (see ../README.md's "Настоящий
 * фикс FOUC" entry): calling `ln()` immediately after import, with no
 * `await`, no setup call, no waiting on anything — must already return the
 * real translation. If the dictionaries were ever loaded asynchronously
 * again (a `fetch()`, a dynamic `import()`, anything that returns a
 * pending Promise before the data is available), this specific test would
 * still pass at the type level (the function signature wouldn't change)
 * but would start failing here, because there'd be nothing populated yet
 * on this synchronous first call.
 */
describe("engine (bundled dictionaries, real translation.json content)", () => {
    it("resolves a real key correctly the moment the module is imported — before any async work could run", () => {
        expect(ln("nav.work")).toBe("Work");
    });

    it("resolves a key with {vars} correctly on the same first call", () => {
        expect(ln("journal.readMins", { count: 3 })).toBe("3 min read");
    });

    it("switches locale and resolves the Russian dictionary just as immediately", () => {
        setLocale("ru");
        expect(ln("nav.work")).toBe("Работы");
        setLocale("en"); // restore default for any other test relying on it
    });
});
