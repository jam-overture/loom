# Reader signals — the three readings a caller had to know existed

**31 October 2026 (evening)** · `Loom signals` · branch
`signals-66-the-second-rung` · §66 of [`docs/signals.md`](../docs/signals.md) ·
record
[0327](../decisions/0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)

## Before anything was built

**One open pull request and no maintainer comment anywhere.** Every non-bot
comment on it is a routine's own summary, so nothing outranked the queue and no
review has been left.

- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October, correctly skipped by the merge routine for the reason it exists.
  **Seven days old**, and still the only thing holding that branch.

**#728 and #729 both landed**, so `main` now holds `0326` and the tip has moved
three commits past this morning's run. `Loom daily build` has **no branch
open**, so nothing was racing the signal path. This work is a new branch off
`main`; the record is **0327**, the next number free on `main`.

### This is the work the last two runs asked for, and it could not have been done this morning

The 30 October finding asks a future run to take `regionPagesOf`,
`silenceCensusOf` and `libraryPaceOf` into **one second rung** rather than
adding any of them individually. The 31 October morning run read that first and
could not do it: `libraryPaceOf` existed only on #728's branch, so the rung
would have covered two of three. #728 has since merged. All three are on `main`,
the unit could be one, and that is what this is.

Ten other open findings owned by this lane were read. The two that close here
are the two about this rung; the remaining eight are limits written down with a
recommendation to leave them, or wait on a screen.

## What I completed

**`windowFiguresOf`** — `src/signals/window-figures.ts`, 22 tests in
`window-figures.test.ts`, exported from `src/signals/index.ts`. Plus
**`distinctRegionRows`**, published from `src/signals/window.ts`, with 5 tests
added to `window.test.ts`.

```ts
const assembly = windowAssemblyOf(window, context)
const figures = windowFiguresOf(window, assembly, context)
```

### What was wrong, and one third of it was a defect

[0322](../decisions/0322-a-window-is-read-off-one-deployment-context-and-the-region-floor-is-not-optional.md)
built the rung between a store and a question, and after it **forty of the
forty-two readings are one call with one argument.** Three were not, and each
was filed as a gap on the day it was built. What they share is not that the
assembly forgot them — the assembly publishes subjects and deliberately
publishes no figures, and all three of these are figures. What they share is
that **each needs something the assembly does not publish**, so each has a
composition a caller has to get right:

```ts
// All three of these compile, run, and are wrong without saying so.
regionPagesOf(window.regions ?? [], { floor: DEFAULT_REGION_FLOOR })
libraryPaceOf(libraries.now.readings, window.pageViews)
silenceCensusOf(/* whatever the caller happens to have mapped */)
```

**The region line has three faults in it, and the third is a real defect.**
`?? []` collapses two sentences 0240 and 0309 keep apart. The floor is a number
typed at the call site rather than the deployment's. And the rows go over as
they came — `regionPagesOf` has **never** deduplicated them, because it was
written to take whatever rows a caller chose, while `windowRegionsOf` always
has.

So a window holding one bucket twice produces **two readerships of one window**:
the assembly's map with the bucket once, the breakdown with it twice. And the
doubled one is the dangerous half, because a doubled bucket **clears a floor it
should not have cleared** — the floor exists so a place with too few readers in
it is not named (0146), and the reading then answers *which pages the readers of
this place read* about a place that should have been withheld. Nothing failed,
because both spellings are right about the rows each was written for.

**The pace line drops two thirds of the evidence.** Every other reading of a
kind takes `libraries.was` or `libraries.now`, so the nearest line to hand is a
library side — which holds one reading per form, dropping the earlier revision
of every page revised inside the window and every form the placings could not
place. In this report's own fixture that is three readings against one on each
side with a third on neither. `libraryPaceOf` is a reading rather than a
comparison, so its evidence is every reading the window holds.

**The census line has no obvious spelling at all**, which is exactly how it was
filed: *nothing reminds a caller the census exists*.

## Decisions I took that were not specified

**The three are picked by a rule, not by taste.** The 30 October finding warned
that the honest version of this rung is large, because it has to decide which of
forty-two readings a deployment wants by default. **It does not, and that is the
decision.** What this takes is every figure that is *not* one call on a subject
the assembly publishes — which is these three and no others, and which is the
same fact that orphaned them. A reading that is one call on a `PageReading`, a
pair or a library stays the caller's.

**`distinctRegionRows` is published from `window.ts` rather than pushed into
`regionPagesOf`.** Making the reading deduplicate internally would change a
published reading's behaviour for a caller that chose its rows deliberately, and
would put one counting rule in two modules. Publishing it puts it in one, and
both callers now use it — which is the fix 0265's module made for the door's
scaling rule a day earlier, applied to this one. The cost is a second linear
pass over the rows, which rule 4 allows where a second spelling of a counting
rule does not.

**The window and the context are handed in again** rather than carried on the
assembly. Two of the three readings are of *rows* the assembly deliberately does
not republish, and the floor has to be the one the assembly's own maps were read
at — a number typed at this call site can differ from the assembly's, and then
one window has two readerships for a second reason. Both are arguments the
caller passed one line above, so nothing is gone looking for. I rejected taking
the window alone and assembling inside: a caller that already holds an assembly
would compute it twice, and the claim this makes is that it is the step *after*
the assembly rather than a second spelling of it.

**The census is over the caller's entries plus the pace's own rows, and the list
is published beside it.** A census's denominator is *the readings somebody is
looking at*, and a rung cannot know what a surface draws — so the caller chooses
by what it hands in, and `census.readings === silences.length` is published as an
identity rather than described. The caller's entries come **first**, so where one
state is reported by both it keeps the caller's vocabulary, which is 0324's rule
and the right way round because the caller's readings are the ones on the screen.
I rejected publishing the entries and taking no census, which leaves the orphan
where it was, and taking the census over the pace's rows alone, which is a
census of five rows.

**Each kind row is attributed to no page.** A `KindPace` row with no pace is an
answer about a kind, a kind is not a page, and putting it on a form would be the
guess 0324 refused. So the rung's own entries land in `census.wide` and never in
a `byForm` row.

**`arrivalStandingOf` is not a fourth member**, which upholds this morning's
finding rather than revisiting it. Carrying its result through would add no
figure and would make `WindowFigures` generic in a deployment's refusal reasons
for one passthrough field. A surface that wants both calls both.

## Records added

- [**0327**](../decisions/0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)
  — *The figures a window holds about itself are a second rung, and a region row
  set is deduplicated once.* **Accepted.** It contradicts no record, adds no
  field to the tree schema or the delta model, and nothing in it needs built code
  migrated, so there was nothing to escalate. Nine alternatives recorded,
  including adding the three to `WindowAssembly`, a rung that computes every
  reading, making `regionPagesOf` deduplicate internally, and carrying the
  arrival standing as a fourth field.

## Findings filed and closed

**Two closed, three filed.**

**Closed**, both by this branch:

1. *A third reading now hangs off the window assembly without being in it*
   (30 October) — the rung exists.
2. *The second rung cannot be built today, because its third member is not on
   `main`* (31 October morning) — #728 landed.

**Filed:**

1. **Owned by this lane** — the closure entry, which carries the part worth
   keeping: the 30 October finding said nothing was broken and no test was
   failing. Two of its three claims were true. **The third was not**, and the
   defect was only visible from the line that calls both readings. *A composition
   nobody has written down is a rule nobody has compared* — the second time this
   week a rule written twice was the defect.
2. **Owned by this lane** — *the rung publishes no census a screen can use on
   its own*, which is the stated limit of 0327 rather than a gap.
   **Recommendation: leave it, and when a screen exists have the screen hand in
   the silences of the readings it drew.** What a future run must not do is give
   the rung a default set of readings to be a census over; that is the surface's
   choice wearing the framework's name.
3. **Owned by `Loom portal`** — *nineteen runs and nothing draws any of it*,
   restated because the ask is now **smaller**: one call gets the regions by
   page, the pace by kind and the census, where before it was three calls and
   knowing which rows each was entitled to. **Recommendation unchanged: the
   arrival standing first**, then `windowFiguresOf`.

## Test numbers

`pnpm verify` **green**, every stage: `build`, `typecheck`, `test`,
`findings:check`, `reports:check`, the app's own `verify`, and
`prerender:check`.

- **5,978 tests in 246 files** in the root suite, all passing, and **6,867 in
  380 files** in the app's own. `findings:check` reads 1,378 findings with none
  malformed; `reports:check` reads 2,032 visuals at 144.6MB with none over the
  cap; `prerender:check` reads 137 pages with 1,945 text junctions and 0 run
  together.
- **27 new tests**: 22 in `window-figures.test.ts`, in four groups — the three
  figures off one call, the regions a caller reaching past this would read
  wrongly, the pace over the window's readings rather than a library side, and
  the census; and 5 in `window.test.ts` for `distinctRegionRows`.
- **Nothing was skipped and nothing was weakened.** No existing test changed its
  expectations. `window.ts` is refactored rather than altered — `regionGroupsOf`
  now calls the published rule instead of inlining it, and its 104 tests pass
  unchanged.

**One failure on the way, and it was the right one.** The app's
`offered.test.ts` failed with *`@jam-overture/loom/signals` hands back a function
called `windowFiguresOf` and no page on this site mentions it. Something is
published that a reader has no way to find.* — for both new exports, plus
`extract.test.ts` on the generated reference's drift. Fixed by
`pnpm --filter @loom/app docs:api`, which is the regeneration those checks exist
to demand; both pass.

### Seventeen mutants planted, seventeen dead

Run **after** the commit, per the 27 October finding that mutation testing
before a commit is how a run loses the work it is testing. `git status` was
clean before and after.

**The region figure, which is where the defect was:** the two region states
collapsed with `?? []`; the rows handed over as they came, undeduplicated; and a
floor typed at the call site rather than the deployment's.

**The pace:** a library side instead of the window's readings, and the door rows
dropped so nothing is scaled.

**The census:** the rung's own entries put before the caller's; the role rows
left out of the entries; a kind row that answered reported as silent; the census
taken over the caller's entries alone; and the published list narrowed to the
caller's, which breaks the `readings === silences.length` identity.

**`distinctRegionRows`:** the place dropped from the key so two places are one
row; the form dropped so two audiences are one row; the kept rows reversed; a
dropped row not counted in `duplicated`; the last row of a repeated bucket kept
instead of the first; and the window's own repeat count silenced.

**One kill is weaker than it looks and is worth saying so.** The mutant that
attributes a kind row to `form: undefined` rather than `form: null` dies on the
**published entry's shape** and not on a figure: `silenceCensusOf` reads
`reading.form ?? null`, so the two behave identically inside the census. The
contract it holds is that the list this publishes says what it means, which is
worth holding — but it is not evidence that the attribution rule is tested, and
the test that *is* evidence for that is `census.byForm` being empty while
`census.wide.readings` is the whole list.



## Browser cost: nothing

**`broadcast.ts` is byte-identical to `main`** — `git diff origin/main` on that
file is empty — and the bundle measures **6,513 bytes** minified, the same
number as the last ten runs. `browser-weight.test.ts` still reports no package
in the broadcaster's import graph.

`window-figures.ts` is server-side, imports four sibling modules, and reaches no
store, no clock and no DOM. It calls three published readings and adds no
arithmetic of its own. **No payload field, no column, no migration, no store
method and no new kind.**

## Open questions

**Nothing blocking.** Four, and three are not new.

1. **#706 / `0308` is seven days old.** One reading of one clause, one member on
   two unions, one line in a switch, and the merge routine correctly skips a pull
   request carrying a `Proposed` architectural record. **Recommendation: read it
   and say yes or no.** If you would rather the two states stayed merged, say so
   and the finding closes as settled.
2. **Nineteen runs with nothing drawing any of it**, and the rung makes the
   screen cheaper rather than larger. **Recommendation: when the portal
   unpauses, the arrival standing first** — one line above two boxes it already
   draws, and the line that explains why every other screen is empty — then this
   rung's three figures, which are now one call.
3. **`LOOM_SIGNAL_SWEEP_MS` is still unset on this deployment**, so the retention
   notice publishes the weaker sentence and §60's verdict reads `unpromised`
   every run. **Recommendation: set it to the cron's real interval when the cron
   is scheduled.**
4. **Whether a third rung is wanted at all.** This one takes three figures
   because three had a composition to get wrong. The other thirty-nine do not,
   so there is nothing to protect them from — but a surface still has to write
   out thirty-nine calls, and a *default set* would be a product decision about
   what a deployment sees when it opens the portal. **Recommendation: leave it
   until the portal exists and says which it draws**, and do not let a framework
   module pick for it.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later, and
nothing was built toward it.** The rung's finest grain is **a page in one form**,
which is the assembly's grain unchanged, and its coarsest is a kind of part
across the whole library. There is no reader in it at any point, and nothing it
publishes is keyed by anything a browser sent.

The one thing worth knowing if that door is ever opened: the region figure is
the only one of the three that touches anything derived from a request, and the
rule this run published is a **deduplication** of buckets rather than a join of
them — it drops a repeated row and never merges two places, two revisions or two
forms into one. A later opt-in that wanted a reader counted once across page
views would be a different key in a different table, and nothing here would have
to move.
