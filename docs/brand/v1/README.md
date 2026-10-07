# Brand v1: YS "One line"

Personal identity for Yurii Surzhykov. The mark draws **Y** and **S** as one
continuous stroke: two branches merge at a decision point (the amber node),
then the line runs unbroken to the end, which is "own the whole pipe" made
into a shape.

## Contents

- `logo/` holds the mark, the horizontal and stacked lockups, and the square
  tiles. Every lockup comes in graphite (for light grounds) and paper (for dark
  grounds). All text is outlined, so no fonts are needed to open them.
- `images/` holds ready-to-use rasters: avatars, the LinkedIn and X headers,
  the OG preview, a title slide, a journal post template, and business card
  faces plus a mockup.
- `source/` holds the generators that produce both folders.

## Core tokens

| Token        | Hex       | Role                                   |
| ------------ | --------- | -------------------------------------- |
| Graphite     | `#121316` | Primary dark, text                     |
| Paper        | `#F1F1EE` | Primary light ground                   |
| Signal Amber | `#F4B400` | The single accent: node, one trace     |
| Amber Ink    | `#8A6200` | Accent text on light (4.9:1 on Paper)  |
| Carbon       | `#1E1F23` | Surfaces on dark                       |
| Iron         | `#34363C` | Hairlines and traces on dark           |
| Steel        | `#5F636B` | Secondary text on light                |
| Mist         | `#D6D7D3` | Hairlines and traces on light          |

Typefaces: Instrument Serif for statements, Geist for headings and body,
Geist Mono (uppercase, +0.18em) for labels and specs.

Mark geometry: 6-unit stroke, R10 centreline radius on every turn, 45° branches
with horizontal terminals, 9-unit node. Clear space is two node diameters.

## Regenerating

```sh
npm i --no-save opentype.js playwright-core
# put Geist-{300,400,500,600}.ttf, GeistMono-{400,500}.ttf,
# InstrumentSerif.ttf and InstrumentSerif-Italic.ttf in source/fonts/ (or set BRAND_FONTS)
node docs/brand/v1/source/gen-logos.mjs docs/brand/v1/logo
CHROMIUM_PATH=/path/to/chrome node docs/brand/v1/source/gen-scenes.mjs docs/brand/v1/images /tmp/brand-scenes
```
