import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusToggle } from "./StatusToggle";

const options = [
    { value: "published" as const, label: "Published", tone: "success" as const },
    { value: "upcoming" as const, label: "Upcoming", tone: "warning" as const },
];

describe("StatusToggle", () => {
    it("marks the current value's option as checked, and no other", () => {
        render(<StatusToggle value="published" onChange={() => {}} options={options} />);

        expect(screen.getByRole("radio", { name: "Published" })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("radio", { name: "Upcoming" })).toHaveAttribute("aria-checked", "false");
    });

    it("calls onChange with the clicked option's value", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<StatusToggle value="published" onChange={onChange} options={options} />);

        await user.click(screen.getByRole("radio", { name: "Upcoming" }));

        expect(onChange).toHaveBeenCalledWith("upcoming");
    });
});
