import React from "react";
import { Button } from "@/shared/ui/Button";
import { Text } from "@/shared/ui/Text";
import { Heading } from "@/shared/ui/Heading";
import { Section } from "@/shared/ui/Section";
import { Surface } from "@/shared/ui/Surface";
import { CodeBlock, type CodeBlockLabels } from "@/shared/ui/CodeBlock";
import { useTranslation } from "@/shared/i18n";
import { ThemeToggle } from "@/feature/theme-toggle";

export function ExampleCodeBlock() {
    const { ln } = useTranslation();
    const labels: CodeBlockLabels = {
        copyButton: ln("label.button.copy"),
        copiedButton: ln("label.button.copied"),
        liveRegionCopied: ln("ui.codeBlock.liveRegion.copied"),
    };

    return (
        <CodeBlock
            title="fp/utils.ts"
            language="ts"
            highlightEnabled
            showLineNumbers
            variant="default"
            labels={labels}
        >
            {`const pluckDeep = key => obj => key.split('.').reduce((accum, key) => accum[key], obj)
const compose = (...fns) => res => fns.reduce((accum, next) => next(accum), res)

const unfold = (f, seed) => {
  const go = (f, seed, acc) => {
    const res = f(seed)
    return res ? go(f, res[1], acc.concat([res[0]])) : acc
  }
  return go(f, seed, [])
}`}
        </CodeBlock>
    );
}

export function Storybook() {
    const { ln, setLanguage } = useTranslation();
    return (
        <main className="min-h-screen bg-color-bg-app text-text">
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
                    <div className="mt-lg flex gap-sm size">
                        <Button>Enter system</Button>
                        <Button variant="secondary">View projects</Button>
                        <Button variant="ghost" size="sm">Docs</Button>
                    </div>
                </Surface>
                <Surface className="p-xl flex flex-col gap-md mt-4">
                    <Heading level={5}>{ln("label.system.language.toggle")}</Heading>
                    <Button variant="secondary"
                            onClick={() => setLanguage("en")}>{ln("label.system.language.english")}</Button>
                    <Button variant="primary"
                            onClick={() => setLanguage("ru")}>{ln("label.system.language.russian")}</Button>
                    <div className="mt-sm" />
                </Surface>
                <ThemeToggle />
                <Surface className="p-xl gap-md mt-lg">
                    <Text variant="mono">
                        suspend fun something(status: (Boolean) -&gt; Unit) = status.invoke(true)
                    </Text>
                    <Text tone="aurora" variant="hero">Let's talk about you!</Text>
                </Surface>
                <ExampleCodeBlock></ExampleCodeBlock>
            </Section>
        </main>
    );
}
