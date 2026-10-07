# Brand v3: YS "Cross"

A cruciform monogram. **Y** and **S** sit in the quarters of a gold Latin
cross, against the crossing, as IC XC does on icons and prosphora seals. To
anyone else the mark reads as a pair of coordinate axes. There is no frame:
when the mark needs a container it gets a filled tile, never an outline.

Geometry lives in `source/brand.mjs`: 80 × 92 units, cross 2.6 thick with the
crossing at (40, 40), arms 40 and a 52 foot. Y is Archivo Expanded Black at
24, S is Archivo Narrow ExtraBold at 34, both 5 units from the cross.

Positioning line: **Android Platform & Architecture** (a specialisation, not
a title).

Faith in the system stays quiet: the cross is the mark's only gold element,
and **S·D·G** (Soli Deo Gloria, Bach's signature on his scores) is set as a
small gold hallmark on the card back, the slide footer and the post template.

## Contents

- `logo/`: mark (platinum, ink with dark gold, one-colour, small with a
  thicker cross), lockups for dark grounds and white paper, filled tiles and
  a favicon.
- `images/`: avatars, LinkedIn and X headers, OG preview, title slide, journal
  post template, business card faces and a mockup with a gilded edge.
- `logo-directions.png`, `frame-options.png`, `cross-proportions.png`: the
  explorations behind the final mark (seal executions, framing, proportions).
- `source/`: the generators.

Palette and typefaces are shared with v2 (Abyss `#07090D`, Platinum `#E6E9ED`,
Gold `#E8B04B`, Haze `#7D8794`; Archivo and JetBrains Mono).

## Regenerating

```sh
npm i --no-save opentype.js playwright-core
# fonts in source/fonts/ (or BRAND_FONTS): ArchivoX-{300,500,700,900}.ttf (wdth 125),
# ArchivoN1-800.ttf (narrow), Archivo-{300,400,500}.ttf, JetBrainsMono-{400,500}.ttf
node docs/brand/v3/source/gen-logos.mjs docs/brand/v3/logo
CHROMIUM_PATH=/path/to/chrome node docs/brand/v3/source/gen-scenes.mjs docs/brand/v3/images /tmp/brand-scenes
```
