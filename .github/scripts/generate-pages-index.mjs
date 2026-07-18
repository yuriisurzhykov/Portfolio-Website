#!/usr/bin/env node
// Writes a tiny static landing page for the GitHub Pages root (the gh-pages branch otherwise
// only ever has reports/<dest>/ written to it via destination_dir, so the bare Pages URL would
// 404 forever without this). See frontend/tests/README.md, section 9.
//
// Usage: node generate-pages-index.mjs <outputDir> <owner/repo>

import fs from "node:fs";
import path from "node:path";

const [, , outputDir, repo] = process.argv;

if (!outputDir || !repo) {
    console.error("Usage: generate-pages-index.mjs <outputDir> <owner/repo>");
    process.exit(1);
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${repo} — Visual &amp; Accessibility Test Reports</title>
<meta name="robots" content="noindex">
<style>
  body { font-family: system-ui, sans-serif; max-width: 640px; margin: 64px auto; padding: 0 24px; color: #222; }
  h1 { font-size: 1.4rem; }
  code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; }
  a { color: #be3500; }
</style>
</head>
<body>
  <h1>Visual &amp; Accessibility Test Reports</h1>
  <p>Published automatically by the <code>visual-tests.yml</code> GitHub Actions workflow.</p>
  <ul>
    <li><a href="reports/master/">Latest report from <code>master</code></a></li>
  </ul>
  <p>Reports for open pull requests aren't listed here — each PR's own sticky comment links
  directly to its report at <code>reports/pr-&lt;number&gt;/</code>.</p>
</body>
</html>
`;

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "index.html"), html);
