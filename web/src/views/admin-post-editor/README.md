# views/admin-post-editor — PostEditorPage

## 2026-07-19 — Фаза 4: один компонент для create И edit

**Что нужно сделать.** `/admin/journal/new` и `/admin/journal/:slug/edit` —
две страницы, но фактически одна и та же форма с разным начальным
состоянием и разным API-вызовом при сохранении.

**Как сделано.** Один `PostEditorPage({initialPost?})` — `initialPost`
отсутствует для create, присутствует для edit. Внутри — единственная
ветка `if (isEditing) updatePost(...) else createPost(...)`, а не два
отдельных компонента с продублированной разметкой формы. Форма всегда
отправляет ВЕСЬ объект целиком (`PostInput`), даже при редактировании —
не PATCH с частичными полями — тот же принцип "простая админка", что и
в `replaceDocumentContent` на backend (весь список блоков целиком, не
diff).

Все мутации идут через `adminApi.createPost`/`updatePost`/`deletePost`
(`shared/lib/admin-api.ts`) — обычный `fetch()` на `/api/admin/posts`, не
Next.js Server Action, ровно как того требует план Фазы 4 ("тот же API,
которым сможет пользоваться будущее мобильное приложение").

**Понятность для другого разработчика.** `toFormState(post?)` — единственное
место, которое переводит `AdminPostDetail | undefined` в состояние формы
(включая пустые значения по умолчанию для create) — без него значения по
умолчанию для новой формы были бы разбросаны по инициализаторам `useState`.

**Нагрузка.** Не применимо — обычная клиентская форма.

**Расширяемость/заменяемость.** Блочный редактор (`shared/ui/block-editor`)
подключен как есть, без Post-специфичной обёртки — тот же компонент
использует `WorkEditorPage` для кейс-стади.

**Миграция/отказоустойчивость.** Ошибки API (`AdminApiError`, включая
409 при занятом slug и 400 при невалидных данных) показываются прямо под
формой, без потери введённых данных — в отличие от, например, редиректа
на страницу ошибки, который заставил бы администратора набирать текст
поста заново.

**SOLID.** Single Responsibility: `PostEditorPage` не знает, как именно
блоки превращаются в JSON для API — это инкапсулировано в
`draftToBlockInput` (`shared/ui/block-editor`), вызывается один раз перед
отправкой.

## 2026-07-19 — Английский-только + BlockNote + "Add translation"

**Что нужно сделать.** По плану "WYSIWYG-редактор + переводы как отдельные
страницы": эта форма — только английский контент; перевод — отдельный
экран, не поле рядом.

**Как сделано.** `FormState`/`toFormState` больше не держат `{en, ru}` —
`title`/`category`/`excerpt` теперь простые строки (`post.title.en`, не
весь объект), `LocalizedInputField`/`LocalizedTextareaField` заменены на
обычные `Input`/`Textarea` (см. `shared/ui/form/README.md`'s запись про их
удаление). `updatePost` (backend) сам сохраняет существующий `ru`, если
он уже есть — эта страница физически не может его затронуть, ей просто
негде показать это поле.

Кнопка "Add translation"/"Edit translation" (текст зависит от того, есть
ли уже `post.title.ru`) ведёт на `/admin/journal/:slug/translate` —
отдельный экран (`admin-post-translate`), отдельный API-вызов
(`translatePost`), отдельный `<BlockEditor>` на русское тело. Кнопка
показывается только в режиме редактирования (`isEditing`) — у ещё не
сохранённого поста просто нет slug, на который вести.

Блочный редактор — `<BlockEditor ref={blockEditorRef} initialBlocks=.../>`
(`shared/ui/block-editor`, полностью переписан на BlockNote — см. его
README) вместо `BlockListEditor`/`blocks`/`onChange`. `handleSubmit` читает
`blockEditorRef.current?.getBlocks()` один раз при отправке — компонент не
контролируемый, см. `BlockNoteEditor.tsx`'s комментарий про то, почему
`ref`, а не `value`/`onChange`.

**SOLID.** Не изменилось: `PostEditorPage` всё ещё не знает, как блоки
превращаются в JSON — теперь это `editorBlocksToBlockInputs` (внутри
`BlockEditor.getBlocks()`), вызывается так же один раз перед отправкой.
