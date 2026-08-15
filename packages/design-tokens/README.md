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
