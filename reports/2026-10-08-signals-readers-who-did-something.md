# Reader signals — readers who did something, rather than readers who saw it

**Routine:** `Loom signals` · **Date:** 2026-10-08 · **Branch:**
`signals-14-looked-at-not-touched`

## What I completed

§18 of [`docs/signals.md`](../docs/signals.md): `pageActionOf(reading)` in
[`src/signals/action.ts`](../src/signals/action.ts), published from
`@jam-overture/loom/signals`, recorded in
[0242](../decisions/0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md).

Every reading this lane has built is about **attention**. §6 answers which parts
came into view, §9 where the reading stops, §12 whether readers had time to take
a part in, §14 how many of the page's words got reached. A tally has carried
`engaged`, `activations`, `opens`, `closes` and `completions` since the counters
existed, and **nothing interpreted any of them.** §6 added four of them into a
role row and wrote down why the fifth could not be added, and that was the whole
of it: a deployment could see that a band was read and had no way to ask whether
anybody *did* anything in it.

The one question of that shape that was answerable was a named `FunnelPair`
(§13), which a deployment writes node by node. So the unnamed question — *of the
readers who got to this ask, how many opened it* — had no answer for any part of
any page, while §4 names what the portal view is for and two of its five clauses
are exactly this: *which asks they open, which they complete.*

It is the **tenth** thing taken out of the server-side join rather than
collected. **Nothing was added to a payload, a browser, a column, a store or the
vocabulary.** The broadcaster was not touched.

### The fact that decided the shape

The obvious implementation is `engaged ÷ reached` per part, and on most of a
page it prints a filing rule as a finding about readers.

A press is filed against the control and credited to the addressed ancestors it
happened inside (0167), so `engaged` counts the page views whose reader did
something **strictly inside** a node. A leaf has no inside. So a heading, a
paragraph **and a button** alike report `engaged: 0` for ever — the button
because the press is its own `activations`, the heading because there was never
anything to press.

Drawn as a share, that nought reads *no reader acted here* against every text
node and every control on the page, and a screen built on it would rank a page's
parts by how little each one is a container. So:

- `PartAction.share` is **`undefined`** where a part bears no element parts, and
  the structural fact is published beside it as `bearsParts`, taken off the tree
  rather than off the window.
- `ActionStanding` has three members, and `untouched` — the only claim this
  reading makes about an absence — is said of nothing but a part that bears
  element parts, that a row named, and that readers reached. A withheld share
  and a standing of `unknown` are therefore the same fact said twice and cannot
  disagree.

**Where the share is defined it is sound**, which is why it was worth building
at all: `engaged` and `reached` are two distinct view counts written by the same
rollups against the same node, so the straddle over-count (0147) is common to
the numerator and the denominator and very nearly divides out. That is §9's
cancellation at one part rather than between two siblings. It is again
deliberately **not** divided by the exact openings §8 added — `opened` and
`engaged` are written in different places and their ratio can honestly exceed 1,
which is §9's refusal of that denominator and it still stands.

**The honest statement of the limit:** an action share is a **band's**
measurement and never a control's. *What share of the readers who saw this
button pressed it* is unanswerable from any counter Loom keeps. The nearest
available question is the band the button is inside, and a deployment that wants
the narrower figure names a pair — which is what pairs are for.

## Decisions I took that were not specified

- **No new silence vocabulary.** The three standings carry every reason a figure
  is missing here, so this adds nothing to the five sets #546 is about. I would
  have had to add a sixth set otherwise, and #546's mapping file is not on
  `main`, so a sixth set would have made that pull request's typecheck fail at
  merge. **That was not the reason, though, and I want to be clear about it:**
  the reason is that every withholding here is answered by the standing beside
  it, which is the shape §6 chose and why §6 needed no silences of its own
  either. The collision was a thing I checked afterwards, not the argument.
- **`uses` is four occurrence counters added, with `counts` keeping them apart.**
  A caller asking *was this used* wants one number and a caller telling a press
  from a dismissal wants four, and neither should do the other's arithmetic.
- **`usesPerReader` is published and `leftOpen` is not.** `opens − closes` is
  negative on a disclosure a revision renders already open — the reader shuts
  something this page never opened — and clamping at zero would hide the one
  state the figure can diagnose. `shutAgain` as `closes ÷ opens`, uncapped, says
  the same thing with no floor to argue about.
- **`unwalked` as a page-level flag.** Occurrences on the page and no reader
  credited inside anything. I added it because the symptom is otherwise *a page
  readers act on and nothing can say where*: every share a nought, every band
  `untouched`, and the counters looking healthy. It is §11's `unopened`
  diagnosis one counter across, and nothing else here would say so.
- **The root is the page-wide headcount, as a row and not an addition.** Every
  action is strictly inside the root, so the root's own `engaged` is the page
  views in which a reader did anything at all. There is no sum of `within`
  anywhere in the module, because summing charges one reader once per level they
  acted inside (0147, 0167) — ten readers pressing once each come to twenty over
  a band and its root, and that is a test rather than a comment.
- **I took 0242, not 0240.** 0240 is claimed by #546 (this lane's) **and** by
  #547 (the framework's), and 0241 by #548. `pnpm decisions:index` prints a note
  for each. The brief says to take the next number free on `main`, which is
  0240; taking it would have made a three-way clash out of a two-way one, so I
  took the next number free of `main` **and** of every open pull request, as
  this lane did on 6 October for the same reason.

## Records added

- [0242 — What readers did is a share off one row, and a leaf has no
  inside](../decisions/0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md).
  Accepted. Nothing superseded: it reuses 0221's cancellation, 0221's ranking
  rule and 0230's treatment of the root, and narrows nothing any of them said.

## Findings filed

- **For `Loom portal`** — the share that is a band's and never a control's,
  `usesPerReader` as a figure that must never be drawn as a rate, and
  `unwalked` as the one state to refuse to draw a card under. `PageAction.leaves`
  is published so a card can account for the withheld shares rather than looking
  broken.
- **For `Loom primitives`** — a second consumer for this lane's own entry of
  6 October, with the price stated more concretely. The missing declaration now
  costs a **standing** as well as a funnel answer: a leaf readers reached with
  nothing against it is a button nobody pressed or a heading nobody could press,
  and `pageActionOf` has to refuse the claim for both. So the one reading in
  this subsystem about what readers *did* is silent about every control on the
  page by construction. One member of `PrimitiveRole` closes it, and every
  counter already stored reinterprets, because the join is at read time (0212).

Nothing closed. The lane's open findings are all owned elsewhere or are
measurements rather than requests.

## Test numbers

Real, from this branch, and nothing was skipped or weakened.

| | |
| --- | --- |
| `pnpm verify` | **green**, end to end |
| `src/signals/action.test.ts` | **30 tests, 30 passed** |
| `src/signals/` | 25 files, **656 tests, 656 passed** (121 s) |
| Root suite | 189 files, **4,142 tests, 4,142 passed** |
| `apps/loom` | 407 files, **7,221 tests, 7,221 passed** |
| `pnpm findings:check` | 1,058 findings, 0 malformed |
| `pnpm prerender:check` | 126 pages, 1,584 junctions, 0 run together |

Two failures on the way, both mine and both fixed rather than worked around:

- **`src/documentation.test.ts`.** Eleven doc comments in `action.ts` wrote a
  record number into the grammar — *"0221's ranking rule"*, *"0167's filing
  rule"* — and the rule is that a number may only be a parenthetical, because
  the reference generator lifts a parenthetical out and a possessive leaves a
  sentence that cannot be read by anybody who has not read the record.
  Rewritten. One of the rewrites then put `(0221)` immediately before a colon,
  so the generated reference read `spelled once\n: a band two readers` — a
  dangling colon on the published page, which no test would have caught. I moved
  the parenthetical and checked the generated output rather than the source.
- **`app/(docs)/_lib/api/extract.test.ts`.** I regenerated
  `reference.generated.json` **before** rebuilding `dist/`, so the committed
  file was generated from the previous doc comments and drifted against the
  rebuild inside `pnpm verify`. `pnpm build` then `pnpm --filter @loom/app
  docs:api`, in that order.

### The double-count test, which the lane's standard requires

0167 credits one press to the control as an `activations` and to every addressed
ancestor as an `engaged`, so a reader who presses a button in a band is in three
rows. Three tests cover it: the control carries the occurrence and the band
carries the reader and never both; the module publishes no page-wide total of
readers who acted, asserted by summing `within` across the parts (20) against
the root's own row (10) and asserting the type has no such field; and the root is
kept out of the ranking it would win on every page.

## Browser byte cost

**Nothing was added that runs in a browser**, and the measurement confirms it
rather than assuming it. `broadcast.ts` bundled with esbuild, minified, ESM,
browser platform:

- **6,477 bytes minified**
- **2,941 bytes gzipped** (`gzip -9` on the file, which is the figure every
  report in this lane quotes — gzipping from stdin adds twelve bytes of filename
  and mtime and reads as a regression)

`action.ts` is not in `broadcast.ts`'s import graph; it is reached only from
`src/signals/index.ts`, which the broadcaster does not import.
`browser-weight.test.ts` passes, and its guard is the import walk rather than a
byte threshold, so the walk is the thing that would catch a regression here.

## The door to per-reader identity

No design choice in this unit makes the parked opt-in any more expensive. Every
figure is read off counters that exist, there is no new column and no new wire
field, and nothing in the module asks who a reader is — `engaged` is a count of
page views and the view key that produced it was dropped with the raw window.
If per-reader identity ever returns, this reading gains a denominator and loses
nothing.

## Open questions

One, and it is not blocking.

**Two windows' action readings, compared.** §10 compares where reading stops and
§16 compares the words a change put in front of readers; nothing compares what
readers *did*, and *readers used to press this and now they do not* is a
sentence the Gate exists to be judged by. The shares here are comparable across
revisions for 0224's reason — each is already a ratio off one revision's own
rows, so the cancellation has happened on each side before the two sides meet —
and the counts are not. It is 0224's shape over a different figure and it is a
unit of its own rather than a paragraph inside this one, which is why I stopped.

I also want to flag that it would be the **third** comparison in this
subsystem, which is exactly the count #546's finding predicted would force the
silence question. That pull request answers it for the five sets that exist; a
third comparison is the first thing that will test whether the answer holds.

## Working beside the other lanes

- **#546 is this lane's own, open and green**, and it holds §17 of
  `docs/signals.md` and `src/signals/silences.ts`. I did not stack on it. This
  branch takes §18 and leaves §17 alone, which is the same note §16 carried for
  §15 a day earlier.
- **One likely conflict, and it is small.** Both branches add a row to the
  *What is already built* table in `docs/signals.md`. I inserted mine beside the
  page-shape row rather than appending at the end, so the two hunks have
  different context and should merge without a conflict — but the table is one
  region and I would not promise it.
- **`reference.generated.json` and `decisions/README.md` are generated** and
  both branches touch them. Regenerate, never hand-resolve.
- **No other open pull request touches `src/signals/`.** I checked all five
  (#544, #545, #546, #547, #548) against `origin/main`.
