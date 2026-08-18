import { defineComponentTokens } from "@portfolio/design-tokens";

/**
 * `SkillCard`'s one-off decorative accent (its `tone="accent"` icon
 * color). See `components/code-block.ts`'s doc comment for the real DS201
 * promotion story this and `codeBlockTokens.className` triggered together.
 */
export const skillCardTokens = defineComponentTokens("skillCard", {
    accentIcon: "{theme.color.decorativeAccent}",
});
