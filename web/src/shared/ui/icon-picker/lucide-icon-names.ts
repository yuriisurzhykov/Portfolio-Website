import { iconNames, type IconName } from "lucide-react/dynamic";

export type { IconName };
export { iconNames };

/**
 * `iconNames` is a plain array (~1900 entries) — re-checking
 * `iconNames.includes(...)` on every keystroke of the admin's icon-name
 * input would be an O(n) scan per render for no reason. One `Set`, built
 * once at module load (this file is only ever imported for its exports,
 * never re-evaluated per call), makes `isKnownLucideIconName` O(1).
 */
const KNOWN_ICON_NAMES = new Set<string>(iconNames);

/**
 * The one real validation check for a `type: "icon"` `IconRef.value` —
 * checked against `lucide-react/dynamic`'s own real name list, not a
 * hand-maintained subset that could drift from what's actually installed.
 * Used identically by the admin form (live validation feedback) and
 * `IconRefPreview` (deciding whether it's safe to hand a name to
 * `DynamicIcon` at all) — see this package's README for why that matters.
 */
export function isKnownLucideIconName(name: string): name is IconName {
    return KNOWN_ICON_NAMES.has(name);
}
