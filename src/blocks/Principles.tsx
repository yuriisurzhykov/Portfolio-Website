import * as React from "react";
import {Section} from "../design-system/components/composite/Section";
import {Text} from "../design-system/components/primitives/Text";

const PRINCIPLES = [
    "Every layer deserves clarity.",
    "Performance is design.",
    "APIs are UX for developers.",
    "Measure, then optimize.",
];

export function Principles() {
    return (
        <Section id="principles" title="Principles" subtitle="What guides my engineering decisions">
            <ul className="grid gap-[--space-md] md:grid-cols-2">
                {PRINCIPLES.map((p) => (
                    <li key={p}
                        className="border border-[--color-border] rounded-[--radius-lg] p-[--space-lg] bg-[--color-elevated]">
                        <Text as="p" variant="body">{p}</Text>
                    </li>
                ))}
            </ul>
        </Section>
    );
}