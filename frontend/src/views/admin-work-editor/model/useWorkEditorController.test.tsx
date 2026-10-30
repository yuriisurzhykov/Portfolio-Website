import { act, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";
import { useWorkEditorController } from "./useWorkEditorController";

it("builds a card-only payload and includes a complete case-study package only when enabled", () => {
    const { result } = renderHook(() => useWorkEditorController());
    act(() => {
        result.current.update("title", "Runtime");
        result.current.update("summary", "Project summary");
        result.current.update("stack", [" Kotlin ", "C++"]);
        result.current.update("featured", true);
    });
    expect(result.current.buildInput()).toMatchObject({
        title: "Runtime",
        summary: "Project summary",
        stack: ["Kotlin", "C++"],
        featured: true,
        caseStudy: null,
        urlMode: "auto",
    });
    act(() => {
        result.current.update("hasCaseStudy", true);
        result.current.update("role", "Lead engineer");
        result.current.blockEditorRef.current = { getBlocks: () => [{ type: "paragraph", text: "Case study" }] };
    });
    expect(result.current.buildInput().caseStudy).toMatchObject({
        role: "Lead engineer",
        blocks: [{ type: "paragraph", text: "Case study" }],
    });
    expect(result.current.buildInput()).not.toHaveProperty("translation");
});
