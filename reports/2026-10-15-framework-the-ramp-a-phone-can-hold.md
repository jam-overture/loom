# The ramp a phone can hold

**Routine:** `Loom daily build` (framework) · **Date:** 2026-10-15 ·
**Section:** §4b (the theme) · **Record:** [0283](../decisions/0283-a-declared-ramp-step-is-a-maximum-and-the-browser-reads-the-width.md)

![The front door at 390 before and after](2026-10-15-framework-ramp-before-front-door-phone.webp)
![The front door at 390 after the ramp holds](2026-10-15-framework-ramp-front-door-phone.webp)

*The front door at 390×844 on the `minimal` palette, before and after. Same
build, same browser, same page: the only thing that changed is what a declared
ramp step means.*

## What was completed

`Loom marketing` filed an entry on 13 October with a camera and no complaint in
it: **the one surface built entirely in Loom is the one that does not fit a
phone.** A declared ramp step was emitted as a fixed pixel length, so the front
door's headline was 72px in a 254-pixel column at 390 — three characters a line
— and `--loom-spacing-4` plus `--loom-spacing-6` took 35% of the screen in
gutter. Neither button in the hero was on the first screen under any palette.

A declared number is now a **maximum**. `themeVariables` emits, per step,
either the plain pixel length it always did or `clamp(floor, coefficient cqi,
declared)` — full size at `48rem` and above, compressed below it toward the
largest value the quantity holds on a phone. No tree changes, no primitive is
touched, no pack is retuned, and `themeVariables` is as pure as it was.

### Measured, with the finding's own shot list

Re-run with the selectors the 13 October entry committed for this purpose, so
the two columns are the same measurement. `before` is this repository at
`4ce00d0`; `after` is this branch.

| front door at 390 | before | after |
| --- | --- | --- |
| the `h1` box, `minimal` | x 68, **254 × 247** | x 40, **310 × 197** |
| the `h1` box, `editorial` | x 68, 254 × 197 | x 40, **310 × 197** |
| the `h1` box, `bold` | x 70, 250 × 197 | x 41, **308 × 197** |
| *See how a change travels*, `minimal` | **286 past the fold** | **y 696 — on the first screen** |
| *Try it yourself*, `minimal` | **364 past the fold** | **y 757 — on the first screen** |
| *See how a change travels*, `editorial` | 182 past the fold | **y 675 — on screen** |
| *See how a change travels*, `bold` | 196 past the fold | **y 680 — on screen** |

**The gutter went from 68 pixels a side to 40, and both calls to action are now
on the first screen under all three palettes.** The 13 October entry estimated
the hero had to lose about 290 pixels to manage that and judged the two levers
the marketing lane owned worth about 75 between them. It did not need them: the
headline lost 50 points of its height and the hero's own vertical padding came
off the ramp with it.

### What did not move, which is the other half of the claim

| at 1280 | before | after |
| --- | --- | --- |
| the `h1` box | x 148, 984 × 166 | x 148, 984 × 166 |
| *See how a change travels* | y 694 | y 694 |
| *Try it yourself* | y 694 | y 694 |

**Identical.** A reader on a laptop sees the ramp the pack declared, to the
pixel, which is what makes the change reviewable: the only pictures that move
are the narrow ones. `/docs` at 390 — hand-written React, the control in the
original comparison — is also unchanged at x 20, 350 × 48.

## The other thing this run did, and why it is three pull requests

**#633 was held by a rule rather than by a problem**, and unblocking it was the
first act of this run.

It carries 0277 and the `changedAt` implementation — `Accepted`, green, clean
against `main` — and it also carried **0278**, a `Proposed — ARCHITECTURAL`
record that implements nothing. `Loom merge` skips any branch carrying a
`Proposed` record, which is right, and the consequence is the thing worth
naming: **the escalation rule and the merge-skip rule compose into "escalating
one question costs you the shipping of everything beside it."** Two days of
finished work waited on a question. `Loom merge`'s own comment named the remedy
— *"If you accept 0278 (or split it out), tomorrow's run merges this as it
stands"* — and only this lane could take it, because the record is this lane's
file.

So: **0278 now travels alone**, unchanged, on its own branch. #633 keeps the
implementation and cites the proposal as prose, the way it cited 0276 before
that record reached `main`. Three pull requests out of one run is more than this
lane likes, and the shape is deliberate: one implementation, one question, one
unit of new work. A proposal is an artefact for a person to read, and holding
code behind it helps nobody.

While there, #633 also got `main` merged in and **the API reference
regenerated** — see the findings below, because the way that failure presented
is worth more than the fix.

## Decisions taken that were not specified

**Three constants, each derived rather than chosen**, because a fluid ramp with
three invented numbers in it is a taste and not an argument.

- **The width is 768px**, which is 0079's `48rem` — the library's one width,
  already the breakpoint `loom.mosaic` switches on. A `clamp()` adds no
  breakpoint, so reusing that number means this does not spend the second one
  0079 set a high bar for.
- **The compression is 0.46**, because that is the ratio which *reproduces*
  `loom.heading`'s `11cqi` cap from the pack's own number — a 72px step floors
  at 42.84px where `11cqi` is 42.90px. `Loom primitives` found that cap on 20
  August by photographing which words lost their last letter at 390. The figure
  is now derived for every step of every pack, including the ones nothing has
  photographed.
- **The holds are 18px for type and 8px for space.** Step 3 is body copy in
  every registered pack; a ramp that shrank it would trade a headline that does
  not fit for paragraphs nobody can read. Whitespace has no legibility floor,
  so it compresses from lower down.

**A medium with no cascade gets the declared numbers.** This was not in the
finding and is the part that would have broken quietly. `inline-variables.ts`
exists because an image renderer and an email body resolve no custom
properties — and they resolve a container unit exactly as poorly, so a
`clamp(…cqi…)` there is *strictly worse* than the pixel it replaced. A render
asked for `themeValues: "literals"` now gets `{ ramp: "fixed" }`, for the
root's declarations as well as the substituted values, so the two cannot
disagree. There is a test asserting no `cqi` and no `clamp(` survives such a
render; without it the failure would look like a design choice.

**`rampLength` is not published.** `RampMode` is re-exported so a host can name
the mode it is selecting; the helper itself stays internal.

## Records

**Added [0283](../decisions/0283-a-declared-ramp-step-is-a-maximum-and-the-browser-reads-the-width.md)**
— *A declared ramp step is a maximum, and the browser is what reads the width*,
`Accepted`. It supersedes nothing. It contradicts no `Accepted` record: no
record stated that a ramp step was a fixed length, and 0079's line — *no
viewport in the render function* — is honoured rather than moved, since a
`clamp()` is CSS reading the width and not the render function reading it.
Four alternatives are recorded with their reasons, including the second-ramp
schema change and the index-keyed rule that looks simpler and is wrong across
the library.

**Nothing was escalated.** This touches neither the tree schema nor the delta
model and requires no migration of built code.

## Findings

**Closed:** *a page built in Loom is the only kind of page on this deployment
that does not fit a phone* (13 October, `Loom marketing`) — the framework half,
with the measurements above. Its row for `Loom primitives` is now a **removal
rather than a fix**, filed below.

**Closed:** *`merge=ours` protects two files and only after `pnpm install`* (15
October) — by the sentence it recommended, in `docs/routines.md` beside
*Reading the merge gate*. This run met the other half of it and the entry now
says so: when the driver *does* work it hands the branch a **stale** generated
file, and the drift surfaces as two failures in `(docs)` naming `src/signals/`
exports that no page mentions — a true failure that names neither the branch
nor the file. `pnpm docs:api` is the fix and it took a branch-against-main
comparison to find.

**Filed for `Loom primitives`:** `loom.heading`'s `CAP_FOR_STEP` is now
redundant. Its `min(var(--loom-scale-8), 11cqi)` wraps a clamp already at or
below the cap at every width — which is the case that file's own comment
predicted. Harmless, and a removal rather than a repair.

**Confirmed, not re-filed:** the records-index render timeout. Reproduced twice
here under full-suite load and passing at 3,200ms of its 5,000ms budget when
run alone, which is exactly the shape `Loom signals` filed this morning. A note
was appended to that entry rather than a tenth copy of it written — see *the
gate* below.

## The gate

`pnpm install && pnpm verify`, read from a file rather than from a
notification, which mattered twice today:

- **`EXIT=1` on this branch's first full run**, while the session's own
  notification said exit code 0. `docs/routines.md`'s *Reading the merge gate*
  is on its third spelling of that mistake; this is the fourth instance and the
  file was read second, so it cost nothing.
- **Red for a reason that is not this branch's.** `pnpm verify` is red on
  `main` intermittently, in
  `app/(docs)/_components/architecture.test.tsx`, which renders one row per
  decision record and times out at 5,000ms under parallel load. Filed this
  morning by `Loom signals`, owned by `Loom docs`, reproduced on `main` in that
  entry with nothing of any branch in the tree. **It is the merge gate for four
  surfaces, and 0283 adds a row to the table it renders.**

**Green, end to end, on the third run.** `EXIT=0`, read from the file:

| | files | tests |
| --- | --- | --- |
| the package | 228 | **5,123** |
| the application | 330 | **5,834** |
| | | **10,957, none failing** |

`prerender:check`: 133 prerendered pages, 1,840 text junctions, 0 run together;
3 metadata conventions, 0 unserved.

**Two real defects were caught between the runs and both are worth naming**,
because neither was visible in the lane this change lives in:

- **`lessons/21-appearance.md` prints `--loom-scale-5` to prove orthogonality** —
  that a palette swap moves no type value. It still does; the printed text moved
  from `24px -> 24px` to `clamp(20.76px, 3.13cqi, 24px) -> …`, identical on both
  sides as before. The transcript is recorded from what the code prints, not
  typed, and the surrounding paragraph is corrected to match. **A cross-lane edit
  in `Loom lessons`' file**, named here because the convention asks: the teaching
  is unchanged and arguably sharper, since the lesson's point is now made by two
  identical clamps rather than two identical pixel values.
- **`reference.generated.json` drifted twice.** The second time was mine: moving
  the `RampMode` re-export below `apply.ts`'s opening paragraph — which
  `src/documentation.test.ts` required — changed that module's extracted summary.
  Regenerated with `pnpm docs:api`.

## Open questions

1. **Does a pack want a second ramp rather than a compressed one?** 0283 takes
   the proportional shrink and records the schema change as the alternative. The
   question is a designer's: should a phone read *smaller*, or should it read
   *differently*? Nothing needs answering until somebody has an opinion the
   first cannot express.
2. **The holds are the one place a judgement is still hiding.** 18px and 8px
   are defended by what body copy is and what a gap is, not measured. If a
   section heading at 24px on a phone reads small, the hold is the number to
   move, and moving it is one line.
3. **The records-index timeout is nobody's to fix in my lane and blocks
   everyone's.** It is `Loom docs`' test and `Loom docs`' budget. Raised here
   because it is the gate four routines share.
