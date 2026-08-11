"use client";

import * as React from "react";
import { ArrowRight, Code2, Database, Palette } from "lucide-react";
import type { Block } from "@portfolio/backend";

import { Card } from "@/shared/ui/card";
import { IconBadge } from "@/shared/ui/icon-badge";
import { Tag } from "@/shared/ui/tag";
import { TechIcon } from "@/shared/ui/tech-icon";
import type { TechIconView } from "@/shared/lib/tech-icons";
import { Tooltip } from "@/shared/ui/tooltip";
import { ProgressBar } from "@/shared/ui/progress";

import { Text } from "@/shared/ui/text";
import { Surface } from "@/shared/ui/surface";
import { Button } from "@/shared/ui/button";
import { ThemeToggle } from "@/feature/theme-toggle";
import { CodeBlock, type CodeBlockLabels } from "@/shared/ui/code-block";
import { Eyebrow } from "@/shared/ui/eyebrow";
import { StatusBadge } from "@/shared/ui/status-badge";
import { PlaceholderCover } from "@/shared/ui/placeholder-cover";
import { CoverImage } from "@/shared/ui/cover-image";
import { Markdown } from "@/shared/ui/markdown";
import { Diagram } from "@/shared/ui/diagram";
import { ContentBlocks } from "@/shared/ui/content-blocks";
import { useTranslation } from "@/shared/i18n";

/**
 * Fixed, literal Block[] just for this demo — mirrors the shape `getPostBySlug`/`getWorkBySlug`
 * hand `<ContentBlocks>` on a real page, but with no database involved. Covers every block type
 * whose markup isn't already exercised by another section on this page (lead/heading/paragraph
 * reuse `<Text>`+`<Markdown>`, already covered by their own sections) — quote's blockquote style,
 * note's tinted variants, code's `<CodeBlock>` wiring, approachList's grid, and diagram's mermaid
 * engine are each otherwise untested in isolation. `image` is skipped: it would need a real static
 * asset just to exist, for zero additional markup coverage beyond a plain `<img>`.
 */
/**
 * Fixed, literal Simple Icons path data for the TechIcon/Tooltip demo
 * sections below — `TechIcon` never resolves an icon itself (see its own
 * comment), so a real, deterministic `TechIconView` has to be constructed
 * by hand here rather than fetched through `resolveTechIcon`
 * (`shared/lib/tech-icons`, server-only — importing it from this
 * `"use client"` playground would pull the whole `simple-icons` catalog
 * into the browser bundle for zero benefit). The `d` strings are copied
 * verbatim from the installed package (kotlin/react), not invented — they
 * render as the real logos, just without going through the resolver.
 */
const TECH_ICON_DEMO_KOTLIN: TechIconView = {
    kind: "path",
    title: "Kotlin",
    d: "M24 24H0V0h24L12 12Z",
};
const TECH_ICON_DEMO_REACT: TechIconView = {
    kind: "path",
    title: "React",
    d: "M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z",
};

/** A deliberately simple, deterministic custom SVG for the `kind: "svg"` demo below — uses `fill="currentColor"` so it also demonstrates that a well-authored pasted SVG CAN pick up the accent hover color, unlike an arbitrary `kind: "url"` image. */
const TECH_ICON_DEMO_SVG_MARKUP = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>';

const CONTENT_BLOCKS_DEMO: Block[] = [
    {
        id: "demo-quote",
        order: 0,
        type: "quote",
        text: "Great UI is invisible until it breaks — then it's the only thing anyone notices.",
        data: { attribution: "Design system playground" },
    },
    {
        id: "demo-note",
        order: 1,
        type: "note",
        text: "Notes reuse `noteVariantClasses` from `ContentBlocks.tsx` — the exact same mapping the block editor's live preview uses, so authoring and publishing never drift.",
        data: { variant: "tip" },
    },
    {
        id: "demo-code",
        order: 2,
        type: "code",
        data: { filename: "example.ts", language: "ts", code: "export const answer = 42;" },
    },
    {
        id: "demo-approach-list",
        order: 3,
        type: "approachList",
        data: {
            items: [
                { title: "Discover", description: "Understand the real constraint before writing code." },
                { title: "Ship", description: "A small, verifiable slice beats a big, unverified one." },
            ],
        },
    },
    {
        id: "demo-diagram",
        order: 4,
        type: "diagram",
        text: "Rendered client-side by Mermaid — no external service involved.",
        data: { engine: "mermaid", source: "graph LR\n  A[Request] --> B[Service]\n  B --> C[(Database)]" },
    },
];

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
            <section className="space-y-md" data-component-id="text">
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
            <section className="space-y-md" data-component-id="surface">
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
            <section className="space-y-md" data-component-id="card">
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
            <section className="space-y-md" data-component-id="icon-badge">
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
            <section className="space-y-md" data-component-id="tag">
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

            {/* SECTION: TECHICON */}
            <section className="space-y-md" data-component-id="tech-icon">
                <Text as="h2" variant="h2" className="font-semibold">
                    TechIcon
                </Text>
                <Text variant="body" tone="secondary">
                    Рендерер уже резолвленного логотипа (`kind: &quot;path&quot;`/&quot;url&quot;/&quot;none&quot;) —
                    сам компонент никогда не резолвит иконку, поэтому здесь используются фиксированные
                    литералы path-данных, а не живой поиск по simple-icons.
                </Text>

                <div className="space-y-sm">
                    <Text variant="micro" tone="muted">
                        kind: &quot;path&quot; (fill=currentColor, наследует text-цвет родителя)
                    </Text>
                    <div className="flex flex-wrap gap-lg items-center">
                        {/* Size lives on this wrapper, not on TechIcon's own className — see TechIcon.tsx's top comment for why (cn() doesn't merge conflicting Tailwind utilities). */}
                        <span className="block w-8 h-8">
                            <TechIcon icon={TECH_ICON_DEMO_KOTLIN} className="text-text-primary" />
                        </span>
                        <span className="block w-8 h-8">
                            <TechIcon icon={TECH_ICON_DEMO_REACT} className="text-accent-solid" />
                        </span>
                    </div>
                </div>

                <div className="space-y-sm">
                    <Text variant="micro" tone="muted">
                        kind: &quot;url&quot;
                    </Text>
                    <span className="block w-8 h-8">
                        <TechIcon icon={{ kind: "url", src: "/favicon/favicon.svg" }} />
                    </span>
                </div>

                <div className="space-y-sm">
                    <Text variant="micro" tone="muted">
                        kind: &quot;svg&quot; (raw, admin-pasted markup — sanitized client-side after mount)
                    </Text>
                    <span className="block w-8 h-8">
                        <TechIcon icon={{ kind: "svg", markup: TECH_ICON_DEMO_SVG_MARKUP }} className="text-accent-solid" />
                    </span>
                </div>
            </section>

            {/* SECTION: TOOLTIP */}
            <section className="space-y-md" data-component-id="tooltip">
                <Text as="h2" variant="h2" className="font-semibold">
                    Tooltip
                </Text>
                <Text variant="body" tone="secondary">
                    CSS-only подсказка при hover/focus — без библиотеки позиционирования. Пузырёк
                    декоративный (`aria-hidden`), доступное имя несёт сам триггер (`aria-label`).
                </Text>

                <Surface className="p-lg pt-16">
                    <div className="flex flex-wrap gap-lg items-center">
                        <Tooltip label="Kotlin">
                            <span
                                role="img"
                                aria-label="Kotlin"
                                className="block w-7 h-7 rounded-sm text-text-muted transition-colors duration-fast hover:text-accent-solid active:text-accent-solid-hover active:scale-press"
                            >
                                <TechIcon icon={TECH_ICON_DEMO_KOTLIN} />
                            </span>
                        </Tooltip>
                    </div>
                </Surface>
            </section>

            {/* SECTION: BUTTON */}
            <section className="space-y-md" data-component-id="button">
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
            <section className="space-y-md" data-component-id="progress">
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

            {/* SECTION: EYEBROW */}
            <section className="space-y-md" data-component-id="eyebrow">
                <Text as="h2" variant="h2" className="font-semibold">
                    Eyebrow
                </Text>
                <Text variant="body" tone="secondary">
                    Маленькая uppercase-метка над заголовками секций/страниц.
                </Text>

                <Surface className="p-lg flex flex-col gap-sm">
                    <Eyebrow tone="accent">Case study</Eyebrow>
                    <Eyebrow tone="muted">Selected work</Eyebrow>
                </Surface>
            </section>

            {/* SECTION: STATUSBADGE */}
            <section className="space-y-md" data-component-id="status-badge">
                <Text as="h2" variant="h2" className="font-semibold">
                    StatusBadge
                </Text>
                <Text variant="body" tone="secondary">
                    Пилюля для статуса проекта, индикатора доступности и категорий журнала.
                </Text>

                <Surface className="p-lg flex flex-wrap gap-sm items-center">
                    <StatusBadge tone="success">Shipped</StatusBadge>
                    <StatusBadge tone="warning">In progress</StatusBadge>
                    <StatusBadge tone="accent" withDot>Available</StatusBadge>
                    <StatusBadge tone="neutral">Archived</StatusBadge>
                </Surface>
            </section>

            {/* SECTION: PLACEHOLDERCOVER */}
            <section className="space-y-md" data-component-id="placeholder-cover">
                <Text as="h2" variant="h2" className="font-semibold">
                    PlaceholderCover
                </Text>
                <Text variant="body" tone="secondary">
                    Акцентный mesh-градиент вместо обложки, когда у work-item ещё нет изображения.
                </Text>

                <PlaceholderCover
                    label="No cover yet"
                    className="h-40 w-full max-w-sm rounded-lg border border-border-subtle"
                />
            </section>

            {/* SECTION: COVERIMAGE */}
            <section className="space-y-md" data-component-id="cover-image">
                <Text as="h2" variant="h2" className="font-semibold">
                    CoverImage
                </Text>
                <Text variant="body" tone="secondary">
                    Procedurally generated post cover: blur-up from an inline placeholder, explicit
                    width/height, a two-width srcset, alt=&quot;&quot; (decorative). A fixed, checked-in
                    sample asset — see <code>public/demo/</code> — so this demo never depends on a real
                    generated cover existing.
                </Text>
                <CoverImage
                    src="/demo/cover-sample-1200.webp"
                    srcNarrow="/demo/cover-sample-640.webp"
                    placeholder="data:image/webp;base64,UklGRqoAAABXRUJQVlA4WAoAAAAQAAAAFwAADAAAQUxQSDwAAAABfyAmTfqHlp1WiIiUAZoGQEIFaMBowIyAEZgJNAMNzOKMYgWNYAUjeEf0P6Nkr32ss++DL8xobpaEkBVWUDggSAAAAHADAJ0BKhgADQA+7WSpTamlpCIwCAEwHYliALsAHjbGOAWHAAD+gxbiBMjCM/UubyO360y5EatexlBmsgA3EYn1TD1H+AAAAA=="
                    width={1200}
                    height={630}
                    className="w-full max-w-lg rounded-lg border border-border-subtle"
                />
            </section>

            {/* SECTION: MARKDOWN */}
            <section className="space-y-md" data-component-id="markdown">
                <Text as="h2" variant="h2" className="font-semibold">
                    Markdown
                </Text>
                <Text variant="body" tone="secondary">
                    Инлайновый markdown (bold/italic/links) для текста блоков. Literal HTML
                    (например, &lt;script&gt;) рендерится как безопасный текст, а не как разметка.
                </Text>

                <Surface className="p-lg">
                    <Text variant="body">
                        <Markdown text="**Bold**, _italic_, a [link](https://example.com), and a literal <script>alert(1)</script> tag rendered as plain, harmless text." />
                    </Text>
                </Surface>
            </section>

            {/* SECTION: DIAGRAM */}
            <section className="space-y-md" data-component-id="diagram">
                <Text as="h2" variant="h2" className="font-semibold">
                    Diagram
                </Text>
                <Text variant="body" tone="secondary">
                    Mermaid-движок рендерится полностью на клиенте. PlantUML здесь не показан —
                    он зависит от отдельного self-hosted plantuml-server, который Playwright не
                    поднимает (см. frontend/tests/README.md, section 4).
                </Text>

                <Surface className="p-lg">
                    <Diagram engine="mermaid" source={"graph LR\n  A[Request] --> B[Service]\n  B --> C[(Database)]"} />
                </Surface>
            </section>

            {/* SECTION: CONTENTBLOCKS */}
            <section className="space-y-md" data-component-id="content-blocks">
                <Text as="h2" variant="h2" className="font-semibold">
                    ContentBlocks
                </Text>
                <Text variant="body" tone="secondary">
                    Рендерер тела поста/case study: quote, note, code, approachList и diagram
                    блоки в одном демонстрационном наборе.
                </Text>

                <Surface className="p-lg">
                    <ContentBlocks blocks={CONTENT_BLOCKS_DEMO} />
                </Surface>
            </section>

            {/*SECTION: Theme Toggle*/}
            <section className="space-y-md">
                <Text as="h2" variant="h2" tone="primary">
                    Theme toggle
                </Text>
                <ThemeToggle />
            </section>

            <section className="space-y-md" data-component-id="code-block">
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
