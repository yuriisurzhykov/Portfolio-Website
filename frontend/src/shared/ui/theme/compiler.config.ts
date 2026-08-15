import type { CompilerInput } from "@portfolio/design-tokens";
import { colorContract, radiusContract, spacingContract } from "./contracts";
import { color, dimension, motion, radius, typography } from "./tokens";
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
    primitives: { color, dimension, radius, typography, motion },
    contracts: { color: colorContract, radius: radiusContract, spacing: spacingContract },
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
