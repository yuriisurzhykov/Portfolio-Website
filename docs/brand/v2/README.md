# Brand v2: YS "Billet"

The mark is one 96×96 block with three cuts. A 7-unit channel from the top
edge forms the **Y**; two opposed slots turn the remaining metal into an **S**.
A gold diamond sits where the branches of the Y meet. No curves, only 0°, 45°
and 90°. The mark is defined as exact polygons in `source/brand.mjs`.

## Contents

- `logo/`: the mark (platinum, ink, gold, mono), horizontal and stacked
  lockups for dark grounds and white paper, and square tiles. Text is outlined.
- `images/`: avatars, LinkedIn and X headers, OG preview, title slide, journal
  post template, business card faces and a mockup with a gilded edge.
- `source/`: the generators for both folders.

## Core tokens

| Token    | Hex       | Role                                  |
| -------- | --------- | ------------------------------------- |
| Abyss    | `#07090D` | Primary ground                        |
| Deep     | `#0D1117` | Raised surfaces                       |
| Slate    | `#1A212C` | Dividers                              |
| Line     | `#2A3442` | Drawing linework, never text          |
| Haze     | `#7D8794` | Secondary text (5.5:1 on Abyss)       |
| Platinum | `#E6E9ED` | Text and mark (16.4:1 on Abyss)       |
| Gold     | `#E8B04B` | The single accent, once per layout    |
| Gold Ink | `#94650F` | Accent text on white paper (5.1:1)    |

Typefaces: Archivo Expanded (width 125%) for display and the name, Archivo for
body text, JetBrains Mono for labels, dimensions and data.

Graphic language: the mark drawn as a technical drawing (piece outlines in
Line, dimension lines with end ticks, mono labels) plus dimension lines that
carry real data in place of plain dividers.

## Regenerating

```sh
npm i --no-save opentype.js playwright-core
# fonts in source/fonts/ (or BRAND_FONTS): Archivo-{300,400,500}.ttf,
# ArchivoX-{300,500,700}.ttf (wdth 125), JetBrainsMono-{400,500}.ttf
node docs/brand/v2/source/gen-logos.mjs docs/brand/v2/logo
CHROMIUM_PATH=/path/to/chrome node docs/brand/v2/source/gen-scenes.mjs docs/brand/v2/images /tmp/brand-scenes
```
