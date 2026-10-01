# Nothing in this repository can see a box — four runs of three lanes wrote the same throwaway script, and the fourth said so

**Routine:** `Loom daily build` (framework, `src/` except `src/primitives/`, and the application shell)
**Date:** 2026-10-01
**Section:** §1 (process) — the harness
**Branch:** `framework-63-nothing-can-see-a-box`, off `main` at `ee9c1d5`. **Not stacked**: this lane has no open pull request
**Records added:** [0212](../decisions/0212-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md). **None superseded**
**Findings closed:** one. **Filed:** one

```
2026-10-01-framework-nothing-can-see-a-box-the-rail-wide  1280x900@2x  scrollWidth 1280 / innerWidth 1280
    aside  x 848 y 44  432x857  holding 1240 in 857
    aside h1  x 869 y 92  391x73  holding 77 in 73
    aside li (1 of 9)  x 869 y 208  87x27
    aside li (2 of 9)  x 962 y 208  101x27
    aside li (3 of 9)  x 869 y 819  391x59
    aside li (4 of 9)  x 869 y 882  391x59  ← 41 past the fold
    aside li (5 of 9)  x 869 y 945  391x59  ← 104 past the fold
    aside li (6 of 9)  x 869 y 1008  391x59  ← 167 past the fold
    aside li (7 of 9)  x 0 y 0  0x0
    aside li (8 of 9)  x 869 y 1254  391x101  ← 455 past the fold
    aside li (9 of 9)  x 869 y 1367  391x85  ← 551 past the fold
    text=Ask that page for a change  x 869 y 92  391x73  holding 77 in 73
    text=a selector that matches nothing  no match
```

*`pnpm shoot reports/2026-10-01-framework-nothing-can-see-a-box.shots.json --serve apps/loom`,
against a production build of `apps/loom` at `2026-10-01T21:23:21.852Z`. The
shot list is committed beside the pictures, which is the whole point of the
unit: every number above can be re-taken by anybody.*

![The rail those numbers are about](2026-10-01-framework-nothing-can-see-a-box-the-rail-wide.png)

## First, the two things a fresh session needs to know

**The migration is done and this run did not touch it.** `apps/loom` holds five
route groups — `(marketing)`, `(docs)`, `(lessons)`, `(portal)`, `(demo)` —
`apps/` holds exactly one package, and there is no `apps/portal` or `apps/docs`.
The brief's "⚠ your next unit" describes work that landed before 30 September.
Nothing is half-migrated and nothing crosses this run boundary in pieces.

**There were no maintainer comments to address.** Five pull requests are open —
#463 and #474 `Loom portal`, #471 `Loom lessons`, #473 `Loom marketing`, #475
`Loom demo` — and none carries a review, a review comment or an issue comment
from anybody but the routine that opened it. This lane has none open at all.

## What was completed, in plain language

A shot list can now name things it wants the size of, and the run prints them.

```json
{ "path": "/demo", "out": "…", "measure": ["aside", "aside li", "text=Put it back"] }
```

Per selector, per match, in document order: `x`, `y`, width, height, and — only
when they differ — how far the box's own content extends against the room it has.
`← N past the fold` when the box reaches below the bottom edge. `no match` when
a selector matched nothing.

**It prints and it does not assert**, which is
[0159](../decisions/0159-an-instrument-may-reach-a-state-and-may-never-assert-one.md)'s
line held where
[0202](../decisions/0202-the-harness-measures-the-content-a-clip-hides-and-it-is-not-scrollwidth.md)
already put it. Nothing here changes an exit code. `pnpm shoot` still exits 1 on
a document wider than its viewport and on nothing else.

## Why it was worth a run

Every visual unit this repository has shipped for a fortnight is argued on a
measurement, and until this morning not one of those numbers came from anything
the repository contained. *The payoff card is 975px in an 857px rail.* *The
caution is 103px.* *The rail's furthest scroll is 623 against a card top of 740.*
Each was taken by a `playwright-core` script written fresh in a scratch
directory, run once, and deleted with the container — the third in three runs
when `Loom demo` filed it on 30 September, and the fourth the next day while it
was writing the entry that mentioned the third.

The hard half was already built. 0159 gave a shot a `do` list, 0182 gave it a
`before` and a `frame`, 0195 gave it a start state: a shot can reach the third
screen of a signed-in flow inside an iframe with a seeded record behind it. And
then it could only photograph. The cost was never reaching the state — it was
that the instrument standing in front of the fact could not read it, so a lane
with a page in exactly the right condition had to go and build a second browser
to ask how tall something was.

**The first run of it reproduced another lane's hand measurement to within a
pixel.** `Loom demo` has quoted *857px of rail holding 1,239px of asks* in four
reports. The line above says `holding 1240 in 857`. That one pixel is the
unit: the claim was true, and it is now re-takeable by somebody who did not
write it.

## Five things that had to be decided rather than inherited

All five are in 0212 with the reasoning; the short version is that each is a way
this could have become a test runner with a camera attached.

| | |
| --- | --- |
| **nothing changes the exit code** | 0202's rule and the load-bearing one. A block below the fold is a copy and ordering decision; the instrument that reports it has no business settling it |
| **`no match` does not fail the shot** | the place this is most easily got wrong. A lane whose selector stopped matching has learnt the most interesting thing the run had to tell it, and a printed line beside a picture beats a dead run with no artefact |
| **every match, not the first** | a lane asking about `aside li` is asking about the list. `(n of m)` on the line, because a bare repeated selector says neither which row nor how many |
| **raw reading, rounded printing** | `getBoundingClientRect` is fractional. Two blocks 0.4px apart rounded at the source arrive as one integer and get quoted as touching |
| **judgement in Node, reading in the page** | 0202's split. `insideViewport` and `pastTheFold` are pure functions over six numbers, tested without a browser instead of checked by photographing something |

## Two decisions nothing specified, and why

**A twenty-match ceiling per selector, with `…and N more matches` under it.**
`CLIPPED_SHOWN` is five, and this is deliberately higher and deliberately
announced, because the reasoning reverses: a clipping box is *discovered*, so a
cap protects a lane from a page with forty of one cause, while a measured box was
*asked for*, so a cap withholds something the lane wanted. The failure worth
preventing is a lane quoting a truncated table as a complete one — so the cap is
generous and the truncation is on the line, which is the only version whose
numbers are safe to quote.

**`measure` is `pnpm shoot`'s and not a specimen's.** The same shape as 0159's
reason for withholding `do` from a static specimen, and a real one: a specimen
is photographed `fullPage` because the reason to photograph a composition is to
see all of it, so its picture has no fold in it — and `pastTheFold` against the
viewport it happened to be laid out at would report a number about a boundary
the artefact does not have.

## What it does not do, stated plainly because the finding asked for it

The finding's sharpest sentence is that **nothing can fail if the payoff card
grows back past the fold**. After this, still nothing can. The number appears in
the run's output and a person has to read it.

That is deliberate and 0212 argues it: the first run of this instrument across
six lanes' surfaces will find blocks below the fold on pages nobody considers
broken — this run's own first output has six of them on `/demo`, every one of
them a rail doing exactly what a scroller does — and a gate that goes red on all
of them on the day the reading first exists is a gate somebody switches off. A
per-shot height budget is the obvious next ask. It should be asked for with a
run's worth of these readings in hand, which is a thing that now exists.

## Found while building

**`aside h1` reports `holding 77 in 73`, and it is not a defect.** A heading's
content extends four pixels past its own line box under `text-balance` with
tight leading. Nothing is hidden. Worth saying here because it is the first
reading this instrument produced that *looks* like something, and the second
lane to see one will be looking at its own page.

**A `li` that is not laid out reads `x 0 y 0  0x0`.** Match 7 of 9 above. The
reading is honest — `getBoundingClientRect` on an element with no box is all
zeros, and nothing is drawn there — but a lane could read it as a box at the
origin. Left as it is rather than given a marker, because inventing a verdict
for it is the thing this decision is about not doing. Recorded as an open
question below.

**This run turned `main` red for twenty minutes and it was nobody's cross-lane
staleness.** The baseline `pnpm verify` was started on a clean `main` and then
edited *underneath*, because the run began work while it was still going. Lesson
28's exercise D reads every citation in `decisions/`, `src/` and `tools/` off
disk at test time, so the `0212` links written into `tools/specimen/` an hour
before `0212` existed came back as two refused citations and the lesson's
recorded transcript drifted. **`main` is green at `ee9c1d5`**, exactly as #473
says it is; the red was this branch's work landing in the middle of its own
baseline. Filed, because the trap is general and the symptom names another
lane's file.

**No framework gap.** `src/` is untouched. The whole unit is `tools/`.

## Tests

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, status written to a file as the last thing on its line and read in a
separate command, with **no file in the repository edited while it ran** — which
is this run's own lesson applied.

Said precisely, because the lesson is about exactly this: the gate ran over
every code file in this branch. `FINDINGS.md` and this report were written
after it returned, and `pnpm findings:check` was re-run over the ledger
afterwards — **929 findings, 0 malformed**. Nothing in the gate reads `reports/`
at all; the two test files that mention the directory use it as an `outDir`
string in a fixture and never open it.

| | `main` at `ee9c1d5` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 171 files / 3,441 | **171 / 3,462** — `src/` untouched |
| `@loom/app` | 348 / 6,040, 1 skipped | **348 / 6,040**, 1 skipped — unchanged |
| findings | 928 | **929**, 0 malformed |

Nothing weakened, skipped or deleted.

Red twice while building, both caught by a test rather than by eye. The first
was my own fixture: a `box()` default of 857px at `y: 96` does not fit a 900px
viewport, so three tests expecting a clean line got `← 53 past the fold` — the
code was right and the fixture was wrong, and the fix was to make the default
box one that fits on every edge so each test states its own single departure.
The second was the citation trap above.

## Open questions

**A per-shot height budget.** Named in 0212 as the next ask and deliberately not
built. The shape it wants is a number a lane declares per selector, failing the
run when a box exceeds it — which is an assertion, so it needs 0159 revisited
rather than extended, and it needs a run's worth of readings first.

**A box that is not laid out.** `x 0 y 0  0x0` is honest and ambiguous. The
options are a marker on the line, a separate `found` state, or leaving it. I
left it; the second lane to meet one should decide.

**Horizontal position past the right edge gets `← outside the viewport` and no
distance.** The vertical case gets a number because it has a remedy a lane acts
on. The horizontal case is the overflow the document measurement already reports
and the stylesheet already owns — but a block pushed right *inside* a clip is
neither, and this instrument says the least about it of the three.
