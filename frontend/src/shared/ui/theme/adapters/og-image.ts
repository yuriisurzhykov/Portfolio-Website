import { resolved } from "../generated/resolved";

/**
 * OG cards are always rendered against the dark theme's palette — there is
 * no light-mode OG card concept. Reads `generated/resolved.ts` only
 * (already-resolved plain strings satori can render directly), never the
 * compiler or the raw theme source.
 */
export const ogTheme = resolved.dark.color;
