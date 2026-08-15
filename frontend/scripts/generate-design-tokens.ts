/**
 * Build-time entry point — the ONLY place `@portfolio/design-tokens`'s
 * compiler is ever imported. Writes `generated/tokens.css` (a static CSS
 * file, replacing the old runtime-injected `<style>` tag) and
 * `generated/resolved.ts` (plain, already-resolved data for the Mermaid/
 * OG-image/WebGL adapters — none of which may import the compiler or the
 * raw theme source directly). See `npm run tokens:generate`/`tokens:check`.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileDesignTokens, DesignTokenBuildError } from "@portfolio/design-tokens";
import compilerInput from "../src/shared/ui/theme/compiler.config";

const THEME_DIR = path.resolve(__dirname, "../src/shared/ui/theme");
const GENERATED_DIR = path.join(THEME_DIR, "generated");

function serializeResolvedModule(resolved: unknown): string {
    return [
        "/*",
        " * AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.",
        " * Source: frontend/src/shared/ui/theme/{tokens,contracts,themes,semantic,components,composites}/",
        " * Generator: frontend/scripts/generate-design-tokens.ts",
        " *",
        " * Plain, already-resolved design-token data — the ONLY thing a non-CSS",
        " * adapter (adapters/mermaid.ts, adapters/og-image.ts, adapters/project-graph.ts)",
        " * may import. No `{reference}` strings remain; no compiler logic is",
        " * needed (or bundled) to read this file.",
        " */",
        `export const resolved = ${JSON.stringify(resolved, null, 4)} as const;`,
        "",
    ].join("\n");
}

// TODO: Make main() receive parameters: output path, input path (if needed).
async function main(): Promise<void> {
    const { css, resolved, warnings } = compileDesignTokens(compilerInput);

    for (const warning of warnings) {
        console.warn(`[tokens:generate] ${warning}`);
    }

    await mkdir(GENERATED_DIR, { recursive: true });
    const cssPath = path.join(GENERATED_DIR, "tokens.css");
    const resolvedPath = path.join(GENERATED_DIR, "resolved.ts");

    await writeFile(cssPath, `${css}\n`, "utf8");
    await writeFile(resolvedPath, serializeResolvedModule(resolved), "utf8");

    console.log(`Generated design tokens: ${cssPath}`);
    console.log(`Generated resolved data: ${resolvedPath}`);
}

main().catch((error) => {
    if (error instanceof DesignTokenBuildError) {
        console.error(`\n[tokens:generate] Build failed:\n\n${error.message}\n`);
    } else {
        console.error(error);
    }
    process.exitCode = 1;
});
