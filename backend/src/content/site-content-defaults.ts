import type { SiteContentDataMap } from "./site-content";

/**
 * The exact copy the site shipped with before Phase 5 — ported verbatim
 * from `frontend/src/data/*.ts`/`web/src/data/*.ts` (which `web/`'s
 * components stop importing once they're repointed to `getSiteContent()`).
 * Serves TWO roles from one definition (DRY, not duplicated between a
 * "seed data" file and a "fallback data" constant that could drift apart):
 *   1. `seed-site-content.ts` inserts these as the initial `SiteContent`
 *      rows — the admin then edits them in place, doesn't start from blank.
 *   2. `getSiteContent()` (`site-content.ts`) falls back to this object for
 *      any key that has no row yet.
 * Typed against `SiteContentDataMap`, not `as const`/inferred — this makes
 * a shape drift between this file and the Zod schemas in `site-content.ts`
 * (e.g. forgetting a required field on a new section) a compile error
 * here, instead of a runtime Zod failure only discovered when the row is
 * actually read.
 */
export const SITE_CONTENT_DEFAULTS: SiteContentDataMap = {
    hero: {
        headline: ["Yurii", "Surzhykov"],
        subhead: {
            en: "I design the systems other engineers build on top of — event-driven architecture, a custom navigation engine, code-generation tooling, and the camera pipeline underneath an OEM Android platform.",
            ru: "Я проектирую системы, на которые опираются остальные инженеры команды — event-driven архитектуру, кастомный движок навигации, инструменты кодогенерации и камера-пайплайн внутри Android-платформы для OEM-устройств.",
        },
        chips: {
            en: [
                "flowbus · shipped",
                "navigation-engine · shipped",
                "asyncapi-compiler · shipped",
                "onvif-camera-lib · in progress",
            ],
            ru: [
                "flowbus · готово",
                "navigation-engine · готово",
                "asyncapi-compiler · готово",
                "onvif-camera-lib · в работе",
            ],
        },
        graphNodes: [
            {
                label: "Client",
                sublabel: { en: "Android · OEM · AOSP", ru: "Android · OEM · AOSP" },
            },
            {
                label: "Navigation Engine",
                sublabel: { en: "route · rendering", ru: "маршрут · рендеринг" },
                highlighted: true,
            },
            {
                label: "FlowBus",
                sublabel: { en: "event bus · pub/sub · Kotlin", ru: "шина событий · pub/sub · Kotlin" },
            },
        ],
    },

    contact: {
        heading: {
            en: "Let's build something reliable.",
            ru: "Давайте построим что-то надёжное.",
        },
        description: {
            en: "Available for new engagements - embedded Android, systems architecture, or a second opinion on a hard problem.",
            ru: "Открыт для новых проектов — embedded Android, системная архитектура, или свежий взгляд на сложную проблему.",
        },
    },

    principles: [
        {
            title: { en: "Order over chaos", ru: "Порядок вместо хаоса" },
            description: {
                en: "I design the structure so nobody downstream has to think about it.",
                ru: "Я закладываю структуру так, чтобы никому ниже по цепочке не пришлось об этом думать.",
            },
            icon: { type: "icon", value: "layout-grid" },
        },
        {
            title: { en: "Simplify ruthlessly", ru: "Простота без компромиссов" },
            description: {
                en: "Every abstraction earns its complexity, or it gets cut.",
                ru: "Каждая абстракция обязана окупать свою сложность — или её вырезают.",
            },
            icon: { type: "icon", value: "scissors" },
        },
        {
            title: { en: "Own the whole pipe", ru: "Отвечаю за весь путь" },
            description: {
                en: "From the camera driver to the UI thread — I trace the entire path, not just my layer.",
                ru: "От драйвера камеры до UI-потока — я прохожу весь путь, а не только свой слой.",
            },
            icon: { type: "icon", value: "git-branch" },
        },
        {
            title: { en: "Ship, then harden", ru: "Сначала запуск, потом закалка" },
            description: {
                en: "Working software first. Resilience isn't optional — it just comes right after.",
                ru: "Сначала — работающий продукт. Надёжность не опциональна, она просто идёт следом.",
            },
            icon: { type: "icon", value: "shield-check" },
        },
    ],

    techStack: [
        { name: "Kotlin", note: { en: "Primary language for over 6 years", ru: "Основной язык последние 6+ лет" } },
        {
            name: "Coroutines & Flow",
            note: {
                en: "Structured concurrency across the whole app",
                ru: "Структурированная конкурентность во всём приложении",
            },
        },
        { name: "Jetpack Compose", note: { en: "Declarative UI layer", ru: "Декларативный UI-слой" } },
        {
            name: "Navigation",
            note: {
                en: "Custom routing & rendering, in place of the standard Navigation Component",
                ru: "Кастомный роутинг и рендеринг вместо стандартного Navigation Component",
            },
        },
        {
            name: "Android Open Source",
            note: { en: "AOSP customization for an OEM device", ru: "Кастомизация AOSP для OEM-устройства" },
        },
        { name: "Dagger2", note: { en: "Dependency injection", ru: "Внедрение зависимостей" } },
        { name: "Camera2", note: { en: "Camera pipeline & capture", ru: "Камера-пайплайн и захват кадров" } },
        { name: "JUnit", note: { en: "Unit & integration testing", ru: "Unit- и интеграционное тестирование" } },
        { name: "Java", note: { en: "Legacy screens & JNI interop", ru: "Legacy-экраны и интеграция с JNI" } },
        {
            name: "JNI & C++",
            note: { en: "Native interop for platform-level code", ru: "Native-прослойка для платформенного кода" },
        },
        {
            name: "Gradle Plugin Development",
            note: {
                en: "3+ custom plugins automating the build & release routine",
                ru: "3+ кастомных плагина, автоматизирующих сборку и релиз",
            },
        },
        { name: "KSP", note: { en: "Annotation-driven code generation", ru: "Кодогенерация на основе аннотаций" } },
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
    ],

    config: {
        name: "Yurii Surzhykov",
        initials: "YS",
        role: { en: "Systems Engineer", ru: "Системный инженер" },
        email: "yuriisurzhykov@gmail.com",
        availability: "available",
        social: {
            github: "https://github.com/yuriisurzhykov",
            linkedin: "https://linkedin.com/in/yuriisurzhykov",
        },
    },

    journalPage: {
        heading: {
            en: "A commit log for how I think.",
            ru: "Коммит-лог того, как я думаю.",
        },
        description: {
            en: "Notes on architecture, decisions, and the trade-offs behind the systems I build - written like commits, not blog posts.",
            ru: "Заметки об архитектуре, решениях и компромиссах за системами, которые я строю — написанные как коммиты, а не посты в блоге.",
        },
    },

    workPage: {
        heading: {
            en: ["Systems I've shipped —", "and one still in flight."],
            ru: ["Системы, которые я довёл до релиза —", "и одна ещё в полёте."],
        },
        description: {
            en: "Every row below is a piece of infrastructure, not a screen. Status on the right tells you where it stands.",
            ru: "Каждая строка ниже — это инфраструктура, а не экран. Статус справа показывает, на каком этапе она сейчас.",
        },
    },
};
