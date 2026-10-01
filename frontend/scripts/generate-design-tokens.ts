/**
 * Build-time entry point — the ONLY place `@portfolio/design-tokens`'s
 * compiler is ever imported. Writes `generated/tokens.css` (a static CSS
 * file, replacing the old runtime-injected `<style>` tag) and
 * `generated/resolved.ts` (plain, already-resolved data for the Mermaid/
 * OG-image/WebGL adapters — none of which may import the compiler or the
 * raw theme source directly). See `npm run tokens:generate`/`tokens:check`.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

    const cssPath = path.join(GENERATED_DIR, "tokens.css");
    const resolvedPath = path.join(GENERATED_DIR, "resolved.ts");
    const outputs = [
        { file: cssPath, content: `${css}\n` },
        { file: resolvedPath, content: serializeResolvedModule(resolved) },
    ];

    if (process.argv.includes("--check")) {
        const stale: string[] = [];
        for (const { file, content } of outputs) {
            const existing = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
                if (error.code === "ENOENT") return null;
                throw error;
            });
            if (existing?.replace(/\r\n/g, "\n") !== content) {
                stale.push(path.relative(THEME_DIR, file));
            }
        }
        if (stale.length > 0) {
            throw new Error(`Design tokens are stale: ${stale.join(", ")}. Run npm run tokens:generate.`);
        }
        console.log("Generated design tokens are up to date.");
        return;
    }

    await mkdir(GENERATED_DIR, { recursive: true });
    for (const { file, content } of outputs) {
        await writeFile(file, content, "utf8");
    }

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
