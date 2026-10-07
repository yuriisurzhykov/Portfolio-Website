# Brand v3: YS "Seal"

A cruciform monogram. A gold Latin cross divides a square seal into quarters;
**Y** fills the short upper-left quarter and **S** the tall lower-right one,
as letters sit in the quarters of the cross in the IC XC inscription on icons.
To anyone else the mark reads as a pair of coordinate axes.

Y is set in Archivo Expanded Black and S in Archivo Narrow ExtraBold, so each
letter fills its quarter without distortion. Geometry lives in
`source/brand.mjs`: 96-unit square, 2.5 frame, 3.5 cross with the crossbar at
y 40, 5-unit inner margin.

Faith in the system stays quiet: the cross is the mark's only gold element,
and **S·D·G** (Soli Deo Gloria, Bach's signature on his scores) is set as a
small gold hallmark on the card back, the slide footer and the post template.

## Contents

- `logo/`: seal (platinum, ink, one-colour), open version without the frame,
  lockups for dark grounds and white paper, square tiles.
- `images/`: avatars, LinkedIn and X headers, OG preview, title slide, journal
  post template, business card faces and a mockup with a gilded edge.
- `logo-directions.png`: the four executions compared before choosing the seal.
- `source/`: the generators.

Palette and typefaces are shared with v2 (Abyss `#07090D`, Platinum `#E6E9ED`,
Gold `#E8B04B`, Haze `#7D8794`; Archivo and JetBrains Mono).

## Regenerating

```sh
npm i --no-save opentype.js playwright-core
# fonts in source/fonts/ (or BRAND_FONTS): ArchivoX-{500,900}.ttf (wdth 125),
# ArchivoN1-800.ttf (narrow), Archivo-{300,400,500}.ttf, ArchivoX-{300,700}.ttf,
# JetBrainsMono-{400,500}.ttf
node docs/brand/v3/source/gen-logos.mjs docs/brand/v3/logo
CHROMIUM_PATH=/path/to/chrome node docs/brand/v3/source/gen-scenes.mjs docs/brand/v3/images /tmp/brand-scenes
```
