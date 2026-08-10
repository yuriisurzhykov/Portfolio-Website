import { describe, expect, it } from "vitest";
import { formatAdminDate, formatAdminDateTime, formatMonthYear, todayIsoDate } from "./date-format";

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

describe("formatAdminDateTime", () => {
    it("formats a real timestamp with both a short date and a time-of-day", () => {
        const iso = "2026-08-09T15:04:00.000Z";
        // Computed independently, with the SAME options `formatAdminDateTime`
        // itself uses (but never importing them) — a mutant that changes
        // those options in the implementation still leaves THIS reference
        // correct, so the two diverge and the mutant is caught, regardless
        // of which local timezone the test happens to run in.
        const expected = new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        }).format(new Date(iso));

        const result = formatAdminDateTime(iso);
        expect(result).toBe(expected);
        expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}\s?[AP]M$/);
    });

    it("distinguishes two timestamps a minute apart — not just to the day, like formatAdminDate above", () => {
        const first = formatAdminDateTime("2026-08-09T15:04:00.000Z");
        const second = formatAdminDateTime("2026-08-09T15:05:00.000Z");
        expect(second).not.toBe(first);
    });
});

describe("todayIsoDate", () => {
    it("matches the YYYY-MM-DD shape the backend stamps a new post with", () => {
        expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
});
