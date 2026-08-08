import { describe, expect, it } from "vitest";
import { describeAddResult, parseTechNames, splitNewNames, techNameKey } from "./parse-tech-input";

describe("techNameKey", () => {
    it("ignores case and surrounding whitespace", () => {
        expect(techNameKey("  Kotlin ")).toBe("kotlin");
    });

    it("collapses inner whitespace runs to a single space", () => {
        expect(techNameKey("Jetpack   Compose")).toBe("jetpack compose");
    });

    it("keeps punctuation, so 'C++' and 'C#' are NOT the same technology", () => {
        // The whole reason this isn't the frontend's `slugify` — that one
        // collapses both to "c". (The backend's `toTechSlug` no longer does;
        // see this function's comment for why it still isn't used here.)
        expect(techNameKey("C++")).not.toBe(techNameKey("C#"));
        expect(techNameKey("C++")).toBe("c++");
    });
});

describe("parseTechNames", () => {
    it("splits a comma-separated line and trims each name", () => {
        expect(parseTechNames("Kotlin, Docker ,PostgreSQL")).toEqual(["Kotlin", "Docker", "PostgreSQL"]);
    });

    it("splits on newlines, semicolons and tabs too", () => {
        expect(parseTechNames("Kotlin\nDocker;Redis\tNginx")).toEqual(["Kotlin", "Docker", "Redis", "Nginx"]);
    });

    it("does NOT split on '&' or '/' — those belong to a single technology's name", () => {
        expect(parseTechNames("Coroutines & Flow, CI/CD")).toEqual(["Coroutines & Flow", "CI/CD"]);
    });

    it("drops empty segments produced by repeated or trailing separators", () => {
        expect(parseTechNames(",Kotlin,,Docker,\n")).toEqual(["Kotlin", "Docker"]);
    });

    it("returns an empty array for whitespace/separators only", () => {
        expect(parseTechNames("  ,\n; \t ")).toEqual([]);
    });

    it("de-duplicates within one input case-insensitively, keeping the FIRST spelling", () => {
        expect(parseTechNames("Kotlin, kotlin, KOTLIN")).toEqual(["Kotlin"]);
    });

    it("collapses inner whitespace in each name", () => {
        expect(parseTechNames("Jetpack   Compose")).toEqual(["Jetpack Compose"]);
    });
});

describe("splitNewNames", () => {
    const entries = (...names: string[]) => names.map((name) => ({ name }));

    it("separates names already present from genuinely new ones, preserving input order", () => {
        expect(splitNewNames(entries("Docker", "Kotlin", "Redis"), ["Kotlin"])).toEqual({
            fresh: entries("Docker", "Redis"),
            duplicates: ["Kotlin"],
        });
    });

    it("compares case-insensitively against the existing list", () => {
        expect(splitNewNames(entries("kotlin"), ["Kotlin"])).toEqual({ fresh: [], duplicates: ["kotlin"] });
    });

    it("treats a name repeated within the same batch as a duplicate of its own first occurrence", () => {
        expect(splitNewNames(entries("Redis", "redis"), [])).toEqual({ fresh: entries("Redis"), duplicates: ["redis"] });
    });

    it("keeps everything when the existing list is empty", () => {
        expect(splitNewNames(entries("Docker", "Kotlin"), [])).toEqual({ fresh: entries("Docker", "Kotlin"), duplicates: [] });
    });

    it("carries each entry's payload through, not just its name — an icon choice must survive the filter", () => {
        const picked = [
            { name: "Docker", icon: "brand:docker" },
            { name: "Kotlin", icon: "auto" },
        ];
        expect(splitNewNames(picked, ["Kotlin"]).fresh).toEqual([{ name: "Docker", icon: "brand:docker" }]);
    });
});

describe("describeAddResult", () => {
    it("says nothing when every name was added", () => {
        expect(describeAddResult(3, [])).toBeNull();
    });

    it("says nothing when there was nothing to add at all", () => {
        expect(describeAddResult(0, [])).toBeNull();
    });

    it("explains a single skipped name on its own, with no 'Added' prefix", () => {
        expect(describeAddResult(0, ["Docker"])).toBe("Docker is already in the list.");
    });

    it("uses plural agreement for several skipped names", () => {
        expect(describeAddResult(0, ["Docker", "Redis"])).toBe("Docker, Redis are already in the list.");
    });

    it("reports the added count alongside the skipped names when both happened", () => {
        expect(describeAddResult(2, ["Docker"])).toBe("Added 2. Docker is already in the list.");
    });

    it("lists at most three skipped names and counts the rest", () => {
        expect(describeAddResult(0, ["A", "B", "C", "D", "E"])).toBe("A, B, C and 2 more are already in the list.");
    });

    it("still lists all three when there are exactly three — the cap is not an off-by-one", () => {
        expect(describeAddResult(0, ["A", "B", "C"])).toBe("A, B, C are already in the list.");
    });
});
