/**
 * "Month Year" (e.g. "February 2026") — the one date format shown to
 * visitors for a journal post, on both the list (`JournalListPage`) and
 * detail (`JournalDetailPage`) pages. Extracted here once both needed it:
 * the list used to show `post.dateLabel ?? post.date` (`dateLabel` was a
 * free-text override for imprecise/upcoming dates, since removed — see
 * `backend/src/content/README.md`'s dated entry) while the detail page
 * already formatted `post.date` through a LOCAL `monthYearFormatter` —
 * two different renderings of what should always look like the same date
 * format for the same post.
 */
// `timeZone: "UTC"` on both formatters below, deliberately — `new
// Date("2026-02-11")` (a date-only ISO string, no time component) parses
// as UTC midnight per the spec, but `Intl.DateTimeFormat` without an
// explicit `timeZone` renders in the CALLER's local timezone. Any
// timezone behind UTC (most of the Americas) would then display the
// PREVIOUS day — found by a failing test, not by inspection:
// `formatAdminDate("2026-02-11")` returned "Feb 10, 2026" in this
// machine's local timezone. Pinning both formatters to UTC makes the
// displayed calendar date match the stored `YYYY-MM-DD` string exactly,
// regardless of where the admin (or a test runner) happens to be.
const monthYearFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export function formatMonthYear(isoDate: string): string {
    return monthYearFormatter.format(new Date(isoDate));
}

/**
 * "2026" — the `/work` ledger's compact year-only column (`WorkListPage`),
 * added 2026-08-11 when `Work.year: Int` became `Work.date: String`. A
 * plain string slice, not `new Date(isoDate).getFullYear()` — deliberately:
 * `.getFullYear()` reads the LOCAL timezone, and `new Date("2026-01-01")`
 * parses as UTC midnight, so any timezone behind UTC would read back
 * "2025" for a date literally named "2026-01-01" — the exact bug class
 * `formatAdminDate`'s own comment above already documents (found there via
 * a failing test, not by inspection). Slicing the string never touches a
 * `Date` object at all, so there's no timezone to get wrong.
 */
export function formatYear(isoDate: string): string {
    return isoDate.slice(0, 4);
}

/** "Jul 19, 2026" — precise enough for the admin editor's read-only "created on" display (`PostEditorPage`), where the visitor-facing "Month Year" above would be too vague for the person who actually needs to tell two same-month posts apart. */
const adminDateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatAdminDate(isoDate: string): string {
    return adminDateFormatter.format(new Date(isoDate));
}

/** Today's date in the exact `YYYY-MM-DD` shape `createPost` (backend) stamps a new post with — used only to PREVIEW what date a not-yet-created post will get, never sent to the server (the server generates its own, in its own clock, at the moment of the actual `POST`). */
export function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

/**
 * "Aug 9, 2026, 3:04 PM" — a REAL instant (`ContentRevision.publishedAt`),
 * not a date-only string, so this deliberately does NOT pin `timeZone:
 * "UTC"` the way `formatAdminDate`/`formatMonthYear` above do — those
 * exist to work around `new Date("2026-02-11")` parsing as UTC midnight
 * for a date-ONLY ISO string; a full timestamp has a real time-of-day
 * component and should render in whichever timezone the admin's own
 * browser is actually in.
 */
const adminDateTimeFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function formatAdminDateTime(isoDateTime: string): string {
    return adminDateTimeFormatter.format(new Date(isoDateTime));
}
