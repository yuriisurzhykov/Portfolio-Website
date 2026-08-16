import { defineTheme, mergeTokenTree } from "@portfolio/design-tokens";
import { colorContract } from "../contracts/color";
import { sharedColorRoles } from "./shared-roles";

/** Light theme — same shape as `dark.ts`, opposite direction through the same scales. See `dark.ts`'s comments for the roles this shares via `mergeTokenTree` and the mesh-spot simplification. */
export const lightTheme = defineTheme(colorContract, mergeTokenTree(sharedColorRoles, {
    surfacePrimary: "{color.neutral.0}",
    surfaceElevated: "{color.neutral.20}",
    surfaceRaised: "{color.overlayBlack.4}",
    surfaceSubtle: "{color.overlayBlack.4}",
    surfaceIcon: "{color.overlayBlack.4}",
    surfaceRowHover: "{color.overlayBlack.4}",
    surfaceOverlay: "{color.scrim.light}",
    surfaceInverse: "{color.neutral.950}",
    surfacePlaceholderPrimary: "{color.pattern.lightPrimary}",
    surfacePlaceholderSecondary: "{color.pattern.lightSecondary}",

    textPrimary: "{color.neutral.900}",
    textSecondary: "{color.neutral.700}",
    // AA-fix step, same story as `textAccent` below: a live a11y test caught
    // `{color.neutral.500}` (contrast ~4.0-4.4:1 depending on background,
    // e.g. #787573 on the header's `surfaceIcon` pill) failing WCAG AA's
    // 4.5:1 floor for the nav's language/theme toggle pills (see PR #65's
    // "Visual & Accessibility Tests" run). `{color.neutral.600}` clears
    // ~5.6-6.2:1 in the same spots. This makes `textMuted` and `textFaint`
    // resolve to the same step in light theme — matching the pre-migration
    // palette, where `muted`/`dim` were already near-identical grays
    // (`#6b6862`/`#6b6760`); dark theme keeps them distinct (400 vs 300)
    // since its direction had more headroom to spare.
    textMuted: "{color.neutral.600}",
    textFaint: "{color.neutral.600}",
    textChip: "{color.neutral.800}",
    textInverse: "{color.neutral.0}",
    // AA-fix step per ARCHITECTURE.md's own reviewed light theme — a real
    // live a11y test caught this at `{color.brand.600}` (contrast 3.23,
    // needs 4.5) instead. See frontend/README.md's dated entry.
    textAccent: "{color.brand.800}",

    borderSubtle: "{color.overlayBlack.8}",
    borderDefault: "{color.overlayBlack.12}",
    borderStrong: "{color.overlayBlack.24}",
    borderConnector: "{color.overlayBlack.16}",

    interactivePrimaryHover: "{color.brand.600}", // darkens — light-mode direction
}));

// See `dark.ts`'s comment: mesh-gradient spot colors moved to
// `composites/gradients.ts` directly, no theme indirection.
