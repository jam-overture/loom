# Reader signals — whether what a deployment collects can be trusted

**Routine:** `Loom signals` · **Date:** 2026-10-13 (morning run) · **Branch:**
`signals-21-the-faults-in-a-deployments-own-collection` · **Section:** §28 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

`collectionHealthOf(readings, rows)` in
[`src/signals/health.ts`](../src/signals/health.ts): *the measurement of eleven
hundred of your readers is wrong, here is where, and here is whose it is.*

It is the **nineteenth** thing taken out of what this subsystem already knows
rather than collected. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary of kinds**, and the broadcaster was not touched —
measured both sides and byte-identical.

### The question nothing inside this subsystem could be asked

Twenty-seven readings answer questions about readers. Each one publishes, beside
its answer, the closed set of reasons the answer may be absent, and §17 maps
twelve such vocabularies onto twelve conditions and four subjects so a card
drawing two readings can tell one state from two.

**Three of those reasons are not quiet windows. They are faults in what the
deployment is collecting, and each was written down where it was found and
nowhere a person would look.**

- §11 named `unopened` — senders that never mark an opening, with the symptom
  spelled out in the record: *every rate denominator-less while the counters look
  healthy, and nothing else here would say so.*
- §18 named `unwalked` — a page readers act on, every band reading *untouched*,
  every share a nought, and the counters again looking healthy.
- §8 turned the straddle from a bound into a measurement, and past a point it is
  not an error to correct but a rollup window shorter than the visits it
  measures, with every count on every card half again the truth.

All three are published per page, on the screens a person opens to look at
**readers**. So a deployment with forty pages and one of them served by an old
broadcaster had no way to be told: it would have to ask a question about reading,
on that page, and notice that the answer was missing. The fault is not in any one
figure — it is in the collection, and nothing in this subsystem was about the
collection.

Two more faults have the same property and belong to the **caller**: counters
filed under a tree that does not contain the nodes they name, which leaves most
parts reading `skipped` while the numbers stay plausible, and two reads
concatenated into one, which neither sums nor overwrites honestly. Both are
reported today by the reading that notices them and by nothing anybody opens.

### What it answers

Five faults — `door-unscaled`, `openings-unmarked`, `counts-inflated`,
`actions-uncredited`, `rows-mishandled` — each with the hand it falls to, each
page with the readers its faults cost, and one headline a deployment can act on:
the share of its arrivals whose measurement is wrong in some way.

## Decisions I took that the plan did not specify

The plan's queue puts *whatever makes the aggregates worth opening* third and
says a counter nobody can phrase a question against is not finished. This is the
reading that says whether the counters are worth phrasing a question against at
all. Four calls in it were mine, and they are in
[0271](../decisions/0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md).

**A fault is named by its consequence and carries the hand it falls to.** Five
faults, four hands: `senders`, `configuration`, `caller`, `undetermined`. The
alternative was five shapes of missing data, which is what the subsystem already
had scattered across twelve vocabularies. What makes a reading worth opening is
the errand, not the gap — and two faults falling to one hand is one errand.
`undetermined` is one fault in five and is deliberate: a missing door row is a
sender older than the opening marker, a row that has passed out of retention
while its counters have not, or counters no sender wrote, and the rows cannot
tell the three apart. Naming one of them would be an invention a surface would
print as fact.

**`pending` is published and no fault is raised from it.** This is the one place
I went looking for a fault and came back without one. Openings no rollup has
folded are what a stalled collection looks like — §8 says so — and also what a
revision published two minutes ago looks like, because the lag of the tallies
behind the buffer is one window by design. The discriminator is time, and the row
cannot supply it: `updatedAt` is written by **both** writers, so a busy page
whose rollup has stopped keeps a fresh timestamp on every delivery while its
appearances never move, and a quiet healthy page looks stale by the same measure.
I had a draft that took an instant and a window as options and fired on a stale
row; it is deleted, because a fault that fires on the wrong one of those two is
worse than no fault. The state is named `unfolded`, it claims nothing about which
cause it is, and the shape that would answer it is filed.

**The threshold for an inflated count, which is this subsystem's first threshold
about an error rather than about a claim.** `COUNTS_INFLATED_ABOVE` is 0.5:
`drift ÷ opened` above a half means the appearances are more than one and a half
times the openings, so the typical page view is being folded into more than one
and a half rollup windows — a window shorter than the reading it measures. Every
**ratio** here survives that, because both counts come off the same rows and the
inflation very nearly divides out; every **count** a card prints is half again
what it should be. Published and not overridable, per 0218's rule, because how
much error makes a figure unfit to print is the framework's statement about its
own numbers — while the remedy, a longer window, is the deployment's own
configuration.

**No thirteenth silence vocabulary.** A silence says *this figure is absent*; a
fault says *go and do something*. Mapping these into §17's table would also have
put a **caller's** bugs into a vocabulary every reader-facing card consults. The
correspondences run the other way instead and are documented in the module and
the record: `openings-unmarked` is the fault whose consequence §11 reports as
`unopened`, and `actions-uncredited` the one behind §18's `unwalked`.

## Records added

[0271](../decisions/0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)
— *A fault in a deployment's collection is named by what it costs, with the hand
it falls to, and a page's readers are counted once.* **Accepted**: it contradicts
no accepted record, touches no schema and needs no built code migrated. It
narrows nothing and supersedes nothing.

**The number.** 0269 is the highest on `main`. Both open pull requests, #613
(this lane's) and #614 (the framework lane's), claim **0270** on their own
branches, so I took **0271** rather than a third 0270. `pnpm decisions:index` is
regenerated and clean.

## Findings filed and closed

**Filed, for `Loom portal`:** the collection screen — the figure to lead with
(`readersAffected ÷ arrivals`, both exact page-view counts off the door and both
addable), the three things on it to draw carefully, and the one remedy that must
never be shown to an operator, because `caller` names somebody else's bug. It
needs no new store read: a screen that already builds `PageReading`s for its
reader cards has everything this takes.

**Filed, for this lane:** a stalled rollup cannot be told from a freshly
published revision, because the page-view row carries one timestamp written by
two writers. The shape is a second timestamp written only by the writer that
folds, and a fault that fires on a pending count behind a window handed in. It is
a column on a live counter table — a migration, both store implementations and
the contract suite — so it is a unit of work with a decision in it and not a
field added on the way past.

**Closed:** none. The two open findings this lane owns as *questions* are both
the reader-weighted library comparison and the library-scale word change; the
second is built on #613's branch, and the first is the one yesterday's run
recommended building as a single unit after the portal has drawn what exists.
That recommendation still stands and nothing has overruled it.

## Test numbers, which are real

`pnpm verify` green end to end — build, typecheck, **4,882 runtime tests** across
218 files, findings and reports checks, **8,365 app tests** across 439 files, and
the prerender check. Exit 0.

`src/signals/health.test.ts` is **26 tests**. Nothing was skipped and no test was
weakened.

**Three gates in this repository caught something before the pull request
existed, and they are worth naming because none of them is about the arithmetic.**
The first `pnpm verify` was red on all three, and each is a rule a new module in
this lane trips by existing:

1. **A record number may not be part of a published sentence.**
   `src/documentation.test.ts` enforces the maintainer's rule that a casual
   reader does not know what *(0229)* is — only a parenthetical footnote is
   allowed, never *0250's refusal* and never a markdown link inside a published
   declaration. Three of my doc comments broke it.
2. **A record must be cited by a number that resolves.** I had 0167's filename
   wrong; `tools/decisions/decisions.test.ts` named the file it did not find.
3. **Every export of a published door must appear in the API reference, and the
   reference is generated.** Seven new exports meant
   `apps/loom/app/(docs)/_lib/api/reference.generated.json` was stale, which
   fails twice over — once for the drift and once for *something is published
   that a reader has no way to find*. Regenerated with
   `pnpm --filter @loom/app docs:api`, never hand-edited.

**And one condition in the module was wrong before any of that.** The first
spelling of `openings-unmarked` required `appearances > 0`, which passed over a
door row with nothing in it at all beside counters full of readers — a page whose
every rate is denominator-less, reported as **sound**, which is the exact failure
this module exists to catch. It now fires wherever something counted readers of
the revision and nothing marked an opening, and the degenerate row has a test of
its own.

### The four mutations I planted, and what caught them

A suite that passes first time is a suite that has not been shown to bite, so I
broke the module four ways on purpose:

| what I changed | what failed |
| --- | --- |
| the inflation threshold from `>` to `>=` | the boundary test — a window exactly at the threshold is sound |
| `readersAffected` summed over every page rather than the faulted ones | two tests, one of them the marginal-fault case |
| the dedup of a revision handed in twice removed | the double-count test |
| unpriced pages ranked together with priced ones | the two-scales test |

Each was restored before the next was planted, and the suite is green on the
module as it stands.

## Browser byte cost

**Nothing was added that runs in a browser**, measured rather than assumed.
`src/signals/broadcast.ts` bundled with esbuild (minified, ESM, browser) from a
clean `git archive` of `origin/main`, and from this working tree:

| | `origin/main` | this tree |
| --- | --- | --- |
| minified | **6,477 bytes** | **6,477 bytes** |
| gzipped | **2,935 bytes** | **2,935 bytes** |

`cmp` reports the two bundles byte-identical. Gzipped with `gzip -9 -n -c`, per
the standing note about the file name landing in the header.

## The double count, and the one shape it has here

0158's rule is that counting a window of reader signals and forgetting it are one
operation, so every count has to be tested against the case where it would
double. This reading adds exactly two things — a page's arrivals over the faulted
revisions, and the arrivals over every revision read — and the double-count it
can have is **a page counted once per fault it has**.

1. **A revision with three faults** — `readersAffected` asserted equal to that
   one revision's arrivals, `standings.faulted` to 1, and each of the three fault
   rows to 1 while the fourth stays 0.
2. **The same reading handed in twice** — dropped, counted in `duplicated`, and
   the readers counted once.
3. **Two revisions of one tree** — two pages, one tree, arrivals added, because a
   page view began on exactly one revision and was counted once at the door.
4. **A faulted page the door cannot price** — in `unpriced`, out of the ranking,
   and out of `readersAffected`, so a floor is never added to an exact count.

## Open questions

Nothing blocking. Two calls worth overruling if you disagree:

1. **I made the collection a reading rather than a status endpoint.**
   `GET /api/reader-signals` already says which configuration is in force, and an
   operator-facing *is this working* answer could have gone there. It is a reading
   because the faults are derived from the same rows every reader screen reads, so
   a second implementation behind an endpoint would be a second place to disagree
   with the cards — and because the portal, not the intake, is where somebody is
   looking. **Recommendation:** leave it; if you want the endpoint to answer too,
   it should call this.
2. **The reader-weighted library comparison is still filed, for the third day.**
   Yesterday's run recommended building it together with the pace-weighted one,
   after the portal has drawn what already exists. I did not take it today for the
   same reason and built the collection answer instead, which nothing else in the
   plan reaches. **Recommendation:** unchanged — one unit, after the screens
   exist.

## Not built, and deliberately

- **A stalled-collection fault.** Filed with the column that would make it
  honest. See above.
- **A rule that calls every silence a fault.** Most of them are not: a part
  nobody reached, a window with no views, a type that declares no copy. A screen
  that called those faults would report a quiet Tuesday as a broken deployment.
- **Anything per reader.** Nothing here is about a person: every figure is a
  count of page views at the door or a count of pages, and no row of this reading
  names a reader, a region or an address.

## Working beside the framework lane

`main` moved four commits overnight and I branched off it after fetching. Of the
three open pull requests, **#613** is this lane's own from yesterday evening
(`libraryCopyChangeOf`, §27) and is untouched here — I left it both its section
number and its place in the count, as §16 did for #539. **#614** and **#566** are
the framework lane's and touch nothing in `src/signals/`. There is no branch open
anywhere that touches the signal path besides mine, so nothing was raced.

`FINDINGS.md` was appended to and nothing in it was reflowed. `decisions/README.md`
was regenerated rather than hand-edited.
