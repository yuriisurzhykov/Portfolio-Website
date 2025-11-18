import React from "react";
import {Section} from "./design-system/components/Section.tsx";
import {Surface} from "./design-system/components/Surface.tsx";
import {Heading} from "./design-system/components/Heading.tsx";
import {Text} from "./design-system/components/Text.tsx";
import {Button} from "./design-system/components/Button.tsx";
import {useI18n} from "./i18n/ui/useI18n.tsx";

export function AppTest() {
    const {ln, setLocale} = useI18n();
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
                <Surface className="p-xl flex flex-col gap-md">
                    <Heading level={4}>{ln("label.language.toggle")}</Heading>
                    <Button variant="secondary" onClick={() => setLocale("en")}>{ln("label.language.english")}</Button>
                    <Button variant="primary" onClick={() => setLocale("ru")}>{ln("label.language.russian")}</Button>
                </Surface>
            </Section>
        </main>
    );
}
