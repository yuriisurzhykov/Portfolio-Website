// noinspection HtmlUnknownAttribute

import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import rule from "./no-raw-dimension-value";

const linter = new Linter();

function lint(code: string) {
    return linter.verify(code, {
        languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { local: { rules: { "no-raw-dimension-value": rule } } },
        rules: { "local/no-raw-dimension-value": "error" },
    });
}

describe("no-raw-dimension-value", () => {
    it("flags a bare px/rem literal across several dimension-bearing style properties", () => {
        expect(lint('const x = <div style={{ width: "26px" }} />;')).toHaveLength(1);
        expect(lint('const x = <div style={{ marginTop: "1.5rem" }} />;')).toHaveLength(1);
        expect(lint('const x = <div style={{ fontSize: "18px" }} />;')).toHaveLength(1);
        expect(lint('const x = <div style={{ borderRadius: "6px" }} />;')).toHaveLength(1);
    });

    it("flags a raw dimension literal inside a template literal", () => {
        expect(lint("const x = <div style={{ gap: `26px` }} />;")).toHaveLength(1);
    });

    it("does NOT flag a calc()/clamp()/var() expression", () => {
        expect(lint('const x = <div style={{ width: "calc(100% - 2rem)" }} />;')).toHaveLength(0);
        expect(lint('const x = <div style={{ width: "var(--ds-dimension-md)" }} />;')).toHaveLength(0);
    });

    it("flags every percentage, including 100%/50% — no fill-parent/center exemption", () => {
        expect(lint('const x = <div style={{ width: "100%", height: "100%" }} />;')).toHaveLength(2);
        expect(lint('const x = <div style={{ top: "50%" }} />;')).toHaveLength(1);
        expect(lint('const x = <div style={{ width: "60%" }} />;')).toHaveLength(1);
    });

    it("does NOT flag a unitless number (line-height, z-index — a different rule's concern) or a dynamic value", () => {
        expect(lint('const x = <div style={{ lineHeight: 1.5 }} />;')).toHaveLength(0);
        expect(lint("const x = <div style={{ width: `${clamped * 100}%` }} />;")).toHaveLength(0);
    });

    it("flags a bare viewport-unit literal too — no unit-based exemption", () => {
        expect(lint('const x = <div style={{ minHeight: "60vh" }} />;')).toHaveLength(1);
    });

    it("does not flag a non-dimension property with a color value", () => {
        expect(lint('const x = <div style={{ backgroundColor: "#fff" }} />;')).toHaveLength(0);
    });

    it("ignores a non-style attribute and a non-object style expression", () => {
        expect(lint('const x = <div data-width="26px" />;')).toHaveLength(0);
        expect(lint('const x = <div style={someStyleObject} />;')).toHaveLength(0);
    });
});
