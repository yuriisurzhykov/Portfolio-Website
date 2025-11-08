import * as React from "react";
import {Container} from "../primitives/Container";
import {Text} from "../primitives/Text";

export type SectionProps = {
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
    id?: string;
};

export function Section({title, subtitle, children, id}: SectionProps) {
    return (
        <section id={id} className="py-[--space-3xl]">
            <Container>
                {title && <Text as="h2" variant="h1" className="mb-[--space-md]">{title}</Text>}
                {subtitle &&
                    <Text as="p" variant="lead" className="text-[--color-muted] mb-[--space-xl]">{subtitle}</Text>}
                {children}
            </Container>
        </section>
    );
}