# Reader signals — the two libraries a window holds

**27 October 2026 (evening)** · `Loom signals` · branch
`signals-58-the-two-libraries-a-window-holds` · §58 of
[`docs/signals.md`](../docs/signals.md) · record
[0319](../decisions/0319-the-two-libraries-a-window-holds-are-assembled-from-a-placing-the-deployment-hands-in.md)

## Before anything was built

**One open pull request, no maintainer comment anywhere.**

- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October. Every comment on it is a routine's own, which is not input: the
  one that reads like a maintainer's is `Loom merge`'s, addressed *to* the
  maintainer and explaining why it skipped the branch. So nothing outranked the
  queue.
- **#714, #715, #716 and #717 all merged** since this morning's run, including
  §56 and §57. `main` is at `86e5b38`.
- `Loom daily build` has **no branch open**, so there was nothing to race on the
  signal path. This branch is cut from `origin/main` and touches
  `src/signals/window.ts`, its test, `docs/signals.md`, `FINDINGS.md`,
  `decisions/` and the generated API reference — nothing #706 goes near.

Eight open findings owned by this lane were read first. The newest was the work.

## What I completed

**§58 / 0319 — `windowLibrariesOf`, the third and last step of the §51 rung.**

§51 turned a store into readings and §57 turned readings into pairs, which
reached **five** of the nine comparisons. The **four library** comparisons take
something else: two whole libraries, every page as it stood against every page
as it stands. §57 named that gap the day it was built, and a finding filed with
it costed three shapes.

### The one line that composes and is wrong

```ts
libraryChangeOf(pairs.map(({ was }) => was), pairs.map(({ now }) => now))
```

It type-checks, it runs, and the result does not say what it left out. It drops
every form in `unpaired` — which is exactly where **a page published inside the
window** lands, because a page published inside the window has one revision in
it. `pagesGained` is the figure `libraryChangeOf` exists to report, so a
deployment that published two pages this week reads nought beside a `pages`
count that looks right. That is 0158's shape: wrong and plausible.

**And the counters cannot place those forms.** A form held at one revision is a
page published, a page withdrawn, or a page nobody touched, and no row tells
them apart — `StoredTally.updatedAt` is when the fold last wrote the row, not
when the page went up, and a revision number is a count of revisions, not a
date. The only party that knows is the deployment.

### What it is

`windowLibrariesOf(pairs, rows, placings)`:

- **A paired form is on both sides and is never asked about** — its two
  revisions are the two libraries' pages by construction, so there is nothing of
  a caller's answer to ignore.
- **An unpaired form is placed by `FormPlacings`**, a `placingFor(form)`
  function: the shape `RevisionTrees` and `PartDeclarations` already use, so a
  store, a cache, a map built for the call and a one-line double all satisfy it.
  `placingsIn` builds one from a list, keyed by the published form rule (0293),
  first-wins as `treesIn` is.
- **Three placings, closed.** `published` → later side only; `withdrawn` →
  earlier side only; `unchanged` → both sides at the one revision there is.
  `FORM_PLACINGS` and `describeFormPlacing` ship with them.
- **A form nobody could place is in `unplaced` and on neither side.**
- **A form named twice across the two lists is dropped and counted**, the pair
  winning over the unpaired form.
- **Each side is a `LibraryWindow`**, both carrying the window's whole set of
  door rows, so all four library comparisons are one call away.

After this **every one of the nine comparisons is one call off a window**, which
is what the rung §51 began was for:

```ts
const { pages } = windowReadingsOf(window, treesIn(trees), registry)
const held = windowPairsOf(pages)
const { was, now } = windowLibrariesOf(held, window.pageViews, placingsIn(history))

const kinds = libraryChangeOf(was.readings, now.readings)
const reach = libraryReachChangeOf(was, now)
```

## Decisions I took that were not specified

**The placing is a three-member closed set, not the predicate the finding
recommended.** The entry proposed *a predicate or a set saying which forms are
new*. A boolean cannot say **withdrawn**: a deployment that retired a page
inside the window would read `pagesLost: 0` with no way to say otherwise, and
the two readings a predicate can make are *published* and *everything else*,
which is a distinction the comparison does not have. Three members, published
with a description each.

**`undefined` is an answer and the form goes on neither side.** The two
defaults I could have taken are both the bug in a different direction — the
later side publishes a page nobody touched as a page gained (the figure 0295
drew its distinction to protect), and both sides publish a page published this
week as a page that was always there. A smaller library that names what it left
out is the safe failure, and it is the same call §56 made a day ago when it
stopped the region floor defaulting silently.

**Both sides carry the window's whole set of door rows rather than a slice.**
`pageViewsFor` picks each page's row on the revision and form its reading names,
and the two sides name different revisions, so one array answers both without
either side borrowing the other's arrivals. Asserted directly: `was.rows` and
`now.rows` are the same array and the reach comparison reads 10 arrivals on one
side and 20 on the other out of it.

**It returns the two libraries and not the four comparisons.** 0309's rule,
carried through 0318 and kept: returning comparisons privileges four of the
thirty-eight readings and derives figures in a second place.

**It lives in `window.ts`** beside the two steps it completes, for the reason
§57 gave — a second file would be a second place to look for one answer.

## Records added

- **0319** — *The two libraries a window holds are assembled from a placing the
  deployment hands in, and a form nobody can place is on neither side.*
  **Accepted.** It contradicts no accepted record: 0293's pairing rule is
  imported, 0295's *a form gained is told from a page published* is what the
  per-form placing protects, and 0309's *adds no figure of its own* is carried
  forward. Eight alternatives recorded with what each costs.

0319 was the next number free on `main`, which holds up to 0318; 0308 is claimed
by #706 and does not claim 0319. Nothing on this branch is `Proposed`, so there
is nothing for `Loom merge` to skip.

## Findings filed and closed

1. **Closed:** *the pairing rung does not assemble the two windows the four
   library comparisons take* (27 October, morning). Built as §58 / 0319, with
   the one change to its recommendation named on the entry.
2. **Filed:** *the two libraries a window holds are assembled now, and the
   placing is the one argument nothing will remind a caller to pass.* Two things
   in it. The placing and the region floor (§54) are now the same shape and the
   same hazard, and if a third appears the three want one deployment reading
   context rather than three arguments threaded through three calls — filed as a
   shape to watch, not as work, because two is not a pattern. And the limit
   below.

## The limit I did not smooth

**A page published *and* then revised inside one window has two revisions, so it
is paired and lands on both sides rather than being counted as a page gained.**
`pagesGained` is therefore a count of the forms whose **only** revision is new.

That is right for what a library comparison is — the sides are two generations
of revisions, and both generations of that page are in the window — but it is
not what the words *pages gained* promise, and nothing in the result says which
reading it took. Recorded in 0319's consequences and filed. The alternative is a
placing that overrides a pair, which throws away the within-window change the
pair would otherwise report.

## Test numbers

`pnpm install && pnpm verify` **green, EXIT=0** — read from `verify.exit`, which
the gate wrote as a separate command, per `docs/routines.md`.

| | |
| --- | --- |
| Root suite | 240 files, **5,809 tests**, all passing |
| App suite | 369 files, **6,689 tests**, all passing |
| `src/signals/` | 49 files, **1,678 tests** |
| `src/signals/window.test.ts` | 71 → **89** |
| New cases | **18** |
| Findings ledger | 1,337 entries, 0 malformed |

**Nothing failed and nothing was skipped.** No test that was on `main` was
changed, weakened or removed; `window.test.ts` gained eighteen cases and lost
none. One case **this branch had already committed** was replaced during
mutation testing, with its reason below: it could not fail, which the mutant
proved.

`reference.generated.json` was regenerated with `pnpm --filter @loom/app
docs:api` after the new exports moved the published surface, never
hand-resolved, per `docs/routines.md`. The diff is the seven new names and
nothing else: `FormPlacing`, `FORM_PLACINGS`, `describeFormPlacing`,
`FormPlacings`, `PlacedForm`, `placingsIn`, `WindowLibraries` and
`windowLibrariesOf`.

### Mutation testing: thirteen planted, thirteen dead — two of them only on the second attempt

Run after the first commit, per the finding filed this morning that mutation
testing before a commit is how a run loses the work it is testing.

| planted | what died |
| --- | --- |
| `published` put on both sides | 4 cases |
| `withdrawn` put on the later side | 2 cases |
| `unchanged` put on the later side only | 3 cases |
| an unplaceable form put on both sides | 1 case |
| the pair's two sides swapped | 3 cases |
| a repeated form counted and still carried | 1 case |
| a repeated form dropped and not counted | 1 case |
| `placingsIn` last-wins rather than first-wins | 1 case |
| each side left in the order it was filled | **nothing, first time round** |
| `unplaced` left in arrival order | **nothing, first time round** |
| each side sorted by tree, ignoring the audience | 1 case |

**The two first-round survivors are the same mistake twice, and it is the one
§57 hit as well (0231): a sort is unfalsifiable if every fixture arrives
sorted.**

- The order case built *one* pair and *one* unpaired form and then reversed both
  lists — and reversing a one-element list changes nothing. Worse, the paired
  page was the one that sorts first, so the order it was filled in **was** the
  published order. Replaced with two cases: one that pairs the page sorting
  second and places the page sorting first, so a side left in fill order is a
  different list; and one with two pairs and two placed forms over two
  audiences, handed in forwards and backwards, asserting both come back in the
  published form order.
- `unplaced` had the same hole, because `windowPairsOf` hands `unpaired` over
  already sorted. The case added builds a `WindowPairs` by hand with the two
  forms reversed.

Nothing was wrong in the code either time; the tests that would have caught it
being wrong did not exist.

**Both double-count cases are covered, per this lane's standing rule.**

- *One reading on two sides must be one page.* An `unchanged` form carries the
  same reading onto both sides, and the case asserts `pages: 1`,
  `pagesGained: 0`, `pagesLost: 0`, `republished: 0`, `gained: 0`, `lost: 0`
  and `viewsWas === viewsNow === 10` — not a page counted twice, and not its
  views counted twice.
- *One form in both lists must be one page in the comparison.* A hand-built
  `WindowPairs` naming a form in `pairs` and in `unpaired` comes back
  `duplicated: 1` with the pair standing, and `libraryChangeOf` over the result
  reports `ambiguous: []` and `pages: 1` — where carrying the repeat would have
  gated the page out of every figure while the totals went on looking right
  (0158).

**Browser cost: nothing.** `broadcast.ts` is byte-identical — `git diff` on it
is empty — and the bundle measures **6,513 bytes** minified, the same number as
the last four runs. `browser-weight.test.ts` still reports no package in the
broadcaster's import graph. `window.ts` is server-only and reaches no browser.
**No payload field, no column, no migration, no store method and no new kind.**

## Open questions

**Nothing blocking.** Four, each with a recommendation, and three are not new.

1. **The placing and the region floor are the same shape and the same hazard**
   (filed today). Both are per-deployment configuration handed into a reading
   call, and nothing reminds a caller to pass either. Recommendation: leave them
   as two arguments for now and gather them into one deployment reading context
   if a third appears — two is not a pattern, and the context would be a record.
2. **`pagesGained` counts the forms whose only revision is new**, so a page
   published and revised inside one window is not among them (filed today).
   Recommendation: leave it. The alternative throws away a real comparison to
   fix a word.
3. **The door's repeated *opening* batch** and the region floor its remedy
   reaches, which is the maintainer's and is unchanged.
4. **`0308`** on #706, unchanged: one reading of one clause, three days old,
   still the cheapest it will ever be.

And the standing one, now eleven runs old: **nothing draws any of this.**
`Loom portal` is paused. As of tonight the rung is complete — all nine
comparisons are three lines from a store — and not one of them is on a screen.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later, and
nothing was built toward it.** A placing is about a page's publishing history —
what the deployment put up and when — and reaches no reader. The libraries hold
readings, which are counters filed under a tree and a form; a person appears
nowhere in either side. If identity ever returns as an opt-in, a consent
decision would be a third thing beside a form rather than something this
assembly would have to be unpicked from.
