# pages/work-list — WorkListPage

Та же механическая замена `Link`, что в `pages/journal-list/README.md`.
Логика сортировки/рендера ledger-строк не менялась.

## 2026-07-19 — Фаза 5: `workPage` intro copy стало пропсом

Та же замена, что в `pages/journal-list/README.md`'s Фазе 5 запись:
`workPage` теперь проп (`WorkPageContent`), не статический импорт из
`@/data/workPage` (файл удалён) — приходит из `app/(site)/work/page.tsx`'s
`getSiteContent("workPage")`.
