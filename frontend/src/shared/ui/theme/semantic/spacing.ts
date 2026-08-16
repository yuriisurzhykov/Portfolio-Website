import { defineTheme } from "@portfolio/design-tokens";
import { spacingContract } from "../contracts/spacing";

/** Role names over the primitive dimension scale. Not yet consumed anywhere — see `semantic/radius.ts`'s identical comment. */
export const spacingRole = defineTheme(spacingContract, {
    inlineXs: "{dimension.xs}",
    inlineSm: "{dimension.sm}",
    inlineMd: "{dimension.md}",
    stackXs: "{dimension.sm}",
    stackSm: "{dimension.md}",
    stackMd: "{dimension.lg}",
    stackLg: "{dimension.xl}",
    sectionSm: "{dimension.3xl}",
    sectionMd: "{dimension.4xl}",
});
