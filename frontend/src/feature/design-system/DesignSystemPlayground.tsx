import * as React from "react";
import { ArrowRight, Code2, Database, Palette } from "lucide-react";

import { Card } from "@/shared/ui/card";
import { IconBadge } from "@/shared/ui/icon-badge";
import { Tag } from "@/shared/ui/tag";
import { ProgressBar } from "@/shared/ui/progress";

import { Text } from "@/shared/ui/text";
import { Surface } from "@/shared/ui/surface";
import { Button } from "@/shared/ui/button";
import { ThemeToggle } from "@/feature/theme-toggle";
import { CodeBlock, type CodeBlockLabels } from "@/shared/ui/code-block";
import { useTranslation } from "@/shared/i18n";

export function DesignSystemPlayground() {
    const { ln } = useTranslation();
    const labels: CodeBlockLabels = {
        copyButton: ln("label.button.copy"),
        copiedButton: ln("label.button.copied"),
        liveRegionCopied: ln("ui.codeBlock.liveRegion.copied"),
    };
    return (
        <div className="min-h-screen bg-bg-app text-text-primary p-lg md:p-xl space-y-2xl">
            {/* HEADER */}
            <header className="space-y-sm">
                <Text as="h1" variant="display" tone="primary" className="font-semibold">
                    Design System Playground
                </Text>
                <Text variant="body" tone="secondary" className="max-w-prose">
                    Живой просмотр базовых компонентов дизайн-системы. Используй этот экран
                    как внутреннюю витрину, чтобы проверять, как изменения токенов влияют на UI.
                </Text>
            </header>

            {/* SECTION: TEXT */}
            <section className="space-y-md">
                <Text as="h2" variant="h2" className="font-semibold">
                    Text
                </Text>
                <Text variant="body" tone="secondary">
                    Типографика по токенам: варианты, тона, выравнивание и усечение текста.
                </Text>

                {/* Варианты шрифтов */}
                <Surface className="p-lg space-y-xs">
                    <Text variant="micro" tone="muted">
                        Variants
                    </Text>

                    <div className="space-y-xs">
                        <Text variant="hero">Hero — Yurii Surzhykov</Text>
                        <Text variant="display">
                            Display — Yurii Surzhykov — Software Engineer
                        </Text>
                        <Text variant="h1">H1 — System architecture & event-driven design</Text>
                        <Text variant="h2">H2 — Feature modules & active objects</Text>
                        <Text variant="h3">H3 — Navigation, flows, user journeys</Text>
                        <Text variant="h4">H4 — Section heading</Text>
                        <Text variant="h5">H5 — Subsection title</Text>
                        <Text variant="body-lg">
                            Body-lg — slightly larger text for emphasis or summaries.
                        </Text>
                        <Text variant="body">
                            Body — основной текстовый стиль для описаний и пояснений.
                        </Text>
                        <Text variant="caption">Caption — подписи, комментарии, подписи к UI.</Text>
                        <Text variant="micro">Micro — метки, статусы, надписи в таблицах.</Text>
                        <Text variant="mono">
                            const flow = createFlowBus() // Mono — код и inline фрагменты
                        </Text>
                    </div>
                </Surface>

                {/* Тона */}
                <Surface className="p-lg space-y-sm">
                    <Text variant="micro" tone="muted">
                        Tones
                    </Text>

                    <div className="flex flex-wrap gap-md items-baseline">
                        <Text variant="body" tone="primary">
                            primary
                        </Text>
                        <Text variant="body" tone="secondary">
                            secondary
                        </Text>
                        <Text variant="body" tone="muted">
                            muted
                        </Text>
                        <Surface className="p-sm bg-surface-inverse">
                            <Text variant="body" tone="inverse">
                                inverse (на инверсной поверхности)
                            </Text>
                        </Surface>
                        <Text variant="body-lg" tone="aurora">
                            aurora — brand gradient text
                        </Text>
                    </div>
                </Surface>

                {/* Выравнивание и truncate */}
                <Surface className="p-lg space-y-md">
                    <Text variant="micro" tone="muted">
                        Alignment & truncate
                    </Text>

                    <div className="grid gap-md md:grid-cols-3">
                        <div className="space-y-xs">
                            <Text variant="caption" tone="muted">
                                align="left"
                            </Text>
                            <Text variant="body-lg" align="left">
                                Left-aligned text. Good for long-form technical explanations.
                            </Text>
                        </div>

                        <div className="space-y-xs">
                            <Text variant="caption" tone="muted">
                                align="center"
                            </Text>
                            <Text variant="body-lg" align="center">
                                Centered text. Often used in hero sections and summaries.
                            </Text>
                        </div>

                        <div className="space-y-xs">
                            <Text variant="caption" tone="muted">
                                align="right"
                            </Text>
                            <Text variant="body-lg" align="right">
                                Right-aligned text. Редко, но иногда полезно для акцентов.
                            </Text>
                        </div>
                    </div>

                    <div className="space-y-xs">
                        <Text variant="caption" tone="muted">
                            truncate / noWrap
                        </Text>
                        <div className="max-w-full md:max-w-xl">
                            <Text variant="body" truncate noWrap>
                                Это очень длинный текст, который демонстрирует работу truncate. Если
                                места мало, он будет аккуратно обрезан с многоточием, не ломая
                                компоновку карточки или таблицы.
                            </Text>
                        </div>
                    </div>
                </Surface>
            </section>

            {/* SECTION: SURFACE */}
            <section className="space-y-md">
                <Text as="h2" variant="h2" className="font-semibold">
                    Surface
                </Text>
                <Text variant="body" tone="secondary">
                    Базовый контейнер для блоков, использующий surface- и border-токены, плюс
                    контролируемая высота тени.
                </Text>

                <div className="grid gap-lg md:grid-cols-2">
                    <Surface className="p-lg space-y-xs">
                        <Text variant="body" className="font-semibold">
                            elevated = true (по умолчанию)
                        </Text>
                        <Text variant="body" tone="secondary">
                            Карточка с мягкой тенью для выделения важного блока на фоне.
                        </Text>
                    </Surface>

                    <Surface elevated={false} className="p-lg space-y-xs">
                        <Text variant="body" className="font-semibold">
                            elevated = false
                        </Text>
                        <Text variant="body" tone="secondary">
                            Плоская поверхность без тени — хорошо для вложенных блоков и
                            low-emphasis контента.
                        </Text>
                    </Surface>
                </div>
            </section>

            {/* SECTION: CARD */}
            <section className="space-y-md">
                <Text as="h2" variant="h2" className="font-semibold">
                    Card
                </Text>
                <Text variant="body" tone="secondary">
                    Базовый surface-компонент с вариантами и интерактивностью.
                </Text>

                <div className="grid gap-lg md:grid-cols-3">
                    <Card variant="filled" className="p-lg flex flex-col gap-xs">
                        <Text variant="body" className="font-medium">
                            variant=&quot;filled&quot;
                        </Text>
                        <Text variant="caption" tone="secondary">
                            Стандартный фон, мягкая граница.
                        </Text>
                    </Card>

                    <Card variant="outlined" className="p-lg flex flex-col gap-xs">
                        <Text variant="body" className="font-medium">
                            variant=&quot;outlined&quot;
                        </Text>
                        <Text variant="caption" tone="secondary">
                            Прозрачный фон, более выраженный бордер.
                        </Text>
                    </Card>

                    <Card
                        variant="subtle"
                        interactive
                        className="p-lg flex flex-col gap-xs"
                    >
                        <Text variant="body" className="font-medium">
                            variant=&quot;subtle&quot;, interactive
                        </Text>
                        <Text variant="caption" tone="secondary">
                            Наведи курсор: фон, бордер, тень и лёгкий scale по motion-токенам.
                        </Text>
                    </Card>
                </div>
            </section>

            {/* SECTION: ICONBADGE */}
            <section className="space-y-md">
                <Text as="h2" variant="h2" className="font-semibold">
                    IconBadge
                </Text>
                <Text variant="body" tone="secondary">
                    Компактный контейнер для иконок с разными размерами и семантическими тонами.
                </Text>

                <div className="space-y-md">
                    <div className="space-y-sm">
                        <Text variant="micro" tone="muted">
                            tone
                        </Text>
                        <div className="flex flex-wrap gap-md items-center">
                            <IconBadge icon={Code2} tone="default" />
                            <IconBadge icon={Code2} tone="accent" />
                            <IconBadge icon={Code2} tone="success" />
                            <IconBadge icon={Code2} tone="warning" />
                            <IconBadge icon={Code2} tone="error" />
                        </div>
                    </div>

                    <div className="space-y-sm">
                        <Text variant="micro" tone="muted">
                            size
                        </Text>
                        <div className="flex flex-wrap gap-md items-center">
                            <IconBadge icon={Palette} size="sm" tone="accent" />
                            <IconBadge icon={Palette} size="md" tone="accent" />
                            <IconBadge icon={Palette} size="lg" tone="accent" />
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION: TAG */}
            <section className="space-y-md">
                <Text as="h2" variant="h2" className="font-semibold">
                    Tag
                </Text>
                <Text variant="body" tone="secondary">
                    Бейджи для технологий и статусов. Варианты оформления и размеры.
                </Text>

                <div className="space-y-md">
                    <div className="space-y-sm">
                        <Text variant="micro" tone="muted">
                            variant
                        </Text>
                        <div className="flex flex-wrap gap-sm items-center">
                            <Tag variant="neutral">TypeScript</Tag>
                            <Tag variant="outline">Next.js</Tag>
                            <Tag variant="accent">PostgreSQL</Tag>
                        </div>
                    </div>

                    <div className="space-y-sm">
                        <Text variant="micro" tone="muted">
                            size
                        </Text>
                        <div className="flex flex-wrap gap-sm items-center">
                            <Tag size="sm" variant="neutral">
                                Small
                            </Tag>
                            <Tag size="md" variant="neutral">
                                Medium
                            </Tag>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION: BUTTON */}
            <section className="space-y-md">
                <Text as="h2" variant="h2" className="font-semibold">
                    Button
                </Text>
                <Text variant="body" tone="secondary">
                    Кнопка с вариантами, размерами, иконками, fullWidth и состоянием loading.
                </Text>

                <div className="space-y-md">
                    {/* Варианты */}
                    <Surface className="p-lg space-y-sm">
                        <Text variant="micro" tone="muted">
                            variant
                        </Text>
                        <div className="flex flex-wrap gap-sm">
                            <Button variant="primary">Primary</Button>
                            <Button variant="secondary">Secondary</Button>
                            <Button variant="ghost">Ghost</Button>
                        </div>
                    </Surface>

                    {/* Размеры + иконки */}
                    <Surface className="p-lg space-y-sm">
                        <Text variant="micro" tone="muted">
                            size + icons
                        </Text>
                        <div className="flex flex-wrap gap-sm items-center">
                            <Button size="sm" variant="secondary" iconLeft={<Code2 />}>
                                Small
                            </Button>
                            <Button size="md" variant="primary" iconRight={<ArrowRight />}>
                                Medium
                            </Button>
                            <Button
                                size="lg"
                                variant="ghost"
                                iconLeft={<Palette />}
                                iconRight={<ArrowRight />}
                            >
                                Large
                            </Button>
                        </div>
                    </Surface>

                    {/* Full width / loading / disabled */}
                    <Surface className="p-lg space-y-sm">
                        <Text variant="micro" tone="muted">
                            fullWidth / loading / disabled
                        </Text>

                        <div className="flex flex-col gap-sm max-w-full">
                            <Button fullWidth loading variant="primary" iconRight={<ArrowRight />}>
                                Loading state
                            </Button>
                            <Button fullWidth disabled variant="secondary">
                                Disabled
                            </Button>
                        </div>
                    </Surface>
                </div>
            </section>

            {/* SECTION: PROGRESSBAR */}
            <section className="space-y-md">
                <Text as="h2" variant="h2">
                    ProgressBar
                </Text>
                <Text variant="body" tone="secondary">
                    Лёгкий прогресс-бар, который будет использоваться в skill-карточках.
                </Text>

                <div className="grid gap-lg md:grid-cols-2">
                    {/* Accent вариант в контексте карточки */}
                    <Card variant="subtle" className="p-lg flex flex-col gap-md">
                        <div className="flex items-center gap-md">
                            <IconBadge icon={Database} tone="accent" />
                            <div className="flex flex-col">
                                <Text variant="body" className="font-semibold">
                                    accent, value=0.75
                                </Text>
                                <Text variant="caption" tone="secondary">
                                    Наведи курсор на карточку: анимация ширины ускорится.
                                </Text>
                            </div>
                        </div>

                        <div className="group mt-md">
                            <ProgressBar value={0.75} variant="accent" />
                            <div className="mt-xs flex justify-between">
                                <Text variant="caption" tone="muted">
                                    Beginner
                                </Text>
                                <Text variant="caption" tone="muted">
                                    Expert
                                </Text>
                            </div>
                        </div>

                        <div className="group mt-md">
                            <ProgressBar value={0.6} variant="accent-inverse" />
                            <div className="mt-xs flex justify-between">
                                <Text variant="caption" tone="muted">
                                    Beginner
                                </Text>
                                <Text variant="caption" tone="muted">
                                    Expert
                                </Text>
                            </div>
                        </div>
                    </Card>

                    {/* Несколько нейтральных значений */}
                    <Card variant="subtle" className="p-lg flex flex-col gap-sm">
                        <Text variant="body" className="font-semibold">
                            neutral, разные значения
                        </Text>
                        <div className="space-y-sm group mt-sm">
                            <ProgressBar value={0.25} variant="neutral" />
                            <ProgressBar value={0.5} variant="neutral" />
                            <ProgressBar value={0.9} variant="neutral" />
                        </div>
                    </Card>
                </div>
            </section>

            {/*SECTION: Theme Toggle*/}
            <section className="space-y-md">
                <Text as="h2" variant="h2" tone="primary">
                    Theme toggle
                </Text>
                <ThemeToggle />
            </section>

            <section className="space-y-md">
                <Text variant="h2" tone="primary">
                    Code Block examples
                </Text>

                <Surface className="p-lg space-y-sm">
                    <Text variant="micro" tone="muted">
                        Typescript language / Default variant
                    </Text>
                    <CodeBlock
                        title="fp/utils.ts"
                        language="ts"
                        highlightEnabled
                        showLineNumbers
                        variant="default"
                        labels={labels}
                        className="mt-sm mb-sm"
                    >
                        {
`const pluckDeep = key => obj => key.split('.').reduce((accum, key) => accum[key], obj)
const compose = (...fns) => res => fns.reduce((accum, next) => next(accum), res)

const unfold = (f, seed) => {
    const go = (f, seed, acc) => {
        const res = f(seed)
        return res ? go(f, res[1], acc.concat([res[0]])) : acc
    }
    return go(f, seed, [])
}`}
                    </CodeBlock>

                    <Text variant="micro" tone="muted">
                        JSX language / Compact variant
                    </Text>
                    <CodeBlock
                        title="fp/utils.ts"
                        language="jsx"
                        highlightEnabled
                        showLineNumbers
                        variant="compact"
                        labels={labels}
                        className="mt-sm mb-sm flex"
                    >
                        {
                            `const pluckDeep = key => obj => key.split('.').reduce((accum, key) => accum[key], obj)
const compose = (...fns) => res => fns.reduce((accum, next) => next(accum), res)

const unfold = (f, seed) => {
    const go = (f, seed, acc) => {
        const res = f(seed)
        return res ? go(f, res[1], acc.concat([res[0]])) : acc
    }
    return go(f, seed, [])
}`}
                    </CodeBlock>
                </Surface>
            </section>
        </div>
    );
}
