# @portfolio/design-tokens

A project-agnostic design-token engine: an **authoring API**
(`definePrimitives`/`defineContract`/`defineTheme`/`defineComponentTokens`/
`defineComposite`) that every token layer is constructed *through* — not a
bag of validator utilities called separately after the fact — plus a
compiler (reference resolution, cycle detection, usage-graph promotion
analysis, CSS/plain-data serialization) and a custom ESLint rule pair.

This package ships **zero color/role names of its own**. `surfacePrimary`,
`statusDanger`, `codeBlock.keyword` — none of that vocabulary lives here.
It lives in the consuming project (in this repo: `frontend/src/shared/ui/theme/`).
What this package provides is the *shape* every project's vocabulary has to
take, and the machinery that enforces it.

## Why this exists (2026-08-14)

**What needed doing.** The repo's own `ARCHITECTURE.md` had already designed
a layered token system (primitive → semantic → composite) but left three
real problems unsolved: nothing stopped a "global" semantic role from
existing for a single component's sake, nothing caught a primitive value
being reused by two unrelated components for two unrelated reasons, and
nothing made "required vs. optional" a checkable property instead of a
convention. A separate design conversation (see the plan this was built
from) worked out a formal answer — a promotion-graph the compiler builds
from real usage, not guessed — and asked for it to be genuinely portable to
a *different* project, not just a bigger file in `frontend/`.

**What was actually done, including the wrong turns:**

- **First draft: `mergeTokenTree(base, overrides)` typed `overrides` as
  `DeepPartial<typeof base>`.** Looked right until the real call site
  (`themes/dark.ts` merging shared roles with per-theme roles — two mostly
  *disjoint* key sets, not one overriding the other) failed to typecheck:
  `DeepPartial<Base>` can only narrow keys `Base` already has, never add
  new ones. Fixed by making `mergeTokenTree` generic over two *independent*
  type parameters (`TBase`, `TOverrides`) returning `TBase & TOverrides` —
  the real shape of "combine two mostly-different objects," not "partially
  override one."
- **First draft of `defineXxx()`'s return types preserved the caller's
  exact literal type** (`definePrimitives<T>(tree: T): PrimitiveLayer<T>`).
  Broke the moment a real project tried to put several different
  primitive objects into one `CompilerInput.primitives: Record<string,
  PrimitiveLayer<TokenTree>>` — TypeScript won't implicitly widen a
  concrete object type to an index-signature type once it's already gone
  through a generic function and been assigned to a variable. Fixed by
  having every authoring function return the *generic* `PrimitiveLayer<TokenTree>`
  (etc.) instead of `PrimitiveLayer<T>` — the exact input shape is still
  checked on the way IN (that's what catches a real authoring mistake), it
  just isn't preserved on the way OUT, where nothing needs it anyway.
- **DS101/DS102 (unused / single-consumer global-semantic role) originally
  fired for every REQUIRED role**, since a required role like
  `interactivePrimary` is mostly consumed through the Tailwind adapter
  (invisible to this token-to-token graph), not by another token. Fixed by
  excluding a category's required paths (from its `Contract`) from both
  checks — they're the ONE case where "no component/composite references
  this" is normal, not a smell.
- **A real DS007 (duplicate generated variable name) collision, found
  live, not hypothetical:** a flat category's primitive tier and its
  semantic tier can name a leaf identically — `radius`'s primitive `pill`
  step and its semantic `pill` role both flattened to `--ds-radius-pill`.
  Fixed by prefixing flat-semantic output with `["semantic", category]`
  instead of `[category]`. Deliberately NOT applied to color's theme
  roles — that collision never actually occurs there (verified by the same
  check simply never firing for color), and changing it would deviate from
  `ARCHITECTURE.md`'s already-accepted `--ds-color-*` contract for no reason.
- **Mutation testing found a real, literal zero:** `serializers/shadow.ts`
  had no dedicated test file at all (only exercised indirectly through
  `compile.test.ts`), and the first real Stryker run measured this
  package's overall score at 56.80% — nowhere near the guessed 75%
  originally written into `stryker.config.mjs` before ever running it
  once. Corrected: wrote `shadow.test.ts` (now 100%), strengthened
  `css-value.test.ts`/`gradient.test.ts`, and tightened 3 assertions in
  `compile.test.ts` to check actual DS201/DS102 message text instead of
  just "an error was thrown." Real, measured score after that pass:
  **72.35%** (620/857 mutants killed). `compile.ts` (58.20%) and the two
  ESLint rule files (61–69%) are the remaining honest gaps — mostly
  `StringLiteral` mutants inside long human-facing error messages and
  defensive `[]`/`{}` initializers, lower-value to chase further than the
  structural bugs this suite already caught live (see below).
  `stryker.config.mjs`'s `thresholds.break: 70` is this real number minus
  headroom, not a guess.

**Proof this catches real bugs, not just theoretical ones** (all found
*while migrating this repo's own color tokens onto this engine, in the same
change that built it*):

- `components/code-block.ts`'s `keyword` and `composites/shadows.ts`'s
  brand-colored shadows both referenced `{color.brand.500}` directly — a
  real DS201 crossing, resolved by routing both through the
  `interactivePrimary` role that already existed for exactly this meaning.
- `components/code-block.ts`'s syntax `className` color and
  `components/skill-card.ts`'s decorative icon color both reached for
  `{color.accent.purple}` directly — DS201 again, this time a genuine
  shared meaning ("the site's one decorative violet accent"), resolved by
  promoting to a new `theme.color.decorativeAccent` role.
- Four `theme.color.meshSpot*` roles existed for a single composite's sake
  — DS102, resolved by inlining the primitives directly into that
  composite instead.

## 2026-08-14 — A real ReDoS finding (GitHub Advanced Security / CodeQL), fixed

`no-arbitrary-color-class.ts`'s `COLOR_BEARING_ARBITRARY_CLASS` matched
against the WHOLE className string with only a soft `(?:^|[\s"'`])`
lookback — not a hard `^...$` anchor. `.match()` without the `g` flag
retries at every position where that lookback succeeds, and at each one,
the color-function alternatives' `[^)]*` scanned forward with no bound. A
className with many repeated, never-closed prefixes made this genuinely
O(n²): one scan attempt per candidate start position, each itself O(n) in
the worst case. CodeQL flagged this correctly (6 separate alert entries,
one per color-function alternative) — not a false positive to dismiss.

Fixed by splitting the className on whitespace FIRST (a Tailwind class is
inherently a whitespace-delimited token — this is also just the
semantically correct unit to check, not only a performance fix) and
matching each token against a fully `^...$`-anchored pattern with a
bounded inner scan (`{0,100}`, not `*`). No per-token attempt can exceed
O(1) work, so the whole check is O(n) in the string's total length.
Verified live, not just reasoned about: added a regression test feeding
the exact adversarial shape (`" accent-[rgb(".repeat(20000)`, ~260,000
characters) and asserting a real wall-clock bound (`<500ms`) — a
regression here shows up as a hung test, not a wrong answer. Also caught
in the process: the existing hsl() test case
(`text-[hsl(20 94% 61%)]`) used a literal space inside the arbitrary
value, which isn't valid Tailwind syntax to begin with (Tailwind itself
requires `_` in place of a space there, for the exact same "classes are
whitespace-delimited" reason) — fixed to `text-[hsl(20_94%_61%)]`.

**Correction, found the same day:** that check was wrong about one file.
`references.ts`'s `TOKEN_REFERENCE = /\{([^}]+)}/g` has the exact same
shape — `g` flag, no `^` anchor, so `.test()`/`.replace()`/`.matchAll()`
(its 3 real call sites: `isReferenceLike`, `resolveString`,
`collectReferences`) all retry at every character position on failure, and
its `[^}]+` scanned unboundedly. CodeQL flagged all 3 call sites
separately (reproduction: many repetitions of `"{{|"`). Fixed the same
way — `[^}]{1,200}`, not `[^}]+` — and bounded `ALPHA_CALL` and
`validate.ts`'s `REFERENCE_LIKE` too, even though both are fully
`^...$`-anchored (a single whole-string attempt, never retried at another
position, so never the same risk) — for one consistent "no unbounded scan
inside braces" invariant across the package, not because they were
independently flagged. Added a regression test for each of the 3 real call
sites, feeding the exact adversarial shape (`"{{".repeat(50000)`) with a
real wall-clock bound, same as the `no-arbitrary-color-class.ts` fix above.

Every remaining regex in this package was checked against the same shape
while investigating this (`RAW_COLOR_VALUE`, `HSL_PATTERN`,
`THEME_OR_SEMANTIC`, `HSL_COLOR`, `COLOR_PROPERTY`, ...) — all of them are
either fully `^...$`-anchored with no unbounded scan, or have no ambiguous
alternation to begin with, so none of them share this risk.

## 2026-08-14 — A real, live bug: Mermaid couldn't render `alpha()`-based colors

Not a lint finding this time — an actual `Diagram render error: Unsupported
color format: "color-mix(in srgb, hsl(20 94% 61%) 12%, transparent)"` from
using the real app. Root cause: `alpha({color.X}, N%)` compiled to a CSS
`color-mix()` call — valid CSS a browser renders fine, but Mermaid's "base"
theme runs every `themeVariable` through its OWN color-math library (no CSS
engine to lean on), which parses a plain `hsl()`/`rgb()`/hex string but not
`color-mix()`.

Fixed at the source, not with a Mermaid-specific workaround: every color
primitive in this system is already validated as an `hsl()` string (DS001),
and `hsl()` has its own native alpha syntax (`hsl(H S% L% / A%)`) —
`color-mix(in srgb, hsl(H S% L%) A%, transparent)` and `hsl(H S% L% / A%)`
are VISUALLY IDENTICAL (both mean "this hue/saturation/lightness at A%
opacity"), but the latter is a plain literal every consumer can parse —
exactly what `generated/resolved.ts` (read by every non-CSS adapter) needs.
`references.ts`'s `resolveString()` now parses the resolved primitive and
re-emits it with the requested alpha via `withAlpha()`; `color-mix()` is
still there as a defensive fallback for a resolved value that somehow isn't
plain `hsl()` despite DS001 — never silently wrong, just documented as a
case that shouldn't occur in practice.

`composites/gradients.ts` (`glow`/`mesh`)'s OWN, separate `color-mix()`
usage for a gradient STOP's opacity (`serializers/gradient.ts`) is
untouched, deliberately — those are CSS-only output (`--ds-gradient-*`),
never read by Mermaid/OG-image/WebGL today. Worth remembering if a future
adapter ever reads a gradient's resolved value directly: the same class of
bug would resurface there.

## 2026-08-14 — DS001's color validators existed, were unit-tested, and were never actually called by the compiler (found by a bot review comment)

`validateColorPrimitiveFormat` and `validateNoRawColorLiterals` were real,
tested functions, exposed via the frontend ESLint config against JSX call
sites — but `compile.ts`'s `validateDesignTokens` only ever ran the
reference-resolution graph checks (DS002/DS006/DS101/DS102/DS201/DS202).
Neither DS001 color validator was invoked anywhere in the compile pipeline
itself. A color primitive authored as `#0d0f14` instead of `hsl(...)`, or a
theme/component color role authored as a raw literal instead of a
`{reference}`, compiled without complaint — exactly the shape of value the
frontend ESLint config is documented to reject, just never checked at the
one point (`tokens:generate`/`tokens:check`) that actually produces the
shipped CSS/data.

Wiring both in turned out to need a third function, not a blind "run the
existing validator on every tree": `validateNoRawColorLiterals` assumes
every string leaf in the tree it's given must be a reference — true for a
theme's `color` category or a (today, 100% color) component-token tree, but
false for a composite recipe. `composites/gradients.ts`'s `Gradient` shape
mixes real color references (`stops[].color`) with legitimate non-reference
structural literals (`type: "radial"`, `position: "30% 30%"`) that were
never meant to route through the token system — running the whole-tree
validator there would have rejected valid, already-shipping data as a false
positive. Added `validateColorFieldsDeep`: walks an arbitrary tree/array and
runs `validateNoRawColorLiterals` only on values under a key literally
named `"color"`, ignoring everything else — covers `Gradient`'s
`stop.color` and `ShadowLayer`'s `layer.color` (both defined in this
package) without hardcoding either shape by name, so a project's own custom
composite kind gets the same coverage for free as long as it names its
color field `color` too.

`validateDesignTokens` now calls: `validateColorPrimitiveFormat` on
`input.primitives.color`; `validateNoRawColorLiterals` on each theme's
`color` category and on every component token tree; `validateColorFieldsDeep`
on every composite. Verified against this repo's own real token source
(`frontend/`'s `tokens:generate`) — no new DS001 errors, only the
pre-existing DS101 warnings, confirming the real `tokens/color.ts`/
`themes/*.ts`/`components/*.ts`/`composites/*.ts` were already compliant
and this wasn't a live bug in THIS project, just an unenforced gap for any
project (including a future one reusing this package) that wasn't.

**Found by mutation testing, not by hand:** the first wiring guarded each
call site (`if (input.primitives.color) { validateColorPrimitiveFormat(...) }`,
`if (colorRoles) validateNoRawColorLiterals(...)`) the way several existing
`compile.ts` checks already do. Both guards' mutants survived. Read what
the mutant actually changed (this rule's own first step) instead of writing
a test to force coverage: `validateNoRawColorLiterals` already returns
immediately for `null`/`undefined` (`node == null`), so its guard was
calling a no-op either way — genuinely equivalent code, not a real branch.
`validateColorPrimitiveFormat`'s guard WAS load-bearing (it required a
`Record<string, unknown>`, and would have thrown a `TypeError` from
`Object.entries(undefined)` on a color-less project) — but the better fix
was making the validator itself tolerate a missing/non-object `node`
(matching the tolerance `validateNoRawColorLiterals` already had), the same
"push a defensive check into the one function that needs it, not every call
site" reasoning as everywhere else this package favors DRY over repeated
ceremony. Removed both call-site guards entirely and added a real test — a
radius-only project with no `color` category anywhere — proving a
color-less project still compiles instead of crashing on either validator.

## 2026-08-15 — DS001's dimension/typography side: `no-arbitrary-dimension-class`/`no-raw-dimension-value`, and why they end up flagging EVERY bare literal, no threshold

Added as the dimension counterpart to the two existing color rules, during a
repo-wide sweep replacing hardcoded `w-[26px]`-style Tailwind values and
inline `style={{ width: "26px" }}` with real design tokens. Shares
`ast-helpers.ts` (extracted from the two color rules for this) —
`isClassNameAttribute`/`isStyleAttribute`/`propertyKeyName`/`walkForStrings`
were duplicated inline in both before this, now a single copy all four rules
import.

**A `minPx` threshold option existed for one round-trip, then was removed
entirely** — worth recording exactly why, since a smaller threshold-based
design is the "obvious" first approach and this project's owner explicitly
rejected it. The first version exempted a literal below a configurable floor
(intended for a consuming project's own smallest primitive step, e.g. 4px)
on the theory that a 2-3px pill/chip-boundary micro-adjustment is "too small
to be a real token concern." Challenged directly: *"why wasn't `gap-[2px]`
actually fixed instead of just exempted?"* — checking for real (not
assuming) found that every one of those cases already had a real fix: this
project's own `xxs` token (4px) or a plain Tailwind numeric utility
(`gap-0.5`, `mt-px`) matched an EXISTING sibling component's already-migrated
pattern exactly (see `frontend/src/shared/ui/theme/README.md`'s 2026-08-15
entry). Once that was true for every case in this codebase, the `minPx`
option had no reason to exist — a threshold is only justified by a value
that genuinely has no real alternative, and none did. Both rules now report
every bare literal unconditionally; the schema is `[]`.

**Same reasoning killed the `vh`/`vw`/`vmin`/`vmax` exemption**, added in
the same round for "relative to the viewport, not a fixed-scale concern."
The project owner's actual position, stated directly: *"in any component we
must use tokens — ours, or Tailwind's own built-ins. Any other value is a
mistake."* No unit gets a free pass just because it isn't px/rem/em/%. In
practice this didn't even cost a new token: `StatusPage.tsx`'s one real
`min-h-[60vh]` case turned out to have a genuine structural fix (the
ancestor layout already provides a `flex`/`flex-1` chain in every context it
renders in — see the same theme README entry), not a value to grandfather
in. `ch` remains the one still-exempt unit — a character-based line-length
tied to font metrics, not a fixed-scale spacing/sizing concern the way `vh`
turned out to be once actually checked.

**Mutation testing, added to this package's scope alongside the two new
rule files:** `ast-helpers.ts` had never been in `stryker.config.mjs`'s
`mutate` list (only the two rules that originally contained its logic
inline were) — adding it surfaced 15 real no-coverage mutants that predate
this session's dimension work, not new bugs. Two categories, both fixed with
a real test (not a suppression, since both are genuinely-unspecified real
`walkForStrings`/`propertyKeyName` shapes, not equivalent code):
- The existing `&&` test asserted on `active && "text-primary"` — a value
  that never matches the dimension regex either way, so it never actually
  proved `LogicalExpression` gets walked at all (the exact "weak assertion
  passes regardless of the mutant" pattern this repo's mutation-testing rule
  warns about). Fixed by using a real dimension-bearing literal on the
  walked branch, and added the three still-untested `walkForStrings` shapes
  real component code in this repo actually uses: an array argument to
  `cn()`, a clsx-style conditional object (`cn({ "gap-[2px]": active })`),
  and a template literal directly in `className` (not just inline `style`,
  already covered there).
- `propertyKeyName`'s `Identifier` vs `Literal` branches were only ever
  exercised by unquoted style keys (`{ width: "26px" }` parses as
  `Identifier`) — every existing test used that shape, so a mutant
  collapsing the `if (key.type === "Identifier")` guard to `if (true)`
  changed nothing observable. Added one test with a quoted key
  (`{ "width": "26px" }`, a `Literal` node) to actually distinguish the two
  branches.

Score after: 75.65% (up from the prior 73.54% baseline before this session's
dimension work — `ast-helpers.ts` alone went 51.52% → 77.27%). `break`
stays at 70 (see `stryker.config.mjs`) — comfortable headroom, same
reasoning as the prior baseline entries: not chasing the remaining
no-coverage mutants (mostly string-literal error-message text and
defensive `[]`/`{}` initializers in the two rule files themselves) further
right now, a documented v1 scope limit rather than an oversight.

## How to use this in a NEW project

1. Add this package as a workspace dependency (see `frontend/package.json`'s
   `"@portfolio/design-tokens": "*"` + `frontend/next.config.ts`'s
   `transpilePackages` for the exact wiring this repo uses).
2. `definePrimitives({...})` for your own scale(s) — any names, any values,
   no constraints. Primitives are addressed only through `{category.path}`
   reference strings, never a hardcoded class name.
3. `defineContract({ category, required: [...] })` — list exactly the
   roles YOUR shared component library's Tailwind classes actually
   consume. This is the one place a required-role list lives; don't invent
   a parallel interface to keep in sync with it.
4. `defineTheme(contract, { ...roles })` — once per theme name for a
   themed category (color, usually), once total for a flat category
   (radius, spacing, ...). Missing a required key throws immediately, at
   import time — not the first time someone remembers to run a checker.
5. `defineComponentTokens(namespace, {...})` / `defineComposite(kind, {...})`
   freely, for anything component- or recipe-specific. No contract, by
   design.
6. Write a `compile.config.ts` (see `frontend/src/shared/ui/theme/compiler.config.ts`)
   assembling every module above into this package's `CompilerInput` shape,
   and a `scripts/generate-design-tokens.ts` (see
   `frontend/scripts/generate-design-tokens.ts`) calling `compileDesignTokens()`
   and writing `generated/tokens.css` + `generated/resolved.ts`.
7. Write your own `adapters/tailwind.css` mapping the generated `--ds-*`
   variables onto the class-facing names Tailwind's `@theme` reads. Any
   non-CSS consumer (Mermaid, `next/og`, WebGL, ...) reads
   `generated/resolved.ts` ONLY — never this package, never the raw theme
   source (see "Runtime boundary" below).

## Re-skinning an EXISTING project onto a new brand

Copy the primitive file(s), replace the values (`brand.500` etc.) — every
downstream file holds a `{path}` reference, never a value, so nothing else
changes syntactically. Reassigning a role (not just recoloring it) is one
line inside the relevant `defineTheme(...)` call. The `defineContract(...)`
calls almost never change during a re-skin — required-ness is about what
the component library needs structurally, not which brand it's wearing.

## Runtime boundary — read this before importing this package from app code

**Nothing under a project's `adapters/` should import this package at
runtime**, with one narrow, documented exception
(`hslStringToRgb01` — see `frontend/src/shared/ui/theme/adapters/project-graph.ts`'s
own comment for why a pure, project-agnostic color-math function is a
different concern than "the compiler"). `compileDesignTokens()`,
`resolveTree()`, the whole authoring API — these are **build-time-only**
dependencies of your `generate-design-tokens.ts` script. Every real runtime
consumer (Mermaid, `next/og`, a WebGL canvas, or any future adapter) reads
the ALREADY-RESOLVED `generated/resolved.ts` instead. This keeps reference
resolution, cycle detection, and the whole validation/authoring engine out
of both the server and client bundles.

## Architecture

```
Primitive (definePrimitives)
   │
   ├──► Global semantic (defineTheme against a Contract)
   │        │
   │        ▼
   └──► Component semantic (defineComponentTokens, no contract)
   │        ▲
   ▼        │
Composite (defineComposite, may reference primitive OR global-semantic)
   │
   ▼
compile() — resolve + validate + usage-graph
   │
   ├──► generated/tokens.css     (CSS custom properties, static, committed)
   └──► generated/resolved.ts   (plain resolved data, for non-CSS adapters)
```

Dependencies point downward only. `tokens/*.ts` never imports from
`themes/`/`components/`/`composites/` — enforced structurally: it would be
a real circular-import error at compile time (DS003), not a runtime check.

## The DS0xx/DS1xx/DS2xx rule family

| Rule | What it catches | Where |
|---|---|---|
| DS001 | Raw color literal outside a primitive layer | `validate.ts` (source), custom ESLint rules (JSX/Tailwind) |
| DS002 | A `{path}` reference that doesn't resolve | `validate.ts` |
| DS003 | Primitive importing from a higher layer | TypeScript's own circular-import error — no runtime code |
| DS004 | A global-semantic role referencing another semantic role instead of a primitive | `validate.ts`, enforced inside `defineTheme()` |
| DS005 | A required key missing from a theme/semantic object | `validate.ts`'s `assertRequiredKeys`, enforced inside `defineTheme()` at construction |
| DS006 | An optional key present in one sibling tree (e.g. one theme) but not another | `validate.ts`'s `checkOptionalKeyParity` (warning) |
| DS007 | Two categories generating the same CSS variable name | `validate.ts`'s `validateUniqueVariableNames` |
| DS101 | A global-semantic role no component/composite references (excludes required roles — see above) | `usage-graph.ts` (warning) |
| DS102 | A global-semantic role consumed by exactly one component/composite namespace | `usage-graph.ts` |
| DS201/202 | A primitive referenced directly by 2+ independent component/composite namespaces | `usage-graph.ts` — collapsed into one check; same mechanism, same fix either way |
| DS203 | A primitive reused repeatedly WITHIN one component namespace | no code needed — it's the absence of a DS201/202 violation |

## Mutation testing

`npm run test:mutation` (Stryker) — see `stryker.config.mjs`'s own comment
for the real, dated baseline numbers and why the threshold is set where it
is. Unlike `backend/`/`frontend/`, this package needs no dedicated
`vitest.mutation.config.ts`: every test here is a plain, DB-free,
jsdom-free Node unit test, so pointing Stryker straight at the normal
`vitest.config.ts` is safe (verified by actually running it, not assumed).
