# Reader signals — nothing arrived, or nothing was let in

**31 October 2026 (morning)** · `Loom signals` · branch
`signals-65-nothing-arrived-or-nothing-was-let-in` · §65 of
[`docs/signals.md`](../docs/signals.md) · record
[0326](../decisions/0326-a-quiet-window-and-a-refusing-door-are-two-states-and-a-refusal-names-no-page.md)

## Before anything was built

**Two open pull requests, both this lane's, and no maintainer comment on
either.** Every non-bot comment on both is a routine's own summary, so nothing
outranked the queue and no review has been left anywhere.

- **#728** — §64, record `0325`, *whether a kind of part is read, and not merely
  reached*. Last night's run, cut off `482081a`, which is still the tip of
  `main` — so it is unmerged and `main` has not moved since.
- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October and skipped by the merge routine for the reason it exists. **Seven
  days old.**

**`Loom daily build` has no branch open**, so nothing was racing the signal
path.

This work is a **new branch off `main`**, not a commit onto #728. The record is
**0326**: `main` holds up to `0324`, and `0325` is claimed on #728's branch, so
taking it would have guaranteed a clash. `pnpm decisions:index` reports `0325`
as a hole per `0097` rather than failing.

**Three shared files collide with #728 and all three are resolvable.**
`FINDINGS.md` is union-merged; `decisions/README.md` and
`reference.generated.json` are generated. `docs/signals.md` is the one needing a
human eye: both branches insert a section immediately before
`## Still not in scope`, and **the resolution is to take both sections, §64 then
§65**. Nothing in either edits the other's text.

### Why this is not the work the last run recommended

The 30 October finding asks a future run to take `regionPagesOf`,
`silenceCensusOf` and `libraryPaceOf` into **one second rung** rather than
adding any of them individually. That was the first thing read and it cannot be
done today: **`libraryPaceOf` exists only on #728's branch.** Building the rung
off `main` would cover two of three and leave the third to be bolted on, which
is exactly the shape the finding asks a run not to produce; building it on #728
would be stacking. Filed, with a recommendation to take it on the first run
after #728 lands.

Nine other open findings owned by this lane were read. **None of them was the
work** — eight are limits written down with a recommendation to leave them, and
the ninth waits on a screen. So the queue fell through to the plan, whose third
item chose this: *a counter nobody can phrase a question against is not
finished* — and here, a counter nobody had ever joined to another.

## What I completed

**`arrivalStandingOf`** — `src/signals/arriving.ts`, 32 tests in
`arriving.test.ts`, exported from `src/signals/index.ts`.

### What was wrong, which was not a bug

**Every reading in this subsystem is a reading of rows that arrived.** That is
so obviously true that nothing had been written down about what it costs. A
counter never written is indistinguishable from a counter written with a nought,
so forty-one readings, nine comparisons, a window rung, a deployment context and
a census over the silences all compute the same answer from an absent row as
from a quiet one.

**So the commonest failure a new deployment has makes all of them say the same
wrong thing.** A snippet copied onto `https://loomjs.org` by a project whose
settings name `www.loomjs.org`; a snippet left on a site after its project
closed; a snippet from an older release the door cannot parse. In all three the
browser does its job, the page posts on every view, the door turns every
delivery away before it reads which tree it was about — and the operator opens a
screen that says **nobody read anything.** The remedy is one line in a settings
field and the evidence points the other way.

The evidence that it is wrong has existed since **0311**, whose own context
names this exact question as the reason it was built:

> the one question a person setting up their site most needs answered — *is my
> page posting and being turned away, or not posting at all?*

**Nothing joined the two.** The portal prints the refusal lines in one box and
the pages in another, and a person reading both can draw the conclusion
themselves. No reading drew it, so no verdict, standing, fault or sentence
anywhere in `src/signals/` could — which also means no host other than this one
gets the answer at all.

### What it answers now

Five standings, two dimensions crossed and one refusal.

| | nothing turned away | deliveries turned away |
| --- | --- | --- |
| **nothing collected** | `silent` | `turned-away` |
| **something collected** | `collecting` | `mixed` |

plus `unasked` where nothing offered a count, which wins over all four.

- **`silent`** — no page is posting to this deployment at all. The strongest of
  the quiet answers, because the door is the one place a delivery cannot arrive
  without being seen, and it saw none.
- **`turned-away`** — the state the unit exists for, and the one standing no
  amount of age on a cumulative counter can weaken: whenever those refusals
  happened, nothing has ever been collected, so there is no window in which the
  deployment was working.
- **`mixed`** — both true and neither the picture: a second sender with a stale
  key, one page of several carrying the wrong snippet, or a misconfiguration
  since fixed. `newest.sinceMs` is what tells those apart and this standing
  deliberately does not try to.

## Decisions I took that were not specified

**It judges on what was collected, never on the arrivals.** This is the one that
would have made the reading worse than nothing. The obvious pair is *refusals
against `CollectionHealth.arrivals`* — and a deployment whose senders never mark
an opening has counters, funnels and region rows and **no door rows at all**
(the `door-unscaled` fault), so its arrivals are nought while its collection
plainly works. Judged that way it reads `turned-away` and sends an operator
after a gate that is letting everything through. The left-hand number is
therefore *was anything collected about anything* — `pages.length`, a revision
standing there if the window held one counter, one funnel answer, one door row or
one region bucket. Both figures are published; only one is the question.

**It is a reading beside collection health rather than an eighth fault inside
it.** All seven `CollectionFault` members are about one revision of one page,
because all seven come off that revision's rows. A refusal is about no page at
all — the door turns a delivery away before anything reads which tree it named,
and reading the body to find out would spend the database on exactly the sender
the gate exists to stop (0311). The subject differs, so the reading differs
(0240). A fourth argument to `collectionHealthOf` was the other candidate and is
rejected in the record: the schedule is already the one argument there that is
not a row, and this lane filed on 29 October that a context plus an instant is
two arguments.

**The reasons stay the deployment's, through a type parameter.** Why a host
turned a sender away is the host's business — which is why the counter is the
deployment's table and not the runtime's — so the reading is generic in the
reason and never names one. Nothing moves out of the app's `refusals.ts`, no
type crosses from `apps/` into `src/`, and `describeArrivalStanding` prints the
reason as the deployment spelled it. **I did not write a remedy per reason**
either: the portal already has one good sentence per reason, and a second set
worded here would be the near-duplicate this subsystem has been bitten by twice.

**No horizon, and no standing that turns on age.** A cumulative counter cannot
say whether its own figure is current — a deployment misconfigured a month ago
and fixed the same afternoon still holds every refusal it ever counted.
`newest.sinceMs` is published rather than judged, which is the shape a
collection schedule already takes (0274), and the instant is optional because
nothing here reads a clock. What makes this safe rather than evasive is that
`turned-away` cannot be weakened by age at all.

**One rule for *was anything turned away*, and the standing and `newest` are
both found by it:** any reason reporting a positive count. So a standing that
names a refusal always carries the refusal it named — asserted as an identity
over eight windows rather than written in a sentence. A reason reporting a
nought is a row saying nothing was turned away for it, so it cannot be the
newest thing that was.

**The health is taken whole**, as `Pick<CollectionHealth, "pages" | "arrivals">`
— the shape `retentionPromiseOf` takes the retention in (0321), so what is
judged is what that reading published. Taking a `ReaderWindow` instead would
have been more reachable (`revisionsIn` plus a sum needs no trees), and I
rejected it because the sum is `collectionHealthOf`'s `arrivals` written a second
time, which is what `door.ts` was bitten by last night. The cost of the choice is
small in the state that matters: a deployment nothing has been collected about
has no trees to join, so its health reading is `collectionHealthOf([], [])`.

**No silence vocabulary, so `silences.ts` is untouched** and its twenty sets stay
twenty. The reading withholds a figure in exactly one state and names it on the
standing, as `retentionPromiseOf` does. That also keeps this branch out of the
one code file #728 edits.

## Records added

- [**0326**](../decisions/0326-a-quiet-window-and-a-refusing-door-are-two-states-and-a-refusal-names-no-page.md)
  — *A quiet window and a refusing door are two states, and a refusal names no
  page.* **Accepted.** It contradicts no record, adds no field to the tree schema
  or the delta model, and nothing in it needs built code migrated, so there was
  nothing to escalate. Seven alternatives recorded, including the eighth
  collection fault, judging on arrivals, a horizon, moving the reason vocabulary
  into `src/`, and a twenty-first silence set.

## Findings filed and closed

**Three filed, all open. Nothing closed** — this unit closed no finding, because
none of the ten open ones was this.

1. **Owned by `Loom portal`** — *the screen that would draw this is already
   built and already reads one of its two inputs.* The *Signals* page calls
   `readings.refusals.read()` and prints `turnedAwayOf`'s per-reason sentences,
   and it reads the door rows through `boundedReaderTallyStore(...).pageViews()`.
   It does not put them together. **Recommendation: draw the standing above both
   boxes rather than beside them**, with the per-reason sentences as the remedy
   under it, and do not word a second set of reason sentences.
2. **Owned by this lane** — *a refusal is not in a window, which is why this
   reading is outside `windowAssemblyOf` for a reason the other three are not.*
   Written down before somebody bundles it with them: the other three are
   figures over a window's own rows, where this joins a window to the
   deployment's refusal table — a second store on a second scope, which
   `ReaderWindow` deliberately is not (0309). The second rung should take this
   reading's *result* if it wants it and must not try to compute it.
   **Recommendation: leave it, and do not count it as a fourth.**
3. **Owned by this lane** — *the second rung cannot be built today, because its
   third member is not on `main`.* The sequencing fact above.
   **Recommendation: take it on the first run after #728 lands.**

## Test numbers

`pnpm verify` **green**, every stage: `build`, `typecheck`, `test`,
`findings:check`, `reports:check`, the app's own `verify`, and
`prerender:check`.

- **5,916 tests in 244 files** in the root suite, all passing, and **6,837 in
  379 files** in the app's own. `findings:check` reads 1,367 findings with none
  malformed; `reports:check` reads 2,023 visuals at 144.0MB with none over the
  cap; `prerender:check` reads 137 pages with 1,945 text junctions and 0 run
  together.
- **32 new tests** in `arriving.test.ts`, in four groups: which of two silences
  a quiet deployment is in, the newest refusal, the case it would double-count,
  and the operator's line.
- **Nothing was skipped and nothing was weakened.** No test anywhere else
  changed — the unit adds a module and one line to `index.ts`, and alters no
  existing behaviour.
**Two failures on the way, both caught by checks that exist for them and both
fixed before the commit.** Saying so plainly because neither is visible in the
final diff:

1. `tools/decisions/decisions.test.ts` caught a citation in `arriving.ts`
   pointing `0311` at a filename I had written from memory rather than read.
2. `app/(docs)/_lib/architecture/architecture.test.ts` caught **0326's
   alternatives being invisible to the parser**, because I wrote them as a
   numbered list and the parser reads a bullet or a paragraph with a bold lead.
   It is the better failure of the two: the page would have shown a shorter
   list of roads not taken and looked complete, which is the error that module's
   own documentation says is the worst way for it to be wrong. Converted to
   bullets.

### Twenty-three mutants planted, twenty-three dead

All dead on the first pass, which has not happened on this branch's last few
siblings and is worth reading sceptically rather than as a result — so the list
is here in full.

**The ones that matter, because each is a figure that would have looked
plausible:** the standing judged on `arrivals` rather than on what was
collected; the two quiet standings swapped and the two live ones swapped; a
reason handed in twice summed rather than folded; the last row of a repeated
reason kept instead of the first; `refused` taken as a count of reasons rather
than a sum of their counts; an empty counter read as no counter at all, and
`null` refusals published as a nought.

**The newest refusal, which is the part an operator acts on:** the oldest named
instead of the newest, the largest named instead of the newest, a tie reordered,
a reason reporting a nought taken as a refusal, the age subtracted the wrong way
round, an unstated instant reported as a nought age, and a counter ahead of the
instant clamped rather than subtracted.

**The sentence:** the reason dropped from the line, no site named printed as a
blank, and both singulars pluralised.

Run **after** the commit, per the 27 October finding that mutation testing
before a commit is how a run loses the work it is testing. `git status` was
clean before and after.

## Browser cost: nothing

**`broadcast.ts` is byte-identical to `main`** — `git diff origin/main` on that
file is empty — and the bundle measures **6,513 bytes** minified, the same
number as the last nine runs. `browser-weight.test.ts` still reports no package
in the broadcaster's import graph.

`arriving.ts` is server-side, imports one module for a type and one for the
closed-set check, and reaches no store, no clock and no DOM. **No payload field,
no column, no migration, no store method and no new kind.**

## Open questions

**Nothing blocking.** Five, and four are not new.

1. **#706 / `0308` is seven days old.** One reading of one clause, one member on
   two unions, one line in a switch, and it is the only thing holding that
   branch — the merge routine correctly skips a pull request carrying a
   `Proposed` architectural record. **Recommendation: read it and say yes or
   no.** If you would rather the two states stayed merged, say so and the
   finding closes as settled.
2. **Whether the portal should draw this.** It is the cheapest screen in the
   subsystem — one line above two boxes it already draws — and it is the line
   that explains why every other screen is empty. `Loom portal` is paused, so
   this is yours rather than a lane's. **Recommendation: when the portal
   unpauses, this before the rest of the readings**, because an operator whose
   door is refusing everything cannot use any of the others.
3. **`LOOM_SIGNAL_SWEEP_MS` is still unset on this deployment**, so the
   retention notice publishes the weaker sentence and §60's verdict reads
   `unpromised` every run. **Recommendation: set it to the cron's real interval
   when the cron is scheduled** — one environment variable, and the same number
   the stall check wants.
4. **Eighteen runs with nothing drawing any of it.** Forty-two readings, nine
   comparisons, an assembly, a context, a census and now a standing.
5. **Whether a horizon belongs on this reading after all.** I published
   `sinceMs` and refused to judge on it, for the reasons above. If you would
   rather `mixed` went quiet once the newest refusal is older than some number,
   the honest version is a per-deployment setting beside the sweep interval and a
   superseding record, not a constant. **Recommendation: leave it until an
   operator complains**, which is a complaint a screen has to exist to receive.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later, and
nothing was built toward it.** The reading's finest grain is **a deployment** —
coarser than anything else in the subsystem, which bottoms out at a page in one
form — and it holds two counts, a standing, a reason and an instant. There is no
reader in it at any point.

The one identity-shaped value anywhere near it is the `Origin` header behind
`newest.origin`, and it was reduced to a site by `keptOrigin` before the counter
ever saw it: what reaches this reading is `https://shop.example`, which is a
fact about a deployment's own configuration and not about anybody who visited
it.

One thing worth knowing if that door is ever opened. The record's seventh
alternative is the shape: *an intake that refuses an identified batch which
cannot show which decision allowed it* would be a fourth refusal reason, and
this reading is generic in the reason — so a host adding it gets the standing,
the join and the sentence without touching `src/signals/` at all. That is not an
argument for building it; it is one fewer thing to build if it is ever approved.
