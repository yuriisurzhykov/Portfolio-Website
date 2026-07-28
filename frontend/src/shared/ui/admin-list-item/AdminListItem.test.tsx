import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminListItem } from "./AdminListItem";

function renderItem(overrides: Partial<Parameters<typeof AdminListItem>[0]> = {}) {
    return render(
        <AdminListItem
            badges={<span>Published</span>}
            meta="Feb 11, 2026"
            title="A Test Post"
            slug="a-test-post"
            editHref="/admin/journal/a-test-post/edit"
            onDelete={vi.fn()}
            {...overrides}
        />,
    );
}

describe("AdminListItem", () => {
    it("renders the title, slug, badges, and meta", () => {
        renderItem();
        expect(screen.getByText("A Test Post")).toBeInTheDocument();
        expect(screen.getByText("a-test-post")).toBeInTheDocument();
        expect(screen.getByText("Published")).toBeInTheDocument();
        expect(screen.getByText("Feb 11, 2026")).toBeInTheDocument();
    });

    it("omits the slug row entirely when slug is not provided", () => {
        renderItem({ slug: undefined });
        expect(screen.queryByText("a-test-post")).not.toBeInTheDocument();
    });

    it("the Edit control is a real link to editHref, labeled for assistive tech even though the visible text only appears on hover", () => {
        renderItem();
        const editLink = screen.getByRole("link", { name: "Edit" });
        expect(editLink).toHaveAttribute("href", "/admin/journal/a-test-post/edit");
    });

    it("clicking Delete calls onDelete", async () => {
        const user = userEvent.setup();
        const onDelete = vi.fn();
        renderItem({ onDelete });

        await user.click(screen.getByRole("button", { name: "Delete" }));

        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("disables the Delete control while deleting", () => {
        renderItem({ deleting: true });
        expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    });
});
