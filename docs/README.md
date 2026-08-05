# docs/ — diagrams for the root README

## 2026-08-04 — Diagrams as a reproducible artifact, not a hand-pasted picture

**What needed doing.** The root `README.md` had grown into needing five
architecture diagrams (building blocks, components, deployment/CI-CD,
authentication, content lifecycle), but not one of those pictures was
allowed to turn into an artifact that gets touched up in an image editor
and quietly stops matching the code it describes.

**How it was done.**

1. Source of truth — plain-text `.puml` files under `docs/diagrams/`,
   ordinary PlantUML with no external `!include`/`!includeurl` (a
   deliberate choice: a diagram that reaches out over the network for
   macros during a CI render is a diagram that will eventually fail to
   build not because of an author's mistake, but because someone else's
   server happened to be unreachable that day).
2. Rendering — not this same project's own private PlantUML server, the
   one already used for diagram blocks inside posts
   (`docker-compose.yml`, `.scripts/provision/13-plantuml-install.sh`):
   that server is deliberately bound only to `127.0.0.1` on the VPS itself
   and must never be reachable from outside it. CI instead uses the
   official public `plantuml/plantuml` image — a self-contained CLI
   container carrying its own copy of `plantuml.jar`, requiring no network
   access whatsoever during the render itself. The first idea was to reuse
   the existing server through `PLANTUML_SERVER_URL` — rejected the moment
   it became clear that address simply does not resolve outside the VPS,
   and reaching for it from a GitHub runner would have been an attempt to
   knock on a door that was closed by design.
3. Automation — `.github/workflows/render-diagrams.yml`: fires only on a
   `pull_request`, only when at least one file under
   `docs/diagrams/**/*.puml` has changed, renders every diagram in one go,
   and commits the resulting `docs/images/*.svg` straight back to the PR's
   own branch — the same trick `accept-visual-baselines.yml` already uses
   to commit accepted visual snapshots (see `frontend/tests/README.md`),
   just without the `/update-snapshots` comment gate, since there is no
   subjective "accept" step here: a PlantUML render is deterministic, and
   the result either matches what already sits in `docs/images/` or it
   does not.
4. The trigger is scoped to `docs/diagrams/**`, not `docs/images/**` —
   which is exactly why the workflow's own commit can never re-trigger it:
   there is no need to guess whether a `GITHUB_TOKEN`-authored push would
   even fire a new event in the first place, nor to guard against
   recursion with a separate `if`.

**Why this is understandable and extensible.** A sixth diagram gets added
by the exact same motion as the first one: a new `.puml` file under
`docs/diagrams/`, a link to `docs/images/<name>.svg` in `README.md`, and
one Pull Request — CI takes care of everything else. Nobody should ever
open a file under `docs/images/*.svg` in an editor and touch it by hand;
in effect, the file reuses the very same discipline already applied to
`frontend/tests/visual-snapshots/`: an artifact with exactly one legitimate
author — a program, not a person.

**Fault tolerance and migration.** Should rendering ever need to move to a
different engine (Mermaid, say — already a `frontend/` dependency in its
own right, used inside posts' diagram blocks), the shape of the scheme does
not change: the same directory of plain-text sources, the same directory
of results, the same `pull_request` trigger — only the single `docker run`
step inside `render-diagrams.yml` would need to change.

**The SOLID angle.** Formally, this is the Single Responsibility Principle
applied not to a class, but to an entire file: `README.md` is responsible
for *what* to show the reader, `docs/diagrams/*.puml` is responsible for
*how the system is actually built*, expressed in the language of a diagram,
and `render-diagrams.yml` is responsible for exactly one thing — making
sure the first never quietly drifts away from the second, with nobody
having intended for that to happen.
