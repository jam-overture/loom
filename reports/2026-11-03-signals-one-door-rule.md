# Reader signals — one rule for the door's scale, and the last place it is taken in

**Routine:** `Loom signals` · **Run:** 3 November 2026, 21:10 UTC ·
**Branch:** `signals-72-one-door-rule`

## What I set out to do

No maintainer comments to address. **No open pull requests at all** — `gh pr
list` is empty, #753 through #758 all landed, including this lane's own §71 — so
there is nothing of another lane's to race and nothing of mine waiting. This
branch is off `main` at `bc289e3`.

The queue decided the work. The open finding at the top of it was filed this
morning by §71 and carried its own recommendation, in as many words:

> **Give `atDoorScale` the total definition** and drop the precondition from its
> doc comment… Then all three keys read the one rule. **Recommendation: the
> second, and not in this unit.** It changes a published function five live
> readings call, which wants its own change and its own test over the five.

This is that unit.

## What I completed

**`atDoorScale` is total, and both remaining ranking keys read it** — `door.ts`,
`deployment.ts`, `deployment-change.ts`.

```ts
export const atDoorScale = (count: number, of: PageDoor, scaledBy: PageDoor = of): number =>
  of.appearances === 0 || scaledBy.counted === of.appearances
    ? count
    : (count * scaledBy.counted) / of.appearances
```

The scaling every reader-weighted figure shares is now written **once** for all
eight readings that take it: the five `door.ts` was created for, and the three
ranking keys that had been spelling it by hand as `count ÷ (1 + inflation)` — the
order of conversions (taken by §71), the order of falls (0250) and the order of
movements (0291).

## The finding was right about the unit and wrong about the reason, and that is the run

The entry recommended totality to close a hazard: `atDoorScale` divides by
`appearances`, neither of those two keys refuses a door whose appearances are
nought, and the swap would turn a sound nought into **a `NaN` in a ranking key**.

**Neither key can reach that state.** Four lines of fixture say so in a second,
and both are stopped two rungs earlier by checks they already had for their own
reasons:

| door | the page | standing | reaches the key |
| --- | --- | --- | --- |
| `opened 10`, `appearances 0` | lost nobody | `unbroken` / `unmoved` | no |
| `opened 10`, `appearances 0` | lost anybody | `inconsistent` | no |

A page that lost nobody has no steepest fall and no movement and leaves the
order before the key. A page that lost anybody lost more readers than ever
appeared, which is the disagreement both files refuse last. So the totality is
**a belt rather than a fix** — what it buys is that the precondition comes off
the doc comment, so the next key to adopt the rule needs no guard beside it,
which is the state `door.ts` exists to prevent.

What the swap actually cost was **the last place**, and the clause that mattered
is a different one.

- **With drift the two spellings disagree, and the published one is the better.**
  Three roundings against two. Over the 22,100 integer triples in `opened ≤ 40`,
  `appearances ≤ 40` where the scale is not the identity, it is **never** further
  from the exact value than the hand-written spelling and is strictly closer in
  **4,963** of them. That is asserted against whole-number arithmetic in
  `door.test.ts` rather than claimed, because two doubles that differ in their
  last place cannot say which of them is nearer.
- **With no drift the published spelling had to be made exact, and this is the
  half that was load-bearing.** `count × n ÷ n` is the count mathematically and
  not in floats. An order of movements ranks on a share movement times a count,
  so **its figure is not a whole number**, and its own rule is that the magnitude
  is the comparison's published figure *because deriving it twice is how two
  screens come to disagree about which band a change hurt*. Ten readers reaching
  a band and four the next, against twenty-four and six, is a movement of
  3.6000000000000005; without the identity clause the swap would have printed
  **3.6** beside the band it happened at — two numbers for one fact, on a page the
  door had nothing to correct.

So the function got two short-circuits rather than one, and the second is the one
that kept a published figure where it was.

## Decisions I took that were not specified

**The ladders above the keys were left alone.** `deployment.ts` keeps its own
`door === null` and `door.inflation === null` checks rather than switching to
`doorOf`'s silence vocabulary, and the reason is a behaviour change I was not
asked for: `doorOf` names a fourth state, `uncounted`, which neither order
refuses. Adopting the vocabulary would invite a future run to "complete" the
switch and quietly withdraw pages from an order. §71 did take `doorOf` into
`funnel.ts`, but there it replaced a duplicated *type* and *function*; here there
is nothing duplicated but two lines that are documented as deliberately written
on the figure the scale needs.

**`movementOf` takes a `PageDoor | null` rather than a rate**, and the `null` now
has a doc comment saying it means *do not scale this one* and not *this page has
no door*. The caller withholds the door for an `inconsistent` row, and that was
previously legible only by reading two call sites.

**The identity short-circuit fires on the two-door caller as well**, where
`scaledBy` is a different door from `of`. It is exact there too — `count × x ÷ x`
is the count whichever doors the two came from — so there is no case where it
answers something the long form would not have meant.

## Records added

- **0346** — *The door's scale is total, so the three ranking keys read the one
  rule.* Accepted, §4c. Five alternatives recorded with the reason each was
  rejected, including the per-call-site guard the finding offered as its first
  shape and rounding the key, which was refused outright.

**The record was written as 0344** — the next free number on `main` when this
branch was cut (0343 was the highest) — and **was renumbered to 0346 at merge
time on 4 November**, because #759 carried a different 0344 onto `main` first and
0345 is claimed on #761. The dated note under the record's header says so.
Nothing it decides changed.

## Findings filed and closed

**Closed:** *two ranking keys still spell the door's scale by hand, and they must
not be changed to the published rule without a guard* (3 November). Closed by
this unit, with its Status line saying that the reason it gave was wrong and
pointing at the correction.

**Filed, closed on filing:** *the hazard that made a tidy unsafe was unreachable,
and the clause that mattered was about a figure rather than an edge.* The
correction above, plus the general shape, which is the part worth keeping: **a
finding that names a hazard is making a claim about reachability, and
reachability is a property of the ladder above the line rather than of the line.**
This one was derived by reading the arithmetic — correctly — and not by asking
what the three rungs above it already refuse. The 31 October entry cost a run by
going stale about a *sequencing* fact; this one would have cost a run by being
wrong about a *reachability* fact, and the check is the same cheap one both
times: **before trusting an entry, write the fixture it describes and look at
what comes out.**

Two smaller things are in the same entry because both are cheap to hit again:

1. **`PageDoor` carries no `inflation`, deliberately.** A test helper written to
   compare against the old spelling reached for `of.inflation` anyway, got
   `undefined`, and `count ÷ (1 + undefined)` is a `NaN` — which the helper then
   hunted for the exact value of by doubling it until it was a whole number. It
   never is. Named in the helper's doc comment now.
2. **An `expect` inside a 22,100-iteration sweep does not finish.** The same
   sweep is 46 ms as arithmetic and over five minutes as assertions. A sweep in
   this subsystem tallies and asserts **once**.

## Test numbers, measured

| | |
| --- | --- |
| `pnpm verify` | **exit 0** |
| Framework suite | **6,124 passed**, 254 files, 0 failed, 0 skipped |
| Application suite | **6,363 passed**, 394 files, 0 failed, 0 skipped |
| Signal suite alone | **1,946 passed** (1,935 before this unit — **11 new**) |
| `pnpm findings:check` | 1,416 findings, 0 malformed |
| `pnpm prerender:check` | 137 pages, 1,948 junctions, 0 run together |

**Nothing failed, nothing was skipped, and no test was weakened or deleted.**
The whole suite was green across the change *before* a single test was added,
which is the number that matters here: a published ranking key moved in its last
place in two orders and **nothing anywhere asserted a figure that moved**. The
eleven new tests are what now says what the figure is.

Two things cost this run time and neither was a flake. A test helper reached for
`of.inflation` on a `PageDoor`, which does not carry one, and the `NaN` that came
out sent a fraction helper doubling it for ever — the helper refuses anything not
finite now. And the same sweep that runs in 46 ms as arithmetic did not finish in
five minutes as 22,100 `expect` calls; it tallies and asserts once.

### The double-count case, which this lane tests for by rule

A readership read through two rollup windows. Every distinct count against the
page doubles and so do the appearances the door saw; the openings are counted
once at the door (0219).

| folded | `lost` | opened | appearances | key |
| --- | --- | --- | --- | --- |
| once | 16 | 30 | 40 | **12** |
| twice | 32 | 30 | 80 | **12** |

**Exactly twelve both times, and not merely nearly** — the doubled reading is one
quotient scaled by two above and below. Through the spelling the key used until
today it comes to **11.999999999999998**, which is a deployment told its worst
page improved by two quadrillionths of a reader because a rollup ran. The same
case is asserted on `atDoorScale` itself, on the order of falls through the whole
pipeline, and the order of movements keeps its existing assertions that a
comparison handed in twice does not double an order.

## Browser cost

**Nothing reaches a reader's browser.** `git diff --stat` on `broadcast.ts` is
empty, and the bundle measures the same as this morning:

```
esbuild src/signals/broadcast.ts --bundle --minify --format=esm
6,513 bytes minified · 2,981 bytes gzipped (gzip -9)
```

`door.ts`, `deployment.ts` and `deployment-change.ts` are not in the
broadcaster's import graph and `browser-weight.test.ts` passes. No payload field,
no column, no migration, no store method, no new kind.

## On the deferred door

Nothing in this unit makes **per-reader identity** more expensive to add later.
If anything it is the reverse: a reader id would remove the straddle this rule
exists to divide out, and the rule being in one place is one call site to retire
rather than eight.

## Open questions

**Nothing blocking.** Two for the maintainer, both with a recommendation.

1. **Whether the published keys moving in their sixteenth decimal needs saying
   anywhere a customer reads.** Recommendation: no. The figures are already
   documented as not counts of people and deliberately not rounded into them, the
   orders are unchanged, and the movement is toward the exact value in every case
   measured. I have recorded it in 0346's consequences rather than in any
   published text.
2. **Still nothing draws any of it**, twenty-five runs on. `Loom portal` is
   paused. This unit is the clearest case yet that the subsystem is being checked
   by its own tests and nothing else: a published ranking key changed in its last
   place today, in two orders, and the only thing that would have noticed is a
   screen.

## Collisions `Loom merge` should expect

- **`docs/signals.md`** — this branch adds **§72** before *Still not in scope*
  and adds one block quote inside §71's closing paragraph. Appends only; nothing
  reflowed. No other branch is open.
- **`FINDINGS.md`** — appended, plus one `Status:` line edited in place (this
  morning's `atDoorScale` entry, this lane's own).
- **`decisions/README.md`** — regenerated by `pnpm decisions:index`, not
  hand-resolved. Regenerate after the merge rather than taking either side.
