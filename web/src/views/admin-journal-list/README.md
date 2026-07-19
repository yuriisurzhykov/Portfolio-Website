# views/admin-journal-list — AdminJournalListPage

## 2026-07-19 — Фаза 4: список + delete, без loopback на собственный API для чтения

Получает `entries: PostSummary[]` как prop — переданы Server Component'ом
роута (`app/admin/(dashboard)/journal/page.tsx`), который вызывает
`getJournalEntries()` напрямую (тот же вызов, что использует и публичная
`/journal`), а не делает `fetch("/api/admin/posts")` из своего же
Server Component. `/api/admin/posts` (GET) существует и полноценен — как
JSON-контракт для будущего мобильного клиента — но самому SSR-рендерингу
внутри одного процесса он не нужен, лишний сетевой прыжок в никуда.

Удаление — единственная мутация на этой странице — идёт через
`adminApi.deletePost()` (обычный `fetch`), затем `router.refresh()`, чтобы
Server Component перезапросил список у базы. Подтверждение —
`window.confirm()`, не кастомный модал: одна редко используемая
деструктивная операция в инструменте на одного пользователя не оправдывает
компонент диалога подтверждения.

Тот же паттерн (список из Server Component + `adminApi.deleteX` +
`router.refresh()`) — в `views/admin-work-list`, без изменений.
