import type { CompilerInput } from "@portfolio/design-tokens";
import { colorContract, radiusContract, spacingContract } from "./contracts";
import { color, dimension, layout, motion, radius, typography, zIndex } from "./tokens";
import { darkTheme, lightTheme } from "./themes";
import { radiusRole, spacingRole } from "./semantic";
import { codeBlockTokens, skillCardTokens } from "./components";
import { gradients, shadows, transitions, typographyStyles } from "./composites";

/**
 * Plain assembly — imports every module and hands the already-tagged
 * objects to `@portfolio/design-tokens`'s `compile()`. Zero validation
 * logic lives here: it already ran inside each `defineXxx()` call at the
 * moment every module above was imported. This is the ONLY file
 * `frontend/scripts/generate-design-tokens.ts` needs to import from this
 * whole tree.
 */
const compilerInput: CompilerInput = {
    // "z", not "zIndex" — and "layout" — chosen so the generated variable
    // names (`--ds-z-navbar`, `--ds-layout-content-max-width`) match the
    // real Tailwind class / arbitrary-value names `adapters/tailwind.css`
    // bridges to. See `tokens/z-index.ts`'s own comment.
    primitives: { color, dimension, radius, typography, motion, layout, z: zIndex },
    contracts: {
        color: colorContract,
        radius: radiusContract,
        spacing: spacingContract
    },
    themes: {
        dark: { color: darkTheme },
        light: { color: lightTheme },
    },
    flatSemantics: {
        radius: radiusRole,
        spacing: spacingRole,
    },
    components: [codeBlockTokens, skillCardTokens],
    composites: [gradients, shadows, typographyStyles, transitions],
};

export default compilerInput;
