import * as React from "react";
import {Text} from "../Text.tsx";
import {Surface} from "../Surface.tsx";

export function Footer() {
    return (
        <footer className="py-[--space-2xl] border-t border-[--color-border]">
            <Surface>
                <Text as="p" variant="muted">Crafted with React & Tailwind. © {new Date().getFullYear()}</Text>
            </Surface>
        </footer>
    );
}