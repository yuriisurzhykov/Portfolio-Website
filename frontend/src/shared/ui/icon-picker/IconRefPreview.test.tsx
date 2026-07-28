import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { IconRef } from "@portfolio/backend";
import { IconRefPreview } from "./IconRefPreview";

describe("IconRefPreview", () => {
    it("renders the neutral placeholder (no <svg>/<img>) for type: 'none'", () => {
        const { container } = render(<IconRefPreview icon={{ type: "none" }} />);

        expect(container.querySelector("svg")).toBeNull();
        expect(container.querySelector("img")).toBeNull();
    });

    it("renders the neutral placeholder when `icon` is undefined (legacy content predating this field)", () => {
        const { container } = render(<IconRefPreview icon={undefined} />);

        expect(container.querySelector("svg")).toBeNull();
        expect(container.querySelector("img")).toBeNull();
    });

    it("renders an <img> pointed at the configured URL for type: 'url'", () => {
        const icon: IconRef = { type: "url", value: "https://example.com/icon.svg" };
        const { container } = render(<IconRefPreview icon={icon} />);

        const img = container.querySelector("img");
        expect(img).not.toBeNull();
        expect(img).toHaveAttribute("src", "https://example.com/icon.svg");
    });

    it("falls back to the placeholder once the <img> fires onError (broken/unreachable URL)", async () => {
        const icon: IconRef = { type: "url", value: "https://example.com/broken.svg" };
        const { container } = render(<IconRefPreview icon={icon} />);

        const img = container.querySelector("img");
        expect(img).not.toBeNull();
        img?.dispatchEvent(new Event("error"));

        await waitFor(() => expect(container.querySelector("img")).toBeNull());
    });

    // This is the actual "does the vector-icon path really render, not just
    // structurally resolve" check — `DynamicIcon` loads the icon's module
    // via a real `import()` inside a `useEffect`, so the `<svg>` only shows
    // up once that promise settles, not on the first synchronous render.
    it("resolves a real, known Lucide icon name to an actual <svg> (type: 'icon')", async () => {
        const icon: IconRef = { type: "icon", value: "rocket" };
        const { container } = render(<IconRefPreview icon={icon} />);

        await waitFor(() => expect(container.querySelector("svg")).not.toBeNull());
        expect(container.querySelector("img")).toBeNull();
    });

    it("renders the placeholder (never hands the name to DynamicIcon) for an unrecognized icon name", async () => {
        const icon: IconRef = { type: "icon", value: "this-is-not-a-real-lucide-icon-name" };
        const { container } = render(<IconRefPreview icon={icon} />);

        // No `waitFor` needed here — an unrecognized name is filtered out
        // before `DynamicIcon` is even rendered, so there's no async
        // resolution to wait on; the assertion holds immediately.
        expect(container.querySelector("svg")).toBeNull();
        expect(container.querySelector("img")).toBeNull();
    });
});
