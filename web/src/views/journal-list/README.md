# pages/journal-list — JournalListPage

## 2026-07-18 — `react-router-dom`'s `Link` → `next/link`

Механическая замена: `import { Link } from "react-router-dom"` →
`import Link from "next/link"`, `to="..."` → `href="..."`. Добавлен
`"use client"` (компонент использует `useTranslation()`, см.
`shared/i18n/README.md` про то, почему это требует клиентской границы).
Логика сортировки/рендера записей журнала не менялась.
