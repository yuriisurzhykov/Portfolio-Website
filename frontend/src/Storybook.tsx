import React from "react";
import { useTranslation } from "./shared/i18n";
import { Button } from "@/shared/ui/Button";
import { Text } from "@/shared/ui/Text";
import { Heading } from "@/shared/ui/Heading";
import { Section } from "@/shared/ui/Section";
import { Surface } from "@/shared/ui/Surface";

export function Storybook() {
    const { ln, setLanguage } = useTranslation();
    return (
        <main className="min-h-screen bg-(--color-bg) text-(--color-text)">
            <Section
                eyebrow="Portfolio shell"
                title={ln("hero.title")}
                subtitle="Tailwind + tokens.ts + design-system components"
            >
                <Surface className="p-xl flex flex-col gap-md">
                    <Heading level={3}>Welcome screen</Heading>
                    <Text variant="body">
                        This block is fully styled via tokens → CSS variables → Tailwind →
                        components.
                    </Text>
                    <div className="mt-lg flex gap-sm">
                        <Button>Enter system</Button>
                        <Button variant="secondary">View projects</Button>
                        <Button variant="ghost">Docs</Button>
                    </div>
                </Surface>
                <Surface className="p-xl flex flex-col gap-md mt-4">
                    <Heading level={5}>{ln("label.language.toggle")}</Heading>
                    <Button variant="secondary"
                            onClick={() => setLanguage("en")}>{ln("label.language.english")}</Button>
                    <Button variant="primary" onClick={() => setLanguage("ru")}>{ln("label.language.russian")}</Button>
                </Surface>
            </Section>
        </main>
    );
}
