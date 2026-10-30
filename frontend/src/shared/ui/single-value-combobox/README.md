# single-value-combobox

## 2026-10-29 Shared authoring controls

Single-value selection is shared by category and relationships. Creation is explicit and opt-in. Closed controls never persist arbitrary text. Keyboard and pointer selection preserve input focus. The existing RelatedItemPicker public contract remains unchanged.

The component owns interaction mechanics and accessibility; domain values and persistence remain with the caller. No dependency or data migration is required.
