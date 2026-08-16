// noinspection HtmlUnknownAttribute

import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import rule from "./no-arbitrary-color-class";

const linter = new Linter();

function lint(code: string) {
    return linter.verify(code, {
        languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { local: { rules: { "no-arbitrary-color-class": rule } } },
        rules: { "local/no-arbitrary-color-class": "error" },
    });
}

describe("no-arbitrary-color-class", () => {
    it("flags a hex color in an arbitrary bg- class", () => {
        const messages = lint('const x = <div className="bg-[#e8743a]" />;');
        expect(messages).toHaveLength(1);
        expect(messages[0].message).toContain('"bg-[#e8743a]"');
    });

    it("flags an hsl()/rgb() color across other color-bearing prefixes", () => {
        // `_` not a literal space — real Tailwind syntax; a raw space would split
        // into two "class tokens", which is exactly why classes can't contain one.
        expect(lint('const x = <span className="text-[hsl(20_94%_61%)]" />;')).toHaveLength(1);
        expect(lint('const x = <div className="border-[rgb(0,0,0)]" />;')).toHaveLength(1);
    });

    it("flags 2 offending classes independently when a className string has both, rather than only the first", () => {
        const messages = lint('const x = <div className="bg-[#fff] text-[#000]" />;');
        expect(messages).toHaveLength(2);
        expect(messages.map((m) => m.message).join(" ")).toContain('"bg-[#fff]"');
        expect(messages.map((m) => m.message).join(" ")).toContain('"text-[#000]"');
    });

    it("does NOT flag a legitimate fluid/responsive arbitrary value — the audit's real 75-occurrence case", () => {
        expect(lint('const x = <div className="w-[min(320px,85vw)]" />;')).toHaveLength(0);
        expect(lint('const x = <div className="p-[clamp(40px,6vw,64px)]" />;')).toHaveLength(0);
        expect(lint('const x = <div className="max-w-[60ch] leading-[1.6]" />;')).toHaveLength(0);
    });

    it("does not flag a plain semantic Tailwind class", () => {
        expect(lint('const x = <div className="bg-surface-primary text-text-primary" />;')).toHaveLength(0);
    });

    it("finds a raw color nested inside a cn(...) call and a conditional expression", () => {
        expect(lint('const x = <div className={cn("bg-[#fff]", active && "text-primary")} />;')).toHaveLength(1);
        expect(lint('const x = <div className={active ? "bg-[#fff]" : "bg-surface-primary"} />;')).toHaveLength(1);
    });

    it("ignores a non-className attribute even with the same-looking string", () => {
        expect(lint('const x = <div data-token="bg-[#fff]" />;')).toHaveLength(0);
    });

    it("does not blow up on the exact adversarial shape CodeQL flagged — many repeated, never-closed color-function prefixes", () => {
        // The real finding: a whole-string scan with an unanchored lookback + an
        // unbounded `[^)]*` was O(n²) on input like this (many candidate start
        // positions, each scanning to end-of-string before failing). Asserting a
        // real wall-clock bound, not just "it returns something" — a regression
        // here would show up as this test timing out, not as a wrong answer.
        // Leading space on each repeated unit, deliberately — that's what made the
        // OLD (unanchored, lookback-based) regex retry the expensive scan at every
        // single one of these 20,000 positions; a variant with no internal
        // whitespace wouldn't actually have reproduced the original bug.
        const adversarial = " accent-[rgb(".repeat(20000);
        const start = performance.now();
        expect(lint(`const x = <div className="${adversarial}" />;`)).toHaveLength(0);
        expect(performance.now() - start).toBeLessThan(500);
    });
});
