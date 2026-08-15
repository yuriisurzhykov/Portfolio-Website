// noinspection HtmlUnknownAttribute,TypeScriptMissingConfigOption

import { Linter } from "eslint";
import { describe, expect, it } from "vitest";
import rule from "./no-arbitrary-dimension-class";

const linter = new Linter();

function lint(code: string) {
    return linter.verify(code, {
        languageOptions: { ecmaVersion: 2022, sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { local: { rules: { "no-arbitrary-dimension-class": rule } } },
        rules: { "local/no-arbitrary-dimension-class": "error" },
    });
}

describe("no-arbitrary-dimension-class", () => {
    it("flags a bare px literal across several dimension-bearing prefixes", () => {
        expect(lint('const x = <div className="w-[26px]" />;')).toHaveLength(1);
        expect(lint('const x = <span className="gap-[2px]" />;')).toHaveLength(1);
        expect(lint('const x = <p className="text-[18px]" />;')).toHaveLength(1);
        expect(lint('const x = <div className="rounded-[6px]" />;')).toHaveLength(1);
    });

    it("flags a bare rem/em/% literal, not just px", () => {
        expect(lint('const x = <div className="p-[1.5rem]" />;')).toHaveLength(1);
        expect(lint('const x = <div className="mb-[0.5em]" />;')).toHaveLength(1);
        expect(lint('const x = <div className="h-[40%]" />;')).toHaveLength(1);
    });

    it("flags a bare literal even with a Tailwind responsive/state modifier", () => {
        const messages = lint('const x = <nav className="sm:gap-[28px]" />;');
        expect(messages).toHaveLength(1);
        expect(messages[0].message).toContain('"sm:gap-[28px]"');
    });

    it("does NOT flag a fluid clamp()/calc()/min() expression — real, already-approved cases from the migration", () => {
        expect(lint('const x = <section className="px-[clamp(20px,4vw,56px)]" />;')).toHaveLength(0);
        expect(lint('const x = <div className="w-[calc(100%-2rem)]" />;')).toHaveLength(0);
        expect(lint('const x = <div className="w-[min(320px,85vw)]" />;')).toHaveLength(0);
    });

    it("does NOT flag an arbitrary-var reference to an existing design token", () => {
        expect(lint('const x = <div className="px-(--layout-section-horizontal-padding)" />;')).toHaveLength(0);
        expect(lint('const x = <div className="w-(--spacing-5xl)" />;')).toHaveLength(0);
    });

    it("does NOT flag a ch-unit measure — a character-based line-length, not a dimension-scale concern", () => {
        expect(lint('const x = <p className="max-w-[70ch]" />;')).toHaveLength(0);
    });

    it("flags a bare viewport-unit literal (vh/vw/vmin/vmax) too — no unit-based exemption, only fluid expressions/ch are exempt", () => {
        expect(lint('const x = <div className="min-h-[60vh]" />;')).toHaveLength(1);
        expect(lint('const x = <div className="w-[40vw]" />;')).toHaveLength(1);
    });

    it("flags every percentage, including 100%/50% — no fill-parent/center exemption (Tailwind already has w-full/h-full/w-1/2 for that)", () => {
        expect(lint('const x = <div className="w-[100%] h-[100%]" />;')).toHaveLength(2);
        expect(lint('const x = <div className="top-[50%]" />;')).toHaveLength(1);
        expect(lint('const x = <div className="w-[60%]" />;')).toHaveLength(1);
    });

    it("does not flag a plain named-token Tailwind class", () => {
        expect(lint('const x = <div className="gap-md p-lg text-h3 rounded-pill" />;')).toHaveLength(0);
    });

    it("finds a bare literal nested inside a cn(...) call and a conditional expression", () => {
        expect(lint('const x = <div className={cn("w-[26px]", active && "text-primary")} />;')).toHaveLength(1);
        expect(lint('const x = <div className={active ? "gap-[2px]" : "gap-sm"} />;')).toHaveLength(1);
    });

    // Each of these puts the dimension-bearing literal on the branch that
    // ONLY that AST shape's own case in walkForStrings visits — unlike the
    // `&&` test above (whose right side, "text-primary", never matches the
    // dimension regex regardless of whether LogicalExpression is even
    // walked), a mutant that deletes/breaks the case here changes the
    // reported count, not just an unrelated string's fate.
    it("walks every remaining AST shape walkForStrings supports: && (real match on the right), array, object-key (clsx form), and template literal", () => {
        expect(lint('const x = <div className={active && "gap-[2px]"} />;')).toHaveLength(1);
        expect(lint('const x = <div className={cn(["w-[26px]", "p-md"])} />;')).toHaveLength(1);
        expect(lint('const x = <div className={cn({ "gap-[2px]": active, "p-md": true })} />;')).toHaveLength(1);
        expect(lint('const x = <div className={`gap-[2px] ${extra}`} />;')).toHaveLength(1);
    });

    it("does not crash and does not false-match on a clsx object keyed by a plain identifier shorthand", () => {
        expect(lint('const x = <div className={cn({ [dynamicKey]: active })} />;')).toHaveLength(0);
    });

    it("ignores a non-className attribute even with the same-looking string", () => {
        expect(lint('const x = <div data-token="w-[26px]" />;')).toHaveLength(0);
    });

    it("does not blow up on an adversarial shape with many repeated, never-closed prefixes", () => {
        const adversarial = " gap-[".repeat(20000);
        const start = performance.now();
        expect(lint(`const x = <div className="${adversarial}" />;`)).toHaveLength(0);
        expect(performance.now() - start).toBeLessThan(500);
    });
});
