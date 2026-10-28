# Reader signals — how often the deployment sweeps, said to the reader

**28 October 2026 (morning)** · `Loom signals` · branch
`signals-58-the-two-libraries-a-window-holds` · §59 of
[`docs/signals.md`](../docs/signals.md) · record
[0320](../decisions/0320-a-notice-publishes-when-a-delivery-goes-and-the-deployment-states-the-sweep-that-takes-it.md)

## Before anything was built

**Two open pull requests, both this lane's, and no maintainer comment anywhere.**
Every comment on both is a routine's own — this lane's reports and `Loom merge`'s
explanation of why it skipped #706 — which is not input, so nothing outranked the
queue. No review has been left on either.

- **#718** — §58, record `0319`, *the two libraries a window holds*. Last
  night's run, cut from `main` at `86e5b38`, which is still where `main` is.
- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October and skipped by the merge routine for the reason it exists. Four
  days old now.

**This work is a second commit on #718's branch rather than a new branch**, which
is step 3 of the procedure in [`docs/routines.md`](../docs/routines.md): a lane
with an open pull request pushes onto it instead of opening a second one. Two
branches from this lane would both have appended a section to `docs/signals.md`,
an entry to `FINDINGS.md` and a row to the generated decisions index, and the
cost of that lands on the maintainer at merge time. The branch was already
current with `main` and `Loom daily build` has no branch open, so there was
nothing to race on the signal path either way.

The record is **0320** and not 0319, because 0319 is claimed on this branch
already. The next number free on `main` is 0319 — and taking it would mean two
records with one number inside one pull request, which is a clash nothing
renumbers. If #718 is never merged the index reports a hole at 0320, which 0097
makes reported rather than blocking.

Eight open findings owned by this lane were read first. The oldest actionable one
was the work.

## What I completed

**§59 / 0320 — a notice publishes when a delivery goes, and the deployment states
the sweep that takes it.**

§52 made what a page collects a value a deployment can publish to the readers it
collects about. One field of it is how long a delivery lives, and the sentence it
published was this:

> a delivery is kept until it is 60 minutes old, and the deployment's own sweep
> is what then counts it into totals and deletes it — the key tying one visit
> together exists until then and nowhere else

Every clause is true. The whole of it is read as a promise this framework cannot
keep, because **`bufferMs` is the age at which a delivery becomes *ripe*, not the
age at which anything deletes it.** Nothing in `src/signals/` deletes a delivery:
`collectReaderSignals` counts the ripe prefix and drops what it counted, and what
calls it is a cron, a deploy hook or an operator — outside the application,
outside this repository, and outside anything a test can see. So a deployment can
have a working endpoint, a notice naming an hour, and nothing sweeping, and
nobody reading *kept until it is 60 minutes old* can hear *…or for ever, if
nobody runs the sweep*.

This is the one direction of overstatement the module was built to make
impossible. Its ceiling rule lets a notice say more is **collected** than is, on
purpose, because overstating collection costs a reader nothing. An overstated
**deletion** is the opposite: the claim a reader would most want to rely on, and
the one this subsystem had the least standing to make.

### What is on the branch

`SweepNotice`, on `CollectionNotice.sweep`:

```ts
type SweepNotice =
  | { readonly state: "stated"; readonly everyMs: number; readonly goneWithinMs: number }
  | { readonly state: "unstated" }
```

- **The deployment states the interval, because nobody else can.** Read where
  the rest of its intake settings are read (0317), as `LOOM_SIGNAL_SWEEP_MS`,
  with a state for a value that could not be used — the same three-state shape
  the switch, the region switch and the window already have in that file.
- **The published figure is a ceiling on a delivery's life.** `goneWithinMs` is
  the ripeness window plus one sweep interval, because a delivery is not counted
  until it ripens and then not until the next run. Derived in one place so no
  surface can print a ceiling that disagrees with the age beside it.
- **Two states rather than a nullable number**, so the ceiling is unreachable
  where nothing was stated. A surface cannot print *gone within 70 minutes* on a
  deployment that promised nothing; the type rules it out rather than a reviewer.
- **Anything that is not a positive, finite interval is `unstated`.** A notice
  may promise a reader less than the deployment knows and may never promise more.
- **`describeBuffer` takes the retention whole** —
  `Pick<CollectionNotice, "bufferMs" | "sweep">` rather than a `number` — so the
  age cannot be published without the sweep beside it. That is the part of this
  that is a design change rather than a field: until today any surface could
  build the sentence this record exists to stop, and it was the obvious call to
  make.
- **The operator's half is on the status and in the sweep script.** It is the one
  setting here whose whole effect is on somebody else's reading: nothing is
  refused, nothing stops, nothing fails, and an operator who never set it had no
  way to learn that their readers were promised nothing.

### The join I did not expect to find

`goneWithinMs` is **the number `CollectionSchedule.foldsWithinMs` asks for.** §29
(0274) judges whether collection has stalled against a schedule a deployment
hands in, and that field's own doc comment spells out the arithmetic: *the
deployment's collection interval **plus** its ripeness window, not the window
alone — a deployment that folds every hour behind a ten-minute window expects a
fold within seventy minutes.* That is the same sum, over the same two numbers.

So one stated interval now gives both halves of the question: a reader's ceiling
on how long a delivery lives, and an operator's threshold for when a fold is
late. It is why the setting takes the **interval** rather than the ceiling — a
deployment that stated the ceiling would be adding a number the notice already
holds to one nothing else knows, by hand, in an environment variable.

## Decisions I took that were not specified

**Pushing onto the open pull request rather than opening a second one.** Covered
above; it is the procedure's rule and the first time in a while this lane has had
a branch open at the start of a run.

**`describeBuffer`'s argument changed shape.** The smaller diff was a second
`describeSweep` beside it, and it keeps the trap: two sentences a surface has to
remember to print together, where printing only the first is exactly today's
failure. This lane has filed *nothing reminds a caller to pass this argument*
twice this month; a disclosure is the last place to leave one. Every caller in
the repository is a test, so the cost was four lines.

**The status gained a field rather than the guide gaining a sentence.**
`docs/deployment.md` is another lane's, and its sample response was already three
fields behind before tonight. Filed with the edit spelled out, beside the
26 October entry asking for the `windowMs` → `rateWindowMs` rename in the same
four lines.

**The sweep script prints the sentence and refuses on nothing.** It is the thing
the setting is about, and the operator reading its output is the one person who
knows what the cron interval actually is. It does not exit on it: an unstated
schedule costs a sentence on a privacy page and nothing a run does, which is the
whole difference between this setting and the window beside it. There is a test
asserting that the schedule is called on exactly one line of that script and that
the line is a `console.log`.

## Records

- **0320** — *A notice publishes when a delivery goes, and the deployment states
  the sweep that takes it.* `Accepted`. Nothing superseded: 0313 decided what it
  decided about the two numbers it named, and this adds the third. Five
  alternatives recorded, including the two shapes the finding costed and
  rejected.

## Findings

**Closed:** the 26 October (evening) entry *a notice promises how long a delivery
is kept, and nothing in it says whether a sweep is scheduled to keep the
promise* — by shape 3, which was its own recommendation.

**Filed:**

1. **A stated interval is a claim nothing here can check.** A deployment that
   states ten minutes and sweeps weekly publishes a false ceiling. The material
   exists — §29 stamps the fold's own timestamp — and the check belongs beside
   the notice rather than inside it, because a notice with a store and a clock
   behind it is a privacy page that cannot render while the database is down. A
   `CollectionFault` member is the shape, and it is a record.
2. **The deployment guide's sample response is four fields behind**, with the
   edit written out. Another lane's file, and the same four lines the 26 October
   rename entry asks about.
3. **A third per-deployment argument has appeared**, which is what §58 said would
   make the two it filed a pattern. It is a milder kind of third — a notice that
   is not handed the interval gets a weaker sentence rather than a wrong answer,
   by construction — and the entry says so plainly, because what is actually
   worth considering is whether the *readings* want one deployment context.

## Test numbers

`pnpm install && pnpm verify` **green, EXIT=0**, read from `verify.exit` which
the gate wrote as a separate command, per `docs/routines.md`.

| | |
| --- | --- |
| Root suite | 240 files, **5,816 tests**, all passing |
| App suite | 369 files, **6,703 tests**, all passing |
| `src/signals/` | 49 files, **1,685 tests** (was 1,678) |
| `src/signals/notice.test.ts` | 18 → **25** |
| `apps/loom/app/_lib/reader-signals/` | 14 files, **179 tests** (was 158) |
| New cases | **21** — 7 in the package, 14 in the app |
| Findings ledger | 1,340 entries, 0 malformed |

**Nothing failed and nothing was skipped.** No test that was on `main` was
changed, weakened or removed. Two hand-built `IntakeSettings` fixtures gained the
new required field; the four existing `describeBuffer` assertions moved from a
number to the retention object through a local helper; one case was renamed from
*but two numbers* to *but three numbers* and gained the third; and one stale
comment in the app's notice test — which filed this very gap — now names the
record that closed it.

**One red verify, fixed before the pull request was touched.**
`src/documentation.test.ts` failed on the new `NoticeRequest.sweep` comment: it
cited a record as ``(`settings.ts`, 0317)``, and the site's generator only lifts a
citation that is a parenthetical of record numbers alone, so the number would have
reached a published sentence. The maintainer's rule, enforced by a test. Reworded,
not weakened.

### Mutation testing: fifteen planted, fourteen dead, one equivalent

Run after the first commit, per the finding of 27 October that mutation testing
before a commit is how a run loses the work it is testing.

| planted | what died |
| --- | --- |
| the ceiling is the interval alone, with no window added | 2 cases |
| the ceiling doubles the window instead of adding the interval | 2 cases |
| a nought interval is stated | 1 case |
| a non-finite interval is stated | 1 case |
| the unstated branch publishes a ceiling, the stated one the refusal | 2 cases |
| the stated sentence stops at the interval, with no ceiling | 1 case |
| the sentence's two figures swapped | 1 case |
| the ceiling is over the default window, not the deployment's | 1 case |
| a fractional or negative interval is accepted by the reading | 1 case |
| a blank value is `unusable` rather than `unstated` | 1 case |
| a stated schedule never reaches the notice | 2 cases |
| the interval handed over is the window beside it | 2 cases |
| the status prints the window's sentence as the sweep's | 1 case |
| the operator's refusal sentence drops what readers are told | 1 case |
| the schedule is not read off the environment at all | 4 cases |
| an unusable schedule is handed to the notice anyway | **nothing — equivalent** |

**The survivor is not a hole.** Passing an `unusable` schedule through to the
notice cannot be observed, because the notice refuses an interval it cannot use
itself: the app would hand over a field that is not there, and a nought or a
fraction would be read as `unstated` on the other side. The refusal is in two
places on purpose — one is the published guarantee, the other is this
deployment's reading of its own environment — and a mutant that removes one of
two independent guards is equivalent by construction rather than untested. Both
halves have their own cases.

**The double-count case, per this lane's standing rule.** The figure this unit
adds is a sum, so the way it would be wrong is adding something twice. The case
uses two deliberately different lengths — fifteen minutes to ripen, a five-minute
cron, twenty minutes published — because the window counted twice is thirty and
the interval counted twice is ten, and all three are plausible-looking minute
figures in a sentence nobody would check. A second case asserts one configuration
gives the same ceiling however often it is asked, which is the way a figure held
on anything but the call would grow.

**Browser cost: nothing.** `broadcast.ts` is byte-identical to `main` — `git
diff` against `origin/main` on that file is empty — and the bundle measures
**6,513 bytes** minified, the same number as the last five runs.
`browser-weight.test.ts` still reports no package in the broadcaster's import
graph. `notice.ts` and `settings.ts` are server-side and reach no browser. **No
payload field, no column, no migration, no store method and no new kind.**

## Open questions

**Nothing blocking.** Four, and two are not new.

1. **`LOOM_SIGNAL_SWEEP_MS` is unset on this deployment**, so its own notice
   publishes the weaker sentence. Setting it to the cron's real interval is one
   environment variable and is the maintainer's rather than a lane's.
   Recommendation: set it when the cron is scheduled, and the same number is
   what the stall check wants.
2. **A false ceiling is uncheckable today** (filed). Recommendation: leave it
   until something draws a notice or a health screen — the check is a reading and
   belongs beside the notice, not inside it.
3. **`0308` on #706**, unchanged and four days old: one reading of one clause,
   one member on two unions and one line in a switch. Recommendation: read it and
   say yes or no.
4. **Still nothing draws any of this**, twelve runs running — and now including
   the notice, which is the one value in this subsystem written for somebody who
   is not the maintainer. Thirty-eight readings, nine comparisons and a
   publishable disclosure are reachable in a few lines, and not one of them is on
   a screen. `Loom portal` is paused, so this is the maintainer's rather than a
   lane's.

## On keeping the parked door cheap to open

**Nothing here makes per-reader identity more expensive to add later, and nothing
was built toward it.** A retention ceiling is a fact about a buffer, and the
buffer holds deliveries that are anonymous and node-shaped. If identity ever
returns as an opt-in, the artefact it needs is a recorded decision per reader,
which is a different thing from a sentence about how long a delivery lives — and
a notice that can already say *gone within 70 minutes* is a better starting point
for *and this is what you consented to* than one that could only say when a
delivery ripened.
