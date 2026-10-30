"use client";
import { SingleValueCombobox } from "@/shared/ui/single-value-combobox";
import type { RelatedItemPickerProps } from "./RelatedItemPicker.types";

/** Relationships share selection mechanics, but remain closed to arbitrary text. */
export function RelatedItemPicker({ options, ...props }: RelatedItemPickerProps) {
    return <SingleValueCombobox {...props} options={options.map(item => ({ value: item.slug, label: item.label }))} />;
}
