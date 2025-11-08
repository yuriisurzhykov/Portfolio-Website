import * as React from "react";
import {Container} from "../design-system/components/primitives/Container";
import {Text} from "../design-system/components/primitives/Text";

export function Footer() {
    return (
        <footer className="py-[--space-2xl] border-t border-[--color-border]">
            <Container>
                <Text as="p" variant="muted">Crafted with React & Tailwind. © {new Date().getFullYear()}</Text>
            </Container>
        </footer>
    );
}