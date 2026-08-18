/**
 * DS001, inline `style={{}}` side, dimension/typography — same shape as
 * `no-raw-color-value.ts`, scoped to dimension-bearing CSS properties.
 * Same exemptions as `no-arbitrary-dimension-class.ts`: a `calc()`/
 * `clamp()`/`var()` value or a unitless number (a raw `lineHeight`/
 * `zIndex`) is never flagged — every bare `px`/`rem`/`em`/`%`/`vh`/`vw`/
 * `vmin`/`vmax` literal is, unconditionally, no "too small to bother"
 * threshold.
 */
import type { Rule } from "eslint";
import { isStyleAttribute, propertyKeyName } from "./ast-helpers.ts";

const DIMENSION_PROPERTY =
    /^(width|height|minWidth|minHeight|maxWidth|maxHeight|padding|padding(Top|Right|Bottom|Left|InlineStart|InlineEnd)?|margin|margin(Top|Right|Bottom|Left|InlineStart|InlineEnd)?|gap|(row|column)Gap|top|right|bottom|left|inset|fontSize|borderRadius|border(TopLeft|TopRight|BottomLeft|BottomRight)Radius)$/;
// No `%` exemption, deliberately — a "100% fill parent" case that first
// looked unavoidable (`og/render.tsx`'s root element, rendered by
// `next/og`'s `ImageResponse`) turned out to have a real alternative once
// checked: the exact canvas size is already passed explicitly as
// `ImageResponse`'s own options AND used by every sibling layer in that
// same file (`OG_SIZE.width`/`OG_SIZE.height`) — the root just hadn't been
// made consistent with them. Verified live (not assumed): the existing
// `og-image.spec.ts` visual baseline still matches byte-for-byte after
// replacing `"100%"` with `OG_SIZE.width`/`OG_SIZE.height` there. No
// percentage literal in this codebase has needed an exemption since.
const RAW_DIMENSION_VALUE = /^-?[\d.]{1,10}(?:px|rem|em|vh|vw|vmin|vmax|%)$/;

const rule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow a bare numeric dimension literal (e.g. \"26px\", \"1.5rem\") inside an inline style={{}} — reference a CSS variable backed by a design token instead. calc()/clamp()/var() expressions and unitless numbers are exempt.",
        },
        schema: [],
        messages: {
            rawDimensionInInlineStyle:
                'Inline style property "{{property}}" has a bare numeric dimension literal ("{{value}}"). Reference a CSS variable backed by a design token instead.',
        },
    },
    create(context) {
        return {
            JSXAttribute(node) {
                if (!isStyleAttribute(node)) return;
                const value = (node as any).value;
                if (!value || value.type !== "JSXExpressionContainer") return;
                const expression = value.expression;
                if (!expression || expression.type !== "ObjectExpression") return;

                for (const property of expression.properties) {
                    if (property.type !== "Property") continue;
                    const keyName = propertyKeyName(property.key);
                    if (!keyName || !DIMENSION_PROPERTY.test(keyName)) continue;

                    const propertyValue = property.value;
                    if (propertyValue.type === "Literal" && typeof propertyValue.value === "string") {
                        const raw = propertyValue.value.trim();
                        if (RAW_DIMENSION_VALUE.test(raw)) {
                            context.report({ node: propertyValue, messageId: "rawDimensionInInlineStyle", data: { property: keyName, value: raw } });
                        }
                    } else if (propertyValue.type === "TemplateLiteral") {
                        for (const quasi of propertyValue.quasis) {
                            const raw = quasi.value.raw.trim();
                            if (RAW_DIMENSION_VALUE.test(raw)) {
                                context.report({ node: propertyValue, messageId: "rawDimensionInInlineStyle", data: { property: keyName, value: raw } });
                                break;
                            }
                        }
                    }
                }
            },
        };
    },
};

export default rule;
