export type { IconName } from "./icons";

export { typography } from "./typography";
export type { TextVariant } from "./typography";

// Every design token (including layout/z-index, migrated 2026-08-14) now
// comes from the statically generated, imported `generated/tokens.css`
// (see `app/styles/index.css`) — no runtime-injected `<style>` tag exists
// anywhere in this app anymore.