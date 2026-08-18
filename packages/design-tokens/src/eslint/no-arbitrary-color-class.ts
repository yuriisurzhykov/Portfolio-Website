/**
 * DS001, JSX/Tailwind side. Deliberately scoped to COLOR-bearing utility
 * prefixes only — the audit behind this plan found ~75 legitimate arbitrary
 * Tailwind values (`w-[min(320px,85vw)]`, `p-[clamp(40px,6vw,64px)]`,
 * `max-w-[60ch]`, ...) that are genuinely fluid/responsive and don't fit a
 * fixed token scale. A blanket "no arbitrary value, ever" rule would break
 * real responsive design; this rule only fires when the bracket content
 * itself looks like a raw color (hex or a color function).
 *
 * A real ReDoS finding (CodeQL/GitHub Advanced Security, "polynomial
 * regular expression used on uncontrolled data"), fixed here, not
 * dismissed: an earlier version matched `COLOR_BEARING_ARBITRARY_CLASS`
 * against the WHOLE className string with only a soft `(?:^|[\s"'`])`
 * lookback (not a hard `^...$` anchor) — `.match()` without the `g` flag
 * retries at every character position where that lookback succeeds, and at
 * each one, the color-function alternatives' `[^)]*` scanned unboundedly
 * forward. A className with many repeated, never-closed prefixes (e.g.
 * `"accent-[rgb(".repeat(n)`) made that O(n²): one scan attempt per
 * candidate start position, each itself O(n) in the worst case. Fixed by
 * splitting on whitespace first (a Tailwind class IS a whitespace-delimited
 * token, this is the semantically correct unit anyway) and matching each
 * token with a FULLY anchored (`^...$`) pattern with a bounded inner scan
 * (`{0,100}`, not `*`) — no per-token match attempt can be more than O(1),
 * so the whole check is O(n) in the string's total length, not O(n²).
 */
import type { Rule } from "eslint";
import { isClassNameAttribute, walkForStrings } from "./ast-helpers.ts";

const COLOR_BEARING_ARBITRARY_CLASS =
    /^(?:bg|text|border|fill|stroke|outline|ring|decoration|divide|from|via|to|caret|accent|shadow)-\[(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]{0,100}\)|hsla?\([^)]{0,100}\)|oklch\([^)]{0,100}\)|oklab\([^)]{0,100}\)|lab\([^)]{0,100}\)|lch\([^)]{0,100}\))]$/;

/** Every offending WHITESPACE-DELIMITED token in `value`, checked independently — see the ReDoS fix note above for why this beats one whole-string regex. */
function findColorBearingArbitraryClasses(value: string): string[] {
    return value.split(/\s+/).filter((token) => COLOR_BEARING_ARBITRARY_CLASS.test(token));
}

const rule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow an arbitrary Tailwind class carrying a raw color literal (e.g. bg-[#fff], text-[hsl(0 0% 0%)]) — concrete colors exist only in tokens/color.ts.",
        },
        schema: [],
        messages: {
            rawColorInArbitraryClass:
                '"{{match}}" is a raw color value inside an arbitrary Tailwind class. Reference a semantic or component color token instead of an arbitrary bracket value.',
        },
    },
    create(context) {
        return {
            JSXAttribute(node) {
                if (!isClassNameAttribute(node)) return;
                walkForStrings((node as any).value, (value, stringNode) => {
                    for (const match of findColorBearingArbitraryClasses(value)) {
                        context.report({
                            node: stringNode,
                            messageId: "rawColorInArbitraryClass",
                            data: { match },
                        });
                    }
                });
            },
        };
    },
};

export default rule;
