/** DS001, inline `style={{}}` side. */
import type { Rule } from "eslint";
import { isStyleAttribute, propertyKeyName } from "./ast-helpers.ts";

const COLOR_PROPERTY = /^(color|background|backgroundColor|background(Color)?Image|border(Color)?|borderTop(Color)?|borderBottom(Color)?|borderLeft(Color)?|borderRight(Color)?|fill|stroke|outline(Color)?|boxShadow|textDecorationColor|caretColor|accentColor)$/;
const RAW_COLOR_VALUE = /^(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|lab\(|lch\()/;

const rule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow a raw color literal inside an inline style={{}} — concrete colors exist only in tokens/color.ts; use a CSS variable backed by a design token instead.",
        },
        schema: [],
        messages: {
            rawColorInInlineStyle:
                'Inline style property "{{property}}" has a raw color literal ("{{value}}"). Reference a CSS variable backed by a design token instead.',
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
                    if (!keyName || !COLOR_PROPERTY.test(keyName)) continue;

                    const propertyValue = property.value;
                    if (propertyValue.type === "Literal" && typeof propertyValue.value === "string") {
                        const raw = propertyValue.value.trim();
                        if (RAW_COLOR_VALUE.test(raw)) {
                            context.report({ node: propertyValue, messageId: "rawColorInInlineStyle", data: { property: keyName, value: raw } });
                        }
                    } else if (propertyValue.type === "TemplateLiteral") {
                        for (const quasi of propertyValue.quasis) {
                            const raw = quasi.value.raw.trim();
                            if (RAW_COLOR_VALUE.test(raw)) {
                                context.report({ node: propertyValue, messageId: "rawColorInInlineStyle", data: { property: keyName, value: raw } });
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
