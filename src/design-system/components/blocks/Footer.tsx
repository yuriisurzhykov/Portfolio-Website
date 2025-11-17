import * as React from "react";
import {Container} from "../primitives/Container.tsx";
import {Text} from "../primitives/Text.tsx";

export function Footer() {
    return (
        <footer className="py-[--space-2xl] border-t border-[--color-border]">
            <Container>
                <Text as="p" variant="muted">Crafted with React & Tailwind. © {new Date().getFullYear()}</Text>
            </Container>
        </footer>
    );
}