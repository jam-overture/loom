# Reader signals — the leak the order threw away, kept as the part a straddle cannot explain

**Routine:** `Loom signals` · **Run:** 3 November 2026, 09:08 UTC ·
**Branch:** `signals-71-a-leak-is-a-range`

## What I set out to do

No maintainer comments to address. There are three open pull requests —
**#753** is this lane's own from last night (`windowAgendaOf`, 0337), **#752**
is `Loom framework`'s and **#754** is `Loom portal`'s — and **none of them
touches `src/signals/`** except #753. So nothing of another lane's to race, and
one thing to be careful about: this branch is off `main` at `eb591ce` and does
**not** build on #753. Nothing here depends on `windowAgendaOf`.

The queue decided the work. Yesterday morning's finding — *the fault vocabulary
now has three published statements per member* — named two shapes to watch for
and the first of them was a unit of work rather than a warning:

> An answer that needs a figure rather than a boolean. `counts-inflated` reaches
> a conversion key by an amount `PairReach.rateAtMost` already bounds for the
> rate. Today the page simply leaves the order, which is the safe call and loses
> a real ranking. A bound on the key — *this page's leak is between n and m* —
> would be a reading rather than a fault answer, and it belongs beside the
> funnel, not here.

## What I completed

**`PairLeak`, on every `PairReach`** — `src/signals/funnel.ts`. The readers one
funnel pair loses between its two ends, on the scale that page's door counts in,
as an interval: `atLeast` and `atMost`.

**`readersAtLeast` and `worstSecure`** — `src/signals/conversion.ts`. Every
ranked page carries both ends of its interval, and the order says whether its
head was forced.

```ts
const order = deploymentConversionOf(windowFunnelsOf(window, assembly).pages)

order.worst?.readers // 48 — the key, which is the most the leak could be
order.worst?.readersAtLeast // 11.6 — the part a short rollup window cannot explain
order.worstSecure // false — the next page's ceiling reaches this page's floor
```

A deployment whose rollup window is short used to be told *your measurement is
the thing to repair* and nothing else about its funnels. It is now told that and
*this page is losing at least eleven readers between its pricing band and its
form, however short your window is.*

## The result the finding did not predict, and it is the whole unit

The entry treated the ranking key as an estimate that a bound would sit around.
**It is already the ceiling.** `atDoorScale(reached − converted)` is
`atDoorScale(reached) × (1 − rate)`, and `rate` is a floor on the true rate for
the reason 0336 worked out — a straddle *splits a conversion across two windows
and loses it*, so `converted` is relatively the more deflated of the two counts
and their ratio understates. The published key has been the most the leak could
be since the day it shipped, and nothing said so.

So the work was not bracketing a figure. It was naming what the figure had been
all along and publishing the other end of it, which is one multiplication.

## Decisions I took that were not specified

**The order still ranks on the ceiling.** The attractive alternative is to rank
on the floor, which cannot be manufactured by a short window, and let
`counts-inflated` stop withdrawing pages. I refused it: it is a different key
for the same question, and a page losing four hundred readers with a wide
interval would sort below one losing six with a narrow one — which answers *what
am I certain of* rather than *what should I fix first*. 0333's key stands,
0336's withdrawal stands, and nothing is superseded. The floor is a figure
beside the key.

**`worstSecure` rather than a second order or a bare flag.** One comparison, and
the only one a screen cannot make for itself without re-deriving the sort: the
rows are sorted by their ceilings, so the only page that can overtake the head is
the one immediately after it. A `bounded` flag was refused for being derivable
(`readersAtLeast === readers`) and for saying only *uncertain* where the whole
value is in how uncertain — `[59, 60]` and `[0, 60]` are not the same page.

**Both ends are one expression over two rates**, and this is the one line in the
file a reader should not simplify. The reach is put on the door's scale once and
then taken at each bound of the rate. Spelling the ceiling the obvious way
instead — as the loss rather than as the reach times a rate, which is the same
number — breaks the interval: at a drift of nought,
`reached × (1 − converted ÷ reached)` and `reached − converted` differ in the
last place for three readers and one conversion, so the floor comes out four
hundred quadrillionths **above its own ceiling**. 0229 has been bitten by this
arithmetic twice; this is the third time and the first where it would have
produced a floor that is not one. The cost of the right spelling is that the
published key moves in its sixteenth decimal on some rows. Nothing orders on a
sixteenth decimal, and the ties 0333 already breaks by tree and revision are
what hold the order steady.

**`funnel.ts` stopped keeping its own copy of the door's per-page rule.** It held
a local `Measured` type, a `NOTHING_MEASURED` constant and a `silenceOf` that
ordered the same three states the same way `doorOf` does — three spellings of
what `door.ts` was created to hold once. It calls `doorOf` now, which is also
what gives the leak a door to scale against. Fifteen lines removed, no behaviour
changed, 1,920 signal tests green either side of it.

## Records added

- **0342** — *A conversion leak is an interval, and the key an order ranks on is
  its ceiling.* Accepted, §4c. Four alternatives recorded with the reason each
  was rejected, including the count-based floor (`lost − 2 × drift`) that is
  valid, looser, and would be a second spelling of a worst case
  `rateCeilingOf` already encodes.

**0342 rather than 0337.** `main`'s highest is 0336, so the next free number
there is 0337 — and 0337 is claimed on **two** open branches already (#753 and
#752), with 0338 on one and 0340/0341 on #754. Taking 0337 would have made a
three-way clash for `Loom merge` to untangle. 0342 clashes with nothing visible,
and `pnpm decisions:index` reports the gaps as claimed-on-a-branch rather than
as holes, which is what it is built to do.

## Findings filed and closed

**Filed, open:** *two ranking keys still spell the door's scale by hand, and
they must not be changed to the published rule without a guard.* Grepping for
the **arithmetic** of `atDoorScale` rather than for its name finds three ranking
keys writing `x ÷ (1 + inflation)`, which is the same rule. Only
`conversion.ts` could take the published one, and the reason is the edge rather
than the arithmetic: `atDoorScale` divides by `appearances` and is documented as
only ever called where that is positive. `conversion.ts` refuses a door with no
appearances before it reaches its key. **`deployment.ts` and
`deployment-change.ts` do not** — neither has an `uncounted` standing, and both
reach their key with `opened > 0` and `appearances === 0` wherever the loss is
nought. Today they answer a sound nought; swapped, they would answer `NaN` in a
ranking key. So the division-first spelling is the one that is *total* there, and
the published rule is the one with a precondition. The fix I recommend is to give
`atDoorScale` the total definition — bit-identical for all five existing callers
— as its own unit, not riding along with a reading of a funnel.

**Filed, closed on filing:** the entry above about the key being a ceiling, with
the general form of the arithmetic trap: *a bound and the figure it bounds have
to be arrived at by one route*, not by two that agree on paper.

**Closed, housekeeping:** two entries that had gone stale.

- *The second rung the three orphaned readings need cannot be built today* (31
  October) — #728 landed and the rung was built that same evening as
  `windowFiguresOf` (§66). The entry was never closed, so it reads to a fresh
  session like the top of the queue, and it cost this run time. The general
  shape: an entry whose status is a **sequencing** fact goes stale without
  anybody being wrong, because the condition is met by a run that is not reading
  it as its own work. Before trusting one, grep for the name it says is missing.
- *Two forms of a page can now be compared, and the same question about its words
  and its actions is a mirror of it* (21 October) — both mirrors were built, in
  the order the entry asked for: `form-action.ts` (§46) and `form-copy.ts` (§48).

## Test numbers, measured

| | |
| --- | --- |
| `pnpm verify` | **exit 0** |
| Framework suite | **6,083 passed**, 252 files, 0 failed, 0 skipped |
| Application suite | **6,273 passed**, 388 files, 0 failed, 0 skipped |
| Signal suite alone | **1,920 passed** (1,906 before this unit — **14 new**) |
| `pnpm findings:check` | 1,406 findings, 0 malformed |
| `pnpm prerender:check` | 137 pages, 1,947 junctions, 0 run together |

Two failures were hit and fixed on the way, both honest gates rather than
flakes: `src/documentation.test.ts` caught two bare decision-record numbers in
published sentences (the maintainer's rule about the API reference), and
`extract.test.ts` caught the generated reference pointing `PairReach` at a line
that now declares `/**`, because inserting `PairLeak` above it moved it.
`pnpm --filter @loom/app docs:api` regenerated it. **Nothing was skipped,
weakened or deleted to get green.**

### The double-count case, which this lane tests for by rule

One readership read through two rollup windows. A hundred page views began,
eighty reached the ask, twenty answered it.

| folded | `reached` | `converted` | appearances | `atMost` | `atLeast` |
| --- | --- | --- | --- | --- | --- |
| once | 80 | 20 | 100 | **60** | **60** |
| twice | 160 | 40 | 200 | **60** | **0** |

The ceiling survives the doubling exactly — that is what the door's scale is for.
What the doubling costs is the floor: at a drift of a hundred, every one of the
sixty could have been a conversion split across the two windows, so the counters
cannot rule out a page that leaks nobody. A sweep over 13 × 13 × 13 count triples
asserts `0 ≤ atLeast ≤ atMost` throughout and `atLeast === atMost` exactly
wherever the drift is nought. A reading handed in twice is asserted to move
neither end of the interval nor the verdict on the head.

## Browser cost

**Nothing reaches a reader's browser.** `broadcast.ts` is byte-identical —
`git diff --stat` on it is empty — and the bundle measures the same as yesterday:

```
esbuild src/signals/broadcast.ts --bundle --minify --format=esm
6,513 bytes minified · 2,982 bytes gzipped
```

`door.ts` and `funnel.ts` are not in the broadcaster's import graph and
`browser-weight.test.ts` passes. No payload field, no column, no migration, no
store method, no new kind.

## On the deferred door

Nothing in this unit makes **per-reader identity** more expensive to add later,
and one thing about it is worth saying plainly: the interval exists *because*
measurement is anonymous and node-shaped. A deployment that could stitch one
reader across page views would know whether a visit straddled a window and would
not need a bound at all. The bound is the honest price of rule 1, and publishing
it is cheaper than the thing that would remove it.

## Open questions

**Nothing blocking.** Two for the maintainer, both with a recommendation.

1. **Whether `atDoorScale` should be given the total definition** so that all
   three ranking keys read one rule. Recommendation: yes, as its own unit, with a
   test over the five existing callers showing it bit-identical. It is one line in
   `door.ts` and one sentence out of its doc comment.
2. **Still nothing draws any of it**, twenty-four runs on. `Loom portal` is
   paused. `worstSecure: false` is the clearest case yet for why a screen is the
   missing half: it is a sentence — *these two pages are too close to call at your
   rollup window* — that no number in this subsystem can say on its own, and it
   is one boolean away from being printed.

## Collisions `Loom merge` should expect

- **`docs/signals.md`** — this branch adds **§71** before *Still not in scope*;
  #753 adds **§70** in the same place. Both append; neither reflows. The numbers
  do not clash and the hunks are adjacent.
- **`FINDINGS.md`** — appended, never reflowed, plus two old `Status:` lines
  edited in place (the 31 October and 21 October entries named above). #753 does
  not touch either.
- **`reference.generated.json`** and **`decisions/README.md`** — regenerated, not
  hand-resolved. Regenerate both after the merge rather than taking either side.
