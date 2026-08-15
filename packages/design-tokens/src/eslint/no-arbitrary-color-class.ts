/**
 * DS001, JSX/Tailwind side. Deliberately scoped to COLOR-bearing utility
 * prefixes only — the audit behind this plan found ~75 legitimate arbitrary
 * Tailwind values (`w-[min(320px,85vw)]`, `p-[clamp(40px,6vw,64px)]`,
 * `max-w-[60ch]`, ...) that are genuinely fluid/responsive and don't fit a
 * fixed token scale. A blanket "no arbitrary value, ever" rule would break
 * real responsive design; this rule only fires when the bracket content
 * itself looks like a raw color (hex or a color function).
 *
 * AST nodes are typed loosely (`any`) throughout, deliberately — `estree`'s
 * precise expression unions fight a generic recursive walker far more than
 * they help here (this rule only ever reads `.type` and a handful of
 * well-known child fields), the same pragmatic choice most hand-written
 * ESLint rules make.
 */
import type { Rule } from "eslint";

const COLOR_BEARING_ARBITRARY_CLASS =
    /(?:^|[\s"'`])((?:bg|text|border|fill|stroke|outline|ring|decoration|divide|from|via|to|caret|accent|shadow)-\[(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|oklab\([^)]*\)|lab\([^)]*\)|lch\([^)]*\))])/;

function isClassNameAttribute(node: any): boolean {
    return node.type === "JSXAttribute" && node.name?.name === "className";
}

function walkForStrings(node: any, visit: (value: string, node: any) => void): void {
    if (!node) return;
    switch (node.type) {
        case "Literal":
            if (typeof node.value === "string") visit(node.value, node);
            return;
        case "JSXExpressionContainer":
            walkForStrings(node.expression, visit);
            return;
        case "TemplateLiteral":
            for (const quasi of node.quasis) visit(quasi.value.raw, node);
            return;
        case "CallExpression":
            for (const arg of node.arguments) walkForStrings(arg, visit);
            return;
        case "ConditionalExpression":
            walkForStrings(node.consequent, visit);
            walkForStrings(node.alternate, visit);
            return;
        case "LogicalExpression":
            walkForStrings(node.left, visit);
            walkForStrings(node.right, visit);
            return;
        case "ArrayExpression":
            for (const element of node.elements) walkForStrings(element, visit);
            return;
        case "ObjectExpression":
            for (const property of node.properties) {
                if (property.type === "Property") walkForStrings(property.key, visit);
            }
            return;
        default:
            return;
    }
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
                    const match = value.match(COLOR_BEARING_ARBITRARY_CLASS);
                    if (match) {
                        context.report({
                            node: stringNode,
                            messageId: "rawColorInArbitraryClass",
                            data: { match: match[1] },
                        });
                    }
                });
            },
        };
    },
};

export default rule;
