import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import rule from "./no-raw-color-value";

const linter = new Linter();

function lint(code: string) {
    return linter.verify(code, {
        languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { local: { rules: { "no-raw-color-value": rule } } },
        rules: { "local/no-raw-color-value": "error" },
    });
}

describe("no-raw-color-value", () => {
    it("flags a hex color literal on a color-bearing style property", () => {
        const messages = lint('const x = <div style={{ color: "#e8743a" }} />;');
        expect(messages).toHaveLength(1);
        expect(messages[0].message).toContain('"color"');
        expect(messages[0].message).toContain("#e8743a");
    });

    it("flags rgb()/hsl()/oklch() the same way", () => {
        expect(lint('const x = <div style={{ backgroundColor: "rgba(0,0,0,.5)" }} />;')).toHaveLength(1);
        expect(lint('const x = <div style={{ borderColor: "hsl(0 0% 0%)" }} />;')).toHaveLength(1);
        expect(lint('const x = <div style={{ fill: "oklch(0.72 0.17 45)" }} />;')).toHaveLength(1);
    });

    it("does not flag a var(--...) reference — the intended replacement", () => {
        expect(lint('const x = <div style={{ color: "var(--color-text-primary)" }} />;')).toHaveLength(0);
    });

    it("does not flag a non-color style property even with a similar-looking value", () => {
        expect(lint('const x = <div style={{ width: "100px" }} />;')).toHaveLength(0);
    });

    it("ignores style objects with no color-bearing keys at all", () => {
        expect(lint('const x = <div style={{ display: "flex", gap: "8px" }} />;')).toHaveLength(0);
    });

    it("flags a raw color hidden inside a template literal value", () => {
        expect(lint('const x = <div style={{ color: `#e8743a` }} />;')).toHaveLength(1);
    });
});
