# Reader signals — the door a deployment-wide reading divides by

**Routine:** `Loom signals` · **Date:** 2026-10-19 (evening run) · **Branch:**
`signals-41-two-forms-arrivals-are-one-door` · **Section:** §41 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

This morning's run fixed a quiet undercount in the region map and filed the same
fault one counter along, with the arithmetic it would need named. I took it. **It
was the worse of the two, because the door is the denominator.**

### What was wrong

A page served in two forms ([0263](../decisions/0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md))
has two door rows, one per audience
([0284](../decisions/0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)).
`pageViewsFor` matched a revision's rows and took **the first of them**,
reporting every row after it as a row handed in twice:

```
SKIERS  opened 4,   appearances 5
RIDERS  opened 400, appearances 400   →   opened 4, duplicated: 1
```

A form's own door was never affected — the audience is picked before the pick —
so what was wrong is the path a **deployment-wide** asking takes. That is the
asking a portal makes, and `opened` is what six readings divide by: a page's
reach, a funnel's reach, the three library readings through `doorOf`, and
`inflationFor`, whose whole job is to hand one revision's straddle rate to a
pace correction. One form's openings under another form's counters scales every
share on those screens by whatever fraction of the deployment's arrivals
happened to sit in the row that sorted first.

### What shipped

- **The dedup key is the audience**, which is what the store keeps one row per,
  and **the kept rows are added**. Arrivals are people: a reader who arrived
  arrived once whichever form they were served, so the sum is one deployment's
  arrivals. That is this morning's clause 2 one counter along, and it stays the
  opposite of a page reading, where adding two forms' node counters would be one
  number about two pages (0290). A second row of the *same* form is still a
  window handed in twice, still dropped, still counted (0158).
- **The arithmetic is the reading's own, taken over the rows rather than written
  again.** `summedOf` hands the rows to `pageViewReadingOf`, so `opened` and
  `appearances` add, `drift` and `pending` are summed **per row**, and
  `inflation` is recomputed from the summed drift over the summed openings.
- **`RevisionPageViews.audiences`** — the census, in the three-valued shape
  §40 gave the region map — and **`audienceId` is now `AudienceId | null`**:
  what the asking named, never what the rows turned out to say. The type
  therefore stops extending `StoredPageViews`, because a reading over two rows
  cannot carry one row's audience.
- **A stall is judged per form without `health.ts` learning about forms.**
  `foldedAt` on a sum is the fold the reading waits on; see below.

## Decisions I took that were not specified

**The filed arithmetic was right in three figures and wrong in the fourth, and
the fourth is the one that matters.** The finding predicted *`drift` is their
difference and therefore adds*. It is not: `drift` and `pending` are each
clamped at nought, so a form mid-collection (openings no fold has reached) and a
form with straddles **net to a revision with neither** if you subtract the two
sums. Summing them per row is also exactly the rule `pageViewReadingOf`'s own
doc comment already states for revisions — *totalled from the rows and never
from the totals* — holding for forms of one revision for the same reason. The
finding asked for the arithmetic to be checked rather than assumed, which is
what that check found. `inflation` is recomputed from the sums, as predicted.

**Two fields the finding did not name needed a rule, because a reading over two
rows cannot carry one row's timestamps.**

- `updatedAt` is **the newest** of the rows: the question it answers is when the
  published number last changed, and the busiest form is what last changed it.
- `foldedAt` is **the oldest fold attested by a row that still has openings
  pending**, or the oldest attested of them all where none has, and absent where
  nothing attests one. The newest would let a fold that ran a minute ago on a
  busy form vouch for a form whose openings have been waiting a day — the fault
  `folded_at` exists to raise, hidden behind traffic. The oldest over *every*
  row has the opposite failure, and it is a realistic one: a small audience's
  form with nothing pending and a fold nobody has needed in days would invent a
  `collection-stalled` on a healthy deployment. Taking it over the waiting rows
  makes the summed answer agree with the per-form one exactly — **a summed door
  is stalled exactly when one of its forms is** — which is a property of the
  field rather than of `health.ts`, and it is tested from both sides.

**`audienceId` is not inferred from a single-membered census**, for the reason
this morning's record gives: a window holding one form today is not a reading of
that form. A reading of one form is what the *asking* named. It is tested, and a
mutation that infers it is caught.

**I did not group `pageViewReadingOf`'s `revisions` by revision.** A window
holding two forms of one revision still comes back as two entries, each naming
its own form, and its totals already add across forms. A caller that wants the
deployment-wide figure for one revision asks `pageViewsFor`, which is the call
that knows what the asking was; grouping there would also stop a screen from
listing the two forms a revision is served in. It is written down as a rejected
alternative rather than left implicit.

## Records added

[0299](../decisions/0299-a-deployment-wide-door-adds-every-forms-arrivals-and-waits-on-the-oldest-fold-under-it.md)
— *A deployment-wide door adds every form's arrivals, and waits on the oldest
fold under it.* Accepted; eight clauses; nothing superseded — 0147, 0158, 0214,
0274, 0284, 0290 and 0297 all stand, and clause 5 applies 0297 clause 3 to a
second reading rather than changing it. Seven alternatives recorded, including
the four above.

**On its number.** Written as **0298**, the next free number on `main` when I
started, and **renumbered to 0299 by me before opening the pull request**: #679
merged its own 0298 — *a project's ingest key is public and names its
application* — while this branch was verifying, so the record already on `main`
keeps the number and mine gives way (0097). The filename, ten doc comments
across four source files, `docs/signals.md`, two `FINDINGS.md` entries and this
report were updated with it, and a dated note under the record's header says
what it was renumbered from. **Nothing in the unit depended on the number**,
which is why the cost was a rename rather than a decision — and renumbering it
here rather than leaving it to `Loom merge` is what keeps a fatal clash off
`main`.

## Findings filed or closed

**Closed:** *`pageViewsFor` picks one form's door row for a revision served in
two, and reports the other as a duplicate* (19 October, mine) — taken with the
arithmetic it named, and the closure records where the prediction was wrong and
which two fields it did not cover.

**Filed, open:** *a door read whole over two forms is a sum of them, and no
screen says so* — `Loom portal`'s, with the three states a surface must tell
apart and the one thing it must not draw (a sum over forms is not
`audiences-mixed`; that fault is a page reading's). It is the third such finding,
after 0295 and 0297.

## Test numbers

**`pnpm install && pnpm verify` is green, exit code 0**, and these numbers are
from the run **after** `main` was merged in (see *Beside the framework lane*).
The root suite is **233 files and 5,457 tests passed**, in 303 seconds; the app
suite is **343 files and 6,053 tests passed**, in 201 seconds. `findings:check`
reads 1,259 findings with none malformed, and `prerender:check` reports 133
prerendered pages, 1,850 text junctions, 0 run together. The run before the
merge was green too, on 338 app files and 6,002 tests — the five files and
fifty-one tests between them are #679's, not mine.

`src/signals/funnel.test.ts` is **66 tests, up from 55** — where
`pageViewsFor`'s tests live. Eleven are new: four on a door read whole over two
forms (the added arrivals, the census, the asking it is a reading of, the
double-count) and seven on the arithmetic of the sum, replacing one test that
documented the old behaviour. `src/signals/health.test.ts` is **46 tests, two of
them new**, on the stall equivalence end to end. `src/signals/door.test.ts`
gained the census on its fixture.

**The one test that changed is the one that asserted the fault.** It was called
*takes every form's row where the reading names no audience, as it always has*
and expected `opened: 400, duplicated: 1` on a window where 404 readers arrived
— the behaviour was documented, which is how it survived 0290 and 0284. It is
now *adds every form's arrivals where the asking names no audience*. No
assertion was relaxed and nothing was skipped.

### Planted mutations, each caught

Every figure this unit touches was tested against a case where it would
double-count, and then the arithmetic was mutated to check the tests bite. All
eleven mutations failed at least one test:

| Mutation | Caught by |
| --- | --- |
| Keep only the first matching row — the original fault | *adds every form's arrivals*, *counts each form's door once however many times the window is handed in*, and six more |
| Dedup by nothing, so every form is one bucket | the same eight |
| `drift` and `pending` from the two sums | *keeps a form's pending openings and another form's straddles apart* |
| `inflation` averaged over the forms | *takes inflation from the summed drift and the summed openings*, and two existing tests |
| Census always `[]` | the three census tests |
| Census over the rows handed in rather than the rows added | six, including *a doubled row neither doubles arrivals nor halves the loss* |
| `audienceId` inferred from a single-membered census | *names the one form in it without claiming to be a reading of it* |
| `updatedAt` from the first row | *says the number last moved when the busiest form last moved it* |
| `foldedAt` the newest fold | *waits on the oldest fold of the forms with openings pending* |
| `foldedAt` over every row rather than the waiting ones | *ignores the old fold of a form with nothing pending* |
| An unparseable fold instant kept as the oldest | *skips a fold instant that does not parse* |

The two fold mutations are the pair worth naming: they fail in opposite
directions, and only the rule in clause 7 passes both. Both were also run
against `health.test.ts` on its own, and there the result is worth stating
exactly: *the oldest fold over every row* is caught by the new health test,
while *the newest fold* survives it — in that case the only form with openings
pending is the lagging one, so the two rules agree — and is caught by the
page-views test, which has two forms waiting. Neither mutation survives the two
files together, and no claim in the record rests on only one of them.

### One check failed on the first run, and the failure was mine

`documentation.test.ts` refuses a decision-record number that is part of a
published sentence — the site can lift `(0299)` out of a sentence as a footnote
and cannot lift *"before 0299 it was…"*. Two of my new doc comments wrote one
into the grammar, so the generated reference dropped both comments whole, which
is the generator doing exactly what it says. Rewritten as parentheticals; the
check passes and both comments are back in
`reference.generated.json`, which I regenerated with
`pnpm --filter @loom/app docs:api` rather than editing.

## Browser cost

**Nothing.** `src/signals/broadcast.ts` is byte-identical to `origin/main` — an
empty `git diff` — and nothing this unit touched is in the import graph
`browser-weight.test.ts` walks. Measured anyway, because the rule is to measure
rather than to reason: bundled and minified with esbuild it is **6,477 bytes**,
the same figure as the last five reports, and **2,952 gzipped** (this
container's `gzip -9`; the morning run's 2,956 on an unchanged file is the same
variance it noted).

One server-side module graph grew: `page-views.ts` now imports `audiences.ts`
for the census, which is the same import `region.ts` took this morning. Nothing
on that path runs in a browser.

## Preview

PLACEHOLDER_PREVIEW

## Open questions

Nothing blocking. Two things are worth the maintainer's eye:

1. **This is the second undercount of the same shape in two runs**, and both
   were invisible for the same reason: a count that was never added cannot be
   noticed (0158), and in both cases the test that covered the path used two
   *different* values of the key — two countries, two revisions — so it
   documented the intent while the implementation failed only where two rows
   share a key. Every remaining reading that picks a row out of a window is now
   audience-keyed, so I believe the shape is exhausted; if a third turns up I
   would propose a contract test over *every* such pick rather than a third fix.
2. **`audienceId` on a door reading is now `null` where it used to be the row's
   own name.** No reading in the repository reads that field, so nothing moves,
   but it is a published type change and a surface that had started reading it
   would see a null. That is the half of this unit a reviewer might want to
   undo, and clause 5 is where it is argued.

## Beside the framework lane

`Loom daily build` has no branch open. **#679 did touch my lane and has now
merged** (`The key a project's pages post with, and a door that files nothing it
cannot name (4b)`): it changed `apps/loom/app/_lib/reader-signals/` —
`intake.ts`, `receive.ts`, the key stores and a new `attribution.ts` — which is
the intake half of this lane, written by the portal thread rather than by me. I
read it before I started and **did not touch a single file it touches**; this
unit is `src/signals/page-views.ts`, `health.ts` and three test files.

It landed on `main` while I was verifying, so I merged `main` into this branch
rather than opening a pull request behind it: `FINDINGS.md` resolved by union,
`decisions/README.md` and the generated reference by regeneration, and nothing
in `src/` or `apps/` conflicted at all. The record number is the one real
collision and it is handled above. **`pnpm verify` was run again after the
merge**, and the numbers in this report are from that run.

## The door this lane is keeping cheap

Nothing here makes the parked per-reader identity work harder. Every row in the
sum is a counter about a revision and a form; the census is a set of `aud_` names
a host wrote about predicates Loom never sees; and the two timestamp rules are
about *when a fold ran*, not about who was counted. If a consented per-reader id
ever arrives behind a gate, nothing in this unit would have to be unpicked —
there is no key in it that a person could be found in.
