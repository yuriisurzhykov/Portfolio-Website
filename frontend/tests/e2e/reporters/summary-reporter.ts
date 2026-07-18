import * as fs from "node:fs";
import * as path from "node:path";
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

/**
 * Minimal shape of an axe-core violation we care about for the summary. Kept local (rather than
 * importing axe-core's own types) so this reporter has zero extra dependencies beyond
 * @playwright/test.
 */
interface AxeViolationSummary {
    id: string;
    impact?: string | null;
    help: string;
    nodes: number;
}

interface TestSummaryEntry {
    title: string;
    project: string;
    status: TestResult["status"];
    durationMs: number;
    errorMessage?: string;
    a11yViolations?: AxeViolationSummary[];
}

interface Summary {
    generatedAt: string;
    overallStatus: FullResult["status"];
    counts: { passed: number; failed: number; skipped: number; total: number };
    a11yViolationCount: number;
    tests: TestSummaryEntry[];
}

const ATTACHMENT_NAME = "axe-results";

/**
 * Writes a flat JSON summary (test-results/summary.json by default) that downstream CI steps
 * (PR comment, GitHub Pages report index) consume without having to parse Playwright's own
 * report format. Registered alongside the built-in `html` reporter in playwright.config.ts —
 * this one never replaces it, it only adds a machine-friendly digest on top.
 */
export default class SummaryReporter implements Reporter {
    private readonly entries: TestSummaryEntry[] = [];
    private readonly outputFile: string;

    constructor(options: { outputFile?: string } = {}) {
        this.outputFile = options.outputFile ?? path.join("test-results", "summary.json");
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        const entry: TestSummaryEntry = {
            title: test.titlePath().filter(Boolean).join(" > "),
            project: test.parent.project()?.name ?? "unknown",
            status: result.status,
            durationMs: result.duration,
        };

        if (result.status !== "passed" && result.errors[0]?.message) {
            entry.errorMessage = result.errors[0].message;
        }

        const axeAttachment = result.attachments.find((attachment) => attachment.name === ATTACHMENT_NAME);
        if (axeAttachment?.body) {
            entry.a11yViolations = parseViolations(axeAttachment.body.toString("utf-8"));
        }

        this.entries.push(entry);
    }

    onEnd(result: FullResult): void {
        const passed = this.entries.filter((entry) => entry.status === "passed").length;
        const skipped = this.entries.filter((entry) => entry.status === "skipped").length;
        const failed = this.entries.length - passed - skipped;
        const a11yViolationCount = this.entries.reduce(
            (sum, entry) => sum + (entry.a11yViolations?.length ?? 0),
            0,
        );

        const summary: Summary = {
            generatedAt: new Date().toISOString(),
            overallStatus: result.status,
            counts: { passed, failed, skipped, total: this.entries.length },
            a11yViolationCount,
            tests: this.entries,
        };

        fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
        fs.writeFileSync(this.outputFile, JSON.stringify(summary, null, 2), "utf-8");
    }
}

function parseViolations(raw: string): AxeViolationSummary[] {
    try {
        const parsed = JSON.parse(raw) as { id: string; impact?: string | null; help: string; nodes: unknown[] }[];
        return parsed.map((violation) => ({
            id: violation.id,
            impact: violation.impact,
            help: violation.help,
            nodes: violation.nodes.length,
        }));
    } catch {
        return [];
    }
}
