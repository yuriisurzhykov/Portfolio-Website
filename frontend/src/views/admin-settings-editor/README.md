# views/admin-settings-editor — SettingsEditorPage

## Будет ли переиспользоваться?

Да — `app/admin/(dashboard)/settings/[key]/page.tsx` is the only route
that renders it, but it dispatches to 7 different small forms (one per
`SiteContentKey`), the same "one View per page, delegate to per-type
pieces" shape as `admin-work-editor`/`shared/ui/block-editor`.

## Зачем `SettingsEditorPage` — дискриминированный union, а не generic-проп

**Что нужно сделать.** Один Server Component
(`app/admin/(dashboard)/settings/[key]/page.tsx`) читает `key`/`initialData`
via `getSiteContent(key)` and needs to render the right form.

**Как сделано.** `SettingsEditorPageProps` — a real discriminated union
(`{ settingsKey: "hero"; initialData: HeroContent } | ...`), not
`{ settingsKey: SiteContentKey; initialData: SiteContentDataMap[SiteContentKey]
}`. The latter would let `initialData` be, say, `TechStackContent` while
`settingsKey` is `"hero"` — the two properties' types wouldn't be tied
together at all. With the discriminated union, the `switch` inside
`SettingsEditorPage.tsx` narrows `initialData` to the exact right shape
per `case`, with zero casts inside this file. The one place a route-param
string genuinely becomes this union — `app/admin/(dashboard)/settings/[key]/page.tsx`
— needs one explicit cast (commented there), because `isSiteContentKey()`
only narrows to the `SiteContentKey` union, not to a specific literal a
discriminated union needs. Same class of generic-indexed-access gap as
`backend/src/content/site-content.ts`'s own comments on
`getSiteContent`/`updateSiteContent`, just at the Server→Client Component
boundary instead of inside one function.

## Зачем `BilingualField` здесь, а не в `shared/ui/form`

`Post`/`Work` deliberately dropped a shared EN+RU-side-by-side field
(`LocalizedField`, see `shared/ui/form/README.md`) in favor of
English-only edit screens plus a separate `/translate` route — right for
a `Document`-backed body, where a translation can restructure into a
completely different block list. A `SiteContent` section has no
equivalent "structure" a translation could diverge on:
`hero.subhead`/`contact.heading`/etc. are always exactly one English
string and one Russian string. Splitting 7 tiny sections into 7 extra
`/admin/settings/[key]/translate` routes would be pure overhead for
content this small, so `fields/BilingualField.tsx` intentionally brings
back a single "both languages, one form" field — scoped to this view
only, not reinstated in `shared/ui/form`, since the reasoning is specific
to settings sections, not a general-purpose admin editing pattern.

## Зачем `useSiteContentForm` не хранит форму целиком

`useSiteContentForm(key)` only owns submit/error/"saved" state — it
deliberately does NOT hold each form's field state the way a single
combined component would. Each settings form has a genuinely different
shape (`hero.graphNodes` is an array; `config` is flat scalars), and
several fields need a derived, editing-only representation that isn't the
storage shape at all — `hero.headline`/`hero.chips` are edited as
comma-joined strings, `workPage.heading` as newline-joined lines,
converted to the real `SiteContentDataMap[K]` shape only in `handleSubmit`.
This is the exact same pattern `admin-work-editor`'s `WorkEditorPage` already
uses for its comma-separated `stack` field — forcing all 7 forms through
one generic `useState<SiteContentDataMap[K]>` would mean editing those
derived representations THROUGH the real shape on every keystroke, which
is the pitfall that pattern avoids.

## `ListEditor` — reorder is up/down buttons, not drag-and-drop

> Since 2026-08-06 `techStack` no longer uses this — see the dated entry
> below for why that one section outgrew it, and why `ListEditor` itself
> was deliberately left alone rather than generalized over both shapes.

Shared by `principles`, `techStack`, and `hero.graphNodes` — the same
add/remove/move-up/move-down implementation instead of three near-copies.
Matches the reasoning the admin block editor's predecessor
(`BlockListEditor`, deleted when BlockNote replaced it — see
`shared/ui/block-editor/README.md`) used: no drag-and-drop dependency,
fully keyboard/screen-reader operable, and these lists are short enough
(a handful of rows) that drag-and-drop would be more machinery than the
UX needs. Rows are keyed by array index (no stable per-item id exists in
storage — `SiteContent` stores the whole array as one JSON value), an
acceptable trade for a single admin editing a handful of rows
infrequently.

## 2026-07-21 — `PrinciplesSettingsForm` получает `IconPickerField`

Каждая строка `ListEditor` для `principles` теперь начинается с
`IconPickerField` (`frontend/src/shared/ui/icon-picker/`) — None/Link/Icon
переключатель + живой preview, для причин/деталей самого компонента см.
его собственный README, а не дублировать здесь. Единственное, что
специфично этой форме: `createItem` инициализирует новую строку с `icon:
{ type: "none" }` (та же логика, что уже применена к
`title`/`description` — пустые, но валидные значения, не `undefined`), а
`handleSubmit` тримит `icon.value` (для `"url"`/`"icon"`) той же ручной
логикой, что уже применена к `title.en`/`description.en` — `IconRef`
достаточно мал, чтобы не заводить для этого отдельную общую утилиту
за пределами этого файла.

## 2026-08-06 — `TechIconPickerField` получает пятую опцию: Custom SVG

Добавлен `type: "svg"` — `<Textarea>` для вставки сырого `<svg>...</svg>`
рядом с Auto/Brand/Link/None, для технологии без реального лого в Simple
Icons и без готовой картинки по ссылке (`"Coroutines & Flow"` и
подобные). Живой preview использует тот же `TechIcon`-рендерер, что и
публичный лендинг — санитайзинг (`shared/lib/sanitize-svg.ts`) происходит
там же, так что превью в админке никогда не может "выглядеть безопасно",
а на публичной странице — иначе. Подробное рассуждение (включая находку
про DOMPurify и SSR) — в `shared/lib/tech-icons/README.md`.

## 2026-08-06 — `TechStackSettingsForm` получает `TechIconPickerField` (Auto/Brand/Link/None)

**Что нужно сделать.** Секция Tech Stack на лендинге переехала с текстовых
тегов на ряд логотипов (`views/landing/sections/TechStack.tsx`) — админке
нужен способ управлять тем, какой логотип показывается на каждой строке,
с автоматическим угадыванием по умолчанию и явным override.

**Как сделано.** `TechIconPickerField` (`fields/TechIconPickerField.tsx`)
— аналог `IconPickerField` с другим набором типов (`auto`/`brand`/`url`/
`none`, не `none`/`url`/`icon` — см. `techIconSchema`'s собственный
комментарий в `backend/src/content/site-content.ts` за тем, почему это не
один обобщённый пикер на оба случая). Ключевое отличие от
`IconPickerField`: этот компонент НИКОГДА не импортирует
`shared/lib/tech-icons`'s runtime-экспорты (там `simple-icons`,
~3450 иконок) — только TYPE `TechIconView` (эрейзится на компиляции).
Оба live-preview (угадывание для `"auto"`, поиск для `"brand"`) идут через
`/api/admin/tech-icons` — новый admin-only роут, который умеет либо
`?auto=<name>` (резолвит РОВНО тем же `resolveTechIcon`, что и публичный
лендинг — превью не может разойтись с тем, что реально покажется), либо
`?q=<query>` (поиск по каталогу, каждый результат уже с `path`, чтобы не
делать второй round-trip на превью).

`TechIconPickerField` получает `techName` отдельным пропом (не читает его
из `value`) — превью для `"auto"` реагирует на поле Name ЭТОЙ ЖЕ строки в
реальном времени, пока админ его редактирует, без необходимости
переоткрывать пикер.

**Понятность для другого разработчика.** Комментарий над компонентом прямо
объясняет, почему это НЕ `IconPickerField` с другим списком типов, а
отдельный компонент — иначе следующий разработчик мог бы попытаться их
объединить и потерять оба смысла `"none"`.

**Расширяемость/заменяемость.** Если `principles` когда-нибудь тоже
захочет "угадывать" иконку автоматически (сейчас у него только `IconRef`
без `"auto"`), `TechIconPickerField`'s подход (роут + `resolveTechIcon`)
переносится почти без изменений — `IconRef`/`iconRefSchema` при этом не
трогаются, раз это генерализация `IconRef` не имела смысла с самого
начала (см. schema-level комментарий).

**Миграция/отказоустойчивость.** Ни одной Prisma-миграции — `icon` на
`techStack`-строке уже добавлен в той же фазе (см.
`backend/src/content/README.md`). `/api/admin/tech-icons` — read-only
GET, ничего не пишет; сбой (например, БД недоступна — хотя сам роут её не
трогает вовсе, он читает только `simple-icons`, статический npm-пакет) не
может испортить сохранённые данные, только показать пустой превью.

**SOLID.** Interface Segregation, тот же принцип, что уже применён по
всему этому файлу: `TechIconPickerField` знает только про
`{name, icon, onChange}`-контракт, не про то, как физически резолвится
"auto"/ищется "brand" — вся эта логика инкапсулирована на сервере
(`shared/lib/tech-icons`), недоступна и не нужна клиентскому коду вообще.

> Частично заменено в тот же день, см. следующую запись: оба live-preview
> и проп `techName` из этого компонента убраны (строка списка теперь сама
> показывает резолвленный логотип), а `GET ?auto=<name>` заменён на
> batch-`POST`. Остальное — набор типов, поиск по каталогу, аргументация
> «почему это не `IconPickerField`» — в силе.

## 2026-08-06 — `techStack` переезжает с `ListEditor` на собственный редактор списка (`tech-stack/`)

**Что нужно было сделать.** Прямая формулировка пользователя: «требуется очень
много времени чтобы добавить tech stack… когда ты хочешь добавить штук 20 их —
это просто кошмар, это нереально». И это ровно так и было: `techStack`
рендерился через общий `fields/ListEditor`, то есть КАЖДАЯ технология — это
карточка с полем Name, пятикнопочным `TechIconPickerField` (со своим
собственным live-preview и полем поиска) и двухъязычным полем Note. Двадцать
строк — это ~8000px вертикали и двадцать походов по форме ради того, чтобы,
по сути, набрать двадцать слов.

**Почему это НЕ доработка `ListEditor`.** `ListEditor` не сломан — он ровно
такой, каким должен быть для `principles` (четыре строки настоящего текста) и
`hero.graphNodes`. Проблема не в его реализации, а в том, что `techStack` —
принципиально другой тип списка: длинный, из коротких однословных записей,
где 95% строк не нуждаются ни в каком редактировании кроме имени. Растягивать
`ListEditor` на оба сценария означало бы засунуть в него режимы
(compact/expanded, quick-add, drag) ради одного из трёх потребителей — это
нарушение и SRP, и OCP сразу. Поэтому `tech-stack/` — отдельная реализация,
а `ListEditor` остался нетронутым для двух своих остальных вызовов.

**Как сделано.**

- `TechStackQuickAdd` — одно поле, три способа ввода: имя + Enter (строка с
  `icon: { type: "auto" }`, которая сама находит свой логотип в подавляющем
  большинстве случаев), ↓ + выбор из живого поиска по каталогу (строка,
  прибитая к конкретному Simple Icons slug'у, — для случаев, где угадать по
  имени невозможно), и вставка списка через запятую/перевод строки/точку с
  запятой/таб (все имена сразу). Фокус после каждого добавления остаётся в
  поле, поле очищается — двадцать технологий это двадцать слов и двадцать
  Enter'ов.
- `TechStackRow` — одна строка высотой 48px: ручка переупорядочивания,
  живой логотип, имя (редактируется прямо в строке), что получился за
  логотип, и удаление. Иконочный override и Note — за раскрывающимся блоком,
  свёрнутым по умолчанию.
- `TechStackEditor` — сборка, drag-n-drop переупорядочивание с явной линией
  вставки, счётчики и полоса «On the landing page».

**Три вещи, которые старый редактор скрывал, а этот показывает.**

1. **Строка без логотипа не попадает на сайт вообще.**
   `views/landing/tech-stack-view.ts`'s `buildTechStackView` ФИЛЬТРУЕТ такие
   строки (`icon.kind !== "none"`), и это самое неочевидное свойство всей
   секции: раньше можно было добавить «Coroutines & Flow», сохранить и просто
   никогда не увидеть её на лендинге, без единого намёка на то, почему.
   Теперь у такой строки жёлтый чип «No logo», а над списком — счётчик
   «N rows have no logo and won't appear on the site». `icon-status.ts`
   отделяет это от осознанного `type: "none"` («Hidden», нейтральный тон):
   резолвятся обе в `{ kind: "none" }`, но только вторая — ошибка.
2. **Строка без имени не сохраняется.** `toTechStackContent` её отбрасывает
   (безымянная строка не резолвит логотип и рендерится как дырка), и об этом
   сказано вслух, а не молча.
3. **Есть несохранённые изменения.** `SettingsFormFooter` получил
   необязательный `dirty` (передаёт только эта форма — остальные шесть секций
   помещаются на экран целиком) и стал `sticky bottom-0`: список теперь
   достаточно длинный, чтобы кнопка Save оказалась в нескольких экранах от
   строки, которую только что правишь.

**Почему reorder — drag-n-drop, хотя `ListEditor` осознанно выбрал
Up/Down-кнопки.** Аргумент `ListEditor`'а («списки короткие, drag — лишняя
машинерия») здесь просто не выполняется: перенести строку с 20-й позиции на
1-ю кнопками — это 19 кликов. При этом сохранено то, ради чего тот выбор
делался: никакой сторонней библиотеки (нативный HTML5 DnD) и полная
управляемость с клавиатуры — ручка это настоящий `<button>`, ↑/↓ на ней
двигают строку. `draggable` включается только пока ручка зажата: постоянный
`draggable` на строке ломает выделение текста в поле имени внутри неё.
`reorder.ts`'s `moveItem` — вставка, а не обмен местами (для шага в одну
позицию это одно и то же, для перетаскивания через полсписка — совсем нет).

**Почему у строки появился клиентский `id` (`identified-tech.ts`).**
`ListEditor` кеирует строки по индексу массива и документирует потерю фокуса
при reorder как приемлемый компромисс. Здесь этот компромисс перестаёт быть
приемлемым: при индексном ключе React переиспользует DOM-узел ПОЗИЦИИ, а не
переносит узел СТРОКИ — фокус остаётся на слоте, который строка только что
покинула, и каждое «переместить вверх» требует заново найти строку глазами.
Монотонный счётчик стоит нисколько. `id` намеренно никогда не попадает в
DOM (только React `key`), иначе серверный и первый клиентский рендер
разошлись бы в значении атрибута.

**Почему один batch-запрос на резолв, а не по одному на строку.**
`resolveTechIcon` тянет `simple-icons` (~3450 иконок), который не должен
попадать в клиентский бандл, — значит, превью в любом случае идёт через
сервер (и это же гарантирует, что превью — буквально то же вычисление, что
делает публичная страница, а не его копия, которая может разойтись).
`GET ?auto=<name>` (по одному имени за запрос) заменён на
`POST /api/admin/tech-icons` со всем списком: вставка 20 технологий раньше
означала бы 20 round-trip'ов. `useResolvedTechIcons` кеширует по
`resolutionKey` — ключу из того, и только того, от чего логотип реально
зависит (имя учитывается лишь для `type: "auto"`), поэтому правка имени в
списке из 30 строк отправляет один элемент, а не тридцать, и только после
паузы в наборе.

**Почему `TechIconPickerField` потерял собственное превью.** У него их было
два (резолв `"auto"` по имени строки и повторный резолв уже сохранённого
`"brand"`-слага), каждое со своим запросом и со своим `techName`-пропом,
протянутым из формы. Всё это существовало потому, что сама строка не
показывала ничего. Теперь строка показывает живой резолвленный логотип на
одну строку выше — второе превью здесь было бы той же картинкой дважды и
двумя лишними round-trip'ами ради её синхронизации. Осталось единственное
превью, которое строка показать не может по определению: миниатюра у каждого
РЕЗУЛЬТАТА ПОИСКА — картинка того, что ещё не выбрано, и она не стоит
дополнительного запроса (поиск и так возвращает `path`).

**Найдено вживую, а не рассуждением.** `BilingualField` рендерил английскую
сторону как `required`. Пока все поля всегда были на экране, это было
незаметно; в свёрнутом по умолчанию блоке — тоже, но стоило раскрыть строку с
пустым Note, и браузер блокировал submit всей формы полем, заполнить которое
никто не просил (`techStack[].note` не рендерится на сайте нигде). Отсюда
`required?: boolean` с дефолтом `true` — шесть остальных форм не тронуты.

**Отказоустойчивость.** Ни одной миграции, схема не менялась.
`POST /api/admin/tech-icons` — read-only, ничего не пишет и не трогает БД
вообще (только статический npm-пакет), так что его отказ не может испортить
данные. Провалившийся резолв оставляет строки в состоянии «неизвестно»
(`null`), а НЕ помечает их как «нет логотипа» — иначе одна сетевая ошибка
показала бы весь список сломанным; повтор не делается сознательно (цикл
запросов к уже несчастливому серверу ради превью), перезагрузка страницы
пробует заново.

**SOLID.** SRP по файлам: разбор ввода (`parse-tech-input.ts`),
переупорядочивание (`reorder.ts`), формулировка статуса (`icon-status.ts`) и
резолв (`use-resolved-tech-icons.ts`) — четыре независимые, чистые (кроме
последней) единицы, каждая тестируется без DOM. DIP на границе с сервером:
редактор знает контракт «список `{name, icon}` → список `TechIconView`», а не
то, как именно резолвится `auto` или ищется `brand`. OCP: `ListEditor` не
изменился ни на строку, хотя `techStack` перестал им пользоваться.

## Тесты и проверка

No component-level tests here — every field in these forms is a plain
controlled `Input`/`Textarea`/`Checkbox` (already covered by
`shared/ui/form`), and the interesting logic (comma/newline join-split
round-tripping, the discriminated-union dispatch) is straightforward
enough to verify by reading it, matched against
`backend/src/content/site-content.test.ts`'s coverage of the actual
validation/persistence. Verified live instead (see
`backend/src/content/README.md`'s Phase 5 entry and `frontend/README.md`'s):
logged in as a throwaway admin user, opened `/admin/settings/contact`,
`PUT` a change through the real `/api/admin/settings/contact` route, and
confirmed the public homepage reflected it immediately — then reverted
the value and deleted the throwaway user.

### 2026-08-06 — `tech-stack/`

That "no component tests" line still holds for the six other forms, but
not for this one: the tech-stack editor has real logic, so the pure parts
are unit-tested directly, with assertions written so a single flipped
operator or off-by-one actually fails (this repo's mutation-testing
rule):

- `parse-tech-input.test.ts` — separators that DO split (`,`/`;`/newline/
  tab) and ones that must NOT (`&`, `/`, or "C++"/"C#" collapsing into one
  key), case-insensitive dedupe against both the batch and the existing
  list, the entry payload surviving the filter, and every branch of the
  "N already in the list" copy including the exactly-three boundary of the
  three-name cap.
- `reorder.test.ts` — insertion vs. swap distinguished by an explicit
  long-move case (a swap implementation returns a visibly different
  array), both inclusive bounds, every out-of-range case, and
  no-mutation.
- `icon-status.test.ts` — branch ORDER, which is the whole point: an
  explicit `type: "none"` and a nonexistent `brand` slug both resolve to
  `{ kind: "none" }`, and only the second may warn; plus "pending must
  never look like a warning", and `hidden` agreeing with
  `buildTechStackView`'s own filter for every variant.

Verified live in a real browser (throwaway admin, since deleted), not
just type-checked: typing a name + Enter adds one row; pasting
"Terraform, Grafana, Prometheus, Rust" adds three and reports Rust as
already present; ↓ + Enter on a catalog result stores the catalog's own
title (`PostgreSQL`, not the typed `postgre`); dragging row 5 onto row 1
inserts it there and shifts the rest; ↑ on a focused grip moves the row
AND keeps focus on that row's grip (the whole reason rows got ids); the
"Unsaved changes" hint appears and the summary line counts the rows that
resolve to no logo. Also checked the two failure modes on the new route
directly: `POST` without the CSRF header → 403, `{"items":[{"name":1}]}`
→ 400 with the field path, not a 500.
