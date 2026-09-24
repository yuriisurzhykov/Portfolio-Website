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

  Expected an image 1440px by 1450px, received 1440px by 1462px. 73602 pixels (ratio 0.04 of all image pixels) are different.

  Snapshot: journal-flowbus/light.png

Call log:
  - Expect "toHaveScreenshot(journal-flowbus/light.png)" with timeout 15000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - Expected an image 1440px by 1450px, received 1440px by 1462px. 73602 pixels (ratio 0.04 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - Expected an image 1440px by 1450px, received 1440px by 1462px. 73602 pixels (ratio 0.04 of all image pixels) are different.

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
          - generic [ref=e33]: September 2026 · 1 min read
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
        - generic [ref=e55]:
          - generic [ref=e56]:
            - paragraph [ref=e57]: RELATED PROJECT
            - generic [ref=e58]: Navigation Engine (E2E fixture)
            - generic [ref=e59]: A fixture case study covering the hero-image + approach-steps-grid template variant.
          - link "View case study →" [ref=e60] [cursor=pointer]:
            - /url: /work/navigation-engine
    - contentinfo [ref=e61]:
      - generic [ref=e62]: © 2026 Yurii Surzhykov
      - generic [ref=e63]:
        - link "GitHub" [ref=e64] [cursor=pointer]:
          - /url: https://github.com/yuriisurzhykov
        - link "LinkedIn" [ref=e68] [cursor=pointer]:
          - /url: https://linkedin.com/in/yuriisurzhykov
        - link "Email" [ref=e71] [cursor=pointer]:
          - /url: mailto:yuriisurzhykov@gmail.com
    - button
  - alert [ref=e74]
  - dialog [ref=e75]:
    - generic [ref=e76]:
      - generic [ref=e77]: YS
      - button [ref=e78]
    - navigation [ref=e82]:
      - link [ref=e83] [cursor=pointer]:
        - /url: /work
        - text: Work
      - link [ref=e84] [cursor=pointer]:
        - /url: /journal
        - text: Journal
      - link [ref=e85] [cursor=pointer]:
        - /url: /#contact
        - text: Contact
    - generic [ref=e86]:
      - generic [ref=e87]:
        - generic [ref=e88]:
          - link [ref=e89] [cursor=pointer]:
            - /url: /journal/flowbus
            - text: EN
          - link [ref=e90] [cursor=pointer]:
            - /url: /ru/journal/flowbus
            - text: RU
        - generic [ref=e91]:
          - button [ref=e92]: Dark
          - button [pressed] [ref=e93]: Light
      - generic [ref=e94]: AVAILABLE FOR PROJECTS
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