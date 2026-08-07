import { afterEach, describe, expect, it } from "vitest";
import { logAuditEvent, setAuditSinkForTesting } from "./audit-log";

describe("logAuditEvent", () => {
    afterEach(() => {
        setAuditSinkForTesting(undefined);
    });

    it("emits the event name, a timestamp, and every extra field passed", () => {
        const entries: unknown[] = [];
        setAuditSinkForTesting((entry) => entries.push(entry));

        logAuditEvent("test_event", { userId: "user-1", status: 200 });

        expect(entries).toHaveLength(1);
        expect(entries[0]).toMatchObject({ event: "test_event", userId: "user-1", status: 200 });
    });

    it("includes a valid ISO timestamp", () => {
        const entries: { timestamp: string }[] = [];
        setAuditSinkForTesting((entry) => entries.push(entry as { timestamp: string }));

        logAuditEvent("test_event");

        expect(new Date(entries[0].timestamp).toString()).not.toBe("Invalid Date");
    });

    it("works with no extra fields at all", () => {
        const entries: unknown[] = [];
        setAuditSinkForTesting((entry) => entries.push(entry));

        logAuditEvent("bare_event");

        expect(entries).toEqual([expect.objectContaining({ event: "bare_event" })]);
    });

    it("setAuditSinkForTesting(undefined) restores the default (console.log) sink", () => {
        const entries: unknown[] = [];
        setAuditSinkForTesting((entry) => entries.push(entry));
        setAuditSinkForTesting(undefined);

        // With the default sink restored, our test array must NOT receive
        // this second call — proving the reset genuinely took effect,
        // rather than the custom sink silently staying wired in.
        logAuditEvent("after_reset");

        expect(entries).toHaveLength(0);
    });
});
