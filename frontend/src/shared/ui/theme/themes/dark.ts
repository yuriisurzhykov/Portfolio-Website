import { defineTheme, mergeTokenTree } from "@portfolio/design-tokens";
import { colorContract } from "../contracts/color";
import { sharedColorRoles } from "./shared-roles";

/**
 * Dark theme's global-semantic color roles — a theme never invents a
 * color, it points a role at a step of `tokens/color.ts`, via a
 * `"{color.scale.step}"` reference the compiler resolves. Ported from
 * `ARCHITECTURE.md`'s section 3.8 (already reviewed); shared roles come
 * from `shared-roles.ts` via `mergeTokenTree` instead of being duplicated
 * here by hand.
 */
export const darkTheme = defineTheme(colorContract, mergeTokenTree(sharedColorRoles, {
    surfacePrimary: "{color.neutral.950}",
    surfaceElevated: "{color.neutral.900}",
    surfaceRaised: "{color.overlayWhite.4}",
    surfaceSubtle: "{color.overlayWhite.4}",
    surfaceIcon: "{color.overlayWhite.4}",
    surfaceRowHover: "{color.overlayWhite.4}",
    surfaceOverlay: "{color.scrim.dark}",
    surfaceInverse: "{color.neutral.0}",
    surfacePlaceholderPrimary: "{color.pattern.darkPrimary}",
    surfacePlaceholderSecondary: "{color.pattern.darkSecondary}",

    textPrimary: "{color.neutral.50}",
    textSecondary: "{color.neutral.200}",
    textMuted: "{color.neutral.400}",
    textFaint: "{color.neutral.300}",
    textChip: "{color.neutral.100}",
    textInverse: "{color.neutral.950}",
    textAccent: "{color.brand.500}",

    borderSubtle: "{color.overlayWhite.8}",
    borderDefault: "{color.overlayWhite.12}",
    borderStrong: "{color.overlayWhite.24}",
    borderConnector: "{color.overlayWhite.16}",

    interactivePrimaryHover: "{color.brand.400}", // brightens — dark-mode direction
}));

// PlaceholderCover's mesh-gradient spot colors used to live here as
// `meshSpotA-D` theme roles — moved to `composites/gradients.ts`'s `mesh`
// recipe directly (primitive references, no theme indirection) after
// `npm run tokens:check` flagged them as DS102 (a global-semantic role
// with exactly one consumer). Also: a deliberate simplification of this
// pass, not silently dropped — the pre-migration design had separate,
// lighter/less-saturated OKLCH spot colors for light theme specifically;
// recreating that pastel variant is real color-authorship work, out of
// scope for a structure-first migration. Both themes get the same
// (dark-tuned) spot colors for now.
