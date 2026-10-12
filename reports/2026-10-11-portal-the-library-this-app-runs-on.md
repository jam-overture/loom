# 2026-10-11 — the library this app runs on, and the theme that only one document needed

**Build order section:** §5 — Loom Portal. Condition 2 of
[0259](../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md):
*the portal's registry is the app's registry.*

**Branch:** `portal-59-the-library-this-app-runs-on` (→ `main`), cut from `main`
at `7e96b6d`.

**Closes** the 11 October entry owned by this lane. The maintainer settled the
open question the same day: *"I think we just replace them with the actual
starter primitives and discard the old ones."* Taken as written.

---

## What changed

The portal registered four primitives it had written itself — `loom.page`,
`loom.card`, `loom.heading`, `loom.prose`, a few lines of Tailwind each. They
were scaffolding from before the library existed and they were the one thing
standing between this portal and the pages this deployment serves: `(marketing)`
builds from `createStarterPrimitiveRegistry()`, so a page of its parts arriving
in this store was a page of parts the portal could not draw.

They are gone. The registry is the library's 107, and the seed is rebuilt
against the library's schemas.

---

## The migration, which was the predicted part

Both registries are `.strict()`, so every difference is a refusal rather than an
ignored key:

| type | the portal's took | the library's takes | what the seed had to become |
| --- | --- | --- | --- |
| `loom.page` | nothing | `width`, `fills` | compatible |
| `loom.card` | `variant: plain \| outlined` | `tone`, `padding`, `href`, `elevation` | `variant: "outlined"` → `tone: "outline"` |
| `loom.heading` | `level?: 1 \| 2 \| 3` | `level` **required**, 1–6 | compatible — the seed always set one |
| `loom.prose` | `tone: normal \| muted` | `tone: default \| muted` | `"normal"` → `"default"` |

**It cost four test files, not the fifty-five that build these types.** Most
build `configure` deltas, which are payloads the registry never validates. The
four that broke were the ones that read a prop back off the seed or validated
against the registry, and each failure was the right one.

Two of the four were **tests pinned to the deployment rather than to the
function**, and both are better now:

- `floors.test.ts` asserted `portalPolicy.registeredPrimitiveTypes` equalled a
  literal list of the four — a second copy of the registry, which passed while
  the two agreed and failed the moment they did not, reporting the wiring as
  broken when what had changed was the library. It now asserts the two are the
  same set, whatever the set is, which is what the file's own comment above it
  said the property was.
- `app-view.test.ts` read *the pieces this portal registers* and *the pieces the
  seed uses* as one list, which they were at four and are not at 107. Those
  functions take rows and know nothing about any registry, so they are handed
  rows. What still reads the real deployment is only what is genuinely about it,
  and it is marked as such.

---

## The two things the photograph found, and neither test nor gate could

### The theme reached six documents and the page is in a seventh

A library primitive reads its colour, family and size off the resolved theme.
The portal's four wrote Tailwind, so nothing here had ever needed a
`ThemeRegistry`. It has one now, and every render passes it.

The first photograph after the swap showed the preview pane drawing the page
with **no ramp, no palette, no spacing** — a 72px headline set at body size, a
card as a hairline box. Not an error: *absent means the tree's theme is not
resolved and nothing is mounted*, in the seam's own words. The markup was right
and every variable behind it resolved to nothing.

**A theme mounts on a wrapper in the document it renders into, and the device
pane is an `iframe`** — `app/(preview)/portal/pages/[treeId]/surface/page.tsx`,
a route group of its own so a page shown at a phone's size has a phone's
viewport. Six themed renders in the parent document do nothing for a child one.

**It is a cross-group diff and here is the line that owes an explanation.**
`(preview)` is not in the lane table. It imports `@/app/(portal)/_lib/registry`,
serves `/portal/pages/[treeId]/surface`, and exists only because the portal's
device pane needs a viewport — so it is the portal's by what it decides, which
is the rule `docs/routines.md` already states for files the framework forces
elsewhere. Worth noting that **the grep that found the other six could not find
this one**, because it was scoped to this lane's directory and this lane's own
rule says its files are not all in it.

| | |
| --- | --- |
| [**the page, drawn by the library**](2026-10-11-portal-library-page-wide.webp) | `1680×1100@2x` — the ramp, the card, the spacing |
| [**what the app is built from**](2026-10-11-portal-library-app-wide.webp) | `1680×1200@2x` — the new reading |
| [**the thumbnails**](2026-10-11-portal-library-pages-wide.webp) | `1680×900@2x` |

### A reading written for a curated registry became an accusation

With 107 registered and a one-page seed, `/portal/app` read:

> **103 pieces are registered and nothing uses them**
> *The AI is offered these every time you ask for a change, and has never put
> one on a page. That is either something your pages are missing, or something
> your project no longer needs.*

Every word true. The advice wrong in the way that costs an afternoon: a one-page
deployment has not *mislaid* a hundred and three things, and does not *no longer
need* them. The library is bigger than the app, which is what a library is for.

**The fraction is the wrong discriminator** and it is the one to reach for
first: four unused out of fourteen means opposite things depending on whether
the fourteen were chosen. What separates them is whether registering was a
**decision**. A host that declined part of the library said something about its
pages, and a piece it kept and never used is part of what it said. A host that
declined nothing said nothing. The caller already computes that — `missing` is
what the library ships and this app has not registered — so `unusedReading`
takes it rather than a count.

It now reads:

> **Your pages are built from 4 of the 107 pieces Loom ships**
> *This app turned the whole library on, so the AI may reach for any of them and
> has reached for these. There is nothing to do about the rest — a library is
> meant to be larger than any one app, and the rest is what is available rather
> than what is missing. The catalogue below lists every piece, used or not.*

And the **second** photograph found the rest of it: a hundred and three names
drawn as an unbroken wall under a sentence saying there was nothing to do about
them. On the curated reading those names are the news and stay on the surface.
On this one they are not, and they were already one click down in the catalogue
with their descriptions and registered names. Nothing removed; moved.

---

## The high-schooler test, applied

**Screen: `/portal/app`.** A person reads *your pages are built from 4 of the
107 pieces Loom ships*, *this app turned the whole library on*, *there is
nothing to do about the rest*, *a library is meant to be larger than any one
app*, and *the catalogue below lists every piece, used or not*. The screen's one
job here is to say whether anything needs doing, and it now says no when the
answer is no.

**Screen: `/portal/pages/[treeId]`.** Nothing was renamed. What changed is that
the page in the pane is drawn the way a reader would be served it, which it was
not before this branch and had not been noticed because nothing was looking.

---

## Gate

`pnpm verify` — status written to a file as the last thing on its own line and
read in a separate command, per `docs/routines.md`.

**Green, exit 0**, on a deleted `dist` and `.next`, against `main` at `7e96b6d`.

| | |
| --- | --- |
| `@jam-overture/loom` | 205 files / 4,642 tests — unchanged, `src/` was not opened |
| `@loom/app` | **425 files / 7,962 tests** |
| findings ledger | **1,139** entries, 0 malformed |
| `prerender:check` | 133 pages, 1,800 text junctions, 0 run together |

**No test weakened, skipped or deleted.** Four test files changed meaning and
each is a correction rather than a weakening — two were pinned to the
deployment's registry instead of to the function, and two read a prop off the
seed that the seed no longer carries. Three test files gained cases: the
whole-library reading, the names moving behind the catalogue, and the
deployment's own answer now that it declines nothing.

Scope: ten files under `apps/loom/app/(portal)/`, one under
`apps/loom/app/(preview)/` (explained above), `FINDINGS.md`, this report, a shot
list and three photographs. Four files deleted. `src/`, `tools/`, `decisions/`
and every other surface untouched.

---

## Findings

One closed, two appended.

1. **Closed** — the 11 October entry owned by this lane, with a note on the two
   things it did not predict.
2. **A theme mounts in the document it renders into**, so the one render with
   its own document was the one it did not reach — and the directory-scoped grep
   that found the others could not find it.
3. **A reading written for a curated registry becomes an accusation when the
   registry is the whole library**, and the fraction is the wrong thing to key
   it on. The fourth time this lane has split one reading in two; the entry says
   what the four have in common.

## What this did not do

**It did not make the marketing pages appear in the portal.** That is condition
1 and it is `Loom marketing`'s: until those routes render from the store there
is nothing in the store to draw. What this branch did is make sure that when
they arrive, the portal can draw them — which was the only part of 0259 that was
this lane's.

**It did not add a guard that every portal render passes the theme.** It is
worth having and it is one regex; it is filed rather than written, because the
right shape is a rule about the pair rather than about this lane's directory,
and the directory is exactly what failed to find the seventh call site.

**It did not touch `src/testing/definitions.ts`**, whose `sampleTree()` has the
same three-names-different-schemas hazard against the library (9 October,
`Loom daily build`'s). This branch is that finding's shape demonstrated at
production scale, and the entry is worth re-reading by its owner rather than
re-filing by me.
