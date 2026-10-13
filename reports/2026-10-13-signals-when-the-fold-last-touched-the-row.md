# Reader signals — when the fold last touched the row

**Routine:** `Loom signals` · **Date:** 2026-10-13 (evening run) · **Branch:**
`signals-29-when-the-fold-last-touched-the-row` · **Section:** §29 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

`loom_reader_page_views.folded_at` — one nullable timestamp written by the fold
and by nothing else — and the sixth collection fault it makes answerable:
`collection-stalled`, raised where page views are waiting to be folded and the
last fold of that revision is older than the schedule the deployment states.

This is **the finding this morning's run filed**, built with one change to the
shape it proposed. It is also the fault
[0271](../decisions/0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)
drafted and deliberately dropped twelve hours ago, with its own alternatives
section naming the column that would make it honest.

### Why the figure could not be judged before today

`pending` is openings no rollup has folded — *the other sign of the same
subtraction* (§8) — and §28 published it per page and across the deployment while
raising no fault from it. The reason is in one sentence: **`updated_at` is
written by both of the row's writers.** The door writes it on every delivery it
counts arrivals from, the rollup writes it on every fold, so the busiest stalled
deployment carries the freshest timestamp in the table and a quiet healthy page
looks stale by the same measure.

What that left was a deployment whose collection had genuinely stopped: every
count on every reader card frozen where it was while the door goes on counting
arrivals, every rate reading low by however much reading has happened since, and
the only person who can tell is one who already knows when the cron last ran.

### What it answers

`collectionHealthOf(readings, rows, schedule?)` now takes an optional
`CollectionSchedule` — the instant the reading is taken, and how long a fold may
honestly be behind — and answers *the collection of this page stopped nine hours
ago and a hundred and forty readers have arrived since*. `PageHealth.foldedAt`
publishes the fold's own age whether or not a schedule was handed in, and
`CollectionHealth.unattested` counts the waits nothing can judge.

It is the **twentieth** thing taken out of what this subsystem already knows
rather than collected, and the first of the twenty that needed a column — which
is why it is a record rather than one more reading. **Nothing was added to a
payload, a browser or the vocabulary of kinds**, and the broadcaster was not
touched: measured both sides and byte-identical.

## Decisions I took that the plan did not specify

Three calls were mine, and they are in
[0274](../decisions/0274-a-page-view-row-says-when-the-fold-last-touched-it-and-a-stall-is-judged-against-a-schedule-the-deployment-hands-in.md).

**The window is not what a caller hands in, and this is where I departed from
the filed shape.** The finding proposed firing where `foldedAt` is older than
*the window a caller hands in*. That would fault a healthy deployment. The
ripeness window is not the cadence: a batch is not folded until it ripens, and
then not until the next run, so a deployment folding hourly behind a ten-minute
window is perfectly sound with a fifty-minute-old fold and would have been
reported broken on every page it has. So the argument is `foldsWithinMs` — the
interval **plus** the window — and it is documented as that on the type, because
a number named after the window is a number somebody fills in with the window.

**Four states answer *not stalled* without anything being sound**, and each is a
refusal rather than an oversight: no schedule handed in; nothing pending, because
a collection that stopped where nobody is arriving is costing no reader's
measurement anything; no fold attested; and a `foldsWithinMs` that is not a
positive, finite number of milliseconds, since a nought allowance would turn the
lag the design *requires* into a fault on every live page. A fold timestamp ahead
of the instant handed in — two clocks disagreeing — answers *no* by the same
subtraction rather than by a case of its own.

**`unattested` is published and is not a fault.** A row written before the column
existed and a row no fold has touched are one state, *nothing attests a fold*,
and there is **no backfill**: the only timestamp those rows carry is the one this
record exists to refuse, and stamping it would report a stalled deployment as
freshly collected on the day it upgraded. So an upgraded deployment reports
`unattested` until its next collection run, and a surface is given the number
rather than being left to read *no fault* as *nothing is late*. It costs one run
of waiting for a number that means what it says.

## What the building found that the finding had not

**The two configuration faults cannot both be true of one revision**, and the
reason is arithmetic rather than policy: `drift` and `pending` are the two signs
of one subtraction (§8), so a revision whose appearances have outrun its openings
has nothing pending to be late. My first double-count test asserted
`counts-inflated` and `collection-stalled` on one page and failed, which is how I
found it. They are published adjacently because they fall to one hand — but as
**alternatives rather than an addition**, and a test pins that so a surface
drawing one configuration errand knows it prints one sentence and never two.

**A stall hides behind `openings-unmarked`.** A deployment whose senders never
mark an opening has nothing pending by construction, so its stall is invisible
until the door is counting again. The marker stays the first fault to fix and
first in the published order, and the module says why.

## Records added

[0274](../decisions/0274-a-page-view-row-says-when-the-fold-last-touched-it-and-a-stall-is-judged-against-a-schedule-the-deployment-hands-in.md)
— *A page-view row says when the fold last touched it, and a stall is judged
against a schedule the deployment hands in.* **Accepted**: it contradicts no
accepted record, needs no built code migrated, and does not touch the tree schema
or the delta model. It extends 0219's row and 0271's fault vocabulary, narrows
nothing, and supersedes nothing — 0271's refusal was *not until there is a second
timestamp*, and this is that timestamp.

**The number.** 0273 is the highest on `main`. The one open pull request, #566,
holds a record the merge routine has already said renumbers to 0252, so **0274**
clashes with nothing on any branch. `pnpm decisions:index` is regenerated and
clean.

## Findings filed and closed

**Closed, this lane's own:** *a stalled rollup cannot be told from a freshly
published revision* (filed this morning) — built as described, with the window
correction above recorded on the entry.

**Closed, this lane's own:** *a change to the words a kind of part says cannot be
read across two windows without 0239's intersection* — built as
`libraryCopyChangeOf` by #613, which landed today. It had stayed open because the
run that built it could not close it from its own branch.

**Filed for `Loom portal`:** the collection screen's four consequences — the
third argument is optional and the reading is unchanged without it, `foldedAt` is
the sentence to draw beside `pending`, `unattested` is the one state never to
draw as *nothing is late*, and the two configuration faults are alternatives. It
needs no new store read: the timestamp arrives on door rows a reader screen
already holds.

**Filed for `Loom daily build`:** a deployment can state its rollup window in
`LOOM_SIGNAL_WINDOW_MS` and has **nowhere at all** to state how often it folds.
`apps/loom/vercel.json` schedules nothing, so the cadence is not in this
repository in any form, and a portal screen therefore has one of the schedule's
two numbers. The shape is one operator-facing setting beside the window,
defaulted to nothing rather than to a number — absent, the stall stays unjudged
and `unattested` says so, which is the honest state.

## Test numbers, which are real

`pnpm verify` green end to end — build, typecheck, **4,978 runtime tests** across
221 files, findings and reports checks (1,191 findings, 0 malformed), **8,557 app
tests** across 445 files, and the prerender check (133 pages, 1,835 text
junctions, 0 run together). **Exit 0**, read out of a file rather than off a
pipe, per the merge-gate rule.

Nothing was skipped and no test was weakened.

| suite | tests | what moved |
| --- | --- | --- |
| `src/signals/health.test.ts` | **41**, up 15 | the stall, its four refusals, the boundary, the double count |
| `src/signals/memory.contract.test.ts` | **58**, up 5 | the five facts about which writer may touch the column |
| `src/signals/postgres.test.ts` | **69**, up 6 | the same five, plus the migration on a table that predates it |

The contract suite is where five of those tests live, which is the point: the two
store implementations are one store rather than two that happen to pass the same
tests. The facts it holds are that a door write attests no fold, that a fold
stamps the instant, that **an arrival landing after a fold leaves the stamp where
it was**, that a second fold moves it, and that a rollup reporting no window
attests nothing.

**The migration has a test of its own**, because this is the subsystem's first
column on live data: a `loom_reader_page_views` in the shape a deployment has
today is created by hand in PGlite, the DDL is run over it, the row reads back
with no fold attested, and the next fold fills it in.

### The five mutations I planted, and what caught them

| what I changed | what failed |
| --- | --- |
| the staleness comparison from `>` to `>=` | the boundary test — a fold exactly as old as the allowance is sound |
| an absent `foldedAt` read as the epoch rather than as *nothing attests a fold* | the upgraded-deployment test |
| `unattested` counting every pending row rather than the unjudgeable ones | the no-schedule test |
| the memory store stamping the fold on a door write | three contract tests, one of them the arrival-after-a-fold case |
| the Postgres door upsert adding `folded_at` to its `set` | the arrival-after-a-fold contract test, on Postgres |

Each was restored before the next was planted, and both stores are green on the
code as it stands.

## Browser byte cost

**Nothing was added that runs in a browser**, measured rather than assumed.
`src/signals/broadcast.ts` bundled with esbuild (minified, ESM, browser) from a
clean `git archive` of `origin/main` and from this working tree:

| | `origin/main` | this tree |
| --- | --- | --- |
| minified | **6,477 bytes** | **6,477 bytes** |
| gzipped | **2,935 bytes** | **2,935 bytes** |

`cmp` reports the two bundles byte-identical. Gzipped with `gzip -9 -n -c`, per
the standing note about the file name landing in the header.

## The double count, and the one shape it has here

0158's rule is that counting a window and forgetting it are one operation, so
every count is tested against the case where it would double. This change adds
one fault to a reading whose figures already add, so the double count available
is the one §28 guards — **a page counted once per fault it has** — now with a
sixth fault in it:

1. **A stalled page with an old sender** — two faults, one faulted page, its
   arrivals in `readersAffected` exactly once.
2. **Two stalled revisions of one tree** — two faults, two pages, one tree, both
   revisions' arrivals added, because a page view began on exactly one revision
   and was counted once at the door.
3. **The same stalled reading handed in twice** — dropped, counted in
   `duplicated`, the readers counted once, the fault counted once.
4. **An inflated revision** — asserted to carry `counts-inflated` and never
   `collection-stalled`, with `pending` nought, which is the exclusivity above.

The column itself cannot double anything: it is a timestamp, replaced rather than
added, and a fold writes it in the same transaction as the appearances it
explains.

## Open questions

Nothing blocking. Two calls worth overruling if you disagree:

1. **I made the schedule an argument rather than configuration this subsystem
   reads.** The alternative is an environment variable the framework reads
   itself, which would spare every caller the two numbers. I refused it because
   nothing in Loom schedules a fold — a host calls the collection from a cron, a
   deploy hook or by hand — so the framework would be reading a setting about
   somebody else's scheduler and defaulting it when absent, which is how a
   healthy deployment gets faulted. **Recommendation:** leave it an argument, and
   let the setting filed for `Loom daily build` be the thing an operator fills in.
2. **An upgraded deployment reports `unattested` rather than a fault for one
   collection run.** The alternative is backfilling `folded_at` from
   `updated_at` on the migration, which would make the fault available on the day
   of the upgrade — and would stamp a fold at the instant of the last *arrival*
   on every busy row, reporting a stalled deployment as freshly collected.
   **Recommendation:** leave it. One run of waiting is worth a number that means
   what it says.

## Not built, and deliberately

- **A fold timestamp on the tallies and the funnels.** The question is *has the
  fold stopped*, the door row is the one place both sides of it are already
  written down, and a timestamp on four tables is four places for them to
  disagree about when the last run was.
- **A default allowance.** See above; it is the one way this reading could be
  made to cry wolf on every page of a healthy deployment.
- **A stall judged against each page's own traffic** — faulting a page whose
  pending openings are a large share of its arrivals. The share is a fact about
  how busy the page has been since the last fold, so a quiet page unfolded for a
  week would read sound. Time is the discriminator.
- **Anything per reader.** Nothing here names a reader, a region or an address:
  the change is one timestamp about a *writer*, on a row that holds a tree, a
  revision and two counts.

## Does this make per-reader identity more expensive to add later?

No, and it is worth saying why this run touched the question at all: it is the
first change to a live reader table since the deferral. `folded_at` is a fact
about Loom's own collection process — when a rollup ran — and there is no reader,
no view key and no address anywhere near it. The row it sits on is still a tree,
a revision and two numbers, which is the narrowness §7 and §8 both argued for.

## Working beside the framework lane

`main` had not moved since this morning's merge of #626 when I fetched, and I
branched off it. **One pull request is open, #566**, which is the framework
lane's `analyzeDelta` vocabulary work; it touches nothing in `src/signals/` and
nothing was raced. The merge routine's own comment on it is waiting on the
maintainer for three strings of portal copy, and that is unrelated to this
branch.

`FINDINGS.md` was appended to, and the two entries I closed had their status
lines amended in place with the original status kept under them — nothing was
reflowed. `decisions/README.md` and
`apps/loom/app/(docs)/_lib/api/reference.generated.json` were regenerated rather
than hand-edited; the reference moved by exactly one export, which is
`CollectionSchedule`.
