# 24 October 2026 — from a store to a question, which is the rung this lane never built

**Routine:** `Loom signals` · **Branch:**
`signals-50-a-comparison-of-two-populations-is-not-a-window-nobody-read` (#700)
· **Section:** §51

## Before anything was built

**Two pull requests open, and one of them is this lane's.** **#700** is last
night's run — 0307 taken, 0308 `Proposed`, §50 — green, based on `origin/main`
at `3547af0`, which is still `origin/main`'s head. **#694** is the maintainer's
own (sign-up, sign-in, password reset) and touches nothing under `src/signals/`
or `apps/loom/app/_lib/reader-signals/`. The framework lane has no branch open,
so there was nothing to race on the signal path.

**No maintainer comment anywhere**, on either pull request, and no review
comment of any kind. The only comment on #700 is this lane's own from last
night, which is not input. So nothing outranked the queue.

**#700 is unmerged, so this unit is on that branch** rather than on a second
one, which is what `docs/routines.md` step 3 says to do: two open branches from
one lane touching one file is a conflict the lane creates for itself.

**What the queue said.** Last night's comment put two questions to the
maintainer and said what this lane would do without an answer: resume the plan,
*and*, failing an unpaused portal, "spend a run building one read-only route
over the aggregates rather than add a thirty-ninth reading — a counter nobody
can phrase a question against is not finished." No answer arrived and the portal
routine is still paused, so that is what this run did, with one change of shape
explained below. 0308 stays `Proposed` and unbuilt: it is the maintainer's to
accept.

## The plain version

**There are thirty-eight readings and there was nothing that turned a store into
one.** Every one of them is a pure function of a `PageReading`, or of a list of
them, or of two held against each other — and the step from *the rows a
deployment's store holds* to *a `PageReading`* had never been written. I checked
before building rather than assuming: the only callers of `store.tallies()`
anywhere in the repository are the store contract tests, and the portal has both
store handles wired up in `(portal)/_lib/reader-signals.ts` and reads neither.

So the aggregates were askable in principle and unaskable in practice, and the
missing thing was not a screen. It was the rung under the screen, and five rules
a first consumer would have had to find for itself:

1. four row sets, from two stores, one of which may not be configured;
2. a tree and a registry per revision the rows name — and a revision may be
   named by a door row with no counters at all, which is the difference between
   *nobody read this* and *nothing has counted this yet*;
3. the rows have to be sliced **before** the join, because `pageReadingOf`
   counts a whole window's worth of other pages as `foreign` rather than
   refusing it;
4. a window holding two audiences at one revision is read as **neither** (0300),
   so a deployment serving two forms of a page gets an empty screen unless the
   caller splits first;
5. 0290 clause 2 says in as many words that splitting is the caller's, and
   published `byAudience` for it — and nothing was that caller.

## The unit

Taken as
[0309](../decisions/0309-a-window-of-counters-is-read-into-the-readings-it-holds-and-the-trees-stay-the-callers.md),
planned as §51. One new module, [`src/signals/window.ts`](../src/signals/window.ts),
and one line in the entry point. **Nothing else in the subsystem was touched.**

```ts
const window = await readReaderWindow({ tallies: store, regions: regionStore })
if (!window.ok) return window
const { pages, unjoined } = windowReadingsOf(window.value, treesIn(trees), registry)
const order = deploymentReadingOf(pages.map(readingProgressOf), window.value.pageViews)
```

- **One read with one scope.** The four row sets are read together with the
  stores' own `TallyReadRequest` passed to each unchanged, and **the first
  failure is the answer**: a window half of whose rows arrived is a reading whose
  rate has a denominator from one read and a numerator from another, and the
  figures would look plausible.
- **An absent region store is not an empty map.** `regions` is `undefined` for
  *no store was offered*, `[]` for *the store holds none*. The second time in
  two runs this lane has had to keep two kinds of nothing apart.
- **The revisions come off all four row sets**, so the page whose readers
  arrived and whose window no rollup has folded is in the answer rather than
  missing from it.
- **The trees stay the caller's**, through a one-method `RevisionTrees` shaped like
  the registry declarations (0114, 0122), with `treesIn` for a caller that
  already holds a list. This lane holds counters, not pages; resolving them here
  would point the reading path at another lane's store for a lookup the caller
  does better.
- **A revision that cannot be joined is published with the rows it left
  unread.** `no-tree` is ordinary — counters outlive revisions — and dropping it
  silently under-reports a deployment. `mismatched`, a source answering with
  another page or revision, is **refused rather than read**: counters against
  the wrong revision's tree answer every question with confident nonsense,
  because the node ids line up often enough to look right.
- **A window of two forms is split into two readings rather than read as
  neither**, which is 0290 clause 2 carried out rather than reversed. One
  reading per page, per revision, per form; no two share a `readingKeyOf`; and
  `foreign` is nought on every reading this produces, because each is handed its
  own revision's rows and told which form to read — while `audiences` still
  names both forms and `otherAudience` counts the other one's rows.
- **It adds no figure of its own.** No count, no sum, no quotient, no silence
  set, no member of any closed set a batch can reach. The census is
  `audiencesIn`, the duplicate rule is `readingKeyOf`, the population answer is
  `audienceScopeOf` inside the join, and the join is `pageReadingOf` unchanged.

## Decisions I took that were not specified

- **A rung, not a route.** The comment's own words were "one read-only route
  over the aggregates", and what I built is the module such a route would have
  been nine tenths of. A route needs a deployment-scoped identity to answer on,
  and that identity is the portal's session, which is another lane's; a route
  written here would either invent an auth story or borrow one. The module is
  the part that is unambiguously this lane's, it is what the portal screen needs
  anyway, and the finding filed against `Loom portal` is now four function calls
  rather than an open design. If the maintainer would rather have the HTTP
  surface too, it is a small unit on top of this one and I will take it next
  run.
- **The trees are an argument rather than a lookup.** Stated as a decision
  because it is the one that constrains callers: everyone who uses this has to
  resolve revisions themselves. The alternative pointed `src/signals/` at the
  tree store and made every test of this module need one.
- **`mismatched` refuses rather than reports.** A reading published against the
  wrong tree would be plausible on screen, and `foreign` would then be reporting
  a fault the caller could have refused one rung earlier.
- **A repeated node row is left for the join to report.** It lands in
  `duplicated` and is counted once; a rung that quietly merged duplicates would
  take away the only sign that a store or a rollup is writing a node twice
  (0158).
- **The grouping is one pass per row set**, not a walk of the window per
  revision. A window is the nodes of every revision a deployment keeps counters
  for, so the quadratic version would have been the largest input in the
  subsystem times the number of pages — rule 4's shape, which took 314 ms on a
  6,000-node page the last time this subsystem had it.
- **I numbered the record 0309.** `main` carries up to 0306 and this branch holds
  0307 and 0308, so 0309 is the next number free to it.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit code 0** through every stage:
build, typecheck, the root suite, `findings:check`, `reports:check`, the app's
own verify and `prerender:check`. Nothing skipped, nothing weakened.

| suite | files | tests |
| --- | --- | --- |
| root (`vitest run`) | 238 | **5,709** |
| the app's own | 351 | **6,274** |
| `src/signals/` alone | 47 | **1,578** |

`window.test.ts` is new at **44**, and that is the whole difference: root was
237 files and 5,665 tests last night, the app's suite is unchanged at 6,274, and
no existing suite gained or lost a case, because no existing module was touched.

**Three reds on the way, all mine and all caught before the push.**

- `src/documentation.test.ts` failed on *never makes a decision-record number
  part of a published sentence*: one comment read "the mistake 0290 found in the
  region map" rather than lifting the citation into brackets. The maintainer's
  rule about the published reference, enforced by a test, working exactly as
  intended.
- **A published name collided**, and the repository caught it rather than me.
  The source of trees was first called `TreeSource`, and the package already
  publishes that name from the react door — an interface that loads a tree for a
  render. `app/(docs)/_lib/api/extract.test.ts` fails on a second collision by
  design: it asserts that the one name in the reference meaning two things is
  "rare rather than decorative". It is `RevisionTrees` now, which also says what
  it is keyed by. The generated reference was regenerated with
  `pnpm --filter @loom/app docs:api`, not edited.
- A cast in my own fixtures hid a type error. `region: "FR"` is not a
  `ReaderRegion`, and `as StoredRegionCount` over the whole literal swallowed
  it — the suite was green and `tsc` was not. The fixtures now annotate the
  stored type with its audience column omitted and cast only that column, so a
  field they get wrong is a type error. That is the shape worth keeping: a cast
  narrow enough to say what it is for.

### The planted mutations

Ten, each reverted after measuring, over the 44 tests of the new suite.

| what I broke | tests that failed |
| --- | --- |
| the whole window handed to each reading instead of its revision's rows | **4** |
| the forms not split, every revision read as one | **8** |
| the form census taken over the counters alone | **3** |
| a revision with no tree dropped silently | **3** |
| the revisions taken from the counters alone | **3** |
| a tree of another revision accepted as the one asked for | **2** |
| a half-read window served anyway | **2** |
| an absent region store answered as an empty map | **1** |
| the last of two trees at one revision winning | **1** |
| a repeated node row dropped before the join rather than reported by it | **1** |

No survivors. (Most also produced an unused-variable type error, which is an
artefact of cutting code out rather than a second signal; the test counts are
the measurement.)

The two rows the standards ask for by name are the first and the last. **The
double-count available to this rung is a reading produced twice** — the readings
above it sum across the list, so one page counted twice is 0158-permanent in
whatever it is summed into. Four tests catch the slice being wrong and one
catches a repeat being folded away before the join can report it, and the
strongest of them is not about any single case: it asserts that no two readings
a window produces share a `readingKeyOf`, over a window with two pages, two
revisions and two forms.

## Nothing reaches a reader

No payload field, no browser code, no column, no store method, no new kind and
no new member of any closed set reachable from a batch. `broadcast.ts` is
**byte-identical to `origin/main`** and measures **6,513 bytes minified**
(esbuild, bundled, browser platform, ESM) — the same figure as the last two
runs. The new module reaches no package and nothing in the broadcaster's import
graph reaches it, so rule 4's budget is untouched and `browser-weight.test.ts`
passes.

This is the thirty-eighth thing taken out of what this subsystem already knows
rather than collected — and the first that makes the previous thirty-seven
reachable from a store.

**Nothing here makes per-reader identity cheaper or dearer to add later.** The
window is rows the store already keeps, and the split is by the column it
already carries; an identified window, if one ever came, would be read by the
same function and split by the same key.

## Findings

Two filed, none closed.

- **filed, `Loom portal`:** *the rung from a store to a reading exists, so a
  reader screen is four lines.* The entry carries the four calls, against the
  handles that module already builds, and the three states a screen has to draw
  that are not figures: `unjoined`, the tree lookup, and the region map's
  `undefined`. Filed against a paused routine, which still waits — the reason to
  file it anyway is that the work changed shape, from *design a reading screen*
  to *call four functions and draw three states*.
- **filed, this lane:** *the region map is the one reading the new rung leaves a
  caller to assemble.* The region rows ride on the window and are counted in the
  form census, and no map is joined out of them, because `regionReadingOf` takes
  a floor and the floor is per-deployment configuration (§7) that this rung does
  not hold. It leaves one reading reachable in two steps where the others are
  reachable in one, and the second step has a rule in it. Named at the moment it
  was created, with the two shapes it could take and which one I would pick.

## Open questions

Three, each with a recommendation, none blocking. They are in the pull request
comment. The oldest is **nothing draws any of this**, now six runs old — and
materially smaller than it was this morning.

## What the merge has to deal with

One branch, three units on it (§50 from last night, 0307 and 0308; §51 from this
run). `origin/main` has not moved since the branch was cut, so **nothing was
merged in and there was no conflict anywhere in the run**. `decisions/README.md`
and the generated API reference were regenerated with the repository's own
tooling rather than hand-resolved. `FINDINGS.md` was appended to and nothing in
it was reflowed.

Preview: <https://loom-git-signals-50-a-compar-307c71-jpizzolato36-6341s-projects.vercel.app>
— quoted from Vercel's own comment on #700, which is where the per-deployment
links are. Nothing in this unit draws a screen, so it is the branch deployed
rather than something to look at; the egress policy for this session refuses
that host, so the URL is not checked from here.
