# views/admin-work-editor — WorkEditorPage

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
