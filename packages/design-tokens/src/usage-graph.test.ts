import { describe, expect, it } from "vitest";
import { buildConsumerReferenceMap, findPrimitiveBoundaryCrossings, findSingleConsumerGlobals, findUnusedGlobalSemantics } from "./usage-graph";

describe("buildConsumerReferenceMap", () => {
    it("maps each referenced path to the set of namespaces referencing it", () => {
        const map = buildConsumerReferenceMap([
            { namespace: "component:codeBlock", tree: { keyword: "{color.accent.purple}" } },
            { namespace: "component:skillCard", tree: { decorativeAccent: "{color.accent.purple}" } },
        ]);
        expect(map.get("color.accent.purple")).toEqual(new Set(["component:codeBlock", "component:skillCard"]));
    });
});

describe("findPrimitiveBoundaryCrossings — DS201/202", () => {
    it("reports nothing when a primitive has exactly one consuming namespace (DS203 — repeated use inside ONE namespace is fine)", () => {
        const violations = findPrimitiveBoundaryCrossings([
            { namespace: "component:codeBlock", tree: { keyword: "{color.accent.purple}", operator: "{color.accent.purple}" } },
        ]);
        expect(violations).toEqual([]);
    });

    it("fires when 2 distinct component namespaces reference the same primitive directly — the plan's worked example, before promotion", () => {
        const violations = findPrimitiveBoundaryCrossings([
            { namespace: "component:codeBlock", tree: { keyword: "{color.accent.purple}" } },
            { namespace: "component:skillCard", tree: { decorativeAccent: "{color.accent.purple}" } },
        ]);
        expect(violations).toEqual([{ primitivePath: "color.accent.purple", consumers: ["component:codeBlock", "component:skillCard"] }]);
    });

    // The two components are named/inserted so their NATURAL insertion order
    // is the REVERSE of alphabetical — the existing "before promotion" test
    // above passes codeBlock before skillCard, which is ALSO alphabetical
    // order, so removing `.sort()` there would never have been caught.
    it("sorts a violation's consumer list alphabetically, not by insertion order", () => {
        const violations = findPrimitiveBoundaryCrossings([
            { namespace: "component:zebra", tree: { keyword: "{color.accent.purple}" } },
            { namespace: "component:apple", tree: { decorativeAccent: "{color.accent.purple}" } },
        ]);
        expect(violations[0].consumers).toEqual(["component:apple", "component:zebra"]);
    });

    // Two DIFFERENT crossing primitive paths, inserted in reverse-alphabetical
    // order — proves the OUTER `violations.sort(...)` (by primitivePath)
    // actually reorders the returned array, not just the per-violation
    // consumer list sorted above.
    it("sorts the overall violations list by primitivePath, not by discovery order", () => {
        const violations = findPrimitiveBoundaryCrossings([
            { namespace: "component:a", tree: { x: "{color.zebra.500}" } },
            { namespace: "component:b", tree: { x: "{color.zebra.500}" } },
            { namespace: "component:a", tree: { y: "{color.apple.500}" } },
            { namespace: "component:b", tree: { y: "{color.apple.500}" } },
        ]);
        expect(violations.map((v) => v.primitivePath)).toEqual(["color.apple.500", "color.zebra.500"]);
    });

    it("treats a composite namespace the same as a component namespace (DS202 collapsed into DS201)", () => {
        const violations = findPrimitiveBoundaryCrossings([
            { namespace: "component:card", tree: { accent: "{color.cyan.500}" } },
            { namespace: "composite:gradients", tree: { hero: { color: "{color.cyan.500}" } } },
        ]);
        expect(violations).toHaveLength(1);
        expect(violations[0].consumers).toEqual(["component:card", "composite:gradients"]);
    });

    it("never flags a theme/semantic reference — those are primitive->global edges, not a boundary crossing", () => {
        const violations = findPrimitiveBoundaryCrossings([
            { namespace: "component:codeBlock", tree: { background: "{theme.color.surfacePrimary}" } },
            { namespace: "component:skillCard", tree: { background: "{theme.color.surfacePrimary}" } },
        ]);
        expect(violations).toEqual([]);
    });

    it("after promotion — both components repointed at the global role — the crossing clears", () => {
        const violations = findPrimitiveBoundaryCrossings([
            { namespace: "component:codeBlock", tree: { keyword: "{theme.color.decorativeAccent}" } },
            { namespace: "component:skillCard", tree: { decorativeAccent: "{theme.color.decorativeAccent}" } },
        ]);
        expect(violations).toEqual([]);
    });
});

describe("findSingleConsumerGlobals — DS102", () => {
    it("fires when a global-semantic role has exactly one component/composite consumer", () => {
        const violations = findSingleConsumerGlobals([
            { namespace: "component:codeBlock", tree: { background: "{theme.color.codeBlockBackground}" } },
        ]);
        expect(violations).toEqual([{ semanticPath: "theme.color.codeBlockBackground", consumer: "component:codeBlock" }]);
    });

    // Two roles inserted in reverse-alphabetical order — proves
    // `.sort((a, b) => a.semanticPath.localeCompare(b.semanticPath))`
    // actually reorders the result.
    it("sorts violations by semanticPath, not by discovery order", () => {
        const violations = findSingleConsumerGlobals([
            { namespace: "component:a", tree: { x: "{theme.color.zebra}" } },
            { namespace: "component:b", tree: { y: "{theme.color.apple}" } },
        ]);
        expect(violations.map((v) => v.semanticPath)).toEqual(["theme.color.apple", "theme.color.zebra"]);
    });

    it("does not fire when 2+ independent namespaces consume the same role — that's a legitimate global", () => {
        const violations = findSingleConsumerGlobals([
            { namespace: "component:articleCard", tree: { accent: "{theme.color.accent}" } },
            { namespace: "component:navigation", tree: { activeIndicator: "{theme.color.accent}" } },
        ]);
        expect(violations).toEqual([]);
    });
});

describe("findUnusedGlobalSemantics — DS101", () => {
    it("flags a defined role with zero component/composite consumers", () => {
        const unused = findUnusedGlobalSemantics(["theme.color.decorativeAccent"], []);
        expect(unused).toEqual(["theme.color.decorativeAccent"]);
    });

    it("does not flag a role that at least one consumer references", () => {
        const unused = findUnusedGlobalSemantics(
            ["theme.color.decorativeAccent"],
            [{ namespace: "component:codeBlock", tree: { keyword: "{theme.color.decorativeAccent}" } }],
        );
        expect(unused).toEqual([]);
    });
});
