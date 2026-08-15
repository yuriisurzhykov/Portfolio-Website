/**
 * Shared AST helpers for the JSX/Tailwind-facing DS001 rules
 * (`no-arbitrary-color-class.ts`, `no-arbitrary-dimension-class.ts`) and
 * the inline-`style={{}}` ones (`no-raw-color-value.ts`,
 * `no-raw-dimension-value.ts`) — extracted once both categories existed,
 * to avoid a third/fourth copy of the same tree-walking logic. AST nodes
 * are typed loosely (`any`) throughout, deliberately — `estree`'s precise
 * expression unions fight a generic recursive walker far more than they
 * help here, the same pragmatic choice most hand-written ESLint rules make.
 */

export function isClassNameAttribute(node: any): boolean {
    return node.type === "JSXAttribute" && node.name?.name === "className";
}

export function isStyleAttribute(node: any): boolean {
    return node.type === "JSXAttribute" && node.name?.name === "style";
}

export function propertyKeyName(key: any): string | null {
    if (key.type === "Identifier") return key.name;
    if (key.type === "Literal" && typeof key.value === "string") return key.value;
    return null;
}

/** Walks a `className={...}` value for every string literal it could resolve to — through `cn()`/`clsx()`-style calls, ternaries, `&&`, arrays, and template literals. */
export function walkForStrings(node: any, visit: (value: string, node: any) => void): void {
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
