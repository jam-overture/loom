# Reader signals — the page to fix, or the measurement that said so

**1 November 2026 (morning)** · `Loom signals` · branch
`signals-67-the-page-to-fix-or-the-measurement` · §67 of
[`docs/signals.md`](../docs/signals.md) · record
[0330](../decisions/0330-the-page-to-fix-first-is-not-the-page-to-fix-when-its-own-fault-made-the-fall.md)

## Before anything was built

**One open pull request, it is not this lane's, and there is no maintainer
comment anywhere.** Nothing outranked the queue and no review has been left.

- **#739** — `Loom portal`'s unit 7, opened just after midnight, claiming record
  `0329`. Its only comment is Vercel's deployment bot.

**#706 and #732 both landed**, so `0308` (still `Proposed — architectural`, and
merged as that: moving it decided nothing) and `0327` are on `main`, and `main`
has moved six commits past last night's run. **`Loom daily build` has no branch
open**, so nothing was racing the signal path.

The record is **0330**: `main` holds up to `0328`, and `0329` is claimed on
#739's branch, so taking it would have guaranteed a clash. `pnpm
decisions:index` reports `0329` as a hole per `0097` rather than failing.

**The only shared file that collides with #739 is `decisions/README.md`**, which
is generated — regenerate, never hand-resolve. `FINDINGS.md` is union-merged and
this branch only appends. `docs/signals.md` is not touched by the portal lane.

### Why this is the work, when the plan is finished

Every step of the plan through §66 is done, and the ten open findings owned by
this lane were read first. **None of them was the work:** nine are limits
written down with a recommendation to leave them, and the tenth — *nothing draws
any of it*, now nineteen runs old — is `Loom portal`'s. So the queue fell
through to the brief's third item: *a counter nobody can phrase a question
against is not finished*, and here, **two questions already answered that
contradict each other.**

## What I completed

**`deploymentAgendaOf`** — `src/signals/agenda.ts`, with **`spoilsTheLoss`**
published from `health.ts` beside `remedyOf`. 19 tests in `agenda.test.ts`, 2
added to `health.test.ts`, both exported from `src/signals/index.ts`.

```ts
const agenda = deploymentAgendaOf(
  deploymentReadingOf(assembly.readings.pages.map(readingProgressOf), window.pageViews),
  collectionHealthOf(assembly.readings.pages, window.pageViews, schedule)
)

agenda.first // → the one thing to do, and whether it is the page or the measurement
```

### What was wrong, and it was a wrong errand rather than a wrong number

Two readings answer *what should this deployment do next*, and they had never
met. [0250](../decisions/0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)
ranks the pages by the readers each loses at its sharpest fall and publishes the
head as **the page to fix first**.
[0271](../decisions/0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)
names the faults in the deployment's own collection and publishes the worst as
**the page to look at first**. Same window, same pages, same scale — and a
surface holding both finds the overlap by eye.

**The overlap is a wrong instruction and it goes one way.** Of the seven faults,
`rows-mishandled` is a tree and a window that do not belong together, and a
reading taken from a mismatched tree leaves most of the page reporting `skipped`
(0212). That is not a quiet page. It is a cliff. So the fault **manufactures the
steepest fall in the deployment**, puts the page at the head of the order under
the sentence *this page loses more readers than any other*, and sends somebody
to rewrite a page that is fine. A stalled fold does the gentler version: the
fall comes off counters the fold has not reached and the scale off a door that
has, so the loss is of one window and its denominator of another.

**Nothing was failing.** Both readings are right about the rows each was written
for, which is the third time this week that the defect was only visible from the
line that calls two readings at once.

### The obvious fix was also wrong, and that is the part I would keep

*Any fault takes the page out of the order* is one line, and it is the
over-caution that makes a verdict worth ignoring. **Two of the seven faults
demonstrably do not reach the figure the order is ranked on:**

- **`counts-inflated` is already divided out of it.** The ranking key is
  `lost ÷ (1 + inflation)`, and the inflation comes off the door row, where an
  opening is counted once and exactly (0219). The fault says the page's
  *absolute counts* are not worth printing; the ranking key is not one of them.
- **`actions-uncredited` is about another counter.** A fall is between two
  siblings on `reached`; an uncredited sender spends its `engaged` (0242). Every
  band reads *untouched* and not one fall moves.

So the question is not *is this page faulted* but *does this page's fault reach
the figure its place was computed from* — a statement about a **fault**, which
is why `spoilsTheLoss` is published beside the fault vocabulary rather than
beside the order. A fault vocabulary written in two places is this subsystem's
commonest defect; it cost a real bug twice in the last week.

## Decisions I took that §67 did not specify

- **`AgendaWork` has four members, not two.** `page`, `collection`, `both`,
  `none`. A page that is ranked and carries only a fault the key survives is
  `both` — rewrite it, and fix the fault. Without that member the reading pulls
  a real fall off a screen because a page's presses are not credited.
- **A contested page leaves the page order and is findable where it went**,
  carrying the whole `RankedPage` it was taken out of: the rank, the fall, the
  readers, the share. `contested` is a **slice** of `collection`, not a fourth
  list, so nothing in it is counted twice.
- **`first` is contested, then the head of the order, then the worst fault.** A
  contested page comes first because while one exists the order itself is not
  evidence — the same mishandled rows could be anywhere in the window.
- **It publishes no reader count at all.** The two orders are in two units —
  *readers lost at one fall* and *a page's whole readership* — so a sum or a
  maximum over them would be a figure in neither, which is the refusal 0327
  makes about three absences in three units. Every figure here is a count of
  **pages**, and every reader figure is the source reading's own, on the source
  reading's own row, carried whole rather than re-spelled.
- **Three of the five faults that spoil the loss cannot be seen today**, because
  the order already refuses those pages as `unscaled`, `unopened` and `unsplit`.
  They are answered anyway: the predicate is about what a fault does to the
  figure, not about what today's standings let through, so a standing change
  cannot make the two readings drift apart silently.
- **No silence vocabulary is added.** 0240's twenty-one sets stand. This reading
  withholds no figure of its own because it publishes no figure of its own, and
  `work: "none"` is an answer rather than a silence.
- **Both readings are handed in rather than derived from a window here**, for
  the reason every derived reading in this subsystem takes readings: each is
  separately drawn, and deriving either twice is how two screens come to
  disagree about one deployment.

## A second defect, found by the test for it

The double-count guard is the one this lane is required to write, and it earned
its keep. The join is a `Map` and cannot hold a key twice — **but the published
orders walk the caller's own lists**, so a caller that concatenated two reads
put one page in `page` twice while `work`, `rows` and `trees` above it all
stayed right. The dedup is now in two places and the comment says not to
simplify it away.

## Records added

- **[0330](../decisions/0330-the-page-to-fix-first-is-not-the-page-to-fix-when-its-own-fault-made-the-fall.md)** —
  *The page to fix first is not the page to fix when its own fault made the
  fall.* **Accepted**, and it supersedes nothing: it contradicts no record, adds
  no field to any existing type, and touches neither the tree schema nor the
  delta model. It composes 0250 and 0271 and leaves both exactly as they are.

## Findings

**One closed on filing** — the two orders that ranked the same pages in the same
unit with nothing joining them, which is this unit.

**Two filed open:**

- **The agenda says what to do about reading and nothing about converting**, and
  that is 0330's stated limit: a page whose pricing band every reader reaches
  and nobody buys from reads `work: "none"`, because the order ranks where
  reading stops and a form nobody submits is not a fall between siblings. Filed
  with the two facts a future run needs to hold together — the unit question is
  the same one 0330 settled by refusing, so a conversion arm is a **third**
  order with its own key, and `funnelReachOf` is the one three-argument per-page
  reading the window rung does not reach. **Recommendation: take the arm and its
  input in one unit of work, or neither.**
- **An amendment to `Loom portal`'s standing ask**, not a new one. Drawing
  0250's order on its own is now a known hazard rather than a thin screen, so
  the recommendation is the arrival standing, then the agenda, then
  `windowFiguresOf`. Nothing in this lane is blocked on any of it.

Nine other open findings owned by this lane were read and left: eight are stated
limits with a recommendation to leave them, and the ninth waits on a screen.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on the final tree.

| | |
| --- | --- |
| Root suite | **248 files, 6,005 tests**, 0 failed, 0 skipped |
| The app's own | **373 files, 6,064 tests**, 0 failed, 0 skipped |
| New tests this branch | **21** — 19 in `agenda.test.ts`, 2 in `health.test.ts` |

**Two things failed on the way and both are reported rather than smoothed over.**
Five of the nineteen new tests failed on their first run: one was my fixture
putting a second `band2` row in a window and so raising `rows-mishandled` where
I wanted `actions-uncredited`, and **four were the real double-count defect
above.** And `src/documentation.test.ts` failed on the first full verify — three
doc comments made a record number part of a published sentence, which the
maintainer's rule on the API reference forbids. All three are reworded; the
number is now a liftable parenthetical in each.

Nothing was skipped, no test was weakened, and `pnpm decisions:index` and
`pnpm findings:check` both pass (1,384 findings, 0 malformed).

## Browser cost

**Nothing reaches a reader's browser.** `broadcast.ts` is byte-identical —
`git diff` on it is empty — and `agenda.ts` is unreachable from it. Measured
rather than asserted:

```
esbuild src/signals/broadcast.ts --bundle --minify --format=esm
6,513 bytes minified · 2,993 bytes gzipped
```

Identical to the figure §66 published last night. No payload field, no header,
no column, no migration, no store method and no new kind.

## Open questions

**Nothing blocking.** One worth the maintainer's eye when he has a minute:

**The per-fault table in `spoilsTheLoss` is a judgement, and it is the one thing
in 0330 that a reasonable person could answer differently.** I say
`counts-inflated` and `actions-uncredited` do not reach the loss, and the
argument is written out: the first is divided out of the ranking key by an exact
door row, and the second spends a counter no fall is made of. If either call is
wrong, the cost is in opposite directions — too lax and a distorted page stays
at the top of a fix-list; too strict and a real fall is pulled off the screen.
Both are a one-line change in one place.

## Per-reader identity

Nothing here makes it more expensive to add later, and it is worth saying why
rather than just asserting it: **the unit of this reading is a page**, in both
inputs and in the join. It holds no reader, joins no reader and counts no reader
— its only headcounts are the two source readings' own, carried on their own
rows. A gate and a record, if that door is ever opened, would not touch this
file.
