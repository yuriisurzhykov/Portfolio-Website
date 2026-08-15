// noinspection TypeScriptMissingConfigOption

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

    it("flags a raw color hidden inside a template literal value, with the exact property/value in the message", () => {
        const messages = lint('const x = <div style={{ color: `#e8743a` }} />;');
        expect(messages).toHaveLength(1);
        expect(messages[0].message).toContain('"color"');
        expect(messages[0].message).toContain("#e8743a");
    });

    it("does not flag a template literal whose value isn't a raw color (a var() reference)", () => {
        expect(lint('const x = <div style={{ color: `var(--color-text-primary)` }} />;')).toHaveLength(0);
    });

    // Both halves matter: leading/trailing whitespace a real formatter could
    // introduce must still match (`.trim()` before testing), for BOTH the
    // plain-Literal and TemplateLiteral branches.
    it("flags a raw color with surrounding whitespace, in both a plain string and a template literal", () => {
        expect(lint('const x = <div style={{ color: " #e8743a " }} />;')).toHaveLength(1);
        expect(lint('const x = <div style={{ color: ` #e8743a ` }} />;')).toHaveLength(1);
    });

    // Neither a string Literal nor a TemplateLiteral — must fall through
    // both branches without reporting or crashing.
    it("does not flag (and does not crash on) a dynamic, non-literal style value", () => {
        expect(lint("const x = <div style={{ color: someVariable }} />;")).toHaveLength(0);
    });

    // A number is a `Literal` node, but not a STRING one — proves the
    // `typeof propertyValue.value === "string"` half isn't redundant with
    // the `type === "Literal"` half.
    it("does not flag a numeric literal on a color-bearing property", () => {
        expect(lint("const x = <div style={{ borderColor: 0 }} />;")).toHaveLength(0);
    });

    // A key that resolves to neither an Identifier nor a string Literal
    // (propertyKeyName returns null) — must be skipped via the `!keyName`
    // half, distinct from the `!COLOR_PROPERTY.test(keyName)` half below.
    it("does not flag (and does not crash on) a computed, non-literal object key", () => {
        expect(lint('const x = <div style={{ [dynamicKey]: "#e8743a" }} />;')).toHaveLength(0);
    });

    // A spread element inside the style object (`property.type !== "Property"`)
    // must be skipped without crashing, while a REAL color-bearing property
    // right next to it still gets flagged.
    it("skips a spread element inside the style object without crashing, and still flags a real sibling property", () => {
        expect(lint('const x = <div style={{ ...base, color: "#e8743a" }} />;')).toHaveLength(1);
    });

    it("ignores a non-style attribute and a non-object style expression", () => {
        expect(lint('const x = <div data-color="#e8743a" />;')).toHaveLength(0);
        expect(lint("const x = <div style={someStyleObject} />;")).toHaveLength(0);
    });
});
