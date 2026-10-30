# dialog

## 2026-10-29 Shared authoring controls

Modal overlays use the native dialog top layer. Opening captures the trigger; closing restores it. Cancel is controlled by the caller, and busy operations cannot be dismissed. Browser focus containment is verified in e2e tests.

The component owns interaction mechanics and accessibility; domain values and persistence remain with the caller. No dependency or data migration is required.
