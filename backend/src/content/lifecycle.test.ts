import { describe, expect, it } from "vitest";
import { InvalidLifecycleTransitionError, isInvalidLifecycleTransitionError, nextState } from "./lifecycle";

describe("nextState", () => {
    it("PUBLISH moves a DRAFT record to PUBLISHED", () => {
        expect(nextState("DRAFT", "PUBLISH")).toBe("PUBLISHED");
    });

    it("PUBLISH is idempotent — publishing an already-PUBLISHED record stays PUBLISHED, no error", () => {
        expect(nextState("PUBLISHED", "PUBLISH")).toBe("PUBLISHED");
    });

    it("UNPUBLISH moves a PUBLISHED record to DRAFT", () => {
        expect(nextState("PUBLISHED", "UNPUBLISH")).toBe("DRAFT");
    });

    it("UNPUBLISH on an already-DRAFT record throws InvalidLifecycleTransitionError, not idempotent", () => {
        expect(() => nextState("DRAFT", "UNPUBLISH")).toThrow(InvalidLifecycleTransitionError);
    });
});

describe("InvalidLifecycleTransitionError", () => {
    it("names both the current state and the rejected action in its message", () => {
        const error = new InvalidLifecycleTransitionError("DRAFT", "UNPUBLISH");
        expect(error.message).toBe("Cannot UNPUBLISH a record that is already DRAFT.");
        expect(error.name).toBe("InvalidLifecycleTransitionError");
    });
});

describe("isInvalidLifecycleTransitionError", () => {
    it("is true for a real InvalidLifecycleTransitionError instance", () => {
        expect(isInvalidLifecycleTransitionError(new InvalidLifecycleTransitionError("DRAFT", "UNPUBLISH"))).toBe(true);
    });

    it("is true for a plain object with the matching name — the cross-bundle case instanceof can't catch", () => {
        const fakeAcrossBundle = Object.assign(new Error("whatever"), { name: "InvalidLifecycleTransitionError" });
        expect(isInvalidLifecycleTransitionError(fakeAcrossBundle)).toBe(true);
    });

    it("is false for an unrelated Error", () => {
        expect(isInvalidLifecycleTransitionError(new Error("nope"))).toBe(false);
    });

    it("is false for a non-Error value", () => {
        expect(isInvalidLifecycleTransitionError("not an error")).toBe(false);
        expect(isInvalidLifecycleTransitionError(null)).toBe(false);
    });
});
