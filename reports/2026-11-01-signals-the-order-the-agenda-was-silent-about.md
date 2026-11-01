# Reader signals — the order the agenda was silent about

**1 November 2026 (evening)** · `Loom signals` · branch
`signals-68-the-order-the-agenda-was-silent-about` · §68 of
[`docs/signals.md`](../docs/signals.md) · record
[0333](../decisions/0333-a-deployments-conversions-are-a-third-order-ranked-on-the-loss-between-the-two-ends.md)

## Before anything was built

**No open pull requests at all, and no maintainer comment anywhere.** Nothing
outranked the queue and no review has been left. `Loom daily build` has no
branch open, so nothing was racing the signal path, and the three branches this
lane pushed in the last two days are all merged.

`main` has moved five commits past this morning's run — the portal lane's unit 7
(`#739`, `#744`), a signature cap, and two marketing units — and holds records
up to **0332**, so **0333** was the next free number and nothing could clash
with it.

The only shared files this branch touches are `decisions/README.md` and
`apps/loom/app/(docs)/_lib/api/reference.generated.json`, both generated and
both regenerated rather than hand-edited. `FINDINGS.md` is appended to and
nothing in it reflowed.

### Why this is the work

The eleven open findings this lane owns were read first. **One of them was the
work, and it named it:** this morning's entry, *the deployment now says what to
do about reading and says nothing about converting*, whose recommendation was
**take the arm and its input in one unit of work, or neither.** That is what
this is. Of the other ten, nine are stated limits with a recommendation to leave
them, and the tenth — *nothing draws any of it* — is `Loom portal`'s and is now
twenty-one runs old.

## What I completed

Two units that had to land together, because either alone is the thing the
finding warned against.

**`windowFunnelsOf`** — `src/signals/window-funnels.ts`. A window's funnel
answers, off the window and its assembly: `pages`, one per reading the window
holds, and `pairs`, one before-and-after per form the window paired.

**`deploymentConversionOf`** — `src/signals/conversion.ts`. The pages ranked by
the readers each loses between the two ends of its sharpest question, on the
door's scale.

```ts
const assembly = windowAssemblyOf(window, context)
const funnels = windowFunnelsOf(window, assembly)

deploymentConversionOf(funnels.pages).worst // → the funnel to fix first
funnels.pairs.map(({ was, now }) => funnelChangeOf(was, now))
```

25 tests across the two new files, both exported from `src/signals/index.ts`.

### The judgement the order turns on, and it is the one thing to argue with

A funnel answer holds two losses: readers who never reached the first end, and
readers who reached it and did not finish. **Only the second is ranked here**,
and that is the whole of what keeps this order from being a second spelling of
[0250](../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)'s.

A reader who never reached the ask stopped **reading**, and the order of falls
already ranks that reader. Rank the same loss here and one page stands near the
head of two orders for one event — an operator fixes it twice, or stops
believing either list. The cost of the call, if it is wrong, is that a funnel
whose readers never arrive looks healthy in this order; the pair's `entry` share
says so out loud on the row, which is why the cost is recoverable and the
double-ranking would not have been.

### What I found while writing it that the finding did not predict

**The funnel answer is the input of a comparison nothing could reach either.**
`funnelChangeOf` takes two answers, and the assembly publishes pairs of
*readings* — so a caller comparing two revisions' funnels wrote the composition
twice per pair. Publishing the pairings costs nothing, because each side is the
answer the readings already produced, looked up rather than read again. That
also makes two answers of one revision on one screen impossible, which is the
property the second rung keeps between a region map and a readership.

## Decisions I took that §68 did not specify

- **One argument, not two.** The order of falls takes the door rows beside its
  readings because a reading of where reading stops holds no arrivals. A funnel
  answer carries the door already — it is read against the exact number of
  readers the revision had — so this takes the answers and nothing else. A
  second row set at the call site would be a second chance to hand in rows the
  answers were not read against.
- **Nine states keep a page out of the order, and two are a new kind of state.**
  `unasked` — nothing asks this version of the page for anything — and `stale` —
  every question names a part the revision no longer has. No reading before this
  one could report either, because none was keyed by what a deployment asked.
- **`unasked` is a standing and not a silence.** Nothing is withheld, because no
  question was written. A census that counted it as a withheld figure would
  report a deployment with no funnels as a deployment whose funnels could not be
  read.
- **`unsplit` is checked first**, because it is the cause of the empty question
  list underneath it: an answer handed two forms with neither asked for reads no
  question at all, which is indistinguishable from a page nothing asks anything
  of and would have been published as one.
- **A stale question is never what a page is ranked on**, even where its count
  is the largest on the page: its counts cannot move again, so it would take the
  head of a page's own order away from a sound question. A page with one sound
  question and three stale ones is ranked on the sound one with the three
  counted on its row.
- **The rate is the tie-break and never the key.** Two readers out of three who
  left an ask unanswered is a worse rate and a smaller problem than four hundred
  out of a thousand.
- **A twenty-second silence vocabulary, bringing one condition.** Six of its
  seven members map onto conditions already published; `questions-stale` is the
  one it brings, and it is the second condition in the set about what a
  deployment asked rather than about the deployment, the window or the shape of
  the page.
- **No deployment-wide conversion rate.** A rate across pages needs a
  denominator across them, and two pages' funnel counts are added across rollup
  windows and therefore generous. The two figures that are added are arrivals
  and counts of questions, each addable for a reason of its own.
- **A pair side the readings do not hold is read rather than dropped**, so
  nothing is silently absent and there is no count of droppings to publish.

## Records added

- **[0333](../decisions/0333-a-deployments-conversions-are-a-third-order-ranked-on-the-loss-between-the-two-ends.md)** —
  *A deployment's conversions are a third order, ranked on the loss between the
  two ends.* **Accepted**, and it supersedes nothing: it contradicts no record,
  changes no existing type, and touches neither the tree schema nor the delta
  model. It adds one member to the silence vocabulary and one condition to the
  published set, which is the path that set's own note describes for a reading
  that can be in a state nothing before it could.

## Findings

**One closed** — this morning's conversion-arm entry, closed by a new entry in
the way this lane closes them, so nothing above it in the ledger is reflowed.

**One filed open, and it is the honest remainder:** the agenda still does not
take this order, so the one call answering *what should this deployment do next*
is still silent about converting. It was not done in this unit because joining
it is two questions of analysis rather than a third list — whether a conversion
leak is `page` work or work of its own, and whether each of the seven faults
reaches a conversion loss the way `spoilsTheLoss` answers for a fall. The second
is the one that matters: the answers are **not** transferable. `counts-inflated`
transfers, because the conversion key divides the same inflation out of the same
door row. `actions-uncredited` may well not, because a question whose second end
asks for `activated` is about presses, which is the counter that fault is
about. A table written by analogy rather than by argument is how a fault
vocabulary comes to be wrong in one of its two places, which has cost this
subsystem a real bug twice in a fortnight. The recommendation in the entry is to
answer the fault question first, beside the fault vocabulary, as
`spoilsTheConversion`.

Nine other open findings owned by this lane were read and left: eight are stated
limits with a recommendation to leave them, and the ninth waits on a screen.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on the final tree.

| | |
| --- | --- |
| Root suite | **250 files, 6,034 tests**, 0 failed, 0 skipped |
| The app's own | **386 files, 6,210 tests**, 0 failed, 0 skipped |
| New tests this branch | **25** — 17 in `conversion.test.ts`, 8 in `window-funnels.test.ts` |

`pnpm decisions:index` and `pnpm findings:check` both pass (1,392 findings, 0
malformed), and `pnpm prerender:check` reports 137 pages with nothing run
together.

**Three things failed on the way and all three are reported rather than
smoothed over.**

- **One of the seventeen conversion tests failed on its first run**, and it was
  the test fixture rather than the unit: a helper whose audience parameter had a
  default took `undefined` as *give me the default form* where the case needed
  *a reading that asked for no form at all*, so a window of two forms was read
  as the default form's and reported `unscaled` instead of `unsplit`. The
  helper now takes `null` for that and the case is what it says it is.
- **The first full verify failed twice in the app**, both in the generated API
  reference: `reference.generated.json` was stale against six new exports, and
  the same staleness made the *every published door* check report that six
  things were published with no page mentioning them. `pnpm --filter @loom/app
  docs:api` is the regenerator and both pass after it. This is the regenerate
  half of the rule in `docs/routines.md` about generated files, met rather than
  hand-resolved.

Nothing was skipped and no test was weakened.

## Browser cost

**Nothing reaches a reader's browser.** `broadcast.ts` is byte-identical —
`git diff` on it is empty — and neither new module is reachable from it.
Measured rather than asserted:

```
esbuild src/signals/broadcast.ts --bundle --minify --format=esm
6,513 bytes minified · 2,982 bytes gzipped
```

The minified figure is identical to the one §66 and §67 published. No payload
field, no header, no column, no migration, no store method and no new kind.

## Open questions

**Nothing blocking.** One worth the maintainer's eye:

**Whether the loss *before* the first end should be in this order at all.** I
say no, and the argument is written out above and in the record: that reader
stopped reading, and the order of falls already has them. The alternative —
rank the whole funnel loss, arrivals to conversion — is the shape most people
would write first, and it is one line. If you want it, it is a third order
rather than a change to this one, for the unit reason 0330 settled.

## Per-reader identity

Nothing here makes it more expensive to add later. A funnel is already
correlated inside one page view by an opaque key that never reaches storage, and
this order holds no reader, joins no reader and counts no reader beyond the
arrivals each page's own door row already published. Its unit is a page and a
question. A gate and a record, if that door is ever opened, would not touch
either new file.
