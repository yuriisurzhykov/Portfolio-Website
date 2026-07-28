import { describe, expect, it } from "vitest";
import { formatAdminDate, formatMonthYear, todayIsoDate } from "./date-format";

describe("formatMonthYear", () => {
    it("formats an ISO date as \"Month Year\"", () => {
        expect(formatMonthYear("2026-02-11")).toBe("February 2026");
    });
});

describe("formatAdminDate", () => {
    it("formats an ISO date as \"Mon D, Year\"", () => {
        expect(formatAdminDate("2026-02-11")).toBe("Feb 11, 2026");
    });

    it("never shifts to the previous day regardless of the runner's local timezone", () => {
        // Regression test: `new Date("2026-02-11")` parses as UTC midnight;
        // without pinning the formatter's `timeZone` to `"UTC"` too, any
        // timezone behind UTC renders the PREVIOUS day instead ("Feb 10"),
        // which is exactly what this test caught live (not by inspection)
        // before `date-format.ts` added `timeZone: "UTC"` to both
        // formatters.
        expect(formatAdminDate("2026-01-01")).toBe("Jan 1, 2026");
    });
});

describe("todayIsoDate", () => {
    it("matches the YYYY-MM-DD shape the backend stamps a new post with", () => {
        expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
