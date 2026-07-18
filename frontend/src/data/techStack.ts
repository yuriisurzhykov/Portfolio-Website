import type { Localized } from "@/shared/i18n";

/**
 * LANDING PAGE — "STACK" ROW
 * ---------------------------
 * Order = display order. `note` shows as a tooltip (title attribute) and is
 * localized; `name` is a proper noun and stays the same in every language.
 */
export interface TechStackItem {
    name: string;
    note: Localized<string>;
}

export const techStack: TechStackItem[] = [
    {
        name: "Kotlin",
        note: {en: "Primary language for over 6 years", ru: "Основной язык последние 6+ лет"},
    },
    {
        name: "Coroutines & Flow",
        note: {
            en: "Structured concurrency across the whole app",
            ru: "Структурированная конкурентность во всём приложении",
        },
    },
    {
        name: "Jetpack Compose",
        note: {en: "Declarative UI layer", ru: "Декларативный UI-слой"},
    },
    {
        name: "Navigation",
        note: {
            en: "Custom routing & rendering, in place of the standard Navigation Component",
            ru: "Кастомный роутинг и рендеринг вместо стандартного Navigation Component",
        },
    },
    {
        name: "Android Open Source",
        note: {en: "AOSP customization for an OEM device", ru: "Кастомизация AOSP для OEM-устройства"},
    },
    {
        name: "Dagger2",
        note: {en: "Dependency injection", ru: "Внедрение зависимостей"},
    },
    {
        name: "Camera2",
        note: {en: "Camera pipeline & capture", ru: "Камера-пайплайн и захват кадров"},
    },
    {
        name: "JUnit",
        note: {en: "Unit & integration testing", ru: "Unit- и интеграционное тестирование"},
    },
    {
        name: "Java",
        note: {en: "Legacy screens & JNI interop", ru: "Legacy-экраны и интеграция с JNI"},
    },
    {
        name: "JNI & C++",
        note: {en: "Native interop for platform-level code", ru: "Native-прослойка для платформенного кода"},
    },
    {
        name: "Gradle Plugin Development",
        note: {
            en: "3+ custom plugins automating the build & release routine",
            ru: "3+ кастомных плагина, автоматизирующих сборку и релиз",
        },
    },
    {
        name: "KSP",
        note: {en: "Annotation-driven code generation", ru: "Кодогенерация на основе аннотаций"},
    },
    {
        name: "Python & Jinja2",
        note: {
            en: "Built a compiler that turns AsyncAPI specs into Kotlin",
            ru: "Написал компилятор, превращающий AsyncAPI-спеки в Kotlin-код",
        },
    },
    {
        name: "MQTT & HiveMQ",
        note: {
            en: "Generated broker client for embedded messaging",
            ru: "Генерируемый broker-клиент для embedded-мессенджинга",
        },
    },
];
