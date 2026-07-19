import "dotenv/config";
import { prisma } from "../src/db/client";

/**
 * One-off migration: transcribes the current, hand-checked content of
 * `frontend/src/data/journal.ts` and `frontend/src/data/work.ts` into
 * Document/Block/Post/Work rows. Run once against a given database
 * (`npx tsx scripts/import-legacy-content.ts`); re-running is safe (it
 * skips any slug that already exists) but not the intended way to add
 * content going forward — once this has run, the database is the source
 * of truth and the admin UI (Phase 4) is how new content gets added.
 *
 * The content itself is duplicated here rather than imported from
 * `frontend/src/data/*.ts` on purpose: those files use `frontend/`'s own
 * `@/...` path aliases and import types from `frontend/src/shared`, which
 * this package has no reason to depend on for what is explicitly a
 * one-time transform. Copying the literal data once for a one-off script
 * is the appropriately-scoped choice here — `frontend/` becomes legacy and
 * is deleted once this migration is verified (see the deployment plan's
 * cutover step), so this script doesn't need to stay in sync with it
 * indefinitely.
 */

type Localized = { en: string; ru: string };

type BlockInput =
    | { type: "lead" | "paragraph"; text: Localized }
    | { type: "heading"; text: Localized }
    | { type: "code"; data: { filename: string; language?: string; code: string } }
    | { type: "approachList"; data: { items: { title: Localized; description: Localized }[] } };

function sectionsToBlocks(sections: { heading: Localized; body: Localized }[]): BlockInput[] {
    return sections.flatMap((s): BlockInput[] => [
        { type: "heading", text: s.heading },
        { type: "paragraph", text: s.body },
    ]);
}

function approachToBlocks(approach?: { title: Localized; description: Localized }[]): BlockInput[] {
    if (!approach || approach.length === 0) return [];
    return [{ type: "approachList", data: { items: approach } }];
}

// ---------------------------------------------------------------------------
// JOURNAL — transcribed from frontend/src/data/journal.ts
// ---------------------------------------------------------------------------

const flowBusBody: BlockInput[] = [
    {
        type: "lead",
        text: {
            en: "Every module in the app wanted to talk to every other module. I was tired of writing the same listener interface for the twentieth time — so I built the thing I actually needed.",
            ru: "Каждый модуль в приложении хотел общаться с каждым другим модулем. Я устал писать один и тот же listener-интерфейс в двадцатый раз — и построил то, что мне действительно было нужно.",
        },
    },
    { type: "heading", text: { en: "The problem", ru: "Проблема" } },
    {
        type: "paragraph",
        text: {
            en: "As the app grew, features stopped being independent. The camera module needed to tell the navigation module about a captured frame; the navigation module needed to tell the UI layer about a route change; the UI layer needed to tell everyone about a lifecycle event. Direct references between modules turned every change into a small refactor across the codebase.",
            ru: "По мере роста приложения фичи перестали быть независимыми. Модулю камеры нужно было сообщить модулю навигации о захваченном кадре; модулю навигации — сообщить UI-слою об изменении маршрута; UI-слою — сообщить всем о событии жизненного цикла. Прямые ссылки между модулями превращали любое изменение в небольшой рефакторинг по всей кодовой базе.",
        },
    },
    {
        type: "paragraph",
        text: {
            en: "The usual fix is an event bus. The usual event bus is a pile of boilerplate: a listener interface per event type, manual registration and unregistration, and a subtle memory leak waiting for the one screen where you forget to unsubscribe.",
            ru: "Обычное решение — event bus. Обычный event bus — это куча boilerplate'а: listener-интерфейс на каждый тип события, ручная регистрация и отписка, и тонкая утечка памяти, которая ждёт того единственного экрана, где вы забудете отписаться.",
        },
    },
    { type: "heading", text: { en: "The idea", ru: "Идея" } },
    {
        type: "paragraph",
        text: {
            en: "Kotlin already gives you a typed, cancellable, structured stream: Flow. FlowBus is a thin layer on top of a shared SharedFlow that lets any module publish a typed event and any module subscribe to exactly the type it cares about — no interfaces, no manual unregistration, and subscriptions that die with their coroutine scope automatically.",
            ru: "В Kotlin уже есть типизированный, отменяемый, структурированный поток — Flow. FlowBus — это тонкий слой над общим SharedFlow, который позволяет любому модулю публиковать типизированное событие, а любому модулю — подписываться именно на тот тип, который ему нужен: без интерфейсов, без ручной отписки, а подписки умирают вместе со своим coroutine scope автоматически.",
        },
    },
    {
        type: "code",
        data: {
            filename: "FlowBus.kt",
            language: "kotlin",
            code: `object FlowBus {
    private val _events = MutableSharedFlow<Any>(extraBufferCapacity = 16)

    fun publish(event: Any) = _events.tryEmit(event)

    inline fun <reified T> subscribe(): Flow<T> =
        _events.filterIsInstance<T>()
}

// Anywhere in the app:
FlowBus.publish(FrameCaptured(id))

scope.launch {
    FlowBus.subscribe<FrameCaptured>().collect { event ->
        renderPreview(event.id)
    }
}`,
        },
    },
    { type: "heading", text: { en: "Sticky and persistable events", ru: "Sticky- и персистентные события" } },
    {
        type: "paragraph",
        text: {
            en: "Not every event fits a fire-and-forget model. Some need to be replayed to a late subscriber (sticky events); some need to survive process death entirely. For the latter, an annotation is enough — a KSP plugin generates the Room entity, DAO, and serialization code behind the scenes, so persisting an event never means hand-writing a schema.",
            ru: "Не каждое событие подходит под модель fire-and-forget. Некоторым нужно быть воспроизведёнными для опоздавшего подписчика (sticky-события), некоторым — полностью переживать смерть процесса. Для последних достаточно одной аннотации — KSP-плагин генерирует Room-сущность, DAO и код сериализации за кулисами, так что персистентность события никогда не требует ручного написания схемы.",
        },
    },
    { type: "heading", text: { en: "Permissions, caught at compile time", ru: "Права доступа, пойманные на этапе компиляции" } },
    {
        type: "paragraph",
        text: {
            en: "The one bug category that kept recurring was a module subscribing to an event it was never supposed to see. A compiler-enforced permissions system closed that off entirely — the rules live next to the event definition, and the compiler rejects the subscription before the code even builds.",
            ru: "Один класс багов повторялся снова и снова — модуль подписывался на событие, к которому у него в принципе не должно было быть доступа. Система прав доступа, проверяемая компилятором, закрыла это полностью — правила лежат рядом с определением события, и компилятор отклоняет подписку ещё до сборки кода.",
        },
    },
    { type: "heading", text: { en: "What it changed", ru: "Что это изменило" } },
    {
        type: "paragraph",
        text: {
            en: "Modules stopped knowing about each other by name. Adding a new subscriber for an existing event became a one-line change, with zero coordination needed with the publisher. And because every subscription rides on a coroutine scope, screens that get destroyed simply stop listening — no manual cleanup, no leaked callbacks.",
            ru: "Модули перестали знать друг о друге по имени. Добавление нового подписчика на существующее событие превратилось в изменение в одну строку без какой-либо координации с публикующей стороной. А поскольку каждая подписка живёт на coroutine scope, уничтоженные экраны просто перестают слушать — без ручной очистки, без утечек callback'ов.",
        },
    },
    {
        type: "paragraph",
        text: {
            en: "FlowBus also quietly seeded a testing culture that didn't exist before it: every pull request against it shipped with unit tests from day one, and the platform now runs over 3,000 of them.",
            ru: "FlowBus также незаметно посеял культуру тестирования, которой до него не было: с первого дня каждый pull request к нему сопровождался unit-тестами, и сейчас платформа прогоняет их больше 3000.",
        },
    },
];

const navigationEngineBody: BlockInput[] = [
    {
        type: "lead",
        text: {
            en: "Navigation Component is built for apps where every screen has roughly the same rules. Ours didn't — and pretending otherwise wasn't an option.",
            ru: "Navigation Component создан для приложений, где у всех экранов примерно одинаковые правила. У нас было не так — и притворяться иначе не вариант.",
        },
    },
    { type: "heading", text: { en: "The mismatch", ru: "Несоответствие" } },
    {
        type: "paragraph",
        text: {
            en: "Some screens needed a session timeout. Some required an accepted privacy policy before they could even render. Some were gated by access level. Navigation Component has no concept of any of this — every one of these rules would have had to live outside the navigation graph, checked manually on every entry point, and re-checked every time a new screen was added.",
            ru: "Некоторым экранам нужен был таймаут сессии. Некоторые не могли отрендериться без принятой privacy policy. Некоторые были закрыты по уровню доступа. У Navigation Component нет понятия ни об одном из этих правил — каждое из них пришлось бы держать снаружи графа навигации, проверять вручную на каждой точке входа и перепроверять при добавлении каждого нового экрана.",
        },
    },
    { type: "heading", text: { en: "A requirements graph, not a route table", ru: "Граф требований, а не таблица маршрутов" } },
    {
        type: "paragraph",
        text: {
            en: "The engine's navigation graph carries more than routes — every screen declares its own timeout, session, privacy, and access requirements right there in the graph, and the engine enforces all of it before the screen is shown. The same graph doubles as a menu description: each item gets appearance and visibility rules through extension classes, so menus assemble themselves automatically instead of being built by hand for every screen.",
            ru: "Граф навигации движка несёт больше, чем маршруты — каждый экран объявляет собственные требования по таймауту, сессии, privacy и доступу прямо в графе, и движок проверяет всё это до показа экрана. Тот же граф одновременно описывает и меню: каждый пункт получает правила appearance и visibility через классы-расширения, так что меню собираются автоматически, а не вручную под каждый экран.",
        },
    },
    { type: "heading", text: { en: "Intents instead of direct calls", ru: "Intent'ы вместо прямых вызовов" } },
    {
        type: "paragraph",
        text: {
            en: "Navigation happens through a dedicated intent pipeline that can deduplicate, debounce, and queue — properties that direct navigation calls don't get for free, and that matter a lot once multiple modules can trigger navigation at once.",
            ru: "Навигация происходит через отдельный pipeline intent'ов, который умеет дедуплицировать, применять debounce и выстраивать очередь — свойства, которых прямые вызовы навигации не получают бесплатно, и которые становятся важны, когда навигацию может инициировать сразу несколько модулей.",
        },
    },
    { type: "heading", text: { en: "Where it stands now", ru: "Где всё это сейчас" } },
    {
        type: "paragraph",
        text: {
            en: "There's no Google navigation library left anywhere in the app. The engine owns routing, rendering, and menu generation end-to-end, and communicates with the rest of the system through FlowBus — the event framework I built right alongside it.",
            ru: "В приложении больше не осталось ни одной библиотеки навигации от Google. Движок сам отвечает за роутинг, рендеринг и генерацию меню от начала до конца, а с остальной системой общается через FlowBus — фреймворк событий, который я построил параллельно с ним.",
        },
    },
];

const architectureNotShippedBody: BlockInput[] = [
    {
        type: "lead",
        text: {
            en: "Not every good idea gets built. This one didn't — and I think that was the right call.",
            ru: "Не каждая хорошая идея доходит до реализации. Эта не дошла — и я думаю, что это было правильным решением.",
        },
    },
    { type: "heading", text: { en: "The problem", ru: "Проблема" } },
    {
        type: "paragraph",
        text: {
            en: "The platform depended on Android's hidden APIs for a handful of system-level operations — things a regular app is never meant to touch. Every one of those calls came with permission friction, and the way we were doing it made the whole approach fragile against platform updates.",
            ru: "Платформа зависела от hidden API Android для нескольких системных операций — того, до чего обычное приложение вообще не должно дотягиваться. Каждый такой вызов приходил с трениями по правам доступа, а способ, которым мы это делали, делал весь подход хрупким к обновлениям платформы.",
        },
    },
    { type: "heading", text: { en: "The idea", ru: "Идея" } },
    {
        type: "paragraph",
        text: {
            en: "Split the app into two: a system-service component built alongside the BSP with real access to hidden APIs, and the actual app talking to it over AIDL/IPC for anything privileged. The app would never touch a hidden API directly again — it would just ask the service to do it.",
            ru: "Разделить приложение на два: system-service компонент, собираемый вместе с BSP и имеющий реальный доступ к hidden API, и собственно приложение, которое обращается к нему через AIDL/IPC за всем, что требует привилегий. Приложению больше не пришлось бы напрямую трогать hidden API — оно просто просило бы сервис сделать это.",
        },
    },
    { type: "heading", text: { en: "Why it didn't ship", ru: "Почему это не пошло в релиз" } },
    {
        type: "paragraph",
        text: {
            en: "It was the right architecture on paper. It was also a real chunk of engineering time the team didn't have to spare, for a problem that had a cheaper, if less elegant, fix already available: a vendor-provided stub jar compiled against, with the real implementation living in a separate jar on-device at runtime. That's what shipped instead.",
            ru: "На бумаге это была правильная архитектура. Но это был реальный кусок инженерного времени, которого у команды не было в запасе — для проблемы, у которой уже было более дешёвое, хоть и менее элегантное решение: vendor предоставлял stub jar для компиляции, а настоящая реализация лежала в отдельном jar на устройстве во время выполнения. В релиз пошло именно это.",
        },
    },
    { type: "heading", text: { en: "The lesson", ru: "Вывод" } },
    {
        type: "paragraph",
        text: {
            en: "Knowing the elegant solution and choosing not to build it is still an engineering decision — arguably a harder one than just building it. The vendor-stub approach wasn't as satisfying, but it shipped on time and didn't cost the team weeks it didn't have.",
            ru: "Знать элегантное решение и осознанно не строить его — это всё равно инженерное решение, и, возможно, более сложное, чем просто построить его. Подход с vendor-stub был не таким изящным, но он вышел в релиз в срок и не стоил команде недель, которых у неё не было.",
        },
    },
];

const testingCultureBody: BlockInput[] = [
    {
        type: "lead",
        text: {
            en: "You don't fix a missing testing culture with a policy memo. You fix it by quietly doing the thing every time, until doing it becomes normal.",
            ru: "Отсутствующую культуру тестирования не исправить служебной запиской. Её исправляют, тихо делая нужное каждый раз — до тех пор, пока это не становится нормой.",
        },
    },
    { type: "heading", text: { en: "The starting point", ru: "Точка отсчёта" } },
    {
        type: "paragraph",
        text: {
            en: "Before FlowBus, the team didn't write unit tests. Not out of disagreement with the practice — it just wasn't part of how work happened, and nobody had made it part of the default PR shape.",
            ru: "До FlowBus команда не писала unit-тесты. Не из-за несогласия с практикой — это просто не было частью того, как строилась работа, и никто не сделал это частью стандартного PR.",
        },
    },
    { type: "heading", text: { en: "What changed", ru: "Что изменилось" } },
    {
        type: "paragraph",
        text: {
            en: "I started attaching unit tests to every pull request against FlowBus, covering whatever functionality that PR touched. No announcement, no mandate — just a consistent example of what a finished PR looked like.",
            ru: "Я начал прикреплять unit-тесты к каждому pull request по FlowBus, покрывая тот функционал, который затрагивал конкретный PR. Без объявлений, без директив — просто последовательный пример того, как выглядит завершённый PR.",
        },
    },
    { type: "heading", text: { en: "The adoption curve", ru: "Кривая принятия" } },
    {
        type: "paragraph",
        text: {
            en: "After about half a year, the team was writing tests for every feature on its own, without being asked. The habit had transferred from one person's PRs to the team's default workflow.",
            ru: "Спустя примерно полгода команда сама писала тесты под каждую фичу, без каких-либо просьб. Привычка перешла из PR одного человека в стандартный рабочий процесс команды.",
        },
    },
    { type: "heading", text: { en: "Where it stands now", ru: "Где это сейчас" } },
    {
        type: "paragraph",
        text: {
            en: "The platform runs over 3,000 unit tests continuously. None of that started with a mandate — it started with one engineer refusing to ship a PR without them, until that stopped being unusual.",
            ru: "Платформа непрерывно прогоняет больше 3000 unit-тестов. Всё это началось не с директивы — оно началось с одного инженера, который отказывался выпускать PR без тестов, пока это не стало нормой.",
        },
    },
];

interface JournalSeed {
    slug: string;
    date: string;
    dateLabel?: string;
    title: Localized;
    category: Localized;
    readMins: number;
    excerpt: Localized;
    status: "published" | "upcoming";
    relatedWorkSlug?: string;
    body?: BlockInput[];
}

const journalSeeds: JournalSeed[] = [
    {
        slug: "flowbus",
        date: "2026-02-11",
        title: {
            en: "Why I Built FlowBus: An Event Bus Without the Boilerplate",
            ru: "Почему я написал FlowBus: шина событий без boilerplate'а",
        },
        category: { en: "Architecture", ru: "Архитектура" },
        readMins: 6,
        excerpt: {
            en: "Every module wanted to talk to every other module, and I was tired of writing the same listener interfaces. Here's the system I built instead — persistent events, generated code, and a permissions model that catches mistakes at compile time.",
            ru: "Каждый модуль хотел общаться с каждым другим модулем, а я устал писать одинаковые listener-интерфейсы. Вот система, которую я построил вместо этого — персистентные события, сгенерированный код и модель прав доступа, которая ловит ошибки на этапе компиляции.",
        },
        status: "published",
        relatedWorkSlug: "flowbus",
        body: flowBusBody,
    },
    {
        slug: "architecture-not-shipped",
        date: "2026-02-25",
        title: {
            en: "An Architecture I Chose Not to Ship",
            ru: "Архитектура, которую я решил не выпускать в релиз",
        },
        category: { en: "Platform", ru: "Платформа" },
        readMins: 5,
        excerpt: {
            en: "We had a real problem with hidden APIs and permissions. I designed a clean fix for it — and then didn't build it, because the honest cost didn't match what the team could actually spend.",
            ru: "У нас была реальная проблема с hidden API и правами доступа. Я спроектировал для неё чистое решение — и не стал его строить, потому что честная цена не совпадала с тем, что команда могла себе позволить.",
        },
        status: "published",
        body: architectureNotShippedBody,
    },
    {
        slug: "navigation-engine-story",
        date: "2026-03-10",
        title: {
            en: "Why I Replaced the Navigation Component Entirely",
            ru: "Почему я полностью заменил Navigation Component",
        },
        category: { en: "Architecture", ru: "Архитектура" },
        readMins: 7,
        excerpt: {
            en: "Off-the-shelf navigation didn't understand session timeouts, privacy gating, or per-screen access rules. So I built a navigation engine that does — and there's no Google navigation library left in the app.",
            ru: "Готовая навигация не понимала таймауты сессии, privacy-гейтинг или пооэкранные правила доступа. Поэтому я построил движок навигации, который понимает — и в приложении больше не осталось ни одной библиотеки навигации от Google.",
        },
        status: "published",
        relatedWorkSlug: "navigation-engine",
        body: navigationEngineBody,
    },
    {
        slug: "testing-culture",
        date: "2026-03-24",
        title: {
            en: "From Zero Unit Tests to 3,000+",
            ru: "От нуля unit-тестов до 3000+",
        },
        category: { en: "Process", ru: "Процесс" },
        readMins: 4,
        excerpt: {
            en: "The team had never written a unit test before I started on FlowBus. Attaching tests to every PR, without making an announcement out of it, was enough to change that.",
            ru: "До того, как я начал работу над FlowBus, команда вообще не писала unit-тесты. Чтобы это изменить, оказалось достаточно прикреплять тесты к каждому PR — без громких объявлений.",
        },
        status: "published",
        relatedWorkSlug: "flowbus",
        body: testingCultureBody,
    },
    {
        slug: "onvif-camera-notes",
        date: "2026-04-01",
        dateLabel: "2026-04",
        title: {
            en: "Notes from the ONVIF Camera Library — draft",
            ru: "Заметки о библиотеке ONVIF-камер — черновик",
        },
        category: { en: "Camera", ru: "Камера" },
        readMins: 0,
        excerpt: {
            en: "Currently in progress. Check back soon.",
            ru: "Пока в работе. Загляните позже.",
        },
        status: "upcoming",
        relatedWorkSlug: "onvif-camera-library",
    },
];

// ---------------------------------------------------------------------------
// WORK — transcribed from frontend/src/data/work.ts
// ---------------------------------------------------------------------------

interface WorkSeed {
    slug: string;
    title: string;
    year: number;
    status: "shipped" | "in-progress";
    summary: Localized;
    stack: string[];
    coverImage?: string;
    featured?: boolean;
    relatedPostSlug?: string;
    caseStudy?: {
        startedLabel: Localized;
        shippedLabel: Localized;
        role: Localized;
        heroImage?: string;
        sections: { heading: Localized; body: Localized }[];
        approach?: { title: Localized; description: Localized }[];
    };
}

const workSeeds: WorkSeed[] = [
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
            startedLabel: { en: "Late 2022", ru: "Конец 2022" },
            shippedLabel: { en: "Mid 2023", ru: "Середина 2023" },
            role: { en: "Lead architect", ru: "Ведущий архитектор" },
            sections: [
                {
                    heading: { en: "Overview", ru: "Обзор" },
                    body: {
                        en: "The requirement was two sentences long: the middleware layer must be built from active objects, and the UI must talk to it only through events. I took that constraint and built the entire application architecture around it, from the middleware contract up through every screen.",
                        ru: "Требование звучало в две строчки: слой middleware должен строиться на active objects, а UI должен общаться с ним только через события. Я взял это ограничение и выстроил вокруг него всю архитектуру приложения — от контракта middleware до каждого экрана.",
                    },
                },
                {
                    heading: { en: "The challenge", ru: "Задача" },
                    body: {
                        en: "A previous platform with a looser architecture made every bug a small investigation. The goal here wasn't just to satisfy the two-line requirement, but to make the resulting system fast to debug — active objects and event-only communication needed to pay for themselves in velocity, not just in structure.",
                        ru: "На предыдущей платформе с более рыхлой архитектурой каждый баг превращался в небольшое расследование. Задача была не просто выполнить требование в две строчки, а сделать так, чтобы результат было быстро отлаживать — active objects и общение только через события должны были окупаться скоростью, а не только структурой.",
                    },
                },
                {
                    heading: { en: "The payoff", ru: "Результат" },
                    body: {
                        en: "Bugs on this architecture were fixed several times faster than equivalent bugs on the platform it replaced — by the team lead's own account, someone who had worked on both.",
                        ru: "Баги в этой архитектуре фиксились в несколько раз быстрее, чем аналогичные баги на платформе, которую она заменила — по словам самого тим-лида, работавшего на обеих.",
                    },
                },
            ],
            approach: [
                {
                    title: { en: "Active objects, not shared state", ru: "Active objects вместо общего состояния" },
                    description: {
                        en: "Each middleware component owns its own thread of execution and mutable state; nothing outside it touches that state directly.",
                        ru: "Каждый компонент middleware владеет своим потоком выполнения и изменяемым состоянием; ничто снаружи не трогает это состояние напрямую.",
                    },
                },
                {
                    title: { en: "Events, not calls", ru: "События вместо вызовов" },
                    description: {
                        en: "The UI layer never calls into middleware directly — every interaction is a published event and a subscribed response.",
                        ru: "UI-слой никогда не вызывает middleware напрямую — любое взаимодействие — это опубликованное событие и подписанный ответ.",
                    },
                },
                {
                    title: { en: "Overlay dialogs, for free", ru: "Overlay-диалоги «из коробки»" },
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
            startedLabel: { en: "Jan 2023", ru: "Янв 2023" },
            shippedLabel: { en: "Aug 2023", ru: "Авг 2023" },
            role: { en: "Sole engineer", ru: "Единственный разработчик" },
            sections: [
                {
                    heading: { en: "Overview", ru: "Обзор" },
                    body: {
                        en: "FlowBus is an event-bus framework built to replace an outdated, ad-hoc communication pattern between the middleware and UI layers of an OEM Android platform. It supports plain pub/sub, sticky events, and — uniquely — persistable events that survive process death by round-tripping through Android Room.",
                        ru: "FlowBus — фреймворк-шина событий, созданный чтобы заменить устаревший, придуманный на ходу способ общения между middleware и UI-слоем Android-платформы для OEM-устройства. Он поддерживает обычный pub/sub, sticky-события и, что особенно ценно, персистентные события, которые переживают смерть процесса за счёт хранения в Android Room.",
                    },
                },
                {
                    heading: { en: "The challenge", ru: "Задача" },
                    body: {
                        en: "Every module wanted to talk to every other module, and the existing approach meant writing a new listener interface, manual registration, and manual unregistration for each one — with a leaked callback waiting on the one screen where someone forgot to unsubscribe. Developers needed to work with event-driven architecture without caring how any of it worked under the hood.",
                        ru: "Каждый модуль хотел общаться с каждым другим модулем, а существующий подход означал: новый listener-интерфейс, ручная регистрация и ручная отписка — под каждый случай, с утечкой callback'а на том единственном экране, где кто-то забыл отписаться. Разработчикам нужно было работать с event-driven архитектурой, не вникая в то, как это устроено под капотом.",
                    },
                },
            ],
            approach: [
                {
                    title: { en: "Codegen over boilerplate", ru: "Кодогенерация вместо boilerplate'а" },
                    description: {
                        en: "A KSP plugin generates everything a persistable event needs from a single annotation — no hand-written Room entities or DAOs.",
                        ru: "KSP-плагин генерирует всё необходимое для персистентного события из одной аннотации — без ручного написания Room-сущностей и DAO.",
                    },
                },
                {
                    title: { en: "Permissions, enforced at compile time", ru: "Права доступа на уровне компиляции" },
                    description: {
                        en: "A compiler-checked permissions system stops a module from subscribing to an event it was never meant to see — a whole class of bugs the old approach couldn't prevent.",
                        ru: "Система прав доступа, проверяемая компилятором, не даёт модулю подписаться на событие, к которому у него не должно быть доступа — целый класс багов, который старый подход просто не мог предотвратить.",
                    },
                },
                {
                    title: { en: "A culture of tests", ru: "Культура тестирования" },
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
            startedLabel: { en: "Jan 2023", ru: "Янв 2023" },
            shippedLabel: { en: "Jun 2023", ru: "Июн 2023" },
            role: { en: "Sole engineer", ru: "Единственный разработчик" },
            sections: [
                {
                    heading: { en: "Overview", ru: "Обзор" },
                    body: {
                        en: "AsyncAPI describes the messages a service publishes and subscribes to; this compiler turns that specification directly into working Kotlin — the MQTT broker client, message models, and topic wiring generated automatically, with HiveMQ used for the generated client at runtime.",
                        ru: "AsyncAPI описывает, какие сообщения сервис публикует и на какие подписывается; этот компилятор превращает такую спецификацию прямо в рабочий Kotlin-код — клиент MQTT-брокера, модели сообщений и привязку топиков он генерирует автоматически, а сгенерированный клиент во время выполнения использует HiveMQ.",
                    },
                },
                {
                    heading: { en: "The challenge", ru: "Задача" },
                    body: {
                        en: "Hand-writing an MQTT client for every message type — the model classes, the serialization, the topic subscriptions — meant the broker integration code grew at the same rate as the number of message types, with the same mistakes repeated by hand each time.",
                        ru: "Написание MQTT-клиента вручную под каждый тип сообщения — модели, сериализация, подписки на топики — означало, что код интеграции с брокером рос вместе с количеством типов сообщений, а одни и те же ошибки повторялись вручную раз за разом.",
                    },
                },
            ],
            approach: [
                {
                    title: { en: "Spec as the source of truth", ru: "Спецификация как единственный источник истины" },
                    description: {
                        en: "The AsyncAPI document is the only thing a developer edits; everything downstream is generated from it.",
                        ru: "AsyncAPI-документ — единственное, что редактирует разработчик; всё остальное генерируется из него.",
                    },
                },
                {
                    title: { en: "Jinja2 templates", ru: "Шаблоны Jinja2" },
                    description: {
                        en: "Kotlin output is produced from a Python + Jinja2 template layer, making the generated code easy to adjust as conventions evolve.",
                        ru: "Kotlin-код генерируется через слой шаблонов на Python + Jinja2 — сгенерированный код легко подстраивать под меняющиеся конвенции.",
                    },
                },
                {
                    title: { en: "HiveMQ at runtime", ru: "HiveMQ во время выполнения" },
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
            startedLabel: { en: "Mar 2024", ru: "Мар 2024" },
            shippedLabel: { en: "Nov 2024", ru: "Ноя 2024" },
            role: { en: "Sole engineer", ru: "Единственный разработчик" },
            sections: [
                {
                    heading: { en: "Overview", ru: "Обзор" },
                    body: {
                        en: "Android's Navigation Component didn't come close to meeting the app's requirements, so I replaced it outright with an engine that owns routing, rendering, and navigation state end-to-end — there is no Google navigation library left anywhere in the app. It communicates with the rest of the system entirely through FlowBus, the event framework built alongside it.",
                        ru: "Navigation Component от Android совершенно не соответствовал требованиям приложения, поэтому я заменил его целиком движком, который сам отвечает за роутинг, рендеринг и состояние навигации от начала до конца — в приложении больше нет ни одной библиотеки навигации от Google. Он общается с остальной системой полностью через FlowBus — фреймворк событий, написанный параллельно с ним.",
                    },
                },
                {
                    heading: { en: "The challenge", ru: "Задача" },
                    body: {
                        en: "Off-the-shelf navigation SDKs couldn't express what this app actually needed: per-screen requirements like session timeouts, privacy-policy gating, and access-level checks, declared and enforced individually rather than bolted on as afterthoughts.",
                        ru: "Готовые SDK для навигации не могли выразить то, что на самом деле требовалось приложению: пооэкранные требования — таймаут сессии, проверка privacy policy, уровень доступа — которые нужно было объявлять и применять по отдельности для каждого экрана, а не прикручивать постфактум.",
                    },
                },
                {
                    heading: { en: "The requirements graph", ru: "Граф требований" },
                    body: {
                        en: "Every screen declares its own requirements — timeout, session state, privacy-policy acceptance, access level, and more — directly in the navigation graph, and the engine enforces them before a screen is ever shown. The same graph also describes app menus: each item gets its own appearance and visibility rules through extension classes, so menus build themselves instead of being hand-assembled per screen.",
                        ru: "Каждый экран объявляет собственные требования — таймаут, состояние сессии, согласие с privacy policy, уровень доступа и другое — прямо в графе навигации, и движок проверяет их ещё до показа экрана. Тот же граф описывает и меню приложения: у каждого пункта — свои правила appearance и visibility через классы-расширения, так что меню собираются сами, а не вручную под каждый экран.",
                    },
                },
                {
                    heading: { en: "Navigation intents", ru: "Intent'ы навигации" },
                    body: {
                        en: "Navigation itself runs through a dedicated intent pipeline rather than direct calls — intents that can be deduplicated, debounced, and queued correctly, instead of racing each other the way ad-hoc navigation calls tend to.",
                        ru: "Сама навигация работает через отдельный pipeline intent'ов, а не через прямые вызовы — их можно дедуплицировать, применять debounce и корректно ставить в очередь, вместо гонок, которые обычно возникают при навигации «напрямую».",
                    },
                },
            ],
            approach: [
                {
                    title: { en: "Routing", ru: "Роутинг" },
                    description: {
                        en: "Graph-based route calculation, isolated from rendering concerns.",
                        ru: "Расчёт маршрута на основе графа, изолированный от логики рендеринга.",
                    },
                },
                {
                    title: { en: "Rendering", ru: "Рендеринг" },
                    description: {
                        en: "Custom tile compositor tuned to the device's frame budget.",
                        ru: "Кастомный tile-компоузер, подстроенный под бюджет кадра устройства.",
                    },
                },
                {
                    title: { en: "State & messaging", ru: "Состояние и обмен сообщениями" },
                    description: {
                        en: "Turn-by-turn state published over FlowBus for any module to consume.",
                        ru: "Состояние навигации по шагам публикуется через FlowBus — любой модуль может его получить.",
                    },
                },
                {
                    title: { en: "Requirements graph", ru: "Граф требований" },
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
            startedLabel: { en: "Feb 2024", ru: "Фев 2024" },
            shippedLabel: { en: "Apr 2024", ru: "Апр 2024" },
            role: { en: "Sole engineer", ru: "Единственный разработчик" },
            sections: [
                {
                    heading: { en: "Overview", ru: "Обзор" },
                    body: {
                        en: "Hierarchical state machines are a natural fit for embedded UI flows, but the popular library the team had been using — kStateMachine — produced code that was, frankly, spaghetti. I wrote a replacement using nothing but idiomatic Kotlin syntax.",
                        ru: "Hierarchical state machine — естественный подход для embedded UI-флоу, но популярная библиотека, которой пользовалась команда — kStateMachine — порождала код, который, честно говоря, был «спагетти». Я написал замену, используя только идиоматичный синтаксис Kotlin.",
                    },
                },
                {
                    heading: { en: "The challenge", ru: "Задача" },
                    body: {
                        en: "The goal wasn't just correctness — kStateMachine was already correct. It was legibility: a developer reading a state definition should see the states, transitions, and guards as clearly as the spec they came from, without wading through a builder-pattern maze.",
                        ru: "Цель была не просто корректность — kStateMachine и так была корректной. Цель — читаемость: разработчик, глядя на определение состояния, должен видеть состояния, переходы и условия так же ясно, как в спецификации, из которой они взялись, не блуждая по лабиринту builder-паттерна.",
                    },
                },
            ],
            approach: [
                {
                    title: { en: "Pure Kotlin syntax", ru: "Чистый синтаксис Kotlin" },
                    description: {
                        en: "No custom builder DSL to learn — state graphs read like ordinary, idiomatic Kotlin.",
                        ru: "Никакого отдельного builder DSL — граф состояний читается как обычный, идиоматичный Kotlin.",
                    },
                },
                {
                    title: { en: "Hierarchy as a first-class concept", ru: "Иерархия как базовое понятие" },
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
            startedLabel: { en: "Jan 2025", ru: "Янв 2025" },
            shippedLabel: { en: "Mar 2025", ru: "Мар 2025" },
            role: { en: "Sole engineer", ru: "Единственный разработчик" },
            sections: [
                {
                    heading: { en: "Overview", ru: "Обзор" },
                    body: {
                        en: "Screens were rendering slowly on Jetpack Compose, and the obvious explanation — weak hardware — wasn't good enough on its own; the app had to run acceptably on that hardware regardless. I went under the hood of Compose's rendering pipeline to find out exactly why, and where the time was going.",
                        ru: "Экраны рендерились медленно на Jetpack Compose, и очевидное объяснение — слабое железо — само по себе ничего не решало: приложению всё равно нужно было работать приемлемо на этом железе. Я разобрался в pipeline рендеринга Compose под капотом, чтобы понять, куда именно уходит время.",
                    },
                },
                {
                    heading: { en: "The challenge", ru: "Задача" },
                    body: {
                        en: "Compose's recomposition and layout model hides a lot of cost behind convenient APIs. Fixing it meant understanding how composables, nodes, and modifiers actually get measured and drawn — then rewriting the hottest paths as lower-level Modifier.Node implementations instead of composable wrappers.",
                        ru: "Модель recomposition и layout в Compose скрывает немалую стоимость за удобным API. Чтобы это исправить, нужно было разобраться, как на самом деле измеряются и рисуются composables, nodes и modifiers — а затем переписать самые горячие пути как низкоуровневые реализации Modifier.Node вместо composable-обёрток.",
                    },
                },
            ],
            approach: [
                {
                    title: { en: "Profile before rewriting", ru: "Сначала профилирование, потом переписывание" },
                    description: {
                        en: "Found exactly which composables were recomposing unnecessarily before touching any code.",
                        ru: "Сначала выяснил, какие composables пересоздаются без необходимости — и только потом начал менять код.",
                    },
                },
                {
                    title: { en: "Modifier.Node over composable wrappers", ru: "Modifier.Node вместо composable-обёрток" },
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
            startedLabel: { en: "Jan 2026", ru: "Янв 2026" },
            shippedLabel: { en: "Q4 2026", ru: "4 кв. 2026" },
            role: { en: "Sole engineer", ru: "Единственный разработчик" },
            sections: [
                {
                    heading: { en: "Overview", ru: "Обзор" },
                    body: {
                        en: "A streaming library for ONVIF-compliant IP cameras, built to run four simultaneous Wi-Fi camera feeds on the same constrained hardware that runs the rest of the platform. It's the project I'm actively building right now.",
                        ru: "Библиотека для стриминга с ONVIF-совместимых IP-камер, рассчитанная на четыре одновременных Wi-Fi видеопотока на том же слабом железе, на котором работает вся остальная платформа. Это проект, над которым я работаю прямо сейчас.",
                    },
                },
                {
                    heading: { en: "The challenge", ru: "Задача" },
                    body: {
                        en: "Cheap, embedded hardware has no room for four decoded video streams running at once, and ONVIF cameras vary wildly in supported stream profiles, codecs, and discovery behavior. The library needs to find cameras reliably (WS-Discovery and IP scanning), onboard and poll them, negotiate a stream profile that fits the device's budget, and still leave room for two-way audio.",
                        ru: "Дешёвое embedded-железо не оставляет запаса для четырёх одновременно декодируемых видеопотоков, а ONVIF-камеры сильно различаются по поддерживаемым stream profiles, кодекам и поведению discovery. Библиотеке нужно надёжно находить камеры (через WS-Discovery и сканирование по IP), онбордить и опрашивать их, договариваться о профиле потока по бюджету устройства — и всё равно оставлять запас для two-way аудио.",
                    },
                },
            ],
            approach: [
                {
                    title: { en: "Discovery & onboarding", ru: "Обнаружение и онбординг" },
                    description: {
                        en: "WS-Discovery and IP-range scanning locate cameras on the network; onboarding polls each one for its capabilities before a stream is ever requested.",
                        ru: "WS-Discovery и сканирование по диапазону IP находят камеры в сети; онбординг опрашивает возможности каждой камеры ещё до запроса потока.",
                    },
                },
                {
                    title: { en: "Stream negotiation", ru: "Согласование потока" },
                    description: {
                        en: "Per-camera stream-profile selection trades resolution and bitrate against the device's decode budget, with fallback across codecs.",
                        ru: "Выбор stream profile для каждой камеры балансирует разрешение и битрейт с бюджетом декодирования устройства, с фолбэком по кодекам.",
                    },
                },
                {
                    title: { en: "NDK-level pipeline", ru: "Pipeline на уровне NDK" },
                    description: {
                        en: "The decode and render path drops to native code where it matters, to keep four concurrent streams inside the frame budget.",
                        ru: "Путь декодирования и рендеринга там, где это критично, уходит в native-код, чтобы удержать четыре потока в рамках бюджета кадра.",
                    },
                },
            ],
        },
    },
];

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

async function createDocument(blocks: BlockInput[]): Promise<string> {
    const document = await prisma.document.create({ data: {} });
    await prisma.block.createMany({
        data: blocks.map((block, index) => ({
            documentId: document.id,
            order: index,
            type: block.type,
            text: "text" in block ? block.text : undefined,
            data: "data" in block ? block.data : undefined,
        })),
    });
    return document.id;
}

async function importJournal() {
    for (const seed of journalSeeds) {
        const existing = await prisma.post.findUnique({ where: { slug: seed.slug } });
        if (existing) {
            console.log(`  skip (exists): journal/${seed.slug}`);
            continue;
        }

        const bodyDocumentId = seed.body ? await createDocument(seed.body) : undefined;

        await prisma.post.create({
            data: {
                slug: seed.slug,
                date: seed.date,
                dateLabel: seed.dateLabel,
                title: seed.title,
                category: seed.category,
                readMins: seed.readMins,
                excerpt: seed.excerpt,
                status: seed.status,
                relatedWorkSlug: seed.relatedWorkSlug,
                bodyDocumentId,
            },
        });
        console.log(`  created: journal/${seed.slug}`);
    }
}

async function importWork() {
    for (const seed of workSeeds) {
        const existing = await prisma.work.findUnique({ where: { slug: seed.slug } });
        if (existing) {
            console.log(`  skip (exists): work/${seed.slug}`);
            continue;
        }

        let caseStudyDocumentId: string | undefined;
        if (seed.caseStudy) {
            const blocks = [...sectionsToBlocks(seed.caseStudy.sections), ...approachToBlocks(seed.caseStudy.approach)];
            caseStudyDocumentId = await createDocument(blocks);
        }

        await prisma.work.create({
            data: {
                slug: seed.slug,
                title: seed.title,
                year: seed.year,
                status: seed.status,
                summary: seed.summary,
                stack: seed.stack,
                coverImage: seed.coverImage,
                featured: seed.featured ?? false,
                relatedPostSlug: seed.relatedPostSlug,
                startedLabel: seed.caseStudy?.startedLabel,
                shippedLabel: seed.caseStudy?.shippedLabel,
                role: seed.caseStudy?.role,
                heroImage: seed.caseStudy?.heroImage,
                caseStudyDocumentId,
            },
        });
        console.log(`  created: work/${seed.slug}`);
    }
}

async function main() {
    console.log("Importing journal...");
    await importJournal();
    console.log("Importing work...");
    await importWork();
    console.log("Done.");
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
