import * as React from "react";
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Field } from "./Field";
import { Input } from "./Input";

it("associates a field error with its control", () => {
    render(<Field label="Title" htmlFor="title" error="Title is required"><Input id="title" /></Field>);
    const input = screen.getByRole("textbox", { name: "Title" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Title is required");
});
