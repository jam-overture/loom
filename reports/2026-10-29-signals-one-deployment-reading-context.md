# Reader signals — one context a deployment reads its own window with

**29 October 2026 (morning)** · `Loom signals` · branch
`signals-60-the-ceiling-the-buffer-keeps` · §61 of
[`docs/signals.md`](../docs/signals.md) · record
[0322](../decisions/0322-a-window-is-read-off-one-deployment-context-and-the-region-floor-is-not-optional.md)

## Before anything was built

**Two open pull requests, both this lane's, and no maintainer comment anywhere.**
Every comment on both is a routine's own — this lane's own summaries and the
Vercel bot's — so nothing outranked the queue. No review has been left on
either.

- **#721** — §60, record `0321`, *judge the published retention ceiling against
  the oldest delivery in the buffer*. Last night's run, cut from `main` at
  `3e6c147`, which is still where `main` is. Preview green.
- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October and skipped by the merge routine for the reason it exists. **Five
  days old now.**

**This work is a fourth commit on #721's branch rather than a new branch**, which
is step 3 of the procedure in [`docs/routines.md`](routines.md): a lane with an
open pull request pushes onto it instead of opening a second one. Both would have
appended a section to `docs/signals.md`, an entry to `FINDINGS.md` and a row to
the generated decisions index, and the cost of that lands on the maintainer at
merge time. `main` had not moved since the branch was cut and `Loom daily build`
has no branch open, so there was nothing to race on the signal path.

The record is **0322**: `main` holds up to 0320 and 0321 is claimed on this
branch already.

Eight open findings owned by this lane were read first. The oldest actionable one
was the work — three of the others are limits written down with nothing asked of
anybody, two are last night's and recommend leaving them, and one
(*a form that posts with `fetch` is invisible to the conversion counter*) is a
question for the maintainer before it is a unit.

## What I completed

**§61 / 0322 — a window is read off one deployment context, and the region floor
is not optional.**

The §51 rung turned a store into a question in three steps, and after §58 every
one of the thirty-eight readings and all nine comparisons was one call off a
window. What none of the three steps published is **the order they compose in**,
and what nothing in the types said is **whose number the region floor is.**

This lane filed the shape twice and said it would gather it on the third: the
floor as an argument (§54, 25 October), the placing as an argument (§58,
27 October), and on 28 October a third. Last night's entry rated the hazard mild,
because a caller that forgets one of these gets a weaker answer rather than a
wrong one.

**That is true of two of the three and not of the floor.** `regionFloorOf` is
raise-only, so a reading called with no floor suppresses at the smallest bucket
this runtime will ever name. A deployment that raised its floor to a hundred,
read by a surface that forgot the argument, publishes buckets of twenty-five
about real people — the one direction the whole region design exists to rule out
(0146) — silently, and in a diff indistinguishable from a caller that meant the
default. So the unit is not three conveniences gathered: it is one required
field, with the other three beside it.

### What is on the branch

`DeploymentReadingContext`, in `src/signals/window.ts`:

```ts
type DeploymentReadingContext = {
  readonly trees: RevisionTrees
  readonly declarations: PartDeclarations
  readonly floor: number
  readonly placings: FormPlacings
}
```

- **Four facts, one value**, all four the deployment's and none discoverable
  from a counter row — the line §7 of the plan draws.
- **The floor is required.** A caller with nothing of its own to say passes
  `DEFAULT_REGION_FLOOR` and has said so in a line a reviewer can read.
- **The floor is about the rows there are, not the switch as it stands.** This
  is the one place it differs from the notice beside it, and it took deciding. A
  notice is handed a floor only where a region is being read at all (0313),
  because a notice describes what is collected *now*. A reading is of rows
  already collected: a deployment that switched regions off yesterday still
  holds last week's buckets, and reading those at the runtime's minimum because
  nothing is being counted today publishes exactly what the floor prevents.
- **`windowAssemblyOf(window, context)`** returns the readings, the pairs and
  the two libraries, composed in the one correct order. The three steps stay
  published and separately callable; what is decided once is that the libraries
  take the pairs `windowPairsOf` produced rather than the pairs alone, that the
  door rows are the window's whole set on both sides, and that the floor reaches
  the regions through the readings.
- **Two of the three repeat counts are nought from here, by construction.**
  `windowReadingsOf` never produces two readings of one key and `windowPairsOf`
  files each form in exactly one list, so nothing the assembly hands on can put
  two readings of one form on one side of a library — the repeat that makes a
  page `ambiguous` to `pairedWindowOf` and takes it out of every figure while the
  counts above it look unchanged (0158). Both fields stay published, because they
  are not nought for the callers they exist for.
- **No figure added, and no single total of what was dropped.** The three
  `duplicated` counts are a count of region rows, a count of readings and a
  count of forms; `unjoined`, `unpaired` and `unplaced` are three reasons a page
  is absent from three different answers. A sum over them is a number in no unit
  at all, and the shortest route to a screen reporting *4 pages dropped* about
  one page.
- **The app half reads the one field only this deployment can answer.**
  `deploymentReadingContextOf` in
  [`reading.ts`](../apps/loom/app/_lib/reader-signals/reading.ts) is
  `deploymentNoticeOf`'s sibling: the floor comes from `readIntakeSettings`
  (0317), so a caller cannot hold a context for this deployment without having
  handed over the settings it came from, and a screen cannot type a bucket size
  at all.

## Decisions I took that were not specified

**The floor is required rather than defaulted.** The alternative was to gather
the three arguments and keep them optional, which is what the filing entry
described. It would have been a smaller diff and it would have left the one
hazard that matters exactly where it was.

**The context does not hold the collection schedule**, which is the fourth
argument of the same family. Its configuration half is per-deployment and is the
number §59 already derives; its other half is `at`, the instant the reading is
taken, and a context holding a clock reading would answer differently on two
calls over one window. Filed, with the shape that costs nothing if it is ever
wanted (a `scheduleAt(at)` function on the context rather than a field), and the
general rule it leaves behind: a per-deployment fact belongs in a context and an
instant never does.

**`windowReadingsOf` keeps its optional options argument**, so the floor hazard
is still reachable a step below the assembly. Narrowing it would cost every
caller — including every test in `window.test.ts` — an argument it has nothing to
say with, for a hazard the shortest route no longer has. Filed with both shapes
and a recommendation to leave it.

**The app half has no caller yet**, as the rest of this rung has none. It is
five lines and it is tested; the alternative was to leave the floor as a number a
future screen types, which is the thing the record is about.

## Records

- **0322** — *A window is read off one deployment context, and the region floor
  is not optional.* `Accepted`. Nothing superseded: 0309, 0318 and 0319 decided
  what they decided about the three steps, and this adds the fourth and makes one
  of their arguments required. Six alternatives recorded, including the two the
  finding costed and the three-state floor that would have been a second spelling
  of a state the app already publishes.

## Findings

**Closed:** the 28 October entry *three deployment settings are now handed into
reading calls one at a time, and a third of them makes it a pattern* — taken as
the gathering it asked about, with its own reading of the hazard corrected in the
closing note.

**Filed:**

1. **The collection schedule is a fourth per-deployment setting and is
   deliberately not in the context**, because its other half is an instant. With
   the shape to take if a screen ever wants collection health off the same
   context, and the rule for whatever arrives next.
2. **The reading context makes the safe route the shortest one, and the unsafe
   one is still reachable a step below it.** Two shapes costed, recommendation to
   leave it.

## Test numbers

`pnpm install && pnpm verify` **green, EXIT=0**, read from `verify.exit` which
the gate wrote as a separate command, per `docs/routines.md`.

| | |
| --- | --- |
| Root suite | 241 files, **5,840 tests**, all passing |
| App suite | 373 files, **6,753 tests**, all passing |
| `src/signals/` | 50 files, **1,709 tests** (was 50 files, 1,699) |
| `src/signals/window.test.ts` | 89 → **99** |
| `apps/loom/app/_lib/reader-signals/` | 15 files, **186 tests** (was 14 files, 180) |
| `apps/loom/app/_lib/reader-signals/reading.test.ts` | new, **6 tests** |
| New cases | **16** — 10 in the package, 6 in the app |
| Findings ledger | 1,349 entries, 0 malformed |

**Nothing failed and nothing was skipped.** No test that was on `main` or on this
branch was changed, weakened or removed — this unit adds a type and a
composition, and every existing signature it builds on is unchanged, so nothing
existing had a fixture to update.

**Two red test runs of my own new cases, before anything was committed.** Both
were wrong expectations about the functions under the composition rather than
faults in it: a placing keyed on `DEFAULT_AUDIENCE_ID` where a hand-built row
names no form at all (the key is `null`, and only a row written through the store
carries the default), and `viewsWas`/`viewsNow` on a reach comparison that
publishes `arrivalsWas`/`arrivalsNow`. Both fixed in the test, neither by
weakening an assertion.

### Mutation testing: MUTANTS planted, DEAD dead, EQUIV equivalent

MUTANT_TABLE

**The double-count case, per this lane's standing rule.** This unit adds no
figure, so the way it would be wrong is handing something on twice. Two cases
cover it: a window holding two forms of one page across two revisions plus a
third page placed `unchanged` — where every library side is asserted to name each
form exactly once, and both `duplicated` counts to be nought — and a window whose
region rows repeat one bucket key, where the repeat is counted once, reported as
one, and does not move either of the other two counts. The second is the one
`duplicated` that can be other than nought from here, because it is a repeat in
the rows a caller was handed rather than one the assembly made.

**Browser cost: nothing.** `broadcast.ts` is byte-identical to `main` — `git
diff` against `origin/main` on that file is empty — and the bundle measures
**6,513 bytes** minified, the same number as the last six runs.
`browser-weight.test.ts` still reports no package in the broadcaster's import
graph. `window.ts` and `reading.ts` are server-side and reach no browser. **No
payload field, no column, no migration, no store method and no new kind.**

## Open questions

**Nothing blocking.** Four, and three are not new.

1. **#706 / `0308`** is five days old and unchanged: one reading of one clause,
   one member on two unions, one line in a switch. Recommendation: read it and
   say yes or no — it is the cheapest it will ever be, and it is the only thing
   holding that branch.
2. **`LOOM_SIGNAL_SWEEP_MS` is unset on this deployment**, so its notice
   publishes the weaker sentence and §60's verdict reads `unpromised` on every
   run. Recommendation: set it to the cron's real interval when the cron is
   scheduled — one environment variable, and the same number the stall check
   wants.
3. **Still nothing draws any of this**, fourteen runs running. Thirty-eight
   readings, nine comparisons, a publishable disclosure, a verdict on that
   disclosure, and now one call and one context that reach all of them — and not
   one of them is on a screen. `Loom portal` is paused, so this is the
   maintainer's rather than a lane's.
4. **Whether a fifth per-deployment argument should pull the schedule in.**
   Filed, not built. Recommendation: leave it until something draws collection
   health; the shape is written down and costs one function on the context.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later, and nothing
was built toward it.** The context holds a deployment's configuration and not one
fact about a person: four facts, of which the only one with a reader anywhere
near it is a floor whose purpose is to make a bucket unattributable. If identity
ever returns as an opt-in, what a reading would need is a per-reader recorded
decision, which is not a per-deployment value and would not live here — and a
reading path that already takes its deployment's own privacy configuration as a
required argument is a better place to add *and this is the decision that allowed
it* than one where the configuration was optional.
