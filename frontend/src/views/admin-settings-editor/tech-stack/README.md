# views/admin-settings-editor/tech-stack — the tech-stack list editor

The full reasoning (what was wrong, what was rejected, what was found
live) lives in this slice's parent README, under the dated
**"2026-08-06 — `techStack` переезжает с `ListEditor` на собственный
редактор списка"** entry. This file is the map, so you don't have to read
that to find your way around.

## What's here

| File | What it owns |
| --- | --- |
| `TechStackEditor.tsx` | Composition: quick-add, landing preview, counts, the row list, drag reorder. |
| `TechStackQuickAdd.tsx` | The one field that adds rows — typed name, catalog pick, or a pasted list. |
| `TechStackRow.tsx` | One 48px line, with the icon picker + note behind a disclosure. |
| `use-resolved-tech-icons.ts` | One debounced, cached `POST` that resolves every visible row's logo. |
| `parse-tech-input.ts` | Pure: raw text → names, duplicate detection, the "already in the list" copy. |
| `reorder.ts` | Pure: move-by-insertion, with every out-of-range case pinned. |
| `icon-status.ts` | Pure: what to say about one row's logo, and whether the site will drop it. |
| `identified-tech.ts` | The client-only row id, and the conversion to/from the stored shape. |

## Three rules that aren't obvious from the code

1. **Never pass a width/height utility to `<TechIcon className=...>`.**
   `cn()` is plain `clsx`, not `tailwind-merge` — it sits alongside
   `TechIcon`'s internal `w-full h-full` instead of overriding it, and
   the winner is decided by compiled-stylesheet order. Size the wrapper.
   (Cost half an hour here; `TechIcon.tsx` has the same warning from the
   component's side.)
2. **A row that resolves to no logo does not appear on the site at all** —
   `buildTechStackView` filters it out. That's what `icon-status.ts`'s
   `hidden` flag exists to surface.
3. **Row ids never reach the DOM.** They're React `key`s only, so the
   server render and the client's first render can't disagree on an
   attribute value even though each starts the counter from zero.

## Not in Storybook, on purpose

Admin-only and auth-gated — the same exclusion
`frontend/tests/e2e/component-gallery.manifest.ts` already documents for
`admin-list-item`, `icon-picker`, `block-editor` and the rest. Nothing
here renders anything meaningful without a session and real
`SiteContent` data, so a deterministic gallery section isn't possible.
Nothing was added to `shared/ui/` in this change, so there's no new
public component to register either.
