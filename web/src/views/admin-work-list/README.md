# views/admin-work-list — AdminWorkListPage

Тот же паттерн, что и `views/admin-journal-list` (см. его README для
полного объяснения): Server Component роута вызывает `getAllWork()`
напрямую, эта страница только рендерит список + delete через
`adminApi.deleteWork()` + `router.refresh()`.

## 2026-07-20 — Строка списка переехала в `shared/ui/admin-list-item`

Та же карточка, тот же компонент, что теперь и в `admin-journal-list` —
см. `shared/ui/admin-list-item/README.md` для полного разбора. Единственное,
что здесь специфично для `Work`: `badges` — это ДВА бэйджа (статус +
опционально "Featured"), не один, и `meta` — год (`item.year`), не
отформатированная дата.
