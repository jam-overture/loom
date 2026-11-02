# Reader signals — the fault that reaches one order and not the other

**Routine:** `Loom signals` · **Run:** 2 November 2026, 09:07 UTC ·
**Branch:** `signals-69-a-fault-reaches-a-conversion-differently`

## What I set out to do

The queue was unambiguous. Two records landed on 1 November — 0330, which answers
*what should this deployment do next* out of a fall in reading and a fault in
collection, and 0333, which built the order of conversions that answer was silent
about — and the finding filed that evening said the join between them is its own
unit of work, in a stated order: **answer the fault question first**, then decide
the vocabulary.

It also said, in as many words, what a run must not do: fold the conversion order
into the existing `page` member without answering, fault by fault, whether a
fault reaches a conversion loss, because *a table written by analogy rather than
by argument is how a fault vocabulary comes to be wrong in one of its two
places, which has cost this subsystem a real bug twice.*

No maintainer comments to address: there were **no open pull requests** on
`jam-overture/loom` at the start of this run, so nothing to answer and nothing of
the framework lane's to race. `main` was at `749e4c1`.

## What I completed

**`spoilsTheConversion`** — `src/signals/health.ts`, published beside
`spoilsTheLoss` and `remedyOf`. Per fault, whether that fault reaches the figure
the order of conversions is ranked on.

**`deploymentAgendaOf` takes three readings** — `src/signals/agenda.ts`. The
order of conversions is a required third argument, and the join publishes
`converting` beside `page`, `spoiledConversion` beside `spoiled`, and the page's
own conversion row beside its fall row.

```ts
const assembly = windowAssemblyOf(window, context)
const progress = assembly.readings.pages.map(readingProgressOf)

const agenda = deploymentAgendaOf(
  deploymentReadingOf(progress, window.pageViews),
  deploymentConversionOf(windowFunnelsOf(window, assembly).pages),
  collectionHealthOf(assembly.readings.pages, window.pageViews, schedule)
)
```

A deployment whose pricing band every reader reaches and nobody buys from now
reads `work: "page"` with a named figure and a place in an order. It read
`work: "none"` yesterday.

## The finding's two worked examples were both wrong, and that is the result

The entry supposed that `actions-uncredited` **might** reach a conversion loss,
and that `counts-inflated` **would not**. Reading the rollup settles both, in
the opposite direction each time.

**A funnel end is satisfied by the node a signal names and the kind it is.**
`rollupOf` files each view key under `(tree, revision, nodeId, kind)` and answers
a pair out of those sets. The ancestry a delegated signal carries is walked into
exactly one counter — `engaged` — and **no funnel figure is made of it.** So a
sender that credits nobody cannot touch a conversion key. Same answer as for a
fall, by a different argument: a fall survives it because a fall is made of
`reached`.

**A conversion is a conjunction inside one rollup window, and a fall is not.** A
fall is a difference of two independent distinct-view counts, so a short window
inflates both ends and `lost ÷ (1 + inflation)` puts the difference back on the
door's exact scale. `converted` counts the views in a pair's `from` set that are
*also* in its `to` set, within one run — so a page view that met the first end in
one window and the second in the next contributes `reached 1, converted 0`, and
the conversion is **lost rather than double-counted**. `funnel.ts` already said
this about the rate (*"a floor on the true rate wherever `exact` is false"*); the
consequence for a ranking key had not been drawn.

So a rollup window shorter than the visits being measured **manufactures the very
loss this order ranks**, and dividing by the straddle corrects the scale of a
count rather than a count that was never made. `counts-inflated` is `false` for a
fall and `true` for a conversion.

**Why this was worth the care the finding asked for.** `counts-inflated` is the
one fault of the seven a fall is explicitly safe from, and it is one of only
three that can be seen on a ranked page at all. The single most likely wrong row
in a transferred table was the single most consequential one, and the symptom
would have been a page in the wrong order with a true-looking number over it.

The published table, with `spoilsTheLoss` beside it:

| fault | reaches a fall | reaches a conversion | can be seen on a ranked page |
| --- | --- | --- | --- |
| `door-unscaled` | yes | yes | no — the orders refuse it |
| `openings-unmarked` | yes | yes | no — the orders refuse it |
| `counts-inflated` | **no** | **yes** | **yes** |
| `collection-stalled` | yes | yes | yes |
| `actions-uncredited` | no | no | yes |
| `rows-mishandled` | yes | yes | yes |
| `audiences-mixed` | yes | yes | no — the orders refuse it |

## Decisions I took that were not specified

**`AgendaWork` keeps its four members, and nothing is superseded.** The finding
left this open and said that if `work` has to say three things, 0330's vocabulary
should be superseded rather than widened in place. I concluded it does not have
to. The four members are on the axis *whose hand the work falls to*, not *which
part of the page*, and a conversion leak is the page writer's work exactly as a
fall is. `page` and `both` cover either kind of page evidence; the row's own
`order` and `conversion` members say which, in those readings' own figures. The
alternative was eight combinations over a flat set of four with `both` renamed,
which is a change of direction in an accepted record — and it buys a surface
nothing it cannot read off the row.

**Each page order is filled by its own predicate, not off `work`.** This is the
one place the shortcut would have put 0330's own defect back. `work` is `page` or
`both` wherever *some* rank is evidence, so using it to fill both lists would put
a page whose leak a fault manufactured into the conversion order on the strength
of its sound fall — which is exactly the state `counts-inflated` produces. A row
is in `page` where its fall is ranked and unspoiled, and in `converting` where
its leak is ranked and unspoiled.

**The third argument is required, not optional.** It breaks a signature nothing
outside its own test calls, and it makes the recurring hazard of this
subsystem's rungs impossible: an argument a caller may omit is a fix-list that
type-checks, runs, and answers `none` about the half of the product that pays. A
deployment that asks its readers nothing hands in the order it gets — every page
`unasked` — and the join reads exactly as it did before.

**Falls before leaks in `first`.** There is no comparing the two magnitudes; the
keys are readers in two units. The argument is causal: a reader who never reached
an ask stopped *reading*, and 0333 deliberately leaves that reader in the order
of falls, so a leak is a question about readers who did arrive. Rewriting an ask
that readers do not reach is work on a part of the page nobody sees.

**`spoiled` was not renamed.** `spoiled` / `spoiledConversion` is asymmetric
where `spoiledLoss` / `spoiledConversion` reads better. Renaming a published
field whose meaning is unchanged buys legibility with churn and a superseded
record, so the asymmetry is stated on both members and filed as a recommendation
for whichever run next has a reason to touch this vocabulary.

## Records added

- **[0335](../decisions/0335-a-fault-reaches-a-conversion-and-a-fall-differently-so-the-fix-list-asks-each-order-its-own-question.md)
  — A fault reaches a conversion and a fall differently, so the fix-list asks
  each order its own question.** Accepted. It supersedes nothing: every member of
  0330's vocabulary keeps its name and its meaning, and `AgendaRow.spoiled`
  keeps its exact definition. Index regenerated.

## Findings filed and closed

- **Closed:** *the agenda has a third order to join and a vocabulary whose four
  members say page or measurement* (1 November, evening) — both of its questions
  are answered, and the entry closing it records that its own two worked examples
  were backwards, with the general lesson: a figure's exposure to a fault is a
  property of **what the counter is made of**, and a counter built by
  intersecting two sets inside one window has an error no scaling of the window's
  drift can reach.
- **Filed, open, mine:** the fault vocabulary now carries three published
  statements per member, two of which are about ranking keys in other files. The
  entry names the two signs that this shape has run out — an answer that needs a
  figure rather than a boolean, and a fourth order whose key is not a headcount
  at the door's scale — and recommends **nothing yet**, because generalising a
  table of seven arguments into a mechanism is how the argument per fault stops
  being written down.

## Test numbers, in full

Everything below is this run's own output, not a previous run's.

```
pnpm install                            Done in 11s
pnpm build                              clean
pnpm typecheck                          clean
pnpm test                               251 files, 6,054 tests, all passed
pnpm findings:check                     1,395 findings, 0 malformed
pnpm reports:check                      2,045 visuals, none over 1.1MB
pnpm --filter @loom/app verify          386 files, 6,208 tests, all passed
pnpm prerender:check                    137 pages, 1,947 junctions, 0 run together
```

`apps/loom/app/(docs)/_lib/api/reference.generated.json` is regenerated with
`pnpm --filter @loom/app docs:api`, not hand-edited: the published surface gained
one function, and two of the docs app's tests are red until the generator has
been run.

The two signal files I changed, on their own:

```
src/signals/agenda.test.ts              28 tests passed (10 new)
src/signals/health.test.ts              52 tests passed (4 new)
```

**Nothing failed and nothing was skipped or weakened.** Two tests did fail on
the way, both from repository rules rather than from the logic, and both were
fixed rather than relaxed: `tools/decisions/decisions.test.ts` rejected a
citation of 0335 before the record existed and then rejected a wrong filename in
one of its links, and `src/documentation.test.ts` rejected three doc comments in
which a record number had become part of a published sentence — the maintainer's
rule that a casual reader of the API reference should never meet a bare `(0007)`
doing grammatical work.

**Double-counting, tested.** Every counting unit here is tested against the case
where it would double-count, which is the lane's standing rule: a page the caller
named twice on the **conversion** side is dropped and counted in `duplicated`; a
page both page orders rank is one row object in both lists and one entry in
`work` (asserted by identity, `agenda.page[0]` is `agenda.converting[0]`); and
`contested` is still a slice of `collection` where only the leak was withdrawn,
so the work counts cannot exceed the pages read. `unpaired` is asserted in all
three short-window directions.

## Browser cost

**Nothing reaches a reader's browser.** `broadcast.ts` is untouched, and
`git diff --name-only src/signals/broadcast.ts` is empty.

```
esbuild src/signals/broadcast.ts --bundle --minify --format=esm
6,513 bytes minified · 2,981 bytes gzipped
```

Byte-identical to yesterday's measurement. No payload field, no counter, no
column, no store method, no migration and no new kind — the whole unit is
interpretation of metadata the server already holds, which is where this lane's
work is meant to be.

## Per-reader identity

No design choice here makes it more expensive to add later. The unit is a page in
all three source readings and in the join; nothing holds a reader, keys anything
by a reader, or joins across page views. The one thing worth noting is a
*cheapening*: `spoilsTheConversion` is a statement about a counter's construction
rather than about a population, so a per-reader funnel — if the gate and the
record ever arrive — would inherit it unchanged.

## Open questions

Nothing blocking. Two things for the maintainer, both recommendations rather than
asks, carried into the pull request comment:

1. **The `spoiled` / `spoiledConversion` asymmetry**, and whether the rename is
   worth a superseding record on its own or should wait for a run that touches
   the vocabulary anyway. My recommendation is to wait.
2. **Still nothing draws any of it.** This is now twenty-two runs old and it is
   `Loom portal`'s, which is paused. The *Signals* screen recommendation has not
   changed shape this run: the arrival standing, then this agenda — which is now
   one call over three readings a screen would already be holding, and prints one
   line saying *rewrite this page*, *rewrite this ask* or *repair this
   measurement*, with the page named — then `windowFiguresOf`.
