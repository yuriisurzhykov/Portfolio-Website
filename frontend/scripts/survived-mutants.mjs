import { readFileSync } from "node:fs";

/**
 * Lists every surviving mutant from the latest `npm run test:mutation`, with
 * the source line it changed — the "read what the mutant actually changed
 * before touching anything" step, without clicking through the HTML report.
 *
 * Reads `reports/mutation/mutation.json` (Stryker's `json` reporter, enabled
 * in `stryker.config.mjs`). Run it after `npm run test:mutation`.
 */
const report = JSON.parse(readFileSync("reports/mutation/mutation.json", "utf8"));

let total = 0;
for (const [file, data] of Object.entries(report.files)) {
    const survived = data.mutants.filter((mutant) => mutant.status === "Survived");
    if (survived.length === 0) {
        continue;
    }
    const source = data.source.split("\n");
    console.log(`=== ${ file }`);
    for (const mutant of survived) {
        const line = mutant.location.start.line;
        console.log(`  [${ mutant.mutatorName }] line ${ line }: ${ source[line - 1].trim() }`);
        console.log(`     -> ${ mutant.replacement }`);
        total += 1;
    }
}

console.log(total === 0 ? "No survivors." : `${ total } survivor(s).`);
