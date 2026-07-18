import type { Localized } from "@/shared/i18n";

/**
 * WORK / PROJECTS
 * ----------------
 * Single source of truth for every project — powers the landing "Selected
 * Work" grid, the /work ledger, and (when `caseStudy` is present) the
 * /work/:slug case-study page.
 *
 * To add a project: append an object to this array. To reorder: reorder
 * the array. To feature it on the landing page: set `featured: true`.
 *
 * `stack` holds the full tech list; compact views (ledger row, landing
 * card) just show the first couple of entries. `title` and `stack` are
 * proper nouns and stay the same in every language; everything else is
 * prose and is `Localized<string>` — resolve with `pick()`.
 */

export type WorkStatus = "shipped" | "in-progress";

export interface WorkApproachItem {
    title: Localized<string>;
    description: Localized<string>;
}

export interface WorkCaseStudy {
    startedLabel: Localized<string>;
    shippedLabel: Localized<string>;
    role: Localized<string>;
    heroImage?: string;
    sections: { heading: Localized<string>; body: Localized<string> }[];
    approach?: WorkApproachItem[];
}

export interface WorkItem {
    slug: string;
    title: string;
    year: number;
    status: WorkStatus;
    /** Card / ledger-row description. */
    summary: Localized<string>;
    stack: string[];
    coverImage?: string;
    /** Show on the landing page's "Selected Work" grid. */
    featured?: boolean;
    /** Cross-link to a journal post ("Read the story →" / related-entry card). */
    relatedPostSlug?: string;
    /** Present only for projects with a full /work/:slug case-study page. */
    caseStudy?: WorkCaseStudy;
}

export const work: WorkItem[] = [
    {
        slug: "multi-client-design-system",
        title: "Multi-Client Design System",
        year: 2022,
        status: "shipped",
        summary: {
            en: "An earlier, token-driven theming system that replaced per-client, from-scratch style duplication — after it shipped, a new client just needed a color palette and a handful of size tokens.",
            ru: "Более ранняя система тем на токенах, заменившая дублирование стилей с нуля под каждого клиента — после её внедрения для нового клиента достаточно было задать цветовую палитру и несколько токенов размеров.",
        },
        stack: ["Android Views", "XML Styles", "Gradle Flavors"],
    },
    {
        slug: "ui-middleware-architecture",
        title: "UI + Middleware Architecture",
        year: 2023,
        status: "shipped",
        summary: {
            en: "The application's core architecture — active objects in the middleware layer, a strict event-only contract with the UI, and an overlay-dialog subsystem any screen can use. Built from a two-line requirement into a shipped product.",
            ru: "Основная архитектура приложения — active objects в слое middleware, строгий контракт «только через события» с UI и подсистема overlay-диалогов, доступная любому экрану. Выросла из требования в две строчки до продукта, дошедшего до релиза.",
        },
        stack: ["Kotlin", "Coroutines", "FlowBus", "Dagger2"],
        caseStudy: {
            startedLabel: {en: "Late 2022", ru: "Конец 2022"},
            shippedLabel: {en: "Mid 2023", ru: "Середина 2023"},
            role: {en: "Lead architect", ru: "Ведущий архитектор"},
            sections: [
                {
                    heading: {en: "Overview", ru: "Обзор"},
                    body: {
                        en: "The requirement was two sentences long: the middleware layer must be built from active objects, and the UI must talk to it only through events. I took that constraint and built the entire application architecture around it, from the middleware contract up through every screen.",
                        ru: "Требование звучало в две строчки: слой middleware должен строиться на active objects, а UI должен общаться с ним только через события. Я взял это ограничение и выстроил вокруг него всю архитектуру приложения — от контракта middleware до каждого экрана.",
                    },
                },
                {
                    heading: {en: "The challenge", ru: "Задача"},
                    body: {
                        en: "A previous platform with a looser architecture made every bug a small investigation. The goal here wasn't just to satisfy the two-line requirement, but to make the resulting system fast to debug — active objects and event-only communication needed to pay for themselves in velocity, not just in structure.",
                        ru: "На предыдущей платформе с более рыхлой архитектурой каждый баг превращался в небольшое расследование. Задача была не просто выполнить требование в две строчки, а сделать так, чтобы результат было быстро отлаживать — active objects и общение только через события должны были окупаться скоростью, а не только структурой.",
                    },
                },
                {
                    heading: {en: "The payoff", ru: "Результат"},
                    body: {
                        en: "Bugs on this architecture were fixed several times faster than equivalent bugs on the platform it replaced — by the team lead's own account, someone who had worked on both.",
                        ru: "Баги в этой архитектуре фиксились в несколько раз быстрее, чем аналогичные баги на платформе, которую она заменила — по словам самого тим-лида, работавшего на обеих.",
                    },
                },
            ],
            approach: [
                {
                    title: {en: "Active objects, not shared state", ru: "Active objects вместо общего состояния"},
                    description: {
                        en: "Each middleware component owns its own thread of execution and mutable state; nothing outside it touches that state directly.",
                        ru: "Каждый компонент middleware владеет своим потоком выполнения и изменяемым состоянием; ничто снаружи не трогает это состояние напрямую.",
                    },
                },
                {
                    title: {en: "Events, not calls", ru: "События вместо вызовов"},
                    description: {
                        en: "The UI layer never calls into middleware directly — every interaction is a published event and a subscribed response.",
                        ru: "UI-слой никогда не вызывает middleware напрямую — любое взаимодействие — это опубликованное событие и подписанный ответ.",
                    },
                },
                {
                    title: {en: "Overlay dialogs, for free", ru: "Overlay-диалоги «из коробки»"},
                    description: {
                        en: "A shared overlay-dialog mechanism was wired into the architecture so any ViewModel or screen could show or hide a dialog without its own plumbing.",
                        ru: "Общий механизм overlay-диалогов встроен прямо в архитектуру, чтобы любая ViewModel или экран могли показывать и скрывать диалог без собственной обвязки.",
                    },
                },
            ],
        },
    },
    {
        slug: "flowbus",
        title: "FlowBus",
        year: 2023,
        status: "shipped",
        summary: {
            en: "An event-bus framework that decouples modules without the usual boilerplate. Backed by Room-persisted events, KSP-driven codegen, and a compiler-enforced permissions system — it quietly powers everything else on this list.",
            ru: "Фреймворк-шина событий, который развязывает модули без привычного boilerplate. За ним — персистентные события на Room, кодогенерация через KSP и система прав доступа, проверяемая на этапе компиляции. Он незаметно питает почти всё остальное в этом списке.",
        },
        stack: ["Kotlin", "Flow", "Android Room", "KSP"],
        featured: true,
        relatedPostSlug: "flowbus",
        caseStudy: {
            startedLabel: {en: "Jan 2023", ru: "Янв 2023"},
            shippedLabel: {en: "Aug 2023", ru: "Авг 2023"},
            role: {en: "Sole engineer", ru: "Единственный разработчик"},
            sections: [
                {
                    heading: {en: "Overview", ru: "Обзор"},
                    body: {
                        en: "FlowBus is an event-bus framework built to replace an outdated, ad-hoc communication pattern between the middleware and UI layers of an OEM Android platform. It supports plain pub/sub, sticky events, and — uniquely — persistable events that survive process death by round-tripping through Android Room.",
                        ru: "FlowBus — фреймворк-шина событий, созданный чтобы заменить устаревший, придуманный на ходу способ общения между middleware и UI-слоем Android-платформы для OEM-устройства. Он поддерживает обычный pub/sub, sticky-события и, что особенно ценно, персистентные события, которые переживают смерть процесса за счёт хранения в Android Room.",
                    },
                },
                {
                    heading: {en: "The challenge", ru: "Задача"},
                    body: {
                        en: "Every module wanted to talk to every other module, and the existing approach meant writing a new listener interface, manual registration, and manual unregistration for each one — with a leaked callback waiting on the one screen where someone forgot to unsubscribe. Developers needed to work with event-driven architecture without caring how any of it worked under the hood.",
                        ru: "Каждый модуль хотел общаться с каждым другим модулем, а существующий подход означал: новый listener-интерфейс, ручная регистрация и ручная отписка — под каждый случай, с утечкой callback'а на том единственном экране, где кто-то забыл отписаться. Разработчикам нужно было работать с event-driven архитектурой, не вникая в то, как это устроено под капотом.",
                    },
                },
            ],
            approach: [
                {
                    title: {en: "Codegen over boilerplate", ru: "Кодогенерация вместо boilerplate'а"},
                    description: {
                        en: "A KSP plugin generates everything a persistable event needs from a single annotation — no hand-written Room entities or DAOs.",
                        ru: "KSP-плагин генерирует всё необходимое для персистентного события из одной аннотации — без ручного написания Room-сущностей и DAO.",
                    },
                },
                {
                    title: {en: "Permissions, enforced at compile time", ru: "Права доступа на уровне компиляции"},
                    description: {
                        en: "A compiler-checked permissions system stops a module from subscribing to an event it was never meant to see — a whole class of bugs the old approach couldn't prevent.",
                        ru: "Система прав доступа, проверяемая компилятором, не даёт модулю подписаться на событие, к которому у него не должно быть доступа — целый класс багов, который старый подход просто не мог предотвратить.",
                    },
                },
                {
                    title: {en: "A culture of tests", ru: "Культура тестирования"},
                    description: {
                        en: "Every PR shipped with unit tests from day one. The team had never written a unit test before FlowBus; it now runs over 3,000 of them.",
                        ru: "С первого дня каждый PR сопровождался unit-тестами. До FlowBus команда вообще не писала unit-тесты; сейчас их прогоняется больше 3000.",
                    },
                },
            ],
        },
    },
    {
        slug: "asyncapi-kotlin-compiler",
        title: "AsyncAPI → Kotlin Compiler",
        year: 2023,
        status: "shipped",
        summary: {
            en: "A compiler that turns AsyncAPI specs into generated Kotlin client code for an MQTT broker — written in Python with Jinja2 templates, it replaced hand-written broker boilerplate entirely.",
            ru: "Компилятор, превращающий AsyncAPI-спеки в сгенерированный Kotlin-код клиента для MQTT-брокера — написан на Python с шаблонами Jinja2, полностью заменив ручное написание broker-boilerplate'а.",
        },
        stack: ["Python", "Jinja2", "AsyncAPI", "Kotlin", "MQTT", "HiveMQ"],
        featured: true,
        caseStudy: {
            startedLabel: {en: "Jan 2023", ru: "Янв 2023"},
            shippedLabel: {en: "Jun 2023", ru: "Июн 2023"},
            role: {en: "Sole engineer", ru: "Единственный разработчик"},
            sections: [
                {
                    heading: {en: "Overview", ru: "Обзор"},
                    body: {
                        en: "AsyncAPI describes the messages a service publishes and subscribes to; this compiler turns that specification directly into working Kotlin — the MQTT broker client, message models, and topic wiring generated automatically, with HiveMQ used for the generated client at runtime.",
                        ru: "AsyncAPI описывает, какие сообщения сервис публикует и на какие подписывается; этот компилятор превращает такую спецификацию прямо в рабочий Kotlin-код — клиент MQTT-брокера, модели сообщений и привязку топиков он генерирует автоматически, а сгенерированный клиент во время выполнения использует HiveMQ.",
                    },
                },
                {
                    heading: {en: "The challenge", ru: "Задача"},
                    body: {
                        en: "Hand-writing an MQTT client for every message type — the model classes, the serialization, the topic subscriptions — meant the broker integration code grew at the same rate as the number of message types, with the same mistakes repeated by hand each time.",
                        ru: "Написание MQTT-клиента вручную под каждый тип сообщения — модели, сериализация, подписки на топики — означало, что код интеграции с брокером рос вместе с количеством типов сообщений, а одни и те же ошибки повторялись вручную раз за разом.",
                    },
                },
            ],
            approach: [
                {
                    title: {en: "Spec as the source of truth", ru: "Спецификация как единственный источник истины"},
                    description: {
                        en: "The AsyncAPI document is the only thing a developer edits; everything downstream is generated from it.",
                        ru: "AsyncAPI-документ — единственное, что редактирует разработчик; всё остальное генерируется из него.",
                    },
                },
                {
                    title: {en: "Jinja2 templates", ru: "Шаблоны Jinja2"},
                    description: {
                        en: "Kotlin output is produced from a Python + Jinja2 template layer, making the generated code easy to adjust as conventions evolve.",
                        ru: "Kotlin-код генерируется через слой шаблонов на Python + Jinja2 — сгенерированный код легко подстраивать под меняющиеся конвенции.",
                    },
                },
                {
                    title: {en: "HiveMQ at runtime", ru: "HiveMQ во время выполнения"},
                    description: {
                        en: "Generated clients talk to the MQTT broker through HiveMQ, so the generated layer only has to describe messages, not transport.",
                        ru: "Сгенерированные клиенты общаются с MQTT-брокером через HiveMQ, поэтому сгенерированному слою нужно описывать только сообщения, а не транспорт.",
                    },
                },
            ],
        },
    },
    {
        slug: "navigation-engine",
        title: "Navigation Engine",
        year: 2024,
        status: "shipped",
        summary: {
            en: "A custom routing and rendering engine, built from scratch to replace Android's Navigation Component entirely — the system I'm proudest of.",
            ru: "Кастомный движок роутинга и рендеринга, написанный с нуля и полностью заменивший Navigation Component — система, которой я горжусь больше всего.",
        },
        stack: ["Kotlin", "Coroutines & Flow", "Custom Rendering", "Android Automotive"],
        featured: true,
        relatedPostSlug: "navigation-engine-story",
        caseStudy: {
            startedLabel: {en: "Mar 2024", ru: "Мар 2024"},
            shippedLabel: {en: "Nov 2024", ru: "Ноя 2024"},
            role: {en: "Sole engineer", ru: "Единственный разработчик"},
            sections: [
                {
                    heading: {en: "Overview", ru: "Обзор"},
                    body: {
                        en: "Android's Navigation Component didn't come close to meeting the app's requirements, so I replaced it outright with an engine that owns routing, rendering, and navigation state end-to-end — there is no Google navigation library left anywhere in the app. It communicates with the rest of the system entirely through FlowBus, the event framework built alongside it.",
                        ru: "Navigation Component от Android совершенно не соответствовал требованиям приложения, поэтому я заменил его целиком движком, который сам отвечает за роутинг, рендеринг и состояние навигации от начала до конца — в приложении больше нет ни одной библиотеки навигации от Google. Он общается с остальной системой полностью через FlowBus — фреймворк событий, написанный параллельно с ним.",
                    },
                },
                {
                    heading: {en: "The challenge", ru: "Задача"},
                    body: {
                        en: "Off-the-shelf navigation SDKs couldn't express what this app actually needed: per-screen requirements like session timeouts, privacy-policy gating, and access-level checks, declared and enforced individually rather than bolted on as afterthoughts.",
                        ru: "Готовые SDK для навигации не могли выразить то, что на самом деле требовалось приложению: пооэкранные требования — таймаут сессии, проверка privacy policy, уровень доступа — которые нужно было объявлять и применять по отдельности для каждого экрана, а не прикручивать постфактум.",
                    },
                },
                {
                    heading: {en: "The requirements graph", ru: "Граф требований"},
                    body: {
                        en: "Every screen declares its own requirements — timeout, session state, privacy-policy acceptance, access level, and more — directly in the navigation graph, and the engine enforces them before a screen is ever shown. The same graph also describes app menus: each item gets its own appearance and visibility rules through extension classes, so menus build themselves instead of being hand-assembled per screen.",
                        ru: "Каждый экран объявляет собственные требования — таймаут, состояние сессии, согласие с privacy policy, уровень доступа и другое — прямо в графе навигации, и движок проверяет их ещё до показа экрана. Тот же граф описывает и меню приложения: у каждого пункта — свои правила appearance и visibility через классы-расширения, так что меню собираются сами, а не вручную под каждый экран.",
                    },
                },
                {
                    heading: {en: "Navigation intents", ru: "Intent'ы навигации"},
                    body: {
                        en: "Navigation itself runs through a dedicated intent pipeline rather than direct calls — intents that can be deduplicated, debounced, and queued correctly, instead of racing each other the way ad-hoc navigation calls tend to.",
                        ru: "Сама навигация работает через отдельный pipeline intent'ов, а не через прямые вызовы — их можно дедуплицировать, применять debounce и корректно ставить в очередь, вместо гонок, которые обычно возникают при навигации «напрямую».",
                    },
                },
            ],
            approach: [
                {
                    title: {en: "Routing", ru: "Роутинг"},
                    description: {
                        en: "Graph-based route calculation, isolated from rendering concerns.",
                        ru: "Расчёт маршрута на основе графа, изолированный от логики рендеринга.",
                    },
                },
                {
                    title: {en: "Rendering", ru: "Рендеринг"},
                    description: {
                        en: "Custom tile compositor tuned to the device's frame budget.",
                        ru: "Кастомный tile-компоузер, подстроенный под бюджет кадра устройства.",
                    },
                },
                {
                    title: {en: "State & messaging", ru: "Состояние и обмен сообщениями"},
                    description: {
                        en: "Turn-by-turn state published over FlowBus for any module to consume.",
                        ru: "Состояние навигации по шагам публикуется через FlowBus — любой модуль может его получить.",
                    },
                },
                {
                    title: {en: "Requirements graph", ru: "Граф требований"},
                    description: {
                        en: "Per-screen timeout, session, privacy, and access rules declared once and enforced automatically.",
                        ru: "Требования по таймауту, сессии, privacy и доступу задаются один раз для экрана и применяются автоматически.",
                    },
                },
            ],
        },
    },
    {
        slug: "design-system",
        title: "Dynamic Design System",
        year: 2024,
        status: "shipped",
        summary: {
            en: "A Material3-independent, standards-aligned component library with full support for dynamic app theming — the base every other UI in the app customizes from.",
            ru: "Библиотека компонентов, не зависящая от Material3, но соответствующая его стандартам, с полной поддержкой динамических тем приложения — основа, от которой отталкивается кастомизация всего остального UI.",
        },
        stack: ["Kotlin", "Jetpack Compose", "Design Tokens"],
    },
    {
        slug: "camera2-capture-library",
        title: "Camera2 Capture Library",
        year: 2024,
        status: "shipped",
        summary: {
            en: "A thin library built on top of Camera2 API for headless photo capture, video preview, and QR-code scanning.",
            ru: "Небольшая библиотека поверх Camera2 API для headless-захвата фото, video preview и сканирования QR-кодов.",
        },
        stack: ["Kotlin", "Camera2"],
    },
    {
        slug: "gradle-plugin-suite",
        title: "Gradle Plugin Suite",
        year: 2024,
        status: "shipped",
        summary: {
            en: "Three Gradle plugins automating build routine: a convention plugin that removes cross-module boilerplate, a plugin that installs the app correctly into system/priv-app, and a plugin for renaming build outputs.",
            ru: "Три Gradle-плагина, автоматизирующих сборку: convention-плагин, убирающий повторяющийся boilerplate между модулями, плагин для корректной установки приложения в system/priv-app и плагин для переименования output-файлов сборки.",
        },
        stack: ["Gradle", "Kotlin DSL"],
    },
    {
        slug: "aosp-platform-customizations",
        title: "AOSP Platform Customizations",
        year: 2024,
        status: "shipped",
        summary: {
            en: "A set of AOSP/SystemUI-level platform tweaks: suppressing system notifications on demand, hiding camera/mic privacy indicators on Android 13, log rotation for the on-device MQTT broker via a custom init.rc process, and kiosk-mode setup.",
            ru: "Набор доработок на уровне AOSP/SystemUI: подавление системных уведомлений по требованию, скрытие индикаторов приватности камеры/микрофона на Android 13, ротация логов встроенного MQTT-брокера через кастомный init.rc-процесс и настройка kiosk mode.",
        },
        stack: ["AOSP", "SystemUI", "Android 13"],
    },
    {
        slug: "hsm-library",
        title: "Hierarchical State Machine Library",
        year: 2024,
        status: "shipped",
        summary: {
            en: "A hierarchical state machine library with a clean Kotlin DSL — built as a direct reaction to kStateMachine's spaghetti API, so developers could write HSMs that stay readable.",
            ru: "Библиотека для hierarchical state machine с чистым Kotlin DSL — написана как прямая реакция на «спагетти»-API kStateMachine, чтобы разработчики писали HSM, которые остаются читаемыми.",
        },
        stack: ["Kotlin", "DSL"],
        caseStudy: {
            startedLabel: {en: "Feb 2024", ru: "Фев 2024"},
            shippedLabel: {en: "Apr 2024", ru: "Апр 2024"},
            role: {en: "Sole engineer", ru: "Единственный разработчик"},
            sections: [
                {
                    heading: {en: "Overview", ru: "Обзор"},
                    body: {
                        en: "Hierarchical state machines are a natural fit for embedded UI flows, but the popular library the team had been using — kStateMachine — produced code that was, frankly, spaghetti. I wrote a replacement using nothing but idiomatic Kotlin syntax.",
                        ru: "Hierarchical state machine — естественный подход для embedded UI-флоу, но популярная библиотека, которой пользовалась команда — kStateMachine — порождала код, который, честно говоря, был «спагетти». Я написал замену, используя только идиоматичный синтаксис Kotlin.",
                    },
                },
                {
                    heading: {en: "The challenge", ru: "Задача"},
                    body: {
                        en: "The goal wasn't just correctness — kStateMachine was already correct. It was legibility: a developer reading a state definition should see the states, transitions, and guards as clearly as the spec they came from, without wading through a builder-pattern maze.",
                        ru: "Цель была не просто корректность — kStateMachine и так была корректной. Цель — читаемость: разработчик, глядя на определение состояния, должен видеть состояния, переходы и условия так же ясно, как в спецификации, из которой они взялись, не блуждая по лабиринту builder-паттерна.",
                    },
                },
            ],
            approach: [
                {
                    title: {en: "Pure Kotlin syntax", ru: "Чистый синтаксис Kotlin"},
                    description: {
                        en: "No custom builder DSL to learn — state graphs read like ordinary, idiomatic Kotlin.",
                        ru: "Никакого отдельного builder DSL — граф состояний читается как обычный, идиоматичный Kotlin.",
                    },
                },
                {
                    title: {en: "Hierarchy as a first-class concept", ru: "Иерархия как базовое понятие"},
                    description: {
                        en: "Nested states and shared transitions are expressed directly, instead of duplicated across sibling states.",
                        ru: "Вложенные состояния и общие переходы выражаются напрямую, а не дублируются в состояниях-соседях.",
                    },
                },
            ],
        },
    },
    {
        slug: "feature-scaffolding-plugin",
        title: "Feature Scaffolding Plugin",
        year: 2025,
        status: "shipped",
        summary: {
            en: "An Android Studio plugin that generates the full package structure and minimal viable code for a new feature — removing boilerplate from the day a feature starts.",
            ru: "Плагин для Android Studio, который генерирует всю структуру пакетов и минимально жизнеспособный код для новой фичи — убирает boilerplate с самого первого дня работы над ней.",
        },
        stack: ["IntelliJ Platform SDK", "Kotlin"],
    },
    {
        slug: "room-migration-codegen",
        title: "Room Migration Codegen",
        year: 2025,
        status: "shipped",
        summary: {
            en: "A Gradle plugin that generates version-to-version Room migration specs from a git diff, so no developer has to hunt down destructive schema changes by hand before a release.",
            ru: "Gradle-плагин, генерирующий Room migration-спеки между версиями прямо из git diff — чтобы перед релизом никому не приходилось руками искать деструктивные изменения схемы.",
        },
        stack: ["Gradle", "Android Room", "Kotlin"],
    },
    {
        slug: "compose-performance",
        title: "Compose Performance Rework",
        year: 2025,
        status: "shipped",
        summary: {
            en: "A deep dive into how Jetpack Compose works under the hood, followed by a set of optimized Modifier.Node implementations that fixed UI slowness on the platform's weak hardware.",
            ru: "Глубокое погружение в то, как Jetpack Compose работает под капотом, и набор оптимизированных реализаций Modifier.Node, которые исправили медлительность UI на слабом железе платформы.",
        },
        stack: ["Kotlin", "Jetpack Compose", "Modifier.Node"],
        caseStudy: {
            startedLabel: {en: "Jan 2025", ru: "Янв 2025"},
            shippedLabel: {en: "Mar 2025", ru: "Мар 2025"},
            role: {en: "Sole engineer", ru: "Единственный разработчик"},
            sections: [
                {
                    heading: {en: "Overview", ru: "Обзор"},
                    body: {
                        en: "Screens were rendering slowly on Jetpack Compose, and the obvious explanation — weak hardware — wasn't good enough on its own; the app had to run acceptably on that hardware regardless. I went under the hood of Compose's rendering pipeline to find out exactly why, and where the time was going.",
                        ru: "Экраны рендерились медленно на Jetpack Compose, и очевидное объяснение — слабое железо — само по себе ничего не решало: приложению всё равно нужно было работать приемлемо на этом железе. Я разобрался в pipeline рендеринга Compose под капотом, чтобы понять, куда именно уходит время.",
                    },
                },
                {
                    heading: {en: "The challenge", ru: "Задача"},
                    body: {
                        en: "Compose's recomposition and layout model hides a lot of cost behind convenient APIs. Fixing it meant understanding how composables, nodes, and modifiers actually get measured and drawn — then rewriting the hottest paths as lower-level Modifier.Node implementations instead of composable wrappers.",
                        ru: "Модель recomposition и layout в Compose скрывает немалую стоимость за удобным API. Чтобы это исправить, нужно было разобраться, как на самом деле измеряются и рисуются composables, nodes и modifiers — а затем переписать самые горячие пути как низкоуровневые реализации Modifier.Node вместо composable-обёрток.",
                    },
                },
            ],
            approach: [
                {
                    title: {en: "Profile before rewriting", ru: "Сначала профилирование, потом переписывание"},
                    description: {
                        en: "Found exactly which composables were recomposing unnecessarily before touching any code.",
                        ru: "Сначала выяснил, какие composables пересоздаются без необходимости — и только потом начал менять код.",
                    },
                },
                {
                    title: {
                        en: "Modifier.Node over composable wrappers",
                        ru: "Modifier.Node вместо composable-обёрток"
                    },
                    description: {
                        en: "Rewrote the costliest UI paths as Modifier.Node implementations, cutting allocation and recomposition overhead.",
                        ru: "Переписал самые дорогие UI-пути как реализации Modifier.Node, сократив накладные расходы на аллокации и recomposition.",
                    },
                },
            ],
        },
    },
    {
        slug: "onvif-camera-library",
        title: "ONVIF Camera Streaming Library",
        year: 2026,
        status: "in-progress",
        summary: {
            en: "A streaming library for ONVIF cameras — four simultaneous Wi-Fi camera feeds on constrained hardware, with camera discovery, onboarding, and an NDK-level pipeline for performance. Currently in active development.",
            ru: "Библиотека для стриминга с ONVIF-камер — четыре одновременных Wi-Fi видеопотока на слабом железе, с обнаружением камер, онбордингом и pipeline на уровне NDK для производительности. Сейчас в активной разработке.",
        },
        stack: ["Kotlin", "C++/NDK", "ONVIF", "WS-Discovery"],
        featured: true,
        relatedPostSlug: "onvif-camera-notes",
        caseStudy: {
            startedLabel: {en: "Jan 2026", ru: "Янв 2026"},
            shippedLabel: {en: "Q4 2026", ru: "4 кв. 2026"},
            role: {en: "Sole engineer", ru: "Единственный разработчик"},
            sections: [
                {
                    heading: {en: "Overview", ru: "Обзор"},
                    body: {
                        en: "A streaming library for ONVIF-compliant IP cameras, built to run four simultaneous Wi-Fi camera feeds on the same constrained hardware that runs the rest of the platform. It's the project I'm actively building right now.",
                        ru: "Библиотека для стриминга с ONVIF-совместимых IP-камер, рассчитанная на четыре одновременных Wi-Fi видеопотока на том же слабом железе, на котором работает вся остальная платформа. Это проект, над которым я работаю прямо сейчас.",
                    },
                },
                {
                    heading: {en: "The challenge", ru: "Задача"},
                    body: {
                        en: "Cheap, embedded hardware has no room for four decoded video streams running at once, and ONVIF cameras vary wildly in supported stream profiles, codecs, and discovery behavior. The library needs to find cameras reliably (WS-Discovery and IP scanning), onboard and poll them, negotiate a stream profile that fits the device's budget, and still leave room for two-way audio.",
                        ru: "Дешёвое embedded-железо не оставляет запаса для четырёх одновременно декодируемых видеопотоков, а ONVIF-камеры сильно различаются по поддерживаемым stream profiles, кодекам и поведению discovery. Библиотеке нужно надёжно находить камеры (через WS-Discovery и сканирование по IP), онбордить и опрашивать их, договариваться о профиле потока по бюджету устройства — и всё равно оставлять запас для two-way аудио.",
                    },
                },
            ],
            approach: [
                {
                    title: {en: "Discovery & onboarding", ru: "Обнаружение и онбординг"},
                    description: {
                        en: "WS-Discovery and IP-range scanning locate cameras on the network; onboarding polls each one for its capabilities before a stream is ever requested.",
                        ru: "WS-Discovery и сканирование по диапазону IP находят камеры в сети; онбординг опрашивает возможности каждой камеры ещё до запроса потока.",
                    },
                },
                {
                    title: {en: "Stream negotiation", ru: "Согласование потока"},
                    description: {
                        en: "Per-camera stream-profile selection trades resolution and bitrate against the device's decode budget, with fallback across codecs.",
                        ru: "Выбор stream profile для каждой камеры балансирует разрешение и битрейт с бюджетом декодирования устройства, с фолбэком по кодекам.",
                    },
                },
                {
                    title: {en: "NDK-level pipeline", ru: "Pipeline на уровне NDK"},
                    description: {
                        en: "The decode and render path drops to native code where it matters, to keep four concurrent streams inside the frame budget.",
                        ru: "Путь декодирования и рендеринга там, где это критично, уходит в native-код, чтобы удержать четыре потока в рамках бюджета кадра.",
                    },
                },
            ],
        },
    },
];
