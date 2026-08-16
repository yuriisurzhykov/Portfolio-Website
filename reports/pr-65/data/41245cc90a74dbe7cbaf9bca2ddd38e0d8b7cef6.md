# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y.spec.ts >> journal-flowbus @ light - a11y
- Location: tests/e2e/a11y.spec.ts:19:13

# Error details

```
Error: Accessibility violations found:
- [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds (.sm\:gap-sm > .p-0\.75.gap-0\.5.bg-surface-icon > .px-xs.py-xxs[href$="flowbus"]:nth-child(2), .sm\:gap-sm > .p-xxs.gap-0\.5.bg-surface-icon > button:nth-child(1), .text-text-muted.text-caption[href$="journal"], .tracking-widest, div > .leading-normal.font-medium.text-text-muted, .text-text-faint.hover\:font-semibold.transition-all, .hover\:font-semibold[target="_blank"][rel="noreferrer"]:nth-child(1), .hover\:font-semibold[target="_blank"][rel="noreferrer"]:nth-child(2), .hover\:font-semibold.transition-all.duration-normal:nth-child(3))

expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 334

- Array []
+ Array [
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.12/color-contrast?application=playwright",
+     "id": "color-contrast",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#f4f4f4",
+               "contrastRatio": 4.15,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#787573",
+               "fontSize": "8.3pt (11px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.15 (foreground color: #787573, background color: #f4f4f4, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"flex items-center gap-0.5 bg-surface-icon border border-border-subtle rounded-pill p-0.75\">",
+                 "target": Array [
+                   ".sm\\:gap-sm > .p-0\\.75.gap-0\\.5.bg-surface-icon",
+                 ],
+               },
+               Object {
+                 "html": "<header class=\"sticky top-0 z-navbar flex items-center justify-between gap-sm px-(--layout-section-horizontal-padding) py-lg bg-overlay-scrim backdrop-blur-md border-b border-border-subtle transition-transform duration-normal ease-standard\">",
+                 "target": Array [
+                   "header",
+                 ],
+               },
+               Object {
+                 "html": "<div class=\"min-h-screen bg-bg-app text-text-primary flex flex-col\">",
+                 "target": Array [
+                   ".min-h-screen",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.15 (foreground color: #787573, background color: #f4f4f4, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<a href=\"/ru/journal/flowbus\" class=\"rounded-pill px-xs py-xxs font-mono font-semibold text-micro uppercase transition-colors duration-fast text-text-muted hover:text-text-primary\">RU</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".sm\\:gap-sm > .p-0\\.75.gap-0\\.5.bg-surface-icon > .px-xs.py-xxs[href$=\"flowbus\"]:nth-child(2)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#f4f4f4",
+               "contrastRatio": 4.15,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#787573",
+               "fontSize": "8.3pt (11px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.15 (foreground color: #787573, background color: #f4f4f4, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"flex items-center gap-0.5 bg-surface-icon border border-border-subtle rounded-pill p-xxs\">",
+                 "target": Array [
+                   ".sm\\:gap-sm > .p-xxs.gap-0\\.5.bg-surface-icon",
+                 ],
+               },
+               Object {
+                 "html": "<header class=\"sticky top-0 z-navbar flex items-center justify-between gap-sm px-(--layout-section-horizontal-padding) py-lg bg-overlay-scrim backdrop-blur-md border-b border-border-subtle transition-transform duration-normal ease-standard\">",
+                 "target": Array [
+                   "header",
+                 ],
+               },
+               Object {
+                 "html": "<div class=\"min-h-screen bg-bg-app text-text-primary flex flex-col\">",
+                 "target": Array [
+                   ".min-h-screen",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.15 (foreground color: #787573, background color: #f4f4f4, font size: 8.3pt (11px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<button type=\"button\" aria-pressed=\"false\" class=\"rounded-pill px-xs py-xxs font-mono font-semibold text-micro uppercase transition-colors duration-fast text-text-muted hover:text-text-primary\">Dark</button>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".sm\\:gap-sm > .p-xxs.gap-0\\.5.bg-surface-icon > button:nth-child(1)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#fafaf9",
+               "contrastRatio": 4.37,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#787573",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.37 (foreground color: #787573, background color: #fafaf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"min-h-screen bg-bg-app text-text-primary flex flex-col\">",
+                 "target": Array [
+                   ".min-h-screen",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.37 (foreground color: #787573, background color: #fafaf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<a class=\"font-mono text-caption text-text-muted\" href=\"/journal\">← <!-- -->back to journal</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".text-text-muted.text-caption[href$=\"journal\"]",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#f6f5f4",
+               "contrastRatio": 4.2,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#787573",
+               "fontSize": "8.3pt (11px)",
+               "fontWeight": "bold",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.2 (foreground color: #787573, background color: #f6f5f4, font size: 8.3pt (11px), font weight: bold). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"bg-surface-base border border-border-subtle rounded-xl p-lg flex justify-between items-center gap-md flex-wrap mt-2xl\">",
+                 "target": Array [
+                   ".p-lg",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.2 (foreground color: #787573, background color: #f6f5f4, font size: 8.3pt (11px), font weight: bold). Expected contrast ratio of 4.5:1",
+         "html": "<p class=\"font-mono font-bold text-micro uppercase tracking-widest text-text-muted mb-xs\">RELATED PROJECT</p>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".tracking-widest",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#f6f5f4",
+               "contrastRatio": 4.2,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#787573",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.2 (foreground color: #787573, background color: #f6f5f4, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"bg-surface-base border border-border-subtle rounded-xl p-lg flex justify-between items-center gap-md flex-wrap mt-2xl\">",
+                 "target": Array [
+                   ".p-lg",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.2 (foreground color: #787573, background color: #f6f5f4, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<div class=\"text-caption font-medium leading-normal text-text-muted\">A fixture case study covering the hero-image + approach-steps-grid template variant.</div>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "div > .leading-normal.font-medium.text-text-muted",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#fafaf9",
+               "contrastRatio": 4.37,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#787573",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.37 (foreground color: #787573, background color: #fafaf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.37 (foreground color: #787573, background color: #fafaf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"text-caption font-medium leading-normal text-text-faint text-caption text-text-muted transition-all duration-normal hover:text-text-primary hover:font-semibold\">© 2026 Yurii Surzhykov</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".text-text-faint.hover\\:font-semibold.transition-all",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#fafaf9",
+               "contrastRatio": 4.37,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#787573",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.37 (foreground color: #787573, background color: #fafaf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.37 (foreground color: #787573, background color: #fafaf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<a href=\"https://github.com/yuriisurzhykov\" target=\"_blank\" rel=\"noreferrer\" class=\"text-caption text-text-muted transition-all duration-normal hover:text-text-primary hover:font-semibold\">GitHub</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".hover\\:font-semibold[target=\"_blank\"][rel=\"noreferrer\"]:nth-child(1)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#fafaf9",
+               "contrastRatio": 4.37,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#787573",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.37 (foreground color: #787573, background color: #fafaf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.37 (foreground color: #787573, background color: #fafaf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<a href=\"https://linkedin.com/in/yuriisurzhykov\" target=\"_blank\" rel=\"noreferrer\" class=\"text-caption text-text-muted transition-all duration-normal hover:text-text-primary hover:font-semibold\">LinkedIn</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".hover\\:font-semibold[target=\"_blank\"][rel=\"noreferrer\"]:nth-child(2)",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#fafaf9",
+               "contrastRatio": 4.37,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#787573",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 4.37 (foreground color: #787573, background color: #fafaf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 4.37 (foreground color: #787573, background color: #fafaf9, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<a href=\"mailto:yuriisurzhykov@gmail.com\" class=\"text-caption text-text-muted transition-all duration-normal hover:text-text-primary hover:font-semibold\">Email</a>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".hover\\:font-semibold.transition-all.duration-normal:nth-child(3)",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2aa",
+       "wcag143",
+       "TTv5",
+       "TT13.c",
+       "EN-301-549",
+       "EN-9.1.4.3",
+       "ACT",
+       "RGAAv4",
+       "RGAA-3.2.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - link "YS" [ref=e4] [cursor=pointer]:
        - /url: /
      - navigation [ref=e5]:
        - link "Work" [ref=e6] [cursor=pointer]:
          - /url: /work
        - link "Journal" [ref=e7] [cursor=pointer]:
          - /url: /journal
        - link "Contact" [ref=e8] [cursor=pointer]:
          - /url: /#contact
      - generic [ref=e9]:
        - generic [ref=e10]:
          - link "EN" [ref=e11] [cursor=pointer]:
            - /url: /journal/flowbus
          - link "RU" [ref=e12] [cursor=pointer]:
            - /url: /ru/journal/flowbus
        - generic [ref=e13]:
          - button "Dark" [ref=e14]
          - button "Light" [pressed] [ref=e15]
        - generic [ref=e16]: AVAILABLE FOR PROJECTS
    - main [ref=e23]:
      - generic [ref=e24]:
        - link "← back to journal" [ref=e25] [cursor=pointer]:
          - /url: /journal
        - generic [ref=e26]:
          - generic [ref=e27]: Architecture
          - generic [ref=e28]: August 2026 · 1 min read
        - heading "Notes on Flowbus (E2E fixture)" [level=1] [ref=e29]
        - generic [ref=e31]:
          - paragraph [ref=e32]: Fixture content for the E2E visual/accessibility suite, not a real post.
          - separator [ref=e33]
          - paragraph [ref=e34]: This post exists to exercise the template's code-block rendering path.
          - figure [ref=e35]:
            - generic [ref=e36]:
              - generic [ref=e41]: example.ts
              - button "Copy" [ref=e42]
            - region "Code sample, ts" [ref=e46]:
              - code [ref=e48]: "export function example(): number { return 42; }"
        - generic [ref=e50]:
          - generic [ref=e51]:
            - paragraph [ref=e52]: RELATED PROJECT
            - generic [ref=e53]: Navigation Engine (E2E fixture)
            - generic [ref=e54]: A fixture case study covering the hero-image + approach-steps-grid template variant.
          - link "View case study →" [ref=e55] [cursor=pointer]:
            - /url: /work/navigation-engine
    - contentinfo [ref=e56]:
      - generic [ref=e57]: © 2026 Yurii Surzhykov
      - generic [ref=e58]:
        - link "GitHub" [ref=e59] [cursor=pointer]:
          - /url: https://github.com/yuriisurzhykov
        - link "LinkedIn" [ref=e60] [cursor=pointer]:
          - /url: https://linkedin.com/in/yuriisurzhykov
        - link "Email" [ref=e61] [cursor=pointer]:
          - /url: mailto:yuriisurzhykov@gmail.com
    - button
  - alert [ref=e62]
  - dialog [ref=e63]:
    - generic [ref=e64]:
      - generic [ref=e65]: YS
      - button [ref=e66]
    - navigation [ref=e70]:
      - link [ref=e71] [cursor=pointer]:
        - /url: /work
        - text: Work
      - link [ref=e72] [cursor=pointer]:
        - /url: /journal
        - text: Journal
      - link [ref=e73] [cursor=pointer]:
        - /url: /#contact
        - text: Contact
    - generic [ref=e74]:
      - generic [ref=e75]:
        - generic [ref=e76]:
          - link [ref=e77] [cursor=pointer]:
            - /url: /journal/flowbus
            - text: EN
          - link [ref=e78] [cursor=pointer]:
            - /url: /ru/journal/flowbus
            - text: RU
        - generic [ref=e79]:
          - button [ref=e80]: Dark
          - button [pressed] [ref=e81]: Light
      - generic [ref=e82]: AVAILABLE FOR PROJECTS
```

# Test source

```ts
  1  | import AxeBuilder from "@axe-core/playwright";
  2  | import { expect, test } from "@playwright/test";
  3  | import { pagesManifest } from "./pages.manifest";
  4  | import { seedTheme, THEMES } from "./utils/theme";
  5  | 
  6  | type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>;
  7  | type AxeViolation = AxeResults["violations"][number];
  8  | 
  9  | /**
  10 |  * axe-core impact levels that fail the build outright. "moderate"/"minor" violations are still
  11 |  * captured (attached to the test result + surfaced in the PR summary) but don't fail CI — they're
  12 |  * worth fixing, but gating every merge on them would be too strict for a one-person portfolio
  13 |  * repo. Tighten this set later if desired.
  14 |  */
  15 | const BLOCKING_IMPACTS = new Set(["critical", "serious"]);
  16 | 
  17 | for (const entry of pagesManifest) {
  18 |     for (const theme of THEMES) {
  19 |         test(`${ entry.name } @ ${ theme } - a11y`, async ({page}, testInfo) => {
  20 |             await seedTheme(page, theme);
  21 |             await page.goto(entry.path);
  22 |             await page.waitForLoadState("networkidle");
  23 | 
  24 |             const results = await new AxeBuilder({page})
  25 |                 .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
  26 |                 .analyze();
  27 | 
  28 |             await testInfo.attach("axe-results", {
  29 |                 body: JSON.stringify(results.violations, null, 2),
  30 |                 contentType: "application/json",
  31 |             });
  32 | 
  33 |             const blocking = results.violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ""));
  34 | 
> 35 |             expect(blocking, formatViolations(blocking)).toEqual([]);
     |                                                          ^ Error: Accessibility violations found:
  36 |         });
  37 |     }
  38 | }
  39 | 
  40 | function formatViolations(violations: AxeViolation[]): string {
  41 |     if (violations.length === 0) return "";
  42 | 
  43 |     const lines = violations.map((violation) => {
  44 |         const selectors = violation.nodes.map((node) => node.target.join(" ")).join(", ");
  45 |         return `- [${ violation.impact }] ${ violation.id }: ${ violation.help } (${ selectors })`;
  46 |     });
  47 | 
  48 |     return `Accessibility violations found:\n${ lines.join("\n") }`;
  49 | }
  50 | 
```