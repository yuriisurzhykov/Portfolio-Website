# Content editor workspace

## 2026-10-29 Body first authoring

The workspace composes status, properties, body and action slots. It owns layout only. Views supply domain state and feature components. Desktop panels scroll independently inside a viewport shell; compact navigation and Focus change CSS visibility without remounting the body. The route group removes dashboard chrome while retaining authentication, keep-alive and inherited NOINDEX metadata.

Column widths compose existing dimension tokens. No editor-specific color or dimension literals are introduced. Errors and persistence remain visible through the status slot. Stable child identity preserves the editor document and undo history.

The optional feedback slot stays below the status bar across all panels, so save/action errors and Retry remain available on small screens. `useWorkspacePanels` keeps selection snapshots opaque and restores them after visibility changes. It owns no content or persistence state.
