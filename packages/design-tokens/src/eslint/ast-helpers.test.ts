import { describe, expect, it } from "vitest";
import { isClassNameAttribute, isStyleAttribute, propertyKeyName, walkForStrings } from "./ast-helpers";

// Direct unit tests, not just through the 4 rules that consume this module —
// some AST shapes (a non-JSXAttribute node, a name-less attribute) never
// actually reach these functions through a real ESLint `JSXAttribute(node)`
// visitor, so testing only through the rules leaves them permanently
// unreachable no matter how the rule-level tests are written.

describe("isClassNameAttribute", () => {
    it("is true only for a JSXAttribute literally named className", () => {
        expect(isClassNameAttribute({ type: "JSXAttribute", name: { name: "className" } })).toBe(true);
    });

    it("is false for a JSXAttribute with a different name", () => {
        expect(isClassNameAttribute({ type: "JSXAttribute", name: { name: "style" } })).toBe(false);
    });

    // A JSXSpreadAttribute ({...props}) has no `name` property at all —
    // `node.name?.name` must not throw reading `.name` off `undefined`.
    it("is false, not a crash, for a node type with no name at all", () => {
        expect(isClassNameAttribute({ type: "JSXSpreadAttribute" })).toBe(false);
    });

    it("is false for a non-JSXAttribute node even if it happens to carry a matching name", () => {
        expect(isClassNameAttribute({ type: "Identifier", name: { name: "className" } })).toBe(false);
    });
});

describe("isStyleAttribute", () => {
    it("is true only for a JSXAttribute literally named style", () => {
        expect(isStyleAttribute({ type: "JSXAttribute", name: { name: "style" } })).toBe(true);
    });

    it("is false for a JSXAttribute with a different name", () => {
        expect(isStyleAttribute({ type: "JSXAttribute", name: { name: "className" } })).toBe(false);
    });

    it("is false, not a crash, for a node type with no name at all", () => {
        expect(isStyleAttribute({ type: "JSXSpreadAttribute" })).toBe(false);
    });

    it("is false for a non-JSXAttribute node even if it happens to carry a matching name", () => {
        expect(isStyleAttribute({ type: "Identifier", name: { name: "style" } })).toBe(false);
    });
});

describe("propertyKeyName", () => {
    it("returns the name of an Identifier key (an unquoted style property like `width:`)", () => {
        expect(propertyKeyName({ type: "Identifier", name: "width" })).toBe("width");
    });

    it("returns the value of a string Literal key (a quoted style property like `\"width\":`)", () => {
        expect(propertyKeyName({ type: "Literal", value: "width" })).toBe("width");
    });

    it("returns null for a Literal key whose value isn't a string (a numeric key)", () => {
        expect(propertyKeyName({ type: "Literal", value: 42 })).toBeNull();
    });

    it("returns null for neither an Identifier nor a Literal (a computed key)", () => {
        expect(propertyKeyName({ type: "MemberExpression" })).toBeNull();
    });
});

describe("walkForStrings", () => {
    it("does nothing (no crash) for a null/undefined node", () => {
        const seen: string[] = [];
        walkForStrings(null, (v) => seen.push(v));
        walkForStrings(undefined, (v) => seen.push(v));
        expect(seen).toEqual([]);
    });

    it("visits a plain string Literal, but not a non-string Literal (a number)", () => {
        const seen: string[] = [];
        walkForStrings({ type: "Literal", value: "gap-md" }, (v) => seen.push(v));
        walkForStrings({ type: "Literal", value: 42 }, (v) => seen.push(v));
        expect(seen).toEqual(["gap-md"]);
    });

    it("unwraps a JSXExpressionContainer to walk its inner expression", () => {
        const seen: string[] = [];
        walkForStrings({ type: "JSXExpressionContainer", expression: { type: "Literal", value: "gap-md" } }, (v) => seen.push(v));
        expect(seen).toEqual(["gap-md"]);
    });

    it("visits every quasi of a TemplateLiteral", () => {
        const seen: string[] = [];
        const node = { type: "TemplateLiteral", quasis: [{ value: { raw: "gap-md " } }, { value: { raw: " p-lg" } }] };
        walkForStrings(node, (v) => seen.push(v));
        expect(seen).toEqual(["gap-md ", " p-lg"]);
    });

    it("walks every argument of a CallExpression (cn(...)/clsx(...))", () => {
        const seen: string[] = [];
        const node = { type: "CallExpression", arguments: [{ type: "Literal", value: "a" }, { type: "Literal", value: "b" }] };
        walkForStrings(node, (v) => seen.push(v));
        expect(seen).toEqual(["a", "b"]);
    });

    it("walks both branches of a ConditionalExpression, not just one", () => {
        const seen: string[] = [];
        const node = { type: "ConditionalExpression", consequent: { type: "Literal", value: "a" }, alternate: { type: "Literal", value: "b" } };
        walkForStrings(node, (v) => seen.push(v));
        expect(seen).toEqual(["a", "b"]);
    });

    it("walks both sides of a LogicalExpression, not just one", () => {
        const seen: string[] = [];
        const node = { type: "LogicalExpression", left: { type: "Literal", value: "a" }, right: { type: "Literal", value: "b" } };
        walkForStrings(node, (v) => seen.push(v));
        expect(seen).toEqual(["a", "b"]);
    });

    it("walks every element of an ArrayExpression", () => {
        const seen: string[] = [];
        const node = { type: "ArrayExpression", elements: [{ type: "Literal", value: "a" }, { type: "Literal", value: "b" }] };
        walkForStrings(node, (v) => seen.push(v));
        expect(seen).toEqual(["a", "b"]);
    });

    it("walks only Property entries of an ObjectExpression's keys, skipping a spread element", () => {
        const seen: string[] = [];
        const node = {
            type: "ObjectExpression",
            properties: [
                { type: "Property", key: { type: "Literal", value: "gap-md" } },
                { type: "SpreadElement", argument: { type: "Identifier", name: "rest" } },
            ],
        };
        walkForStrings(node, (v) => seen.push(v));
        expect(seen).toEqual(["gap-md"]);
    });

    it("does nothing for an unrecognized node type (the default branch)", () => {
        const seen: string[] = [];
        walkForStrings({ type: "Identifier", name: "someVar" }, (v) => seen.push(v));
        expect(seen).toEqual([]);
    });
});
