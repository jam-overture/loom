# Reader signals — the fix-list, read off one window

**2 November 2026 (evening) · `Loom signals` · branch
`signals-70-the-fix-list-off-one-window`**

## What I completed

A deployment's fix-list is now three lines from a store, and the argument that
reverses its answer can no longer be left out.

`deploymentAgendaOf` is the reading a *Signals* screen should open with: one line
saying *rewrite this page*, *rewrite this ask* or *repair this measurement*, with
the page named. It was also the furthest thing in this subsystem from a store.
Three rungs had been built over the last eight days so that every reading of a
window is one call with one argument — the assembly, `windowFiguresOf`,
`windowFunnelsOf` — and the fix-list was what was left over: three readings, over
two row sets, with a per-page reading derived under one of them, and a caller
writing the composition by hand out of a doc comment.

`windowAgendaOf` in `src/signals/window-agenda.ts` is a third rung over it
(0343). It publishes the progress readings, the order of falls, the order of
conversions, the health reading and the join over all four:

```ts
const assembly = windowAssemblyOf(window, context)
const funnels = windowFunnelsOf(window, assembly)
const { agenda } = windowAgendaOf(window, assembly, funnels, { at, foldsWithinMs })
```

### The thing the run found, which is why the unit was worth taking

0330 had rejected a home for that composition, and its reason was explicit:
*both of its inputs are one call with one argument, so there is nothing here a
caller can get wrong to be protected from.* That was true of two inputs. 0336
made it three, and the third needed a rung of its own.

Three parts of the hand-written line can now be wrong, and **one of them
reverses the answer rather than thinning it.** `collectionHealthOf`'s third
argument — what the deployment folds within, and when the reading is taken — is
optional, correctly, because a caller with no schedule to state should get a
reading that judges nothing. The composed line in the doc comment omitted it. I
expected that to cost a missing fault row. It costs more than that: a stalled
fold reaches **both** ranking keys (0336), so omitting the schedule leaves the
fall and the leak the stall manufactured **ranked**. The same window, read twice,
differing by one omitted argument:

| the schedule | `work` | the orders | `contested` |
| --- | --- | --- | --- |
| stated | `collection` | both withdrawn | the page |
| omitted | `page` | both ranked | empty |

So the composition as written sends an operator to rewrite a page whose numbers
are an artefact of its own stopped collection — the precise failure 0330 exists
to prevent, arriving through the one argument nothing reminds anybody of. On the
rung the schedule is required and may be `null`, so *this deployment states no
schedule* is a word a reviewer can read rather than a space where an argument is
not. That is the shape the region floor was given, for the same reason (0322).

The two readings are asserted side by side, and that is the test worth keeping
out of the fifteen.

## Decisions I took that were not specified

- **The funnel answers are handed in; the progress and health readings are
  made.** The rule, stated in the record so the next reading added to this rung
  does not re-derive it: *a reading with a published call of its own is handed
  in, and a reading that is one call over the assembly's own readings is made.*
  `windowFunnelsOf` exists precisely so that every side of every funnel
  comparison is the same object as the reading of that form, so answering the
  funnels again inside the rung would put two answers of one revision on one
  screen. The progress line is the hazardous one — the nearest line to hand maps
  a side of a library, which type-checks and silently drops a revision — so
  taking it as an argument would have preserved the hazard and kept none of the
  benefit.
- **All four readings are published, not only the join**, with the join's rows
  carrying the published rows by identity: `rows[0].conversion` *is*
  `conversion.ranked[0]`. Each of the four is separately drawn.
- **`collectionHealthOf` keeps its optional third argument.** Making it required
  is the only shape that closes the hole rather than narrowing it, and it costs
  every caller of a published reading — and every test in `health.test.ts` — a
  `null` it has nothing to say with, to protect a composition that has one
  caller. Filed as the stated limit rather than taken.
- **`DeploymentReadingContext` gains no fifth field.** The 29 October boundary
  entry suggested a `scheduleAt(at)` function on the context if a screen ever
  wanted health off it. The rung takes the whole schedule instead, which saves a
  caller nothing less and does not make every caller reading regions state a
  fold window. That entry is closed with an answer.
- **No fourth rung composing the three.** A caller wanting everything writes
  four lines. A single entry point over them would have to decide which of the
  forty-two readings a deployment wants by default, which is the policy decision
  0327 said made the honest version large and which no surface has asked for.
  Filed as a shape rather than built.
- **One doc-truth fix outside the unit.** `docs/signals.md` claimed the
  broadcaster costs **4.8 KB**; it costs 6,513 bytes, and has for weeks while
  every report of this lane printed the right figure. The table now carries the
  number *and the date it was measured on*, and no longer implies that
  `browser-weight.test.ts` guards a byte count — that test walks the import graph
  and fails on a package, which is a different and stronger promise.
  `browser-weight.test.ts`'s own comment said *it is 4.8 KB now* in the present
  tense and now says *it was 4.8 KB when that was fixed*, which is a claim about
  a record and cannot go stale.

## Records added

- **0343 — A deployment's fix-list is read off one window, and states its
  collection schedule or says it has none.** Accepted. Nothing is superseded;
  0330's decision stands and one premise of one of its rejected alternatives has
  changed, which the record states rather than editing anything.

## Findings filed and closed

**Closed:**

- the 29 October entry *the collection schedule is a fourth per-deployment
  setting and is deliberately not in the reading context* — the boundary holds,
  the shape it suggested is not needed, and the context is unchanged.

**Filed:**

- *the fix-list is one call now, and the argument it makes required is the one
  whose absence reverses its answer* — closed on filing, and carrying the general
  check: **every rung built over this subsystem has found a real defect in the
  composition it wrote down** (the region dedup on 28 October, two funnel answers
  of one revision on 1 November, and this). When a doc comment shows a caller a
  multi-call composition, the comment is a defect report about a missing unit.
- *`collectionHealthOf` keeps the optional argument the rung above it made
  required* — open, the stated limit of 0343, recommendation to leave it.
- *the three rungs over a window are three calls and nothing composes them* —
  open, a shape named so the next run does not build a fourth rung before a
  surface exists.
- *the plan's own browser-cost figure was a third out of date* — closed on
  filing, with the general shape: a number in prose is only safe where it can
  carry a date or a record.

## Test numbers

`pnpm install && pnpm verify` — **exit 0, nothing failed, nothing skipped and
nothing weakened.**

```
framework    253 test files   6,084 tests passed
application  388 test files   6,273 tests passed
findings     1,406 findings, 0 malformed
prerender    137 pages, 1,948 text junctions, 0 run together
```

The framework suite was 252 files and 6,069 tests on `main`; the difference is
this unit's one file and fifteen tests.

```
src/signals/window-agenda.test.ts    15 tests passed
```

One failure on the way, and it was my expectation rather than the code: I
asserted the stalled fixture would read `work: "both"` — a page to rewrite *and*
a measurement to repair. It reads `collection`, because a stalled fold spoils
both ranking keys and there is then no rank left standing to be evidence. The
test was corrected to assert what is true, and the fact it taught is now the
sharpest assertion in the file and the argument the record is built on. Nothing
was relaxed.

**Double-counting, tested.** Four assertions, since the lane's standing rule is
that anything which counts is tested against the case where it would
double-count: a window holding the same counters twice is one row in the
fix-list with `duplicated` nought on all four readings; a door row handed in
twice is **named** in `duplicatedRows` and the page is scaled by one row rather
than both, asserted against the same page read once; a page that both falls and
leaks is one row object in both orders and one entry in `work`, asserted by
identity; and `unpaired` is asserted nought on all three sides over a window of
two trees and two forms.

## Browser cost

**Nothing reaches a reader's browser.** `broadcast.ts` is untouched —
`git diff --name-only src/signals/broadcast.ts` is empty.

```
esbuild src/signals/broadcast.ts --bundle --minify --format=esm
6,513 bytes minified · 2,981 bytes gzipped
```

Byte-identical to yesterday's measurement. No payload field, no counter, no
column, no store method, no migration and no new kind. The whole unit is
interpretation of metadata the server already holds.

## Per-reader identity

No design choice here makes it more expensive to add later, and one of them makes
it slightly cheaper. The rung's unit is a page in all four readings and in the
join; nothing holds a reader, keys anything by a reader, or joins across page
views. The schedule it requires is per-deployment configuration and an instant,
neither of which is about a person. A per-reader funnel, if the gate and the
record ever arrive, would arrive as a different reading over the same assembly
and would inherit this rung's composition unchanged.

## Open questions

Nothing blocking. Two recommendations for the maintainer, carried into the pull
request comment:

1. **Whether `collectionHealthOf`'s third argument should become required and
   nullable too**, which is the only shape that closes the hole rather than
   narrowing it. My recommendation is to leave it: the one surface that will
   exist reads the rung, and narrowing the published reading costs every caller
   of it a `null` it has nothing to say with.
2. **Still nothing draws any of it.** Twenty-three runs old, `Loom portal`'s, and
   that lane is paused. The recommendation has not changed shape this run and is
   now shorter than it has ever been: the arrival standing, then
   `windowAgendaOf`, then `windowFiguresOf` — three calls, one of which is now
   the whole fix-list.
