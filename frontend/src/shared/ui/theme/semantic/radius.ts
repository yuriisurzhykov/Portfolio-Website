import { defineTheme } from "@portfolio/design-tokens";
import { radiusContract } from "../contracts/radius";

/**
 * Role names over the primitive radius scale. Not yet consumed anywhere —
 * `radiusContract`'s required list is empty for the same reason (see its
 * own comment). The real payoff only shows up the day a role needs to
 * move independently (e.g. every card gets a bigger radius without "`xl`"
 * changing meaning everywhere else it's used) — adding this layer now,
 * even while it looks like a thin pass-through, is what makes that day a
 * one-line change instead of a grep-and-replace across every component
 * using `rounded-xl` today.
 */
export const radiusRole = defineTheme(radiusContract, {
    chip: "{radius.sm}",
    control: "{radius.md}",
    card: "{radius.xl}",
    pill: "{radius.pill}",
});
