import * as React from "react";
import {Container} from "../design-system/components/primitives/Container";
import {Text} from "../design-system/components/primitives/Text";
import {Button} from "../design-system/components/primitives/Button";
import {Icons} from "../design-system/icons";
import {site} from "../lib/config";

export function Hero() {
    return (
        <header className="py-[--space-3xl]">
            <Container>
                <Text as="h1" variant="display" className="mb-[--space-md]">
                    {site.tagline}
                </Text>
                <Text as="p" variant="lead" className="text-[--color-muted] mb-[--space-xl] max-w-2xl">
                    Architecture. Performance. Precision.
                </Text>
                <div className="flex gap-[--space-md] items-center">
                    <a href={site.links.github} aria-label="GitHub" className="inline-flex items-center gap-2">
                        <Icons.github className="w-6 h-6"/>
                    </a>
                    <a href={site.links.linkedin} aria-label="LinkedIn" className="inline-flex items-center gap-2">
                        <Icons.linkedin className="w-6 h-6"/>
                    </a>
                    <a href={site.links.email} aria-label="Email" className="inline-flex items-center gap-2">
                        <Icons.mail className="w-6 h-6"/>
                    </a>
                    <Button>Download Resume</Button>
                </div>
            </Container>
        </header>
    );
}