#!/usr/bin/env node
// Turns the custom Playwright reporter's test-results/summary.json into a Markdown comment body,
// written to frontend/pr-comment.md so the workflow can hand it to
// marocchino/sticky-pull-request-comment via its `path` input (avoids GITHUB_OUTPUT multiline
// escaping entirely).
//
// Usage: node format-summary.mjs <summaryJsonPath> <reportDestDir> <owner/repo>

import fs from "node:fs";

const [, , summaryPath, reportDir, repo] = process.argv;

if (!summaryPath || !reportDir || !repo) {
    console.error("Usage: format-summary.mjs <summaryJsonPath> <reportDestDir> <owner/repo>");
    process.exit(1);
}

if (!fs.existsSync(summaryPath)) {
    fs.writeFileSync(
        "frontend/pr-comment.md",
        "### ⚠️ Visual & accessibility tests\n\nNo summary was produced — check the workflow run logs.",
    );
    process.exit(0);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
const [owner, repoName] = repo.split("/");
const reportUrl = `https://${owner}.github.io/${repoName}/${reportDir}/`;

const statusEmoji = summary.counts.failed > 0 ? "❌" : "✅";

const violationLines = summary.tests.flatMap((test) =>
    (test.a11yViolations ?? []).map(
        (violation) =>
            `- **[${violation.impact}]** \`${violation.id}\` on _${test.title}_ — ${violation.help} (${violation.nodes} element${violation.nodes === 1 ? "" : "s"})`,
    ),
);

const lines = [
    `### ${statusEmoji} Visual & accessibility tests`,
    "",
    "| | |",
    "|---|---|",
    `| Passed | ${summary.counts.passed} |`,
    `| Failed | ${summary.counts.failed} |`,
    `| Skipped | ${summary.counts.skipped} |`,
    `| Accessibility violations | ${summary.a11yViolationCount} |`,
    "",
    `[Full report with visual diffs →](${reportUrl})`,
];

if (violationLines.length > 0) {
    lines.push("", "<details><summary>Accessibility violations</summary>", "", ...violationLines, "", "</details>");
}

fs.writeFileSync("frontend/pr-comment.md", lines.join("\n") + "\n");
