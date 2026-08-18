# views/admin-work-history — WorkHistoryPage

## 2026-08-09 — Новый слайс: Work-версия `admin-post-history`

Идентично `views/admin-post-history/README.md` — тот же список
`RevisionSummary[]`, та же кнопка "Load into draft"
(`adminApi.restoreWorkRevision`), то же явное "не публикует ничего сама".
Отдельный компонент, не generic над `kind`, по тому же принципу, что уже
применён ко всей паре Post/Work admin-экранов в этом приложении — см.
`frontend/README.md`'s дневник за эту же дату.
