# Journal and Work Editor Frontend Redesign Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Checkboxes describe implementation work that has not yet been performed.

**Goal:** Replace the Journal and Work editing forms with one consistent authoring workspace that prioritizes the body, separates properties from actions, and preserves the existing content model.

**Architecture:** Reuse the existing design system and BlockNote integration. Introduce a shared workspace widget and focused feature slices for properties, URL editing, and content actions. Keep Journal and Work payload construction and API adaptation in their own view controllers.

**Tech stack:** Next.js App Router, React, TypeScript, Tailwind CSS v4, the existing token compiler, BlockNote, Vitest, Testing Library, and Playwright. Use the installed repository versions. No new UI framework, editor engine, global state library, or form generator is required.

**Spec:** [Approved Figma proposal](https://www.figma.com/design/fcuFQxIzBI3r4S54LGqeW0?node-id=4-2), followed by the URL clarification in this document. Figma is a composition reference. The behavior and data contracts below take precedence over illustrative Figma text.

**Baseline:** `yuriisurzhykov/Portfolio-Website`, branch `master`, commit `e91d464ccb73bfb0ed1d8bc236322d2382393105`, inspected on October 29, 2026. All paths are relative to the repository root. Existing paths are verified against this commit; paths marked **new** are proposed.

**Deliverable status:** Technical specification and implementation plan. The application has not been modified by preparing this document.

## Global constraints

- Follow the repository's FSD structure: `app → views → widgets → features → shared`. Lower layers must not import higher layers. Feature slices must not import one another; compose them through the view.
- Use the active token chain rooted in `frontend/src/app/styles/index.css`. The former single `tokens.ts` has been replaced by `shared/ui/theme/tokens/`, compiled output, and the Tailwind adapter. Do not recreate the obsolete file.
- Use existing color, dimension, radius, typography, motion, and layout tokens. Do not introduce literal colors, pixel dimensions, arbitrary color classes, or copied Figma values in components. Do not edit generated token files manually.
- Use Public Sans for UI and prose and JetBrains Mono for code and technical values. Scope editor overrides so they cannot restyle public article rendering or translation editors accidentally.
- Mount one BlockNote document per active editor. Layout changes, metadata edits, tabs, Focus mode, and viewport changes must not recreate it.
- Autosave writes drafts. Only an explicit publication action applies the draft to public content. Preserve translation data and existing slug history behavior.
- The agreed URL policy is mandatory: automatic until first publication unless manually overridden; stable after any publication, including after unpublishing. This replaces the current first-save boundary.
- Keep API access in the existing `adminApi` boundary. Client code may import backend contract types, but must not import server runtime modules, Prisma, or publish schemas that pull server dependencies into the browser.
- Add comments explaining ownership, race prevention, or invariants. Do not add comments that merely restate JSX.

## Review focus

| Failure condition | Required behavior | Owning task |
| --- | --- | --- |
| A new document has body content but no title | Persist a draft after the contract prerequisite is implemented; never report an unsaved body as saved | Task 5 |
| A previously published item is unpublished and then retitled | Keep its URL stable; publication history, not current lifecycle alone, controls automatic URL behavior | Task 4 |
| A user changes Work tabs, mobile panels, or Focus mode with a selection and undo history | Preserve the same editor instance, body, selection, and undo history | Tasks 2 and 6 |
| Save fails or another edit arrives during save or publication review | Do not publish stale content or navigate away as if save succeeded | Tasks 5 and 7 |
| A Work item has no case study, or its removal is cancelled | Keep card-only data valid; cancelling removal preserves the complete case study | Task 3 |

## 1 Product behavior

### 1.1 Workspace composition

| Region | Responsibility | Content |
| --- | --- | --- |
| Persistent top bar | Identity and state | Back navigation, content kind, a short document label, date information, draft save state, publication state, unpublished changes |
| Left panel | Editable properties | Title, descriptive metadata, relationships, and URL summary |
| Center | Authoring | Body, editor formatting, block insertion, and Focus control |
| Right panel | Deliberate actions | Review and publish, preview, version history, translation, content status controls, and destructive actions |

The first editable body block is available immediately. The user must not scroll through metadata to reach it. Title remains in the properties panel; a body heading is article content and must not silently become the title field.

The top bar remains visible while each desktop panel scrolls independently. Use one page-level scroll strategy, not nested page and editor scrollbars competing for the same gesture. The center has `min-width: 0` and all grid children have `min-height: 0` so long content does not expand the shell.

On compact screens, show Body, Details, and Actions as three workspace panels. Only one panel participates in layout and keyboard navigation at a time. Keep the editor mounted while its panel is inactive. Focus mode hides the two side panels and expands the body region without changing the document.

### 1.2 Journal property mapping

| Existing value | New location and control | Rule |
| --- | --- | --- |
| `title` | Left panel, multiline title field | Separate from body; required for publication |
| `category` | Left panel, searchable single-value combobox | One category; allow choosing an existing category or explicitly creating a new one |
| `excerpt` | Left panel, textarea | Teaser for the journal list; not an article lead block |
| `relatedWorkSlug` | Left panel, `RelatedItemPicker` | Optional; existing Work options only; allow clearing |
| `slug` / `draftSlug` | Left panel, read-only URL summary plus Edit URL dialog | Apply the policy in section 5 |
| `blocks` | Center, existing `BlockEditor` | Preserve all supported blocks, rich text, paste handling, and shortcuts |
| `status` | Right panel, clearly named Journal listing status control | Preserve `published` and `upcoming`; do not confuse this with `lifecycleState` |
| `date` | Top bar, display only | Server-assigned Journal date; not editable |
| `readMins` | Quiet saved-draft summary | Use the most recently saved server result; no full document serialization on every keypress |

Existing lead, note, code, image, diagram, list, and smart-link blocks remain body content. This change must not convert them into new metadata fields.

### 1.3 Work property mapping

| Existing value | New location and control | Rule |
| --- | --- | --- |
| `title`, `summary` | Left panel, Card tab | Title field and summary textarea |
| `stack` | Left panel, Card tab, existing `TokenCombobox` | Multiple free-text technology values; retain trimming and deduplication |
| `date` | Left panel, Card tab, date input | Editable portfolio sorting date; it is not a creation timestamp |
| `coverImage` | Left panel, Card tab, image URL field in an expanded section | Home-page cover use; do not invent an upload service |
| `relatedPostSlug` | Left panel, Card tab, existing `RelatedItemPicker` | Optional existing Journal reference |
| `slug` / `draftSlug` | Shared URL summary below the tabs | Same policy as Journal |
| `hasCaseStudy` | Explicit case-study enable control | A card-only project remains a complete supported mode |
| `startedLabel`, `shippedLabel`, `role`, `heroImage` | Left panel, Case study tab | Preserve free-text date labels; display Target while `in-progress` and Shipped otherwise |
| `caseStudy.blocks` | Center | Use the same BlockEditor implementation as Journal |
| `status` | Right panel | Preserve `in-progress` and `shipped` |
| `featured` | Right panel | Feature on the home page |

When case study is disabled, the center shows an explanation and an Add case study action, not a body that will be silently omitted from the payload. Switching Card and Case study property tabs never toggles case-study existence.

Removing a populated case study opens a confirmation dialog explaining that its metadata and body will be removed from the draft. Cancelling leaves everything intact. Confirming removes the whole package on the next save; public content remains unchanged until publication.

### 1.4 Action hierarchy

The primary action is Review and publish for a never-published item and Review changes for a published item with pending edits. The confirmation action is Publish or Publish update. Preview is secondary. History and translation use quiet buttons. Delete belongs in More actions. Unpublish and Discard draft changes remain explicit actions with confirmation.

Show draft save state, publication state, and content status as separate concepts. A Published badge must never mean that the newest local text is already public. Do not show a redundant Update action when there are neither local edits nor a saved pending draft.

## 2 Current implementation and consequences

| Verified source | Current behavior | Consequence for this change |
| --- | --- | --- |
| `frontend/src/views/admin-post-editor/PostEditorPage.tsx` | Form state, autosave wiring, lifecycle actions, category picker, and presentation are in one component | Extract the controller and field sections; make the page a composition root |
| `frontend/src/views/admin-work-editor/WorkEditorPage.tsx` | Similar actions are duplicated; card and case-study fields form a long vertical page | Reuse the shared workspace and actions; keep Work payload semantics explicit |
| `frontend/src/app/admin/(dashboard)/layout.tsx` | Adds AdminNav, page padding, and a maximum-width wrapper | A full authoring workspace needs a separate route-group layout |
| `frontend/src/shared/ui/block-editor/BlockNoteEditor.tsx` | Uncontrolled document; `initialBlocks` read once; `getBlocks()` serializes on demand | Retain this ownership model; add a narrow editing surface API |
| `frontend/src/shared/lib/use-autosave-draft.ts` | One request in flight; coalesced follow-up; three-minute debounce; retry after five seconds; `flush()` waits and rejects on failure | Preserve those guarantees; add honest dirty state and explicit resource identity reconciliation |
| Both editor views | First save uses `isEmpty: input.title.trim().length === 0` | Body-only draft creation needs both client and server changes |
| Both editor views | `slugTouched` starts from `isEditing` | Reloading a saved draft stops title-derived URL updates before first publication |
| `backend/src/content/admin-posts.ts`, `admin-work.ts` | Both draft input schemas require a nonempty title | Changing only the frontend empty check is insufficient |
| `frontend/src/shared/ui/related-item-picker/RelatedItemPicker.tsx` | Single-value, existing-options-only selection | Preserve that restriction when sharing combobox mechanics |
| `frontend/src/shared/ui/token-combobox/TokenCombobox.tsx` | Multiple values with free-text creation | Keep it for Work stack; do not force relationships or category into a multi-value API |
| `frontend/src/shared/ui/status-badge/StatusBadge.tsx` | Solid status colors avoid the light-theme contrast problem described in its source | Do not copy the Figma dark-theme tinted badges into the light theme without validation |

The inspected Work summary does not expose a creation timestamp. Therefore use Portfolio date for Work in the status bar, or omit that date there. Do not relabel `Work.date` as Created. A real Created label requires a separately supplied creation timestamp.

## 3 Reuse architecture and ownership

### 3.1 Shared UI primitives

Extend existing public components before adding alternatives. A second editor-specific Button, Input, Textarea, Badge, or relationship picker is prohibited.

| Component | Action | Ownership boundary |
| --- | --- | --- |
| `Button` | Extend with a reusable flat appearance and a danger variant; retain default appearance for existing callers | Visual variants, disabled/loading/focus behavior; no API calls |
| `Input`, `Textarea` | Share control styles and add an inset appearance for tool panels | Native input semantics, refs, visual states; no autosave |
| `Field` | Improve hint/error IDs and description wiring | Label, hint, error layout and accessible association |
| `StatusBadge` | Add a compact normal-case presentation if needed | Status appearance; preserve contrast-safe color treatment |
| `SingleValueCombobox` **new** | Extract single-value selection mechanics; support closed options or explicit creation | Keyboard operation, listbox, focus, query and selection mechanics |
| `RelatedItemPicker` | Keep its public API; adapt options to the shared combobox in closed mode | Existing-content relationship semantics |
| `TokenCombobox` | Reuse as is unless a demonstrated shared style defect requires a correction | Multi-value free-text stack editing |
| `Dialog` **new** | Use native modal-dialog behavior with a controlled React wrapper | Accessible name, focus containment, Escape/cancel, and focus restoration |
| `BlockEditor` | Extend the existing component with an authoring appearance and toolbar | BlockNote ownership and editor-library integration |

Do not reuse the current Drawer as a complete accessibility solution without changes. Its inspected implementation handles Escape, portal placement, scroll lock, and inactive content, but does not implement an open-dialog focus trap. The compact workspace in this plan uses panels rather than modal drawers. URL editing and confirmations use the shared Dialog.

### 3.2 Feature and widget boundaries

| Slice | Responsibilities | Must not own |
| --- | --- | --- |
| `features/edit-content-properties` **new** | Journal properties, Work card properties, Work case-study properties, and category selection | BlockNote document, router, API mutations, publication lifecycle |
| `features/edit-content-url` **new** | URL policy reducer, URL summary, manual-edit dialog, pending-address explanation | Server uniqueness guarantees, live route identity, post/work API selection |
| `features/manage-content` **new** | Shared action presentation, confirmation/review UI, and ordered action coordination through callbacks | Form fields, work-specific payload construction, server runtime imports |
| `widgets/content-editor` **new** | Status bar, three-column layout, compact panels, Focus mode, and slot placement | Journal/Work API selection or form validation rules |
| `views/admin-post-editor` | Journal controller, payload mapping, API adapters, and composition | A private copy of shared controls or workspace layout |
| `views/admin-work-editor` | Work controller, card/case-study payload mapping, API adapters, and composition | Journal conditionals inside shared UI |

Keep the two view controllers separate. Their state and serialization differ materially. Reuse the genuinely common action coordinator and UI instead of a large `useUniversalEditor<T>` with `isWork` branches, optional fields, and casts.

### 3.3 Proposed component contracts

The following are internal application contracts, not claims about the BlockNote library API. Implement library integration inside `shared/ui/block-editor` using the installed package's types.

```ts
// widgets/content-editor/model/types.ts
export type WorkspacePanel = "body" | "details" | "actions";

export interface ContentEditorWorkspaceProps {
  statusBar: React.ReactNode;
  properties: React.ReactNode;
  body: React.ReactNode;
  actions: React.ReactNode;
  compactPanel: WorkspacePanel;
  onCompactPanelChange(panel: WorkspacePanel): void;
  focusMode: boolean;
  onFocusModeChange(enabled: boolean): void;
}

// features/edit-content-url/model/types.ts
export type UrlMode = "auto" | "manual";
export interface ContentUrlState {
  canonicalSlug: string | null;
  draftSlug: string;
  mode: UrlMode;
  hasEverBeenPublished: boolean;
}

// features/manage-content/model/types.ts
export interface PublicationIssue {
  field: string;
  message: string;
}
export interface ContentActionPort {
  flushDraft(): Promise<void>;
  getResourceSlug(): string | null;
  getEditRevision(): number;
  validateForPublication(): PublicationIssue[];
  publish(): Promise<void>;
  unpublish(): Promise<void>;
  discardDraft(): Promise<void>;
  deleteContent(): Promise<void>;
}
```

The view supplies callbacks that reconcile its normalized server result, autosave identity, lifecycle state, and route. The action coordinator never guesses whether to call `publishPost` or `publishWork`.

Property components are controlled through typed values and field-level callbacks. They render server-provided options and field errors. They do not receive the whole view controller, a general-purpose mutable form object, or the editor ref.

## 4 Exact frontend file map

### 4.1 Existing files to modify

| Path | Required change |
| --- | --- |
| `frontend/src/views/admin-post-editor/PostEditorPage.tsx` | Replace vertical form markup with workspace composition; delegate state/actions to the Journal controller; remove local CategoryPicker after migration |
| `frontend/src/views/admin-work-editor/WorkEditorPage.tsx` | Compose shared workspace; render explicit card-only or case-study body; delegate Work state and serialization |
| `frontend/src/views/admin-post-editor/README.md` | Document controller boundaries, new layout, URL policy, autosave and publication invariants |
| `frontend/src/views/admin-work-editor/README.md` | Document Card/Case study tabs and whole-package removal semantics |
| `frontend/src/shared/ui/form/Input.tsx`, `Textarea.tsx`, `Field.tsx`, `index.ts` | Reusable inset appearance, unified states, accessible error/hint wiring, and public exports |
| `frontend/src/shared/ui/button/Button.tsx`, `Button.types.ts` | Flat appearance and danger variant; preserve defaults for existing consumers |
| `frontend/src/shared/ui/status-badge/StatusBadge.tsx` | Compact presentation only if required; keep existing semantic tones and accessible colors |
| `frontend/src/shared/ui/related-item-picker/RelatedItemPicker.tsx` | Delegate common selection mechanics to SingleValueCombobox while preserving options-only behavior |
| `frontend/src/shared/ui/block-editor/BlockNoteEditor.tsx`, `index.ts` | Authoring appearance, toolbar integration, focus/selection/readonly API; retain current default for translations |
| `frontend/src/shared/lib/use-autosave-draft.ts` | Dirty tracking, resource identity access and adoption, and race-safe status reporting |
| `frontend/src/shared/lib/use-autosave-draft.test.ts` | Verify new guarantees alongside the existing coalescing and retry cases |
| `frontend/playwright.config.ts` | Include the new editor suite in the intended viewport projects; current Tablet and Mobile projects only match `visual.spec.ts` |
| `frontend/tests/e2e/generate-pages-manifest.ts` | Inspect route discovery assumptions after route moves; update only if its admin path handling requires it |

`frontend/src/app/styles/globals.css` and the default appearance of unrelated public components are not the place to implement editor-specific layout. Use scoped component styles.

### 4.2 New files

| New path | Responsibility |
| --- | --- |
| `frontend/src/widgets/content-editor/index.ts` | Public workspace exports |
| `frontend/src/widgets/content-editor/model/types.ts` | Workspace and status-view contracts |
| `frontend/src/widgets/content-editor/ui/ContentEditorWorkspace.tsx` | One mounted slot tree for desktop, compact, and Focus layouts |
| `frontend/src/widgets/content-editor/ui/EditorStatusBar.tsx` | Persistent identity and distinct save/publication states |
| `frontend/src/widgets/content-editor/ui/WorkspacePanelNavigation.tsx` | Accessible Body/Details/Actions controls |
| `frontend/src/widgets/content-editor/ui/content-editor.css` | Token-based grid, panel scrolling, responsive and Focus rules |
| `frontend/src/features/edit-content-properties/index.ts` | Public metadata component exports and types |
| `frontend/src/features/edit-content-properties/model/types.ts` | Journal and Work property values and field errors |
| `frontend/src/features/edit-content-properties/ui/JournalProperties.tsx` | Journal metadata field composition |
| `frontend/src/features/edit-content-properties/ui/WorkProperties.tsx` | Shared tab selection and Work property section composition |
| `frontend/src/features/edit-content-properties/ui/WorkCardProperties.tsx` | Portfolio card fields |
| `frontend/src/features/edit-content-properties/ui/WorkCaseStudyProperties.tsx` | Case-study metadata and enable/remove controls |
| `frontend/src/features/edit-content-properties/ui/CategoryField.tsx` | One creatable category value using the shared combobox |
| `frontend/src/features/edit-content-url/index.ts` | Public URL feature API |
| `frontend/src/features/edit-content-url/model/types.ts` | URL state and reducer action types |
| `frontend/src/features/edit-content-url/model/url-policy.ts` | Pure automatic/manual/frozen URL transitions |
| `frontend/src/features/edit-content-url/ui/ContentUrlField.tsx` | Effective URL, live URL when different, and Edit URL action |
| `frontend/src/features/edit-content-url/ui/EditUrlDialog.tsx` | Explicit manual URL editing and validation |
| `frontend/src/features/manage-content/index.ts` | Public action and review API |
| `frontend/src/features/manage-content/model/types.ts` | Action port and publication issue contracts |
| `frontend/src/features/manage-content/model/useContentActions.ts` | Flush, confirmation, publication review, and operation sequencing |
| `frontend/src/features/manage-content/ui/ContentActions.tsx` | Unified action hierarchy for both editors |
| `frontend/src/features/manage-content/ui/PublicationReviewDialog.tsx` | Saved-draft review and issue summary |
| `frontend/src/features/manage-content/ui/ConfirmContentActionDialog.tsx` | Shared destructive-action confirmation |
| `frontend/src/shared/ui/form/control-styles.ts` | Shared Input/Textarea visual classes; retain `inputBaseStyles` export compatibility |
| `frontend/src/shared/ui/single-value-combobox/{SingleValueCombobox.tsx,types.ts,index.ts}` | Single-value combobox with closed and creatable modes |
| `frontend/src/shared/ui/dialog/{Dialog.tsx,index.ts}` | Shared native dialog wrapper |
| `frontend/src/shared/ui/block-editor/EditorToolbar.tsx` | Formatting and insertion controls bound to the existing editor instance |
| `frontend/src/shared/ui/block-editor/block-editor.css` | Scoped token and font bridge for the authoring appearance |
| `frontend/src/views/admin-post-editor/model/{types.ts,usePostEditorController.ts,publication-issues.ts}` | Journal form state, API adaptation, and client publication feedback |
| `frontend/src/views/admin-work-editor/model/{types.ts,useWorkEditorController.ts,publication-issues.ts}` | Work form state, serialization, and client publication feedback |

Brace notation above enumerates proposed files, not an existing directory. Add concise README documentation to each new feature/widget slice and expose consumers through its `index.ts`.

### 4.3 Route moves

Create `frontend/src/app/admin/(editor)/layout.tsx`. It must call `requirePage()`, include `SessionKeepAlive`, and provide the viewport-height authoring shell without AdminNav or the dashboard's padded maximum-width container.

| Move from | Move to |
| --- | --- |
| `frontend/src/app/admin/(dashboard)/journal/new/page.tsx` | `frontend/src/app/admin/(editor)/journal/new/page.tsx` |
| `frontend/src/app/admin/(dashboard)/journal/[slug]/edit/page.tsx` | `frontend/src/app/admin/(editor)/journal/[slug]/edit/page.tsx` |
| `frontend/src/app/admin/(dashboard)/work/new/page.tsx` | `frontend/src/app/admin/(editor)/work/new/page.tsx` |
| `frontend/src/app/admin/(dashboard)/work/[slug]/edit/page.tsx` | `frontend/src/app/admin/(editor)/work/[slug]/edit/page.tsx` |

Move, do not copy, the route files. Their public URLs remain unchanged because route groups do not contribute URL segments. Preserve every page's own `requirePage()`, data-loading function, `force-dynamic`, not-found handling, and service-unavailable fallback. The shared layout check does not replace per-page authorization.

Keep list, history, translation, settings, and login routes in their current layouts. Keep the admin root NOINDEX metadata. Do not solve editor chrome by inspecting pathname strings in AdminNav, global body selectors, negative margins, or per-page hiding effects.

### 4.4 Preserve the editor during address reconciliation

The first successful creation currently calls `router.replace()` from a `/new` page to an `/[slug]/edit` page. Those are different page segments and must not be used as an incidental document-reset mechanism. Likewise, a published rename must not discard the active editor merely to update the address bar.

After the controller adopts the saved resource identity, use the supported native History API integration to replace the current same-origin editor address without a page navigation: `window.history.replaceState(null, "", editUrl)`. Next.js documents this integration with its router. This is a deliberate application of that mechanism; verify the installed version with browser tests rather than assuming address replacement preserves the document automatically.

Use ordinary guarded router navigation when actually leaving the editor. Do not patch router internals or browser history state fields. Derive whether actions are available from the controller's persisted resource state, not only from the initial `initialPost` or `initialWork` prop. Reloading the reconciled URL must fetch the saved draft through its existing guarded server page.

## 5 Mandatory URL policy

### 5.1 Behavior matrix

| Situation | URL behavior |
| --- | --- |
| New, never-published draft in automatic mode | Generate candidate from Title and update it when Title changes |
| Same draft after first autosave or after reload | Continue automatic behavior; saving is not the freeze boundary |
| User applies a manual URL before publication | Enter manual mode and persist it; later title changes leave that address unchanged |
| First publication | Publish the resolved address and freeze automatic URL changes |
| Title changes after publication | Keep the live and draft URL unchanged unless Edit URL is explicitly used |
| Previously published item is unpublished | Keep URL frozen; do not return to automatic behavior |
| User edits a published URL manually | Save a pending rename; the live address remains unchanged until Publish update |
| Manual URL dialog is cancelled | Preserve the previous URL and mode |
| Title is empty or cannot yield a slug | The server assigns a unique temporary draft identifier; do not show an empty or fabricated public URL as final |
| Candidate conflicts with another item | Server resolves automatic candidates uniquely; manual conflicts produce a visible validation error |

The user explicitly selected this policy. Preserving today's first-save freeze is not an acceptable implementation of the redesign.

### 5.2 Separate identities

- **Canonical slug:** the persisted lookup key used for admin requests and the current edit route. Keep it stable during ordinary autosave.
- **Draft slug:** the candidate address proposed for publication. Show it in the URL field.
- **URL mode:** persisted automatic or manual authoring policy. Do not infer it from `isEditing`, component mount state, or a local `slugTouched` flag.
- **Publication history:** use `publishedAt !== null` to identify an item that has ever been published. Current `lifecycleState === DRAFT` alone does not mean automatic URL updates are allowed.

In automatic mode, the browser may calculate a candidate preview using the existing `slugify` helper, but server resolution owns the actual unique candidate. Treat the server-returned `draftSlug` as authoritative after saving. A manually edited URL must never be silently changed to another candidate.

### 5.3 Necessary server contract extension

The frontend cannot make URL mode survive another browser session by itself. Extend the admin draft input/read/save-result contracts with a persisted `urlMode: "auto" | "manual"` and a resolved `draftSlug`. Retain `slug` as the canonical lookup key. Preserve the mode in initial creation, draft writes, reload, discard, history restoration, and publication. Persistence must exist on initial creation as well as later draft updates.

Implement this in the existing admin content layer and its backing storage. Relevant verified files are `backend/src/content/admin-posts.ts`, `backend/src/content/admin-work.ts`, and `backend/src/content/slug.ts`; summary contract definitions are in `backend/src/content/posts.ts` and `backend/src/content/work.ts`. Update the actual backing schema and migration path when implementing persistence; this frontend plan does not prescribe an uninspected database migration filename.

Use an admin-specific mutation result to return canonical slug, draft slug, mode, lifecycle, and pending-draft state. Do not add authoring policy to public summary DTOs just to make the editor work. Continue the existing slug-history behavior when publication applies a rename.

For legacy records, use frozen/manual behavior for anything ever published. For never-published legacy drafts, preserve a custom slug rather than guessing it was automatic. An exact title-derived candidate may be initialized as automatic; ambiguous collision-suffixed or customized values require conservative preservation. New records persist their mode explicitly.

## 6 Draft state and operation ordering

### 6.1 Autosave

Retain `useAutosaveDraft` as the shared persistence mechanism. Do not add a second save timer in a view or metadata feature. Preserve its single-flight request and coalesced follow-up behavior.

Extend its public result with:

```ts
isDirty: boolean;
getResourceSlug(): string | null;
adoptResourceSlug(slug: string): void;
```

`scheduleSave()` marks the current local revision dirty immediately. A successful response clears dirty state only if it saved the newest revision. An edit arriving during an in-flight save remains dirty until the follow-up succeeds. The top bar must not continue to say Draft saved while newer local text is waiting for the debounce.

`getResourceSlug()` reads the hook's current resource identity synchronously. Action handlers use it after `await flush()` so the first save can create the resource without the handler relying on a stale React closure.

`adoptResourceSlug()` reconciles the hook after publication applies a rename. The current hook stores its own slug ref; updating only the page's `currentSlug` and router leaves that ref pointing to the old endpoint. Call adoption only after the save chain has settled, while edits are temporarily locked for publication.

Keep the current three-minute debounce and five-second retry unless a separate persistence-cadence change is authorized. This redesign must accurately expose unsaved state rather than silently changing network frequency. Continue explicit flushes on field blur and before actions. A blur caused by clicking another workspace control must be coordinated with that action, not create an independent race.

Update saved summaries from each server result, including reading time. Clear resolved save errors. Do not calculate full markdown, word count, or publication payload on every body keystroke.

### 6.2 Body-only draft prerequisite

Both current server draft schemas require Title. To persist a draft written body-first, change those draft contracts to permit an empty title while keeping publication validation strict. The existing server slug generator already has an `untitled` fallback and uniqueness suffixes, but permitting the draft still requires schema and creation-flow tests.

On the client, replace the title-only first-save predicate with meaningful-content detection. A blank default paragraph is empty; actual text, a populated code block, an image URL, or other supported nonempty block counts as content. For Work, inspect case-study body only when case study is enabled. Do not serialize the BlockNote document merely to drive a per-keystroke UI counter.

Do not work around the server contract by inserting a fake title into user content, storing the body in a different field, claiming local memory is a saved draft, or introducing an unrelated local-storage persistence system.

### 6.3 Review and publish

1. Flush the latest draft and obtain its resource identity.
2. If save fails, retain the body and show the error; do not open a stale publication review as current.
3. Collect client-side issue feedback using the view's publication adapter. The server publish schema remains authoritative.
4. Open the shared review dialog with the saved draft summary and the current edit revision.
5. Before final confirmation, flush again. If the revision changed since review, refresh the review and require another confirmation rather than publishing unseen edits.
6. Temporarily lock edits during the actual publish request.
7. Reconcile the returned lifecycle, pending-draft state, canonical address, and URL policy. Adopt the resource slug before later saves; update the edit route if needed.

Do not turn the review dialog into a separate writable copy of the form. Server publication currently reads the saved draft, not an unsaved client payload. This sequencing guarantee covers the current editing session; cross-tab optimistic concurrency would require an additional server revision contract and is outside this UI change.

Client publication feedback must match the real model: current publish schemas accept block arrays without a nonempty-body minimum, Work stack may be empty, related items are optional, and case-study labels are required only when the case-study package exists. Do not invent requirements because a Figma review specimen shows a green Body check.

### 6.4 Preview and navigation

Reuse the existing `/journal/[slug]?preview=1` and `/work/[slug]?preview=1` routes and public renderers. Do not create a second article rendering engine in the editor. Preview the saved pending draft addressed by the canonical slug.

For a fresh preview in a new tab, open the pending tab synchronously from the user gesture, flush, then navigate that tab to preview. On failure, close the pending tab and show the save error. Preserve the existing security attributes. Do not claim a fresh preview after swallowing a flush error.

Back, History, and Translation use one guarded-navigation path: flush, verify success, then navigate. Delete and Discard preserve the existing race protection: wait for any blur-triggered save chain to settle before deleting the resource or discarding its draft. Do not publish or navigate on a rejected save.

## 7 Block editor and layout integration

Keep `getBlocks()` and `initialBlocks` semantics. Extend `BlockEditorProps` with a reusable authoring appearance and optional readonly state. Add focus and selection capture/restore methods to `BlockEditorHandle`; keep their representation opaque to callers. Only `shared/ui/block-editor` should know BlockNote selection types or toolbar command details.

Render `EditorToolbar` against the same instance created by `useCreateBlockNote`. Formatting and insertion controls must execute real commands on that editor; they must not be decorative buttons. Prevent toolbar pointer interactions from discarding the text selection before a command executes. Retain the current slash menu, schema, custom blocks, paste handler, fence shortcut, and client-only mount gate.

The authoring appearance removes the enclosing card treatment in the central canvas and uses the product's typography. It must not inherit the imported BlockNote Inter font by accident. Scope rules under the authoring wrapper and keep the existing default appearance for translation screens.

Do not change the block schema or conversion format for this UI work. A `key={contentVersion}` remount is allowed for intentional Discard or history restoration, where a whole new document is loaded. It is forbidden for title edits, autosave acknowledgements, panel switches, viewport changes, and Focus toggling.

If there is no case study, do not mount a second hidden Work editor just to make the layout symmetrical. When case-study creation is confirmed, initialize its one editor from the retained draft data.

## 8 Token and responsive rules

| UI role | Existing token or utility family |
| --- | --- |
| Central canvas | `bg-bg-app`, primary text tokens |
| Properties and actions surfaces | `bg-surface-base`, `border-border-subtle` |
| Inset fields | `bg-bg-app`, `border-border-default`, `rounded-md` |
| Primary action | `bg-accent-solid`, `text-accent-on-solid`, existing hover token |
| Secondary and quiet actions | Existing text/surface/border roles; flat appearance suppresses decorative glow |
| Failure feedback | Existing `status-error` and contrast-safe foreground treatment |
| Spacing | `xxs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, `5xl`, `6xl` |
| Reading column | `--layout-content-reading` |
| Workspace width reference | `--layout-content-max-width-wide` |
| Toolbar/control sizing | Existing dimension tokens; no new literal heights copied from Figma |
| UI and code typography | `--font-body`, `--font-mono`, existing text and line-height roles |

For the desktop reference, the properties column corresponds to three `dimension-5xl` values plus `dimension-2xl`; the actions column corresponds to three `dimension-5xl` values. Express these as composed existing token values in the widget's scoped stylesheet, not literal widths. The center is `minmax(0, 1fr)` with a centered maximum reading width.

Use existing Tailwind responsive variants rather than raw media-query dimensions. At `xl` and wider use the three-column layout; below it use Body/Details/Actions panels. Test the boundary and browser zoom. If available width cannot support the reading canvas, use the compact composition rather than overflow. Figma's 1440 desktop and 400 mobile sizes are reference frames, not new application tokens.

Use structural CSS values such as fractional tracks, `auto`, `minmax`, and viewport-relative shell height for layout. All design dimensions must resolve to source tokens. Do not create arbitrary `max-w-[...]`, `w-[280px]`, `text-[...]`, or `bg-[#...]` values. Never edit `shared/ui/theme/generated/tokens.css` or generated resolved data by hand.

## 9 Implementation tasks

### Task 1: Shared controls and accessible overlays

**Files:** Existing shared Button, Input, Textarea, Field, StatusBadge, and RelatedItemPicker files from section 4; new control styles, SingleValueCombobox, and Dialog files.

**Produces:** Backward-compatible visual appearances; one native Dialog; one single-value combobox used by category and relationship selection.

- [ ] Add `frontend/src/shared/ui/single-value-combobox/SingleValueCombobox.test.tsx`: Arrow navigation, Enter selection, Escape, clear, and create-new in creatable mode. Closed mode must reject unlisted free text; blur must not accidentally commit it.
- [ ] Add `frontend/src/shared/ui/dialog/Dialog.test.tsx`: accessible name, cancel, and focus restoration. Verify real focus containment in the browser suite because jsdom does not reproduce the browser top layer faithfully.
- [ ] Add focused Field/Input tests for label association, `aria-invalid`, and hint/error IDs. Existing default appearances must remain available.
- [ ] Run the new tests before implementation and confirm that the missing behavior fails.
- [ ] Implement the shared components and adapt RelatedItemPicker without changing its public value contract or optimistic selection/focus behavior.
- [ ] Run `npm --prefix frontend test -- src/shared/ui/single-value-combobox src/shared/ui/dialog src/shared/ui/form` and confirm all selected tests pass.

### Task 2: Shared workspace and route shell

**Files:** New `widgets/content-editor` slice, new `(editor)/layout.tsx`, and four route moves from section 4.3.

**Consumes:** Shared controls and React node slots. **Produces:** One body-first workspace with persistent status and reusable compact/Focus layouts.

- [ ] Add `frontend/src/widgets/content-editor/ui/ContentEditorWorkspace.test.tsx`. A body child with a mount counter must mount once while changing compact panel and Focus state. Inactive panels must not be keyboard reachable.
- [ ] Implement the single slot tree and scoped token-based CSS. Store panel/focus state in the composing view or a local workspace controller; do not introduce global state.
- [ ] Move the four route pages and preserve guards and loaders. Leave the dashboard shell unchanged for its remaining routes.
- [ ] Run `npm --prefix frontend test -- src/widgets/content-editor` and confirm the mount and visibility checks pass.
- [ ] Verify the unchanged editor URLs, anonymous access handling, service-unavailable fallback, and absence of duplicate AdminNav in a real browser.

### Task 3: Property features and Work sections

**Files:** New `features/edit-content-properties` slice and view-local form types.

**Consumes:** Existing options, typed form values, field callbacks, and shared UI. **Produces:** Journal properties and Work Card/Case study property sections.

- [ ] Add `JournalProperties.test.tsx` in the feature's `ui/` directory: exactly one category value, explicit new-category creation, optional related Work clearing, and excerpt separate from body.
- [ ] Add `WorkProperties.test.tsx`: tab switches preserve values; card-only mode is valid; cancelling removal keeps role, labels, hero URL, and body; Target/Shipped labels follow Work status.
- [ ] Extract the field sections. Keep the native date input, TokenCombobox stack semantics, current image URL workflow, and all existing payload fields.
- [ ] Run `npm --prefix frontend test -- src/features/edit-content-properties` and confirm all selected tests pass.

### Task 4: URL policy and persistent mode

**Files:** New `features/edit-content-url`; both view controllers; admin API contract adaptation. Complete the server prerequisite in section 5.3 before integrating the new policy.

**Consumes:** Canonical identity, server-resolved candidate, persisted mode, and publication history. **Produces:** The automatic/manual/frozen behavior matrix.

- [ ] Add `frontend/src/features/edit-content-url/model/url-policy.test.ts` covering every row of section 5.1, including saved-but-never-published drafts and unpublish followed by retitle.
- [ ] Add reload/contract tests proving manual mode survives and automatic mode continues after first autosave. Do not use component-local state as evidence of persistence.
- [ ] Implement the reducer and URL UI. Remove the two view-local `slugTouched` policies after both views consume the new model.
- [ ] Adapt save responses to reconcile `draftSlug` and mode without replacing the BlockEditor document.
- [ ] Run `npm --prefix frontend test -- src/features/edit-content-url` and confirm all transitions pass. Verify automatic and manual collision handling against the real API in the browser suite.

### Task 5: Autosave and view controllers

**Files:** Existing autosave hook and tests; new Journal/Work controllers and publication feedback modules.

**Consumes:** Existing adminApi methods and the completed draft/URL contracts. **Produces:** Correct saved/dirty state, body-only persistence, and stable resource identity.

- [ ] Extend autosave tests: an edit after acknowledgement is dirty immediately; an edit during a save remains dirty; flush waits for the final coalesced result; failed save remains dirty; adopting a renamed slug changes the next update endpoint.
- [ ] Add `frontend/src/views/admin-post-editor/model/usePostEditorController.test.tsx`: first body-only save, first-create identity after flush, latest reading time, and clearing a resolved save error.
- [ ] Add `frontend/src/views/admin-work-editor/model/useWorkEditorController.test.tsx`: all card fields are serialized, case-study package is conditional, stack remains an array, and Draft data does not overwrite translation content.
- [ ] Implement the public autosave additions from section 6.1 without removing the current request sequencing, retry, or rejection behavior.
- [ ] Extract view controllers. Keep separate `buildInput` functions and API result adapters for Journal and Work.
- [ ] Reconcile create and rename addresses as specified in section 4.4. Add a browser assertion that the first creation and a published rename update the URL while retaining editor identity, selection, and undo history; a full reload must open the saved resource.
- [ ] Run `npm --prefix frontend test -- src/shared/lib/use-autosave-draft.test.ts src/views/admin-post-editor/model src/views/admin-work-editor/model` and confirm the existing and new cases pass.

### Task 6: BlockNote authoring surface

**Files:** Existing BlockNoteEditor and exports; new EditorToolbar and scoped CSS.

**Consumes:** The existing schema and editor instance. **Produces:** Unified authoring appearance and a real toolbar without a second document state.

- [ ] Add `frontend/src/shared/ui/block-editor/EditorToolbar.test.tsx` for command delegation and disabled/readonly behavior.
- [ ] Add browser cases proving bold/link/insertion commands affect the selected content and that Focus/panel switches retain text, selection, and undo history.
- [ ] Implement the authoring appearance, readonly/focus/opaque selection handle, and toolbar. Keep SSR mount protection and default translation appearance.
- [ ] Run `npm --prefix frontend test -- src/shared/ui/block-editor` and verify existing conversion, paste, schema, and custom-block tests continue to pass.

### Task 7: Unified actions and page composition

**Files:** New `features/manage-content`; both existing editor page files; both view README files.

**Consumes:** The action port and view controller state. **Produces:** Shared actions/review UI used by both pages.

- [ ] Add `frontend/src/features/manage-content/model/useContentActions.test.ts`: flush failure blocks publish; review revision change requires renewed confirmation; first-save identity is read after flush; duplicate clicks do not create parallel publications.
- [ ] Test that Discard and Delete wait for an in-flight blur save, and that successful publication adopts a renamed resource before later autosave.
- [ ] Implement the coordinator and review/confirmation dialogs. Keep client validation feedback separate from the authoritative server publish gate.
- [ ] Replace both large form render trees with workspace composition. Keep exactly one top status bar, properties slot, body slot, actions slot, and URL feature per editor.
- [ ] Run `npm --prefix frontend test -- src/features/manage-content src/views/admin-post-editor src/views/admin-work-editor` and confirm all selected tests pass.

### Task 8: Browser verification and integration checks

**Files:** New `frontend/tests/e2e/admin-content-editor.spec.ts`; `frontend/playwright.config.ts`; necessary test fixture and documentation updates.

- [ ] Add authenticated deterministic Journal and Work fixtures using the existing test database setup. Do not run mutation scenarios against personal development or production content.
- [ ] Make the new suite execute in Desktop, Tablet, and Mobile projects by updating their test matching. A file added under `tests/e2e` currently runs only in Desktop unless this is addressed.
- [ ] Cover the acceptance matrix below, including light and dark themes, keyboard navigation, and browser zoom.
- [ ] From the repository root, run `npm --prefix frontend run lint`, `npm --prefix frontend run lint:css`, `npm --prefix frontend run lint:tokens`, `npm --prefix frontend run tokens:check`, `npm --prefix frontend test`, and `npm --prefix frontend run build`. Each must exit successfully.
- [ ] Run `npm --prefix frontend run test:e2e -- tests/e2e/admin-content-editor.spec.ts`. The npm wrapper intentionally prepares the isolated test fixtures before Playwright starts.
- [ ] Inspect visual changes before accepting baselines. Check non-editor consumers affected by shared-control or picker changes. Use the existing full CI verification path when integrating the implementation branch.
- [ ] Update slice documentation with final responsibilities, public APIs, and verified behavior. Remove dead view markup, the old local CategoryPicker, duplicate status-label functions, and obsolete handlers only after their replacements are wired.

## 10 Acceptance matrix

| Area | Acceptance condition |
| --- | --- |
| Journal layout | Body is immediately available; all metadata is left; actions are right; state stays above |
| Work layout | Card and Case study properties share one shell; card-only mode has no silently discarded body |
| Reuse | Both editors import the same workspace, action UI, URL feature, controls, and BlockEditor |
| FSD | No shared/widget import from views; no feature-to-feature dependency; no runtime backend code in client bundles |
| URL automatic mode | Title changes before first publication update the candidate across autosave and reload |
| URL manual mode | Explicit edit survives title changes and reload; cancel leaves the prior policy unchanged |
| URL publication boundary | Retitle after publication or after unpublish keeps the address; explicit rename applies only on publication |
| Rename identity | The next save after a published rename uses the new canonical endpoint, not the hook's old slug ref |
| Address reconciliation | First creation and published rename update the edit address without resetting the document; reloading that address opens the correct saved resource |
| Drafts | A meaningful body without Title persists after the server contract change; blank documents are not reported as saved |
| Save state | Unsaved local revisions never appear as Draft saved; failures retain text and offer Retry |
| Publication | Review represents saved content; stale review and save failure cannot publish unseen edits |
| Navigation | Back, History, Translation, Preview, Discard, and Delete obey their save/order guarantees |
| Editor continuity | Tabs, Focus, metadata updates, and responsive transitions preserve the same document and undo history |
| Content compatibility | Existing supported block types round-trip without schema/storage changes |
| Accessibility | Labels, descriptions, errors, combobox keyboard handling, dialog focus, and inactive-panel focus are verified |
| Responsive behavior | No horizontal page overflow; center text and code remain usable; active compact panels retain draft state |
| Themes | Source fonts are applied; all shared-control and badge states remain readable in light and dark themes |
| Regression scope | Translation editors, admin lists/settings, public buttons/badges, authentication, and NOINDEX behavior remain valid |

## 11 Explicit exclusions and implementation cautions

This plan does not add a media upload service, AI-generated excerpts, collaborative editing, arbitrary scheduling, new content fields, or a replacement block editor. Image and hero controls operate on existing URL-backed fields.

Do not introduce a JSON form schema, registry of every possible field, giant context provider for the entire editor, mirrored `blocks` React state, or one conditional component for every content type. Reuse is achieved through stable controls, feature APIs, action coordination, and layout slots.

Native form submission must remain controlled. Do not leave HTML `required` behavior capable of blocking a draft-only operation. Publication checks belong to the explicit review path, with server validation as the final authority.

The route-group change, body-only draft contract, persisted URL mode, and autosave identity adoption are functional requirements, not styling details. Do not label the work complete if only the panels and buttons have been rearranged.

## 12 Source references

The inspected source commit is the authority when older project notes or README entries conflict with implementation.

- [Journal editor](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/frontend/src/views/admin-post-editor/PostEditorPage.tsx)
- [Work editor](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/frontend/src/views/admin-work-editor/WorkEditorPage.tsx)
- [Autosave implementation](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/frontend/src/shared/lib/use-autosave-draft.ts)
- [BlockNote integration](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/frontend/src/shared/ui/block-editor/BlockNoteEditor.tsx)
- [Dashboard layout](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/frontend/src/app/admin/(dashboard)/layout.tsx)
- [Token entry point](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/frontend/src/app/styles/index.css)
- [Tailwind token adapter](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/frontend/src/shared/ui/theme/adapters/tailwind.css)
- [Journal draft and publish contracts](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/backend/src/content/admin-posts.ts)
- [Work draft and publish contracts](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/backend/src/content/admin-work.ts)
- [Frontend scripts and dependencies](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/frontend/package.json)
- [Browser test configuration](https://github.com/yuriisurzhykov/Portfolio-Website/blob/e91d464ccb73bfb0ed1d8bc236322d2382393105/frontend/playwright.config.ts)
- [Next.js native History API integration](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api)

