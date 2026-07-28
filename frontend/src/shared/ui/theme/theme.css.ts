import {
    blur,
    colors,
    type colors as ColorsType,
    colorsLight,
    layout,
    motion,
    palette,
    radii,
    shadows,
    spacing,
    typography,
    zIndex,
} from "./tokens";

type Colors = typeof ColorsType;

function colorVars(c: Colors): string {
    return `
    --color-bg-app: ${ c.background.app };
    --color-bg-strip: ${ c.background.strip };

    --color-surface-base: ${ c.surface.base };
    --color-surface-raised: ${ c.surface.raised };
    --color-surface-icon: ${ c.surface.icon };
    --color-surface-row-hover: ${ c.surface.rowHover };
    --color-surface-placeholder-a: ${ c.surface.placeholderA };
    --color-surface-placeholder-b: ${ c.surface.placeholderB };

    --color-border-subtle: ${ c.border.subtle };
    --color-border-default: ${ c.border.default };
    --color-border-strong: ${ c.border.strong };
    --color-border-connector: ${ c.border.connector };
    --color-border-highlight: ${ c.border.highlight };

    --color-text-primary: ${ c.text.primary };
    --color-text-secondary: ${ c.text.secondary };
    --color-text-muted: ${ c.text.muted };
    --color-text-faint: ${ c.text.faint };
    --color-text-chip: ${ c.text.chip };
    --color-text-inverse: ${ c.text.inverse };

    --color-accent-solid: ${ c.accent.solid };
    --color-accent-solid-hover: ${ c.accent.solidHover };
    --color-accent-on-solid: ${ c.accent.onSolid };
    --color-accent-text: ${ c.accent.text };
    --color-accent-glow: ${ c.accent.glow };
    --color-accent-glow-opacity: ${ c.accent.glowOpacity };
    --color-accent-tint-bg: ${ c.accent.tintBg };
    /* Legacy aliases kept so existing dev-only components keep resolving */
    --color-accent-magenta: ${ c.accent.solid };
    --color-accent-purple: ${ palette.syntaxPurple };
    --color-accent-blue: ${ palette.syntaxBlue };

    --color-status-success: ${ c.status.success };
    --color-status-success-tint-bg: ${ c.status.successTintBg };
    --color-status-warning: ${ c.status.warning };
    --color-status-warning-tint-bg: ${ c.status.warningTintBg };
    --color-status-error: ${ c.status.error };
    --color-status-on-solid: ${ c.status.onSolid };

    --color-code-keyword: ${ c.code.keyword };
    --color-code-string: ${ c.code.string };
    --color-code-number: ${ c.code.number };
    --color-code-class-name: ${ c.code.className };
    --color-code-function: ${ c.code.function };
    --color-code-property: ${ c.code.property };
    --color-code-punctuation: ${ c.code.punctuation };
    --color-code-comment: ${ c.code.comment };

    /* Code panels stay dark regardless of site theme, per the approved design */
    --color-code-panel-bg: ${ c.codePanel.bg };
    --color-code-panel-border: ${ c.codePanel.border };
    --color-code-panel-hover-bg: ${ c.codePanel.hoverBg };
    --color-code-panel-title: ${ c.codePanel.title };
    --color-code-panel-copy-text: ${ c.codePanel.copyText };
    --color-code-panel-copy-text-hover: ${ c.codePanel.copyTextHover };
    --color-code-panel-code: ${ c.codePanel.code };
    --color-code-panel-line-number: ${ c.codePanel.lineNumber };

    --color-overlay-scrim: ${ c.overlay.scrim };`;
}

export const themeVars = `
  :root {
    /* COLORS (dark — default, matches .theme-dark) */
    ${ colorVars(colors) }

    /* TYPOGRAPHY */
    --font-body: ${ typography.fontFamily.body };
    --font-mono: ${ typography.fontFamily.mono };

    --font-size-hero: ${ typography.fontSize.hero };
    --font-size-display: ${ typography.fontSize.display };
    --font-size-h1: ${ typography.fontSize.h1 };
    --font-size-h2: ${ typography.fontSize.h2 };
    --font-size-h3: ${ typography.fontSize.h3 };
    --font-size-body: ${ typography.fontSize.body };
    --font-size-body-lg: ${ typography.fontSize.bodyLg };
    --font-size-caption: ${ typography.fontSize.caption };
    --font-size-micro: ${ typography.fontSize.micro };

    --line-height-tight: ${ typography.lineHeight.tight };
    --line-height-normal: ${ typography.lineHeight.normal };
    --line-height-relaxed: ${ typography.lineHeight.relaxed };

    --font-weight-regular: ${ typography.fontWeight.regular };
    --font-weight-medium: ${ typography.fontWeight.medium };
    --font-weight-semibold: ${ typography.fontWeight.semibold };
    --font-weight-bold: ${ typography.fontWeight.bold };

    /* SPACING */
    --space-none: ${ spacing.none };
    --space-xxs: ${ spacing.xxs };
    --space-xs: ${ spacing.xs };
    --space-sm: ${ spacing.sm };
    --space-md: ${ spacing.md };
    --space-lg: ${ spacing.lg };
    --space-xl: ${ spacing.xl };
    --space-2xl: ${ spacing["2xl"] };
    --space-3xl: ${ spacing["3xl"] };
    --space-4xl: ${ spacing["4xl"] };

    /* RADIUS */
    --radius-xs: ${ radii.xs };
    --radius-sm: ${ radii.sm };
    --radius-md: ${ radii.md };
    --radius-lg: ${ radii.lg };
    --radius-xl: ${ radii.xl };
    --radius-pill: ${ radii.pill };

    /* SHADOWS */
    --shadow-primary-btn: ${ shadows.primaryBtn };
    --shadow-soft-glow: ${ shadows.softGlow };
    --shadow-surface-deep: ${ shadows.surfaceDeep };
    --shadow-focus-ring: ${ shadows.focusRing };

    /* BLUR */
    --blur-aurora-strong: ${ blur.auroraStrong };
    --blur-aurora-soft: ${ blur.auroraSoft };

    /* MOTION */
    --duration-instant: ${ motion.duration.instant }ms;
    --duration-fast: ${ motion.duration.fast }ms;
    --duration-normal: ${ motion.duration.normal }ms;
    --duration-slow: ${ motion.duration.slow }ms;

    --easing-standard: ${ motion.easing.standard };
    --easing-entrance: ${ motion.easing.entrance };
    --easing-exit: ${ motion.easing.exit };

    --scale-press: ${ motion.scale.press };

    /* LAYOUT */
    --layout-content-max-width: ${ layout.contentMaxWidth };
    --layout-content-max-width-wide: ${ layout.contentMaxWidthWide };
    --layout-content-narrow: ${ layout.contentNarrow };
    --layout-content-reading: ${ layout.contentReading };
    --layout-content-journal: ${ layout.contentJournal };
    --layout-section-vertical-padding: ${ layout.sectionVerticalPadding };
    --layout-navbar-height: ${ layout.navbarHeight };

    /* Z-INDEX */
    --z-background: ${ zIndex.background };
    --z-content: ${ zIndex.content };
    --z-snackbar: ${ zIndex.snackbar };
    --z-navbar: ${ zIndex.navbar };
    --z-overlay: ${ zIndex.overlay };

    color-scheme: dark;
  }

  /* DARK THEME (explicit — same values as :root) */
  .theme-dark {
    ${ colorVars(colors) }
    color-scheme: dark;
  }

  /* LIGHT THEME */
  .theme-light {
    ${ colorVars(colorsLight) }
    color-scheme: light;
  }
`;
