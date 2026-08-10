# views/admin-work-editor — WorkEditorPage

## 2026-08-09 — Черновик/публикация разведены: autosave больше никогда не пишет в живой work-item

Идентично `admin-post-editor/README.md`'s одноимённой записи — тот же
`saveWorkDraft` (было `updateWork`), тот же единый Publish/Update-эндпоинт
(`adminApi.publishWork`), та же кнопка **Discard changes**
(`adminApi.discardWorkDraft`), та же **Preview** (открывает
`/work/[slug]?preview=1`), та же **History**
(`views/admin-work-history`), тот же `draftSlug`/`currentSlug`
(pending-переименование vs. живой, маршрутизируемый slug), тот же
`<BlockEditor key={contentVersion}>` для принудительного remount после
Discard/восстановления из истории, то же удалённое auto-unpublish
уведомление. Единственная Work-специфичная деталь: `Discard`/`Load into
draft` сбрасывают ЦЕЛИКОМ секцию "Case study" (`form.hasCaseStudy` +
`startedLabel`/`shippedLabel`/`role`/`heroImage`), не только тело — весь
кейс-стади это одна условно рендерящаяся секция формы, у которой нет
отдельного механизма частичного откат.

## 2026-07-31 — Фаза 3 (мгновенный черновик + непрерывный autosave)

Идентично `admin-post-editor/README.md`'s одноимённой записи — тот же
`useAutosaveDraft<WorkInput, WorkSummary>`, тот же убранный `handleSubmit`/
Submit-кнопка (заменена на "Back to list" + `Saving…`/`Saved just now`/
`Save failed — retrying` индикатор рядом с `<StatusToggle>`), тот же
`onCreated` → `router.replace('/admin/work/[slug]/edit')`, тот же
`autosave.flush()` перед Publish, тот же перенос auto-unpublish уведомления
в `onSaved`. Единственные Work-специфичные детали:

- `buildInput()` включает `caseStudy` целиком (или `null`) — ровно то же,
  что `handleSubmit` собирало раньше, теперь просто читается на каждую
  попытку сохранения, а не один раз при сабмите.
- `<BlockEditor onChange={autosave.scheduleSave}>` подключен только внутри
  секции "Case study", т.к. сам блочный редактор рендерится условно
  (`form.hasCaseStudy`) — как и раньше, никакого Work-специфичного
  ветвления внутри самого `BlockEditor`.
- Дефолт `status` — `"in-progress"`, не `"shipped"` (то же рассуждение,
  что у `PostEditorPage`'s `"upcoming"`, применённое к Work-терминологии).

**SOLID.** Не появилось ни одной новой Work-специфичной абстракции — тот
же дженерик-хук `useAutosaveDraft`, что и у `Post`, что и было целью его
дизайна (см. `shared/lib/README.md`'s запись).

## 2026-07-31 — Фаза 2 (lifecycle state machine): Publish/Unpublish + auto-unpublish notice

Идентично `admin-post-editor/README.md`'s одноимённой записи — тот же
`lifecycleState` `useState`, тот же `<StatusBadge>` + Publish/Unpublish
кнопка, вызывающие `adminApi.publishWork`/`unpublishWork`, тот же
"остаться на странице вместо редиректа" ТОЛЬКО когда safety-net
(`updateWork`) молча снял элемент с публикации. Единственное
Work-специфичное отличие — формулировка `notice` упоминает "summary или
case-study field" вместо "excerpt или category", отражая, какие поля
`workPublishSchema` реально требует.

## 2026-07-19 — Фаза 4: "Has a case study" как единый переключатель

**Что нужно сделать.** У `Work` кейс-стади — необязательный "пакет" из
пяти полей (startedLabel/shippedLabel/role/heroImage/blocks) сразу, не
пять независимо необязательных полей — так и в модели данных
(`backend/src/content/work.ts`'s `CaseStudy | null`).

**Как сделано.** Одна checkbox "Has a case study" (`form.hasCaseStudy`)
управляет видимостью всех пяти полей + блочного редактора сразу. При
снятии галочки перед отправкой на API уходит `caseStudy: null` целиком
(см. `admin-work.ts`'s `updateWork` — это очищает и лейблы, и удаляет
`Document` с блоками). Это прямое отражение формы данных на форму UI, а не
пять чекбоксов "показывать это необязательное поле" по отдельности.

`title`/`stack` у `Work`, в отличие от `Post`, НЕ локализованы (`title`
— обычная строка, `stack` — `string[]`, не `{en, ru}[]`) — форма отражает
это буквально: `title` — один `Input`, не `LocalizedInputField`; `stack`
— один `Input` с comma-separated списком (`"Kotlin, Jetpack Compose"` →
`["Kotlin", "Jetpack Compose"]` при сохранении), не редактор списка тегов
— самое простое, что покрывает реальный сценарий (короткий список
технологий, редко меняется).

**Понятность для другого разработчика.** Hint у поля "Title" прямо
говорит "Not localized — same value in both languages on the public
site" — без этого неочевидно, почему у `Work.title` нет пары EN/RU полей,
в отличие от почти всех остальных полей в обоих редакторах.

**Нагрузка/Расширяемость.** См. `admin-post-editor/README.md` — та же
архитектура (один компонент на create+edit, `adminApi`, целиковая
отправка формы), применённая к `Work`.

**Миграция/отказоустойчивость.** Не применимо.

**SOLID.** Тот же `BlockListEditor` (`shared/ui/block-editor`), что и в
`PostEditorPage`, без единой Work-специфичной ветки внутри него —
Liskov-подобная гарантия: компонент ведёт себя одинаково независимо от
того, редактирует он тело поста или нарратив кейс-стади.

## 2026-07-19 — Английский-только + BlockNote + "Add translation"

**Что нужно сделать.** См. `admin-post-editor/README.md`'s одноимённая
запись — тот же план, та же логика, применённая к `Work`.

**Как сделано.** `summary`/`startedLabel`/`shippedLabel`/`role` — теперь
простые строки (`work.summary.en`, ...), не `{en, ru}`; кнопка "Add
translation"/"Edit translation" (по `work.summary.ru`) ведёт на
`/admin/work/:slug/translate` (`admin-work-translate`). Единственная
Work-специфичная деталь: перевод кейс-стади (лейблы + блоки) — часть той
же страницы перевода, но её раздел скрыт целиком, если у элемента ещё
нет ДАЖЕ английского кейс-стади (`hasCaseStudy: false`) — см.
`getWorkTranslationForAdmin`'s комментарий в backend. Блочный редактор —
тот же новый `<BlockEditor>` (`shared/ui/block-editor`, BlockNote), что и
в `PostEditorPage`, всё ещё без единой Work-специфичной ветки внутри
самого компонента редактора.

## 2026-07-19 — Тот же автослаг + цветной статус, что и у `PostEditorPage`

**Что нужно сделать.** Живая обратная связь пользователя по
`PostEditorPage` (см. его README) — автогенерация slug из title и
цветовой индикатор статуса — не специфична для постов; у `Work` тот же
`slug`+`status` UX-долг.

**Как сделано.** Тот же `slugify()` (`shared/lib/slugify.ts`) и тот же
`slugTouched`-паттерн (не трогает slug при retitling существующего
элемента, только у нового), тот же `<StatusToggle>`
(`shared/ui/status-toggle`) с маппингом `shipped`→success/`in-progress`→
warning — те же цвета, что уже использовались в `AdminWorkListPage`.
`date`/`dateLabel`/`category`/`excerpt` не касается `Work` вообще — эти
поля не в его модели, только у `Post`.

**SOLID.** Ноль новых Work-специфичных абстракций — оба переиспользованных
кусочка (`slugify`, `StatusToggle`) уже были написаны генерично при
первом использовании в `PostEditorPage`, ровно как и было задумано.

## 2026-07-19 — "Я вообще не понял, что такое Work" — секции, а не безымянная стена полей

**Что нужно сделать.** Живая обратная связь пользователя: форма создания
`Work` выглядела "ужасно и максимально confusing" — не было понятно, что
такое `Work` в принципе, чем оно отличается от журнала, и что означают
конкретные поля (`coverImage` vs `heroImage`, `startedLabel`/
`shippedLabel`, "Has a case study").

**Как сделано.** Форма разбита на две ЯВНО подписанные секции с
описанием под заголовком, а не два визуально одинаковых `<Card>` без
подписи:

1. **"Portfolio card"** — поля, которые получает КАЖДЫЙ элемент
   (title/slug/summary/year/stack/cover image/featured/related post) —
   это то, что видно на `/work` и (если featured) на лендинге.
2. **"Case study (optional)"** — весь пакет started/shipped/role/hero
   image/тело, с явным заголовком-объяснением: это отдельная страница
   `/work/{slug}`, не то же самое, что карточка выше.

Плюс под самим `<h1>` — одна строка, напрямую отвечающая на "что такое
Work и чем оно отличается от journal": Work — "что ты построил"
(портфолио-леджер), Journal — "что ты написал" (дневник с датами).

Каждый конкретно-запутанный hint переписан на то, ГДЕ именно поле
реально показывается, а не абстрактное описание:
- **Cover image** — старый hint ("small ledger/card thumbnail") был
  ПРЯМО НЕВЕРНЫМ: `/work`-леджер вообще не использует `coverImage`,
  только "Selected Work" грид на лендинге. Исправлено на честное
  "only used on the landing page's grid, not on the /work ledger".
- **Hero image** — hint теперь явно противопоставлен Cover image ("the
  large banner... different from the small Cover image above").
- **Started/Shipped** — hint теперь прямо говорит "free-text, not an
  exact date" (это была главная путаница — выглядит как поле даты, но
  принимает `"Jan 2023"`, а не `2023-01-15`). Лейбл поля "Shipped"
  дополнительно становится "Target" прямо в UI, когда статус
  `in-progress` — то же самое, что уже происходит на публичной
  странице кейс-стади, просто теперь видно и во время редактирования,
  не только после публикации.
- **"Has a case study"** чекбокс получил `hint` (новый проп у
  `Checkbox`, `shared/ui/form/Checkbox.tsx` — раньше чекбокс мог
  показывать только `label`, ничего под ним) — объясняет ПОСЛЕДСТВИЕ
  галочки ("turns the card into a clickable link to a full detail
  page"), не просто повторяет название поля.

**Найденная по дороге живая ошибка (не гипотетическая — увидена в
реальном dev-сервере пользователя).** Первая версия новых hint'ов
экранировала вложенные кавычки как `"...\"Selected Work\"..."` — то есть
обычный JSX-атрибут (`hint="..."`), где backslash-escape кавычек ПРОСТО
НЕ РАБОТАЕТ (в отличие от обычного JS string literal) — Turbopack упал
с `Expected unicode escape`, что на живом сайте пользователя проявилось
как каскад `500` на `/journal`, `/admin/journal`, `/work/...` (все
страницы, которые транзитивно импортируют этот файл через layout).
Исправлено переводом таких hint'ов в `{"..."}` (JS-выражение, где
backslash-escape кавычек — валидный синтаксис), а во ВЕЗДЕ, где кавычки
попадали в JSX-ТЕКСТ (не атрибут) — на типографские `“ ”`/`’` вместо
прямых `"`/`'` (тот же приём, что нужен и по правилу линтера
`react/no-unescaped-entities`, не только по синтаксису).

**Понятность для другого разработчика.** Комментарий у нового `hint`-пропа
`Checkbox` явно сравнивает его с `Field`'s hint — не отдельная,
непохожая идея, а тот же паттерн "объяснение под контролом", просто для
чекбоксов, которых раньше в наборе примитивов не было.

**SOLID.** `Checkbox`'s `hint` — Open/Closed: существующий вызов в
`HeroSettingsForm.tsx` (несвязанная фича) не потребовал никаких
изменений — новый проп опциональный, старое поведение не изменилось.
