# Content editor implementation verification

The Journal and Work authoring screens share a body-first workspace, reusable property controls, URL policy UI, action coordinator, native dialogs and the same mounted BlockNote editor. Route loaders/authentication remain server-owned. The dashboard shell is removed only from create/edit routes.

## Behavior

- Metadata stays left, writing stays central, publication actions stay right. Compact panels and Focus preserve the document and undo history.
- Meaningful body-only drafts save without a title; empty drafts are not reported as saved. Lists identify untitled drafts.
- Automatic URL candidates follow the title across saves/reloads until first publication. Manual edits persist. Publication history freezes automatic updates even after unpublish; explicit renames apply only on publication.
- Save acknowledgements cannot overwrite a newer local URL edit. Publication adopts the new resource identity before later autosave. Save failure blocks deliberate navigation, preview and publication.
- Review flushes the draft and verifies the revision again on confirmation. Destructive actions wait for any in-flight save. Removing a Work case study requires confirmation.
- Structured block types keep their schema/storage contracts. Text-only block conversion is disabled for custom blocks.

## Verification results

| Check | Result |
| --- | --- |
| Frontend Vitest | 75 files, 533 tests passed |
| Backend Vitest | 53 files, 788 tests passed |
| Frontend TypeScript | Passed |
| Backend TypeScript | Passed |
| Production Next build | Passed |
| CSS lint | Passed |
| Token lint | Passed, 11 existing inline-config warnings |
| Generated token drift | Passed |
| Editor files with compatible ESLint 9 | Passed |
| Playwright editor integration | 21/21 across Desktop, Tablet and Mobile |
| Axe / themes / clipping | Light and dark, all three viewports passed; CSS zoom smoke passed |

The ordinary `npm run lint` remains blocked by the repository's existing ESLint 10 / react-plugin incompatibility. The existing CI workflow explicitly excludes that general lint backlog and uses the CSS/token checks above. This change does not change that policy or dependency versions.

Local infrastructure uses a temporary PGlite PostgreSQL-protocol server and a temporary Chromium 153 executable outside the repository. Its default one-connection cap initially caused connection failures; setting its test-only limit to 50 produced the full green backend run. Native PostgreSQL/standard Chromium are still exercised by repository CI. `node --import tsx` runs the existing preparation scripts because the sandbox rejects the tsx CLI's Unix IPC socket. No production dependencies were added.

## Review images

Actual production-build screenshots against deterministic fixtures are in [the screenshot folder](../../pr-screenshots/content-editor/README.md). They are review artifacts, not automatically accepted visual baselines.

## Implementation decisions

- Isolation uses a clean task-owned clone on a feature branch. No existing user checkout was modified.
- Existing content is migrated to manual URL mode to preserve potentially customized addresses. Newly created content defaults to automatic mode. Existing drafts therefore retain their original address until explicitly changed.
- URL/controller wiring followed dependency order: server policy first, controllers next, page composition last.
- Local infrastructure workarounds affect verification only. Repository CI remains the native-environment gate.
- The pre-existing general ESLint backlog stays outside this editor change. Changed editor files pass the compatible linter and the repository's required CSS/token gates.

## CI integration correction

The first full Visual & Accessibility run (41002002166) had 134 passing tests and six failed Work-list snapshots. The new editor suite published Work cards in the same database while public snapshots ran in parallel, changing page height/content. The editor-only local run did not exercise that interaction.

The Playwright project graph now completes all public Desktop/Tablet/Mobile checks before editor mutations start, then executes editor viewports sequentially. Snapshot baselines and thresholds are unchanged. The fix must be verified by the full native CI run, not by editor-only tests.
