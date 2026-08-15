export type { IconName } from "./icons";

export { typography } from "./typography";
export type { TextVariant } from "./typography";

// Color/dimension/radius/typography/motion CSS variables now come from the
// statically generated, imported `generated/tokens.css` (see
// `app/styles/index.css`) — not a runtime-injected `<style>` tag. Only
// `layout`/`zIndex` (out of this architecture's scope) still work that way.
export { legacyLayoutVars } from "./legacy-layout-vars";