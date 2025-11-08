import type { Config } from "tailwindcss";

export default {
    content: ["./index.html", "./src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            colors: {
                bg: "var(--color-bg)",
                surface: "var(--color-surface)",
                text: "var(--color-text)",
                muted: "var(--color-muted)",
                border: "var(--color-border)",
                accent: {
                    cyan: "var(--accent-cyan)",
                    blue: "var(--accent-blue)",
                    violet: "var(--accent-violet)",
                },
            },
            borderRadius: {
                lg: "var(--radius-lg)",
                xl: "var(--radius-xl)",
            },
            boxShadow: {
                soft: "var(--shadow-soft)",
                hard: "var(--shadow-hard)",
            },
            spacing: {
                xs: "var(--space-xs)",
                sm: "var(--space-sm)",
                md: "var(--space-md)",
                lg: "var(--space-lg)",
                xl: "var(--space-xl)",
                '2xl': "var(--space-2xl)",
                '3xl': "var(--space-3xl)",
            },
            fontFamily: {
                sans: ["var(--font-body)"],
                mono: ["var(--font-mono)"],
            },
        },
    },
    plugins: [],
} satisfies Config;