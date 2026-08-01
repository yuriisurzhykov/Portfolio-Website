# views/admin-work-list — AdminWorkListPage

Тот же паттерн, что и `views/admin-journal-list` (см. его README для
полного объяснения): Server Component роута вызывает `getWorkForAdmin()`
напрямую (не публичную `getAllWork()` — см. 2026-07-31 запись ниже, та же
причина, что и у `admin-journal-list`), эта страница только рендерит
список + delete через `adminApi.deleteWork()` + `router.refresh()`.

## 2026-07-31 — Фаза 2 (lifecycle state machine): вкладки Draft/Published

Идентично `admin-journal-list`'s одноимённой записи — `lifecycleOptions()`,
`<StatusToggle>`, фильтрация на клиенте, Published-вкладка первой. Ничего
Work-специфичного в самой механике вкладок — единственное отличие от
Post здесь то, что `getWorkForAdmin()`'s имя не оканчивается на "s"
(`getPostsForAdmin`, но `getWorkForAdmin`) — та же конвенция, что уже
использует `getAllWork` (не `getAllWorks`), "work" трактуется как
собирательное существительное во всём этом файле.

## 2026-07-20 — Строка списка переехала в `shared/ui/admin-list-item`

Та же карточка, тот же компонент, что теперь и в `admin-journal-list` —
см. `shared/ui/admin-list-item/README.md` для полного разбора. Единственное,
что здесь специфично для `Work`: `badges` — это ДВА бэйджа (статус +
опционально "Featured"), не один, и `meta` — год (`item.year`), не
отформатированная дата.
