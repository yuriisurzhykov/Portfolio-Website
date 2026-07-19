# shared/ui/form — Input/Textarea/Select/Checkbox/Field/Localized*Field

## Будет ли переиспользоваться?

Да, максимально: каждое поле в `admin-post-editor`, `admin-work-editor`,
`admin-login` и в самом `block-editor` (Фаза 4) проходит через один из
этих примитивов. Это первый набор компонентов в `shared/ui`, рассчитанный
исключительно на форму ввода данных — до Фазы 4 в проекте не было ни
одной формы (публичный сайт — read-only), поэтому этих компонентов не
существовало раньше.

## 2026-07-19 — Набор примитивов для админ-форм

**Что нужно сделать.** Админка (Фаза 4) — это в основном формы:
Post/Work-метаданные, редактор блоков. Плану явно предписано "per-field
EN/RU text inputs side by side" — не WYSIWYG, не сторонняя форм-библиотека.

**Как сделано.** `Input`/`Textarea`/`Select` — тонкие обёртки над
нативными `<input>`/`<textarea>`/`<select>`, стилизованные в тех же
токенах, что и `Button`/`Card` (`border-border-strong`,
`focus-visible:ring-2 focus-visible:ring-border-highlight`) — не новый
визуальный язык для админки, тот же самый design system. `Field` — label +
control + hint/error, тот же паттерн, что уже применяется built-in в
каждой форме, вынесенный один раз. `Checkbox` — настоящий
`<input type="checkbox">`, визуально спрятанный (`sr-only` + `peer`), а не
`<div>` с `onClick` — клавиатура (Space), скринридеры и обычная форм-
семантика работают бесплатно, тот же принцип, что уже применялся к
`Drawer`'s focus-management в Фазе 3.

`LocalizedInputField`/`LocalizedTextareaField` (`LocalizedField.tsx`) —
самый однозначно переиспользуемый компонент во всём наборе: EN/RU два
поля рядом (`grid-cols-2` на широких экранах, стек на узких), с маленькой
`EN`/`RU`-плашкой в углу каждого поля. Каждое `{en, ru}`-поле в обоих
редакторах (Post: title/category/excerpt; Work: summary/role/startedLabel/
shippedLabel; блоки: text/caption/alt/approachList-items) идёт через один
из этих двух компонентов, а не через две независимые пары `Field`+`Input`,
повторяемые в каждом месте вызова.

**Понятность для другого разработчика.** `LocalizedTextValue` — локальный
тип `{en: string; ru: string}`, СПЕЦИАЛЬНО не импортированный из
`@portfolio/backend`'s `LocalizedText` — этот слайс чисто UI-примитив, не
должен тянуть за собой рантайм-зависимость от backend-пакета только чтобы
описать форму объекта.

**Нагрузка.** Не применимо — обычные контролируемые инпуты, тот же паттерн,
что и везде в React.

**Расширяемость/заменяемость.** Добавление третьего языка (если он
когда-нибудь понадобится) — это `grid-cols-2` → `grid-cols-3` в
`LocalizedField.tsx`, один файл, а не правка каждой формы, которая его
использует.

**Миграция/отказоустойчивость.** Не применимо (нет данных/схемы).

**SOLID.** Single Responsibility по слоям: `Input`/`Textarea`/`Select` не
знают про EN/RU вообще, `LocalizedInputField`/`LocalizedTextareaField`
знают только про "два одинаковых поля рядом", ничего не знают про
конкретные бизнес-поля (title, summary, ...) — эти два компонента
переиспользуются и `PostEditorPage`, и `WorkEditorPage`, и `BlockFields`
без единой правки.
