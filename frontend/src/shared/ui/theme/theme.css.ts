import {
    palette,
    colors,
    radii,
    spacing,
    typography,
    shadows,
    blur,
    motion,
    layout,
    zIndex,
} from "./tokens";

export const themeVars = `
  :root {
    /* COLORS */
    --color-bg-app: ${colors.background.app};
    --color-bg-strip: ${colors.background.strip};

    --color-surface-base: ${colors.surface.base};
    --color-surface-raised: ${colors.surface.raised};

    --color-border-subtle: ${colors.border.subtle};
    --color-border-default: ${colors.border.default};
    --color-border-highlight: ${colors.border.highlight};

    --color-text-primary: ${colors.text.primary};
    --color-text-secondary: ${colors.text.secondary};
    --color-text-muted: ${colors.text.muted};
    --color-text-inverse: ${colors.text.inverse};

    --color-accent-aurora-text: ${colors.accent.auroraText};
    --color-accent-aurora-fill: ${colors.accent.auroraFill};
    --color-accent-magenta: ${colors.accent.magenta};
    --color-accent-purple: ${colors.accent.purple};
    --color-accent-blue: ${colors.accent.blue};

    --color-status-success: ${colors.status.success};
    --color-status-warning: ${colors.status.warning};
    --color-status-error: ${colors.status.error};

    --color-overlay-scrim: ${colors.overlay.scrim};

    /* TYPOGRAPHY */
    --font-body: ${typography.fontFamily.body};
    --font-mono: ${typography.fontFamily.mono};

    --font-size-hero: ${typography.fontSize.hero};
    --font-size-display: ${typography.fontSize.display};
    --font-size-h1: ${typography.fontSize.h1};
    --font-size-h2: ${typography.fontSize.h2};
    --font-size-h3: ${typography.fontSize.h3};
    --font-size-body: ${typography.fontSize.body};
    --font-size-body-lg: ${typography.fontSize.bodyLg};
    --font-size-caption: ${typography.fontSize.caption};
    --font-size-micro: ${typography.fontSize.micro};

    --line-height-tight: ${typography.lineHeight.tight};
    --line-height-normal: ${typography.lineHeight.normal};
    --line-height-relaxed: ${typography.lineHeight.relaxed};

    --font-weight-regular: ${typography.fontWeight.regular};
    --font-weight-medium: ${typography.fontWeight.medium};
    --font-weight-semibold: ${typography.fontWeight.semibold};
    --font-weight-bold: ${typography.fontWeight.bold};

    /* SPACING */
    --space-none: ${spacing.none};
    --space-xxs: ${spacing.xxs};
    --space-xs: ${spacing.xs};
    --space-sm: ${spacing.sm};
    --space-md: ${spacing.md};
    --space-lg: ${spacing.lg};
    --space-xl: ${spacing.xl};
    --space-2xl: ${spacing["2xl"]};
    --space-3xl: ${spacing["3xl"]};
    --space-4xl: ${spacing["4xl"]};

    /* RADIUS */
    --radius-xs: ${radii.xs};
    --radius-sm: ${radii.sm};
    --radius-md: ${radii.md};
    --radius-lg: ${radii.lg};
    --radius-xl: ${radii.xl};
    --radius-pill: ${radii.pill};

    /* SHADOWS */
    --shadow-primary-btn: ${shadows.primaryBtn};
    --shadow-soft-glow: ${shadows.softGlow};
    --shadow-surface-deep: ${shadows.surfaceDeep};
    --shadow-focus-ring: ${shadows.focusRing};

    /* BLUR */
    --blur-aurora-strong: ${blur.auroraStrong};
    --blur-aurora-soft: ${blur.auroraSoft};

    /* MOTION */
    --duration-instant: ${motion.duration.instant}ms;
    --duration-fast: ${motion.duration.fast}ms;
    --duration-normal: ${motion.duration.normal}ms;
    --duration-slow: ${motion.duration.slow}ms;

    --easing-standard: ${motion.easing.standard};
    --easing-entrance: ${motion.easing.entrance};
    --easing-exit: ${motion.easing.exit};
    
    --scale-press: ${motion.scale.press};

    /* LAYOUT */
    --layout-content-max-width: ${layout.contentMaxWidth};
    --layout-content-max-width-wide: ${layout.contentMaxWidthWide};
    --layout-section-vertical-padding: ${layout.sectionVerticalPadding};
    --layout-navbar-height: ${layout.navbarHeight};

    /* Z-INDEX */
    --z-background: ${zIndex.background};
    --z-content: ${zIndex.content};
    --z-snackbar: ${zIndex.snackbar};
    --z-navbar: ${zIndex.navbar};
    --z-overlay: ${zIndex.overlay};
  }

  /* DARK THEME (DEFAULT) */
  .theme-dark {
    /* Mapped exactly to :root defaults for now, can be used for override context */
  }

  /* LIGHT THEME (Placeholder / Future Proofing) */
  .theme-light {
    --color-bg-app: #FAFBFF;
    --color-bg-strip: #F3F6FF;
    --color-surface-base: #FFFFFF;
    --color-surface-raised: #FFFFFF;
    
    --color-border-subtle: #E0E4F0;
    --color-border-default: #D2D7E5;
    --color-border-highlight: #6B57FF;

    --color-text-primary: #0C1222;
    --color-text-secondary: #48506A;
    --color-text-muted: #767F96;
    --color-text-inverse: ${palette.neutral50};

    --color-accent-aurora-text: linear-gradient(135deg, #EF1C5C 0%, #765AF8 100%);
    --shadow-primary-btn: 0 4px 14px rgba(0,0,0,0.1);
    --shadow-soft-glow: 0 4px 20px rgba(0,0,0,0.05);
  }
`;