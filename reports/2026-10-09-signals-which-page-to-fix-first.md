# Reader signals — which page to fix first

**Routine:** `Loom signals` · **Date:** 2026-10-09 (evening run) · **Branch:**
`signals-17-which-page-to-fix-first`

## What I completed

§21 of [`docs/signals.md`](../docs/signals.md): `deploymentReadingOf(pages, rows)`
in [`src/signals/deployment.ts`](../src/signals/deployment.ts), published from
`@jam-overture/loom/signals`, with a seventh vocabulary added to
[`silences.ts`](../src/signals/silences.ts) and the whole thing recorded in
**0250** — `decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md`.

**The gap it closes is the one every reading in this lane has left open by
construction.** Twenty sections answer about *one revision of one page*: where
its reading stops, how much of what it says gets read, whether readers had time
for it, what a change did to any of that, who the readers were. A deployment has
forty pages. **Nothing could put them in an order** — so the first question
anybody opening a portal asks, *where is the problem*, was the one question the
counters could not be asked. Every answer available was *here is a page, and here
is what is wrong with it*, which requires already knowing which page to open.

It is the **twelfth** thing taken out of what this subsystem already knows rather
than collected. **Nothing was added to a payload, a browser, a column, a store or
the vocabulary**, and the broadcaster was not touched — measured rather than
asserted, below.

It is also, I think, the first thing in this lane that tells a **model** where to
act without being told where to look. §9 named the band reading stops at; this
names the page, and the two together are an address a proposal can be written
against.

### The fact that decided the shape

**The over-count divides out inside a page and does not divide out across two.**

§9 rests on a fall being a ratio of two `reached` counts off the same rows: a
reader who straddled a rollup window straddled it for the whole page, so the
inflation 0147 names is common to the numerator and the denominator. That is what
makes *four in ten readers stopped here* sayable where *four hundred readers* is
not.

But the straddle rate is **each page's own**. A page readers linger on for twenty
minutes, against a rollup window of five, posts its batches into four windows and
has every distinct count against it inflated roughly fourfold; a page read in
ninety seconds does not. So an order over the raw losses is partly an order over
how long readers stay — and it fails in the direction nobody checks, because the
pages it floats to the top are the pages readers spend the most time on, which
reads as plausible.

So the key is the loss **scaled to the door**: `lost ÷ (1 + inflation)`, off that
page's own row, using §11's published matching rule rather than another
hand-written copy of it. The figure is not a count of people and is not rounded
into one; `lost` is published beside it unscaled, so nothing is hidden.

One pleasant consequence, proved rather than clamped: **a scaled loss can never
exceed the page views counted at the door.** The loss is at most the appearances,
and the appearances divided by one plus the straddle rate are the openings. There
is a test that walks the order and asserts it, because a headline figure above
its own denominator is exactly the sort of number a screen prints with three
decimal places on it.

## Decisions I took that were not specified

- **A page the door cannot scale is reported out of the order rather than placed
  in it.** A page can be perfectly well measured and have no row at the door —
  rows expired, or a deployment that upgraded mid-window — and there is no safe
  height to put it at: a long-dwell page would be over-ranked and a quick one
  under-ranked. Four standings say why a page is out and two say where it stands
  when it is in. This is §7's refusal in another costume: the figure a surface
  could misread is one the function never offers.
- **No deployment-wide loss, now or later.** The artefact is an **order** and not
  a sum, and that is also what makes the double count structurally unavailable
  rather than merely guarded: nothing in an order is added, so the only error it
  can make is one page standing in it twice. The published shape is pinned by a
  test that lists the eight keys, so a total added later has to argue with the
  test first. The one figure that *is* added is `arrivals`, and it is addable for
  the reason no other counter here is — a page view began on exactly one revision
  of exactly one tree and was counted once at the door (§8).
- **Both revisions of one tree stay in the order.** I built the tidier rule first
  in my head — one row per tree, newest revision wins — and it is wrong in a way
  that would have been very hard to see on a screen: a change shipped an hour ago
  *is* the newest revision and has four readers on it, so the rule hides the
  revision nine thousand people actually read behind the one four did. `trees` is
  published beside the order's length so a surface can say the two rows are one
  page.
- **A standing for a page whose counters report a bigger fall than the door has
  ever seen appear.** Not defensiveness: the scaled figure is the headline, and a
  reading assembled by hand is the one way it comes out absurd. The scaled figure
  is withheld, and the fall and its share are published anyway, because the
  disagreement is the thing worth seeing.
- **The ranking key is readers before share**, which is 0221's rule applied one
  level up. Across pages it matters more than within one: ranking by share puts
  every quiet page above every busy one, for ever.
- **I did not reach for the §20 shape of taking two already-published readings.**
  Here the inputs are a reading and a window of raw door rows, because the
  matching of a page to its row is the thing §11 published a rule for and the
  rule needs the rows. The same discipline is kept a different way: each page is
  scaled by its own row, and there is a test that a second page's row in the
  window changes neither page's answer.
- **I took 0250.** It is the next number free on `main` and on every open pull
  request: #548 holds 0245, and 0248 and 0249 are already on `main`. Neither of
  the other two open pull requests takes a number.

## Records added

- **0250 — A deployment is ordered by readers lost at the door's scale, and a
  page the door cannot scale is out of the order.** Accepted. **Nothing
  superseded.** It applies 0147's approximation, 0219's exactness and its
  matching rule, 0221's ranking rule and its refusal to divide across two
  counters, 0158's permanence, and 0240's table — and narrows nothing any of them
  said.

## Findings filed

- **For `Loom portal`** — the landing screen, which is the one reader screen that
  has never existed, with four notes on drawing it and three of them refusals:
  rank on one figure and print the other, `opened` is the exact weight,
  the unranked pages are a diagnosis and never a second league table, and `trees`
  against the order's length is what stops a reader double-counting a page.
- **For this lane** — a limit found in 0240, with nothing asked of anybody. See
  below; it is also in *Open questions*.

Nothing closed. The lane's open findings are all owned elsewhere, are questions
for the maintainer, or are measurements rather than requests.

## The limit I found in an accepted record

0240 says the subject of a silence is a property of the **reading** and uniform
across its set. That is exactly true and stays true with a seventh set in the
table.

What the first six sets could not distinguish is the stronger reading of it: that
a reading's silences are about *the reading*. In all six, the subject is the
reading's own scope or one level inside it.

**An order over a deployment's pages breaks that.** The order stands; one page is
not in it. So every reason it gives is about a page while the reading is of
something larger, and the subject published for it is `page` — not a fourth
member of `SilenceSubject`, because nothing here is silent about the deployment.

0240 is **not superseded and nothing in it is wrong.** The paragraph is written
into its own module and into 0250, and the mapping test now walks every set added
after the fifth rather than naming the sixth by hand — which is what its own
comment asked the seventh set to do.

## Test numbers

Real, from this branch, and nothing was skipped or weakened.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green, exit 0**, end to end |
| `src/signals/deployment.test.ts` | **22 tests, 22 passed** (new) |
| `src/signals/silences.test.ts` | **34 tests, 34 passed** (2 changed, none removed) |
| `src/signals/` | 29 files, **766 tests, 766 passed** |
| Root suite | 200 files, **4,487 tests, 4,487 passed** |
| `apps/loom` | 419 files, **7,636 tests, 7,636 passed** |
| `pnpm findings:check` | 1,096 findings, **0 malformed** |
| `pnpm prerender:check` | 129 pages, 1,644 junctions, **0 run together** |

**22 tests added**, all in this lane's own files, and no existing test was
deleted or loosened. The two changed in `silences.test.ts` are the two that count
the sets: the one that asserts every member of every vocabulary is mapped, and
the one that asserts the subject table in order. The third — *maps the sixth set
onto conditions the first five already reported* — was generalised to walk every
set added after the fifth, which is what its own doc comment said a seventh set
should cause.

**One red run, and it was the fixture rather than the unit.** Node ids are
`n_[A-Za-z0-9_]+`, so `band-1` is not one and the first run of the new file died
in the parser before a single assertion. Renaming the fixture's bands fixed it;
nothing in `deployment.ts` moved.

The exit code was read from a file written as the last thing on its own line, per
the merge-gate rule, and not from a pipe.

### The double-count test, which the lane's standard requires

Four shapes were available here and all four are covered.

**One reading of a revision handed in twice.** A caller that concatenated two
reads holds one page twice, and a page twice in an order is an order lying about
how much there is to fix. The test hands the same reading in three times and
asserts one row, `duplicated: 2`, and arrivals of 100 rather than 300.

**One door row handed in twice.** Quieter and worse: doubling a page's door row
doubles its arrivals *and* halves the loss the order is on, so the page slides
down the order with nothing looking wrong. The test asserts the doubled reading
is `toEqual` the single one, with `duplicatedRows: 1`.

**Two revisions of one tree**, which is *not* a double count and is deliberately
not treated as one. Both are ranked, `trees` is 1, and the arrivals add — because
a page view began on exactly one of them.

**A deployment-wide total**, which is absent by construction and is the reason
the other three cannot compound. The test pins the published shape to its eight
keys.

## Browser byte cost

**Nothing was added that runs in a browser**, and this is the measurement rather
than the assumption. `broadcast.ts` bundled with esbuild — minified, ESM, browser
platform — from a clean `git archive` of `origin/main` and from this working
tree, both written to the same output path so the gzip header is identical on
both sides:

| | `origin/main` | this branch |
| --- | --- | --- |
| minified | **6,477 bytes** | **6,477 bytes** |
| gzipped (`gzip -9`) | **2,942 bytes** | **2,942 bytes** |

`cmp` reports the two bundles **byte-identical**. `deployment.ts` is not in
`broadcast.ts`'s import graph — it is reached only from `src/signals/index.ts`,
which the broadcaster does not import — and its one value import is
`pageViewsFor`, which is server-side already. `browser-weight.test.ts` passes,
and its guard is the import walk rather than a byte threshold, so the walk is
what would catch a regression here.

## The preview, and what I did not see

The deployment's preview URL is in the pull request body. I could not open it
from this container — the environment's egress policy denies `*.vercel.app`, as
every lane's report has said for weeks — so I am not claiming to have looked at
it. There is nothing on it that differs from `main` except the generated API
reference, which is the one thing `pnpm verify` already checks: the app's
extraction test asserts the committed `reference.generated.json` against a fresh
build, and it passes.

## The door to per-reader identity

**No design choice in this unit makes the parked opt-in any more expensive.**
There is no new column, no new wire field, and nothing in the module asks who a
reader is: an order is built from falls between siblings and from page views
counted once at the door, and the view keys behind both were dropped at the door
and never written down.

One thing is worth naming because it would be hard to add later. The scaling this
module does is *between two populations of the same counter* — a window count
restated at the door's scale. An identified reading, if it ever returned, would
be a third population with its own denominator, and the shape here takes the
scale as a number the caller's rows supply rather than as something the function
derives. So a consented subset could be scaled the same way without the function
learning anything about who was in it.

## Open questions

One, and it is not blocking. It is filed in `FINDINGS.md` as well, with the same
recommendation.

**Should `SilenceSubject` gain a fourth member for a collection?** 0240 has
`page`, `part` and `comparison`. This unit needed none of them extended, because
an order's silences are about its member pages. But *this deployment holds no
pages at all* is a sentence somebody might want, and today it is reported as an
empty order rather than as a silence — which is the right answer for a function
and may be the wrong one for a card that has to print something.

**My recommendation is to leave it.** A fourth subject is cheap to add and
impossible to remove once a surface switches on it, and the case for it is
hypothetical until a screen is actually drawn: the portal finding above is the
thing that will discover whether an empty order needs a sentence of its own. If
it does, it is one member, one line in the table and one in the mapping, and this
lane will take it the run after somebody says so.

## Working beside the other lanes

- **No open pull request touches `src/signals/`.** I checked all three against
  `origin/main` before branching: #548 is `Loom primitives`' (and holds 0245),
  #563 is `Loom portal`'s, #564 is `Loom demo`'s. This lane's two from this
  morning, #555 and #562, are both on `main`, so nothing was stacked and nothing
  was raced.
- **`docs/signals.md` should merge cleanly this time.** Both of this lane's
  earlier branches inserted a section immediately before *## Still not in scope*
  and collided there; nothing else is inserting at that position today.
- **`decisions/README.md` and `reference.generated.json` are generated.**
  Regenerate, never hand-resolve. `pnpm build` first, then
  `pnpm --filter @loom/app docs:api` — in that order, or the committed reference
  is generated from the previous doc comments and drifts against the rebuild
  inside `pnpm verify`.
- **`FINDINGS.md` is append-only and was appended to**, two entries at the end,
  with nothing above them touched.
- **No maintainer comments on any open pull request**, review or issue, at the
  time of writing. Nothing outranked the queue.
