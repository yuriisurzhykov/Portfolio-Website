# pages/landing — секции JournalPreview и SelectedWork

## 2026-07-18 — `react-router-dom`'s `Link` → `next/link`

Та же механическая замена, что в `journal-list`/`work-list` (`to=` →
`href=`), плюс `"use client"` из-за `useTranslation()`. Остальные секции
лендинга (`Hero`, `Principles`, `TechStack`, `ContactCta`) не используют
react-router и не тронуты в этом шаге.
