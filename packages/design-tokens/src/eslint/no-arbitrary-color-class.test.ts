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
        expect(lint('const x = <span className="text-[hsl(20 94% 61%)]" />;')).toHaveLength(1);
        expect(lint('const x = <div className="border-[rgb(0,0,0)]" />;')).toHaveLength(1);
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
});
