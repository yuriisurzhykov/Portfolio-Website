import React from "react";
import { Button } from "@/shared/ui/button";
import { Text } from "@/shared/ui/text";
import { Section } from "@/shared/ui/section";
import { Surface } from "@/shared/ui/surface";
import { CodeBlock, type CodeBlockLabels } from "@/shared/ui/code-block";
import { useTranslation } from "@/shared/i18n";
import { ThemeToggle } from "@/feature/theme-toggle";
import { SkillCard } from "@/shared/ui/SkillCard";
import { Cpu, Smartphone } from "lucide-react";
import { DesignSystemPlayground } from "@/feature/design-system/DesignSystemPlayground.tsx";

export function ExampleCodeBlock() {
    const {ln} = useTranslation();
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
            labels={ labels }
        >
            { `const pluckDeep = key => obj => key.split('.').reduce((accum, key) => accum[key], obj)
const compose = (...fns) => res => fns.reduce((accum, next) => next(accum), res)

const unfold = (f, seed) => {
  const go = (f, seed, acc) => {
    const res = f(seed)
    return res ? go(f, res[1], acc.concat([res[0]])) : acc
  }
  return go(f, seed, [])
}` }
        </CodeBlock>
    );
}

export function SkillsSection() {
    return (
        <section className="py-24 relative">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <SkillCard
                        icon={ Cpu }
                        title="Event-driven architectures"
                        desc="Designing robust systems with FlowBus, state machines and composable domain boundaries."
                        variant="accent"
                        tone="success"
                    />
                    <SkillCard
                        icon={ Smartphone }
                        title="Mobile Design"
                        desc="Designing robust mobile application with Jetpack Compose."
                        variant="accent"
                        tone="default"
                    />
                </div>
            </div>
        </section>
    );
}

export function Storybook() {
    const {ln, setLanguage} = useTranslation();
    return (
        <main className="min-h-screen bg-bg-app text-text-primary">
            <Section
                eyebrow="Portfolio shell"
                title="Design system playground"
                subtitle="Tailwind + tokens.ts + design-system components"
            >
                <Surface className="p-xl flex flex-col gap-md">
                    <Text variant="h3">Welcome screen</Text>
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
                    <Text variant="h3">{ ln("label.system.language.toggle") }</Text>
                    <Button variant="secondary"
                            onClick={ () => setLanguage("en") }>{ ln("label.system.language.english") }</Button>
                    <Button variant="primary"
                            onClick={ () => setLanguage("ru") }>{ ln("label.system.language.russian") }</Button>
                    <div className="mt-sm"/>
                </Surface>
                <ThemeToggle/>
                <Surface className="p-xl gap-md mt-lg">
                    <Text variant="mono">
                        suspend fun something(status: (Boolean) -&gt; Unit) = status.invoke(true)
                    </Text>
                    <Text tone="aurora" variant="hero">Let's talk about you!</Text>
                </Surface>
                <ExampleCodeBlock></ExampleCodeBlock>
            </Section>
            <SkillsSection/>
            <DesignSystemPlayground/>
        </main>
    );
}
