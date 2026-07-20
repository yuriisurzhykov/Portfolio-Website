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

## 2026-07-19 — Дата отформатирована, `upcoming` покрашен в тот же warning, что и везде

Мелкая полировка заодно с `PostEditorPage`'s редизайном (см. его README):
`post.slug · post.date` (сырой ISO, `"2026-02-11"`) заменён на
`post.slug · {formatAdminDate(post.date)}` (`"Feb 11, 2026"`, тот же
форматтер, что и в шапке самого редактора — одна и та же дата должна
выглядеть одинаково везде в админке). `<StatusBadge>` для `upcoming`
был `tone="accent"` — единственное место в админке, где upcoming был не
warning (`AdminWorkListPage`'s `in-progress`, новый `<StatusToggle>` в
обоих редакторах — все warning) — исправлено для единообразия, не
намеренное отличие, которое стоило сохранить.

## 2026-07-20 — Строка списка переехала в `shared/ui/admin-list-item`

Разметка одной карточки поста (`<Card>` + бэйдж/slug/дата/Edit/Delete) —
теперь `<AdminListItem>`, общий с `admin-work-list`. Полный разбор
(причина — живая обратная связь по скриншоту узкого списка, как устроена
hover-анимация Edit/Delete) — в `shared/ui/admin-list-item/README.md`.
Этот файл больше не рендерит `<Card>` напрямую, только решает, что
подставить в `badges`/`meta` для поста (статус-бэйдж + `formatAdminDate`).
