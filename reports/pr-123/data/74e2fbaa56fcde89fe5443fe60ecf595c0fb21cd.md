# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> journal-flowbus @ light
- Location: tests/e2e/visual.spec.ts:7:13

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  Expected an image 1440px by 1458px, received 1440px by 1518px. 

  Snapshot: journal-flowbus/light.png

Call log:
  - Expect "toHaveScreenshot(journal-flowbus/light.png)" with timeout 15000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - Expected an image 1440px by 1458px, received 1440px by 1518px.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - Expected an image 1440px by 1458px, received 1440px by 1518px.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "YS" [ref=e5] [cursor=pointer]:
          - /url: /
        - generic [ref=e6]: AVAILABLE FOR PROJECTS
      - navigation [ref=e12]:
        - link "Work" [ref=e13] [cursor=pointer]:
          - /url: /work
        - link "Journal" [ref=e14] [cursor=pointer]:
          - /url: /journal
        - link "Contact" [ref=e15] [cursor=pointer]:
          - /url: /#contact
      - generic [ref=e16]:
        - generic [ref=e17]:
          - link "EN" [ref=e18] [cursor=pointer]:
            - /url: /journal/flowbus
          - link "RU" [ref=e19] [cursor=pointer]:
            - /url: /ru/journal/flowbus
        - 'button "Display theme: Light" [ref=e20] [cursor=pointer]'
    - main [ref=e28]:
      - generic [ref=e29]:
        - link "← back to journal" [ref=e30] [cursor=pointer]:
          - /url: /journal
        - generic [ref=e31]:
          - generic [ref=e32]: Architecture
          - generic [ref=e33]: November 2026 · 1 min read
        - heading "Notes on Flowbus (E2E fixture)" [level=1] [ref=e34]
        - generic [ref=e36]:
          - paragraph [ref=e37]: Fixture content for the E2E visual/accessibility suite, not a real post.
          - separator [ref=e38]
          - paragraph [ref=e39]: This post exists to exercise the template's code-block rendering path.
          - figure [ref=e40]:
            - generic [ref=e41]:
              - generic [ref=e46]: example.ts
              - button "Copy" [ref=e47]
            - region "Code sample, ts" [ref=e51]:
              - code [ref=e53]: "export function example(): number { return 42; }"
        - paragraph [ref=e55]:
          - text: S • D • G
          - generic [ref=e56]: Soli Deo Gloria
        - generic [ref=e57]:
          - generic [ref=e58]:
            - paragraph [ref=e59]: RELATED PROJECT
            - generic [ref=e60]: Navigation Engine (E2E fixture)
            - generic [ref=e61]: A fixture case study covering the hero-image + approach-steps-grid template variant.
          - link "View case study →" [ref=e62] [cursor=pointer]:
            - /url: /work/navigation-engine
    - contentinfo [ref=e63]:
      - generic [ref=e64]: © 2026 Yurii Surzhykov
      - generic [ref=e65]:
        - link "GitHub" [ref=e66] [cursor=pointer]:
          - /url: https://github.com/yuriisurzhykov
        - link "LinkedIn" [ref=e70] [cursor=pointer]:
          - /url: https://linkedin.com/in/yuriisurzhykov
        - link "Email" [ref=e73] [cursor=pointer]:
          - /url: mailto:yuriisurzhykov@gmail.com
    - button [aria-hidden]
  - alert [ref=e76]
  - dialog [aria-hidden] [ref=e77]:
    - generic [ref=e78]:
      - generic [ref=e79]: YS
      - button [ref=e80]
    - navigation [ref=e84]:
      - link [ref=e85] [cursor=pointer]:
        - /url: /work
        - text: Work
      - link [ref=e86] [cursor=pointer]:
        - /url: /journal
        - text: Journal
      - link [ref=e87] [cursor=pointer]:
        - /url: /#contact
        - text: Contact
    - generic [ref=e88]:
      - generic [ref=e89]:
        - generic [ref=e90]:
          - link [ref=e91] [cursor=pointer]:
            - /url: /journal/flowbus
            - text: EN
          - link [ref=e92] [cursor=pointer]:
            - /url: /ru/journal/flowbus
            - text: RU
        - generic [ref=e93]:
          - button [ref=e94]: Dark
          - button [pressed] [ref=e95]: Light
      - generic [ref=e96]: AVAILABLE FOR PROJECTS
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | import { visualFixturesManifest } from "./visual-fixtures.manifest";
  3  | import { seedTheme, THEMES } from "./utils/theme";
  4  | 
  5  | for (const entry of visualFixturesManifest) {
  6  |     for (const theme of THEMES) {
  7  |         test(`${ entry.name } @ ${ theme }`, async ({page}) => {
  8  |             await seedTheme(page, theme);
  9  |             await page.goto(entry.path);
  10 |             await page.waitForLoadState("networkidle");
  11 | 
  12 |             // Array name -> nested folder: tests/visual-snapshots/<page>/<theme>-<viewport>.png,
  13 |             // one folder per page instead of 30 flat files (see frontend/tests/README.md, section 4).
> 14 |             await expect(page).toHaveScreenshot([entry.name, `${ theme }.png`], {
     |                                ^ Error: expect(page).toHaveScreenshot(expected) failed
  15 |                 fullPage: true,
  16 |             });
  17 |         });
  18 |     }
  19 | }
  20 | 
```