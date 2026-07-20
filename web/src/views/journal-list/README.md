# pages/journal-list — JournalListPage

## 2026-07-19 — `dateLabel` удалён, дата форматируется одинаково для published/upcoming

**Что нужно сделать.** Пользователь не понимал, зачем в админке отдельное
поле "Date label" рядом с датой — предложил просто использовать дату
поста и форматировать её, без отдельного override-поля. См.
`backend/src/content/README.md`'s одноимённую запись — `Post.dateLabel`
удалён из схемы целиком, не просто скрыт из формы.

**Как сделано.** `formatDate(post, ln)` (локальная функция, читавшая
`post.dateLabel ?? post.date`) удалена; обе ветки (published/upcoming)
теперь используют один общий `formatMonthYear()` (вынесен в новый
`shared/lib/date-format.ts` — до этого была ЛОКАЛЬНАЯ копия форматтера в
`JournalDetailPage.tsx`, теперь одна штука на оба места). Для upcoming
всё ещё показывается суффикс "· upcoming" (ключ `status.upcoming`) —
только сама дата отформатирована как везде, а не читается из
свободно-текстового поля.

**Найденная по дороге настоящая ошибка (не гипотетическая).** Первая
версия `formatMonthYear`/`formatAdminDate` не указывала `timeZone: "UTC"`
у `Intl.DateTimeFormat` — `new Date("2026-01-01")` парсится как UTC-полночь,
а форматирование без явной таймзоны рендерит в ЛОКАЛЬНОЙ таймзоне вызова;
в любой таймзоне западнее UTC это отображало ПРЕДЫДУЩИЙ день. Поймано
юнит-тестом (`shared/lib/date-format.test.ts`), не инспекцией кода —
`expect(formatAdminDate("2026-02-11")).toBe("Feb 11, 2026")` реально упал
с `"Feb 10, 2026"`. Исправлено добавлением `timeZone: "UTC"` в оба
форматтера.

## 2026-07-19 — Фаза 5: `journalPage` intro copy стало пропсом

`JournalListPage` больше не импортирует `journalPage` из `@/data/journalPage`
(файл удалён) — принимает его как проп `journalPage: JournalPageContent`,
приходящий из `app/(site)/journal/page.tsx`'s `getSiteContent("journalPage")`
рядом с уже существующим `getJournalEntries()`. См.
`backend/src/content/README.md`'s разбор Фазы 5.

## 2026-07-18 — `react-router-dom`'s `Link` → `next/link`

Механическая замена: `import { Link } from "react-router-dom"` →
`import Link from "next/link"`, `to="..."` → `href="..."`. Добавлен
`"use client"` (компонент использует `useTranslation()`, см.
`shared/i18n/README.md` про то, почему это требует клиентской границы).
Логика сортировки/рендера записей журнала не менялась.
