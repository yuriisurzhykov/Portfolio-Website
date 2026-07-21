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
`IconPickerField` (`web/src/shared/ui/icon-picker/`) — None/Link/Icon
переключатель + живой preview, для причин/деталей самого компонента см.
его собственный README, а не дублировать здесь. Единственное, что
специфично этой форме: `createItem` инициализирует новую строку с `icon:
{ type: "none" }` (та же логика, что уже применена к
`title`/`description` — пустые, но валидные значения, не `undefined`), а
`handleSubmit` тримит `icon.value` (для `"url"`/`"icon"`) той же ручной
логикой, что уже применена к `title.en`/`description.en` — `IconRef`
достаточно мал, чтобы не заводить для этого отдельную общую утилиту
за пределами этого файла.

## Тесты и проверка

No component-level tests here — every field in these forms is a plain
controlled `Input`/`Textarea`/`Checkbox` (already covered by
`shared/ui/form`), and the interesting logic (comma/newline join-split
round-tripping, the discriminated-union dispatch) is straightforward
enough to verify by reading it, matched against
`backend/src/content/site-content.test.ts`'s coverage of the actual
validation/persistence. Verified live instead (see
`backend/src/content/README.md`'s Phase 5 entry and `web/README.md`'s):
logged in as a throwaway admin user, opened `/admin/settings/contact`,
`PUT` a change through the real `/api/admin/settings/contact` route, and
confirmed the public homepage reflected it immediately — then reverted
the value and deleted the throwaway user.
