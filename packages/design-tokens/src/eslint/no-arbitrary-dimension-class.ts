/**
 * DS001, dimension/typography side of the JSX/Tailwind check — same shape
 * as `no-arbitrary-color-class.ts`, scoped to DIMENSION-bearing utility
 * prefixes instead of color ones. Deliberately narrower than "flag every
 * arbitrary Tailwind value": only fires on a BARE `px`/`rem`/`em`/`%`/`vh`/
 * `vw`/`vmin`/`vmax` literal (`26px`, `1.5rem`, `40%`, `60vh`) — never a
 * fluid/responsive expression (`clamp(...)`, `calc(...)`, `min(...)`,
 * `var(...)`), and never a `ch`-unit measure (a character-based line-
 * length this rule never sees the context to size against). Every bare
 * literal is flagged unconditionally, with no "too small to bother"
 * threshold — a project's own tokens (or Tailwind's own built-ins, e.g.
 * `h-screen` for a full-viewport height) come first; a bracket value is
 * always wrong, even a couple of pixels off a step, per this repo's own
 * explicit call. See theme/README.md's dated entries for the exceptions
 * that DO remain (fluid expressions, `ch`) and why.
 *
 * Regex fully anchored (`^...$`) and tested per whitespace-delimited
 * token, matching `no-arbitrary-color-class.ts`'s own fix for a real
 * ReDoS finding on that shape — never repeated here from scratch.
 */
import type { Rule } from "eslint";
import { isClassNameAttribute, walkForStrings } from "./ast-helpers.ts";

const DIMENSION_PREFIXES =
    "w|h|size|min-w|max-w|min-h|max-h|p|px|py|ps|pe|pt|pr|pb|pl|m|mx|my|ms|me|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y|top|right|bottom|left|start|end|inset|inset-x|inset-y|text|leading|tracking|rounded";

// `(?:[\w-]{1,20}:)?` allows one leading Tailwind modifier (`sm:`, `hover:`,
// `dark:`, ...) — dimension arbitrary values are commonly responsive-
// prefixed in this codebase's real usage, unlike colors. No `%` exemption
// (see `no-raw-dimension-value.ts`'s comment on why one seemed needed and
// turned out not to be) — Tailwind already has `w-full`/`h-full`/`w-1/2`
// for "fill parent"/"center" anyway, so an arbitrary `[100%]`/`[50%]`
// bracket value would be a real bypass of those, not a case with no
// alternative.
const DIMENSION_BEARING_ARBITRARY_CLASS = new RegExp(
    `^(?:[\\w-]{1,20}:)?-?(?:${DIMENSION_PREFIXES})-\\[-?[\\d.]{1,10}(?:px|rem|em|vh|vw|vmin|vmax|%)\\]$`,
);

function findDimensionBearingArbitraryClasses(value: string): string[] {
    return value.split(/\s+/).filter((token) => DIMENSION_BEARING_ARBITRARY_CLASS.test(token));
}

const rule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow an arbitrary Tailwind class carrying a bare numeric dimension literal (e.g. w-[26px], p-[1.5rem]) — reference an existing spacing/radius/typography primitive, or a Tailwind built-in, instead. clamp()/calc()/min()/var() expressions and ch-unit measures are exempt (genuinely fluid or character-based, not a fixed-scale concern).",
        },
        schema: [],
        messages: {
            rawDimensionInArbitraryClass:
                '"{{match}}" is a bare numeric dimension literal inside an arbitrary Tailwind class. Reference an existing dimension/radius/typography step (or a Tailwind built-in) instead of a raw bracket value — ask before adding a new one if nothing fits.',
        },
    },
    create(context) {
        return {
            JSXAttribute(node) {
                if (!isClassNameAttribute(node)) return;
                walkForStrings((node as any).value, (value, stringNode) => {
                    for (const match of findDimensionBearingArbitraryClasses(value)) {
                        context.report({
                            node: stringNode,
                            messageId: "rawDimensionInArbitraryClass",
                            data: { match },
                        });
                    }
                });
            },
        };
    },
};

export default rule;
