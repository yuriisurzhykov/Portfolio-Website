# views/admin-work-list — AdminWorkListPage

Тот же паттерн, что и `views/admin-journal-list` (см. его README для
полного объяснения): Server Component роута вызывает `getAllWork()`
напрямую, эта страница только рендерит список + delete через
`adminApi.deleteWork()` + `router.refresh()`.
