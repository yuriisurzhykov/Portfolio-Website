import { defineComposite } from "@portfolio/design-tokens";

/** Semantic duration+easing pairings over `tokens/motion.ts`'s primitives — structure only for this pass, ported from `ARCHITECTURE.md`'s section 3.7/2. Not yet consumed (today's components pair `duration-*`/`ease-*` Tailwind classes by hand at each call site). */
export const transitions = defineComposite("transition", {
    hover: {
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}"
    },
    focus: {
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.standard}"
    },
    enter: {
        duration: "{motion.duration.normal}",
        easing: "{motion.easing.entrance}"
    },
    exit: {
        duration: "{motion.duration.fast}",
        easing: "{motion.easing.exit}"
    },
});
