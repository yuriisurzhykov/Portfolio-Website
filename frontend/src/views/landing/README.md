# pages/landing — секции JournalPreview и SelectedWork

## 2026-07-19 — Фаза 5: Hero/TechStack/Principles/ContactCta стали пропс-driven

`Hero`, `ContactCta`, `Principles`, `TechStack` (все "use client", читали
статические `@/data/*` напрямую) больше не импортируют данные сами —
каждый принимает свою секцию как проп (`hero`/`contact`/`principles`/
`techStack`, плюс `role`/`email` из `config` для `Hero`/`ContactCta`
конкретно, а не весь `ConfigContent` — Interface Segregation, эти два
компонента используют ровно одно поле конфига каждый). `LandingPage`
получает все 5 значений от `app/(site)/page.tsx` (один `Promise.all` рядом
с уже существующими `getFeaturedWork()`/`getLatestPublishedPost()`) и
раздаёт их секциям — сами секции ничего не знают про `@portfolio/backend`
как источник, только про форму данных (`HeroContent`/`ContactContent`/...).
Подробности схемы/фолбэков — `backend/src/content/README.md`'s Фаза 5.

## 2026-07-18 — `react-router-dom`'s `Link` → `next/link`

Та же механическая замена, что в `journal-list`/`work-list` (`to=` →
`href=`), плюс `"use client"` из-за `useTranslation()`. Остальные секции
лендинга (`Hero`, `Principles`, `TechStack`, `ContactCta`) не используют
react-router и не тронуты в этом шаге.
