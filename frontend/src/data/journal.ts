import type { ContentBlock } from "@/shared/ui/content-blocks";
import type { Localized } from "@/shared/i18n";

/**
 * JOURNAL / BLOG
 * ---------------
 * Powers the landing "From the Journal" preview, the /journal commit-log,
 * and (when `body` is present) the /journal/:slug post page.
 *
 * To publish a new post: append an object with a `body` block array. To
 * announce a draft without writing it yet: append one without `body` and
 * `status: "upcoming"`. Prose fields are `Localized<string>` — resolve
 * with `pick()` from `useTranslation()`.
 */

export interface JournalPost {
    slug: string;
    /** ISO date; formatted per-view (log entry vs. post meta). */
    date: string;
    /** Override for irregular dates (e.g. a month-only "upcoming" stub). */
    dateLabel?: string;
    title: Localized<string>;
    category: Localized<string>;
    readMins: number;
    excerpt: Localized<string>;
    status: "published" | "upcoming";
    relatedWorkSlug?: string;
    body?: ContentBlock[];
}

const flowBusBody: ContentBlock[] = [
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

const navigationEngineBody: ContentBlock[] = [
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

const architectureNotShippedBody: ContentBlock[] = [
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

const testingCultureBody: ContentBlock[] = [
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

export const journal: JournalPost[] = [
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
