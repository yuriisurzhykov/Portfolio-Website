/**
 * Generation of CCS variables from tokens (tokens.ts) + dark theme.
 * */
import {colors, fonts, fontWeights, radii, shadows, spacing} from "./tokens";

export const themeVars = `
  :root {
    /* Colors */
    --color-bg: ${colors.neutral[50]};
    --color-surface: ${colors.neutral[100]};
    --color-elevated: ${colors.neutral[200]};
    --color-border: ${colors.neutral[400]};
    --color-text: ${colors.neutral[900]};
    --color-muted: ${colors.neutral[700]};

    --accent-cyan: ${colors.accent.cyan};
    --accent-blue: ${colors.accent.blue};
    --accent-violet: ${colors.accent.violet};

    /* Typography */
    --font-body: ${fonts.body};
    --font-mono: ${fonts.mono};
    --fw-regular: ${fontWeights.regular};
    --fw-medium: ${fontWeights.medium};
    --fw-semibold: ${fontWeights.semibold};
    --fw-bold: ${fontWeights.bold};
    --fw-extrabold: ${fontWeights.extrabold};

    /* Radii/shadows */
    --radius-sm: ${radii.sm};
    --radius-md: ${radii.md};
    --radius-lg: ${radii.lg};
    --radius-xl: ${radii.xl};
    --radius-pill: ${radii.pill};
    --shadow-soft: ${shadows.soft};
    --shadow-hard: ${shadows.hard};

    /* Spacing */
    --space-xs: ${spacing.xs};
    --space-sm: ${spacing.sm};
    --space-md: ${spacing.md};
    --space-lg: ${spacing.lg};
    --space-xl: ${spacing.xl};
    --space-2xl: ${spacing['2xl']};
    --space-3xl: ${spacing['3xl']};
  }

  /* Dark/Light themes (can be switched using class .theme-dark/.theme-light */
  .theme-dark {
    --color-bg: ${colors.neutral[50]};
    --color-surface: ${colors.neutral[100]};
    --color-elevated: ${colors.neutral[200]};
    --color-text: ${colors.neutral[900]};
    --color-muted: ${colors.neutral[700]};
  }

  .theme-light {
    --color-bg: #FAFBFF;
    --color-surface: #FFFFFF;
    --color-elevated: #F3F6FF;
    --color-text: #0C1222;
    --color-muted: #5B637A;
  }
`;