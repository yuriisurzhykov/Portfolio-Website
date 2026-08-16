import { defineContract } from "@portfolio/design-tokens";

/**
 * Empty required list, deliberately — matches `ARCHITECTURE.md`'s own
 * framing for this category: "not yet consumed anywhere (today's
 * components call `rounded-md`/`rounded-xl` directly, i.e. they reach past
 * this layer to the primitive)". `semantic/radius.ts` still goes through
 * `defineTheme()` so it's graph-validated the same way color is; there's
 * just nothing to require YET. Add roles here the day a real consumer
 * needs one guaranteed to exist.
 */
export const radiusContract = defineContract({ category: "radius", required: [] });
