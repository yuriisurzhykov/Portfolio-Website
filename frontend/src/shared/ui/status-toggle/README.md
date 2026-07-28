# shared/ui/status-toggle — StatusToggle

## Будет ли переиспользоваться?

Да, с самого начала: `PostEditorPage` (published/upcoming) и
`WorkEditorPage` (shipped/in-progress) both need "a control that changes
a status" — different value types, different tone mapping, but the exact
same interaction/visual shape. Two independent copy-pasted segmented
controls would drift the moment one gets a visual tweak the other
doesn't.

## 2026-07-19 — Почему цветной тоггл, а не `<Select>` + текст

**Что нужно сделать.** Пользователь: "status должен иметь какой-то
цветовой индикатор даже в панели редактирования" — до этого статус был
обычным `<Select>` с текстом ("published"/"upcoming"), без цвета вообще, в
отличие от списков (`AdminJournalListPage`/`AdminWorkListPage`), которые
уже красили статус через `<StatusBadge>`.

**Как сделано.** `StatusToggle<T extends string>` — ряд самих
`<StatusBadge>` (`shared/ui/status-badge`, тот же компонент, что и на
публичном сайте и в списках админки — не новый визуальный язык), каждый
оборачивающий `<button>` — клик меняет `value` напрямую, а не отдельный
`<Select>` рядом с бэйджем-только-для-показа. Один компонент — это и
индикатор, и контрол ввода одновременно, а не два разных представления
одного и того же состояния.

Generic по `T` (не `PostStatus`/`WorkStatus` напрямую): `options: {value,
label, tone}[]` передаётся с каждого места вызова со своим маппингом
статус→цвет (`published`→success/`upcoming`→warning у постов,
`shipped`→success/`in-progress`→warning у проектов — те же цвета, что уже
использовались в списках, просто теперь и в самом редакторе).

**Понятность для другого разработчика.** `role="radiogroup"`/`role="radio"`/
`aria-checked` — семантически это ровно группа радио-кнопок (выбор одного
значения из небольшого фиксированного набора), просто стилизованная как
цветные пилюли, а не как классические кружки.

**Нагрузка.** Не применимо — пара кнопок в форме.

**Расширяемость/заменяемость.** Третий статус (если он когда-нибудь
понадобится, скажем, "archived") — ещё один элемент в массиве `options`
на месте вызова, не правка этого компонента.

**Миграция/отказоустойчивость.** Не применимо.

**SOLID.** Open/Closed: сам `StatusToggle` не знает ни про `PostStatus`,
ни про `WorkStatus`, ни про какой-либо конкретный enum — он закрыт для
изменений при добавлении новой сущности со статусом, расширяется только
через проп `options`.
