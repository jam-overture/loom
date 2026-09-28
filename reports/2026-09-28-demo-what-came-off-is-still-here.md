# What came off is still here

**Routine:** `Loom demo` · **Branch:** `demo-32-what-came-off-is-still-here` ·
**28 September 2026**

The thirty-third run of this lane, with no open pull request of its own — `demo-31`
merged, and the only open branch this morning was `Loom portal`'s. So: a fresh
branch off `main` at `657d27e`.

Every picture below is a production `next build` of a real commit, served with
`next start` by `pnpm shoot --serve` and photographed at 1280 × 900 and 390 × 844
with reduced motion. The `before` pair is the same harness run against `main` at
`657d27e`, built separately. **The preview deployment is not photographed and has
never been by this lane**: the URL is on the pull request and Vercel reports it
Ready, and `*.vercel.app` is denied by the environment's egress policy
(`Loom portal`, 27 September).

---

## What a stranger could not understand before this run

**That the page's missing part had not gone anywhere.**

The demo's brief names three things to show, in one sentence: *the page adapting;
what was asked for; the stakes and reversibility in the Gate's own language;
which rule fired under which policy; **and the inverse, as a button that really
puts it back.*** Everything before the word *inverse* has been on the arrival
screen or one press from it since last week. The inverse was three presses in,
and this lane measured the sequence on 27 September: press one at ~15 seconds,
press two at ~35, and press three past the end of the minute.

So the claim the whole record exists to support — *nothing is ever removed, and
the exact opposite of every change already exists* — was the one a visitor was
**told**. The card said it, in the Gate's own language, before they ever pressed
*Apply this change*:

> **Can it be taken back?** **Yes.** The 4 pieces it takes off the page are kept,
> so the exact opposite of this change already exists.

Right sentence, right place, and still a sentence. Four pieces were kept and
there was nowhere to look at them.

## What a stranger can understand now

**Where the four pieces went: into the record, which is holding them, on the card
that offers to put them back.**

| | before (`main`) | after |
| --- | --- | --- |
| the payoff screen, wide | `reports/2026-09-28-demo-what-came-off-is-still-here-before-wide.png` | `reports/2026-09-28-demo-what-came-off-is-still-here-after-wide.png` |
| the payoff screen, phone | `reports/2026-09-28-demo-what-came-off-is-still-here-before-phone.png` | `reports/2026-09-28-demo-what-came-off-is-still-here-after-phone.png` |
| **the card itself**, clipped | `reports/2026-09-28-demo-what-came-off-is-still-here-before-card.png` | `reports/2026-09-28-demo-what-came-off-is-still-here-after-card.png` |
| the card on a phone, after *Show the record* | — | `reports/2026-09-28-demo-what-came-off-is-still-here-after-phone-record.png` |

**The two card portraits are the whole of this run.** Same ask, same verdict,
same words, same button. On one of them the sentence *"The 4 pieces it takes off
the page are kept"* is followed by nothing; on the other it is followed by
*3,400 appointments last year*, *24 years on the same street* and *92%* — the
band that is no longer on the page beside it — and then by **Put it back**.

Nothing in it is a picture, a mock or a second copy. It is the nodes the runtime
is holding so that the undo can be exact, rendered through the same registry and
wearing the same resolved theme as the stage. **It is the one excerpt on this
surface whose content is on no screen at any width**, which is why the wide
exemption that hides a question's preview must not be extended to it, and is why
`globals.css` now says so in the same paragraph as the original rule.

## The change

Eight source files, one of them new, and nine test files beside them.

### `record.ts` — `reversibility.inverse`, beside the sentences about it

`ReversibilityView` carried `inverseOperations: readonly string[]`, which is
`describeOperation` over the inverse — a line of evidence for the disclosure. The
inverse itself was read at the fold and dropped, and it is the only field on the
assessment that is *content* rather than an account of content: for a removal it
is an insert carrying the removed subtree, parent, position, props, children and
all, because there is nowhere else for the content to have gone.

That was the check the 27 September finding named as the one that kills the
cheaper shape, and it is why the field was added rather than worked around.
Nothing was taken away: `inverseOperations` is untouched and the disclosure goes
on printing it. `touched` has read the same inverse since it was written — *"the
only place a removed node's parent and position survive"* — so this is the third
reader of one value, not a second source for it.

Measured rather than assumed, and asserted in `pipeline.test.ts`: the nodes the
insert carries number exactly `retainedNodeCount`, which is the number the card's
sentence prints. The sentence and the thing it counts are now checked against
each other.

### `_lib/kept.ts` — new, and it is the unit

`partTheRecordKept(tree, record)`. Applied records only, and only where the ask
reached assessment. Everything else it refuses by handing the operations to the
walk the other two moments already use.

### `in-question.ts` — a third moment, and one refusal doing two jobs

`where` is `"question" | "ask" | "kept"`. The first two are conditional — *this
is what would come off the page* — because a proposal is a thing that has not
happened. The third is in the past tense, which is a claim about the page rather
than about a proposal, and one line in the walk is what keeps it honest: **the
tree must not already have the node.**

It withdraws the excerpt the moment a visitor spends the undo, because the nodes
come back with the ids they had (0032) and the tree can then find them — no
flag, no second gate, nothing to remember to clear. And it is also what keeps
the sentence off an operation that could not have removed anything, because
every operation but an insert reads its subject out of that same tree.

That second half was written as a separate `op !== "insert"` guard and the
defect matrix found it unreachable. See below.

### `rail.ts`, `page.tsx`, `record-card.tsx` — the wiring, and one gate

A third loop over the readings map, folded onto whatever a record already has
rather than set over it. Nothing can collide today; a map written by three loops
fails silently, which is the whole reason it folds.

**The excerpt and the button share one condition**, in the markup, and that is
the placement decision. They are one claim — *here is what is kept, and here is
what spends it* — and split into two conditions they can come apart: a band held
out over no button, or a card claiming to hold something it has already given
back. The rail has the same rule about the leading ask's preview and it is there
for the same reason.

It sits outside the `<form>`. Nothing in an excerpt is operable — `globals.css`
sees to that — but the excerpt is a page, a page may hold a `loom.form`, and a
form inside a form is invalid markup whatever the pointer events say.

### `part-in-question.tsx` — the condition names the ask now

It read `where === "question" ? <h4> : <p>`, which was right while there were two
moments and would have silently given a third one in a card the panel's
paragraph: a level-four heading demoted on the one card where it has a sibling to
be level with, with nothing going red. It names the ask instead, and
`part-in-question.test.tsx` asserts the kept excerpt gets the heading.

### `globals.css` — the window, and the exemption that is not extended

`.demo-part--kept .demo-part-stage` is 21rem, the ask's, because it is the same
band: *Take the numbers off* is what the arrival screen previews and what the
landed card holds, so a shorter window here would show a stranger three figures
before the press and fewer after it. The question's 13rem ceiling exists to keep
two buttons on a 390×844 screen and there is one button here, waiting on nothing.

The wide-screen `display: none` stays on `.demo-part--question` alone, and
`globals.test.ts`'s sweep over every `display: none` in the file now names
`--kept` as well as `--ask`. The question's exemption is a ring on the stage
forty pixels away; after a removal there is no band on the stage to be redundant
with, so a wide screen is the *only* place this content exists.

## What it cost, measured

Read out of the browser on a production build at both viewports, with reduced
motion — `scrollTop` and bounding boxes, not estimates off a picture.

| | before (`main`) | after |
| --- | --- | --- |
| the applied card, wide | **606px** | **976px** |
| the excerpt's window | — | 336px (21rem), 370px with its lead and gap |
| the rail's viewport at 1280 × 900 | 857px | 857px |

**And one thing it revealed, which it did not cause.** The rail keeps the scroll
`AnswerInView` took to put the *question* at the top of it — 788 — and answering
that question makes everything above the card 91px shorter, so the scroll now
points 48px into the card. On `main` the card is short enough that the browser
clamps the scroll away and the card lands at about +117; on this branch the clamp
no longer bites and the payoff screen opens 48px down, with the **Applied** badge
and the quoted ask above the fold.

That is why the wide `after` picture starts mid-sentence, and it is worth saying
plainly rather than reframing: **what a visitor sees of the payoff card is
currently decided by whether the card is taller or shorter than the rail**, which
is nobody's decision. It is filed, with the numbers, the two shapes worth trying
and the reason the obvious one collides with `SpotlightScroll` on a phone. It is
not fixed here because the fix has a design question in it and this run's unit is
the excerpt. The clipped portraits are the honest picture of the card; the wide
pair is the honest picture of the frame.

**On a phone the change is one press away and that is unchanged.**
`SpotlightScroll` carries a visitor to the mark on the stage — `scrollY` 4,685,
with the card 3,863px above them — and `BackToTheRecord` is the way back. So the
phone `before`/`after` pair is identical by design, and the picture of the change
on a phone is the fourth one: press **Show the record**, and the excerpt is
between the account and the button.

## Decisions taken that were not specified

- **Removals only, and that is a refusal rather than a scope cut.** The inverse
  of an insert, a move or a configure names a node the visitor can already see;
  drawing it would be the rail re-rendering the stage at it.
- **Shape (1) of the finding was not taken.** *Put it back* does not become the
  card's own green. What makes it the next step is the band standing over it, and
  a second green on a rail whose one green means *the answer to a question* is a
  vocabulary this surface has spent five runs keeping straight.
- **No new voice.** The lead is `LEADS.remove` with *would come* in the past and
  one clause added. Nothing else on this rail was reworded.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated, nothing left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, written to a file as the last
thing on its own line and read in a separate command (`EXIT=0`).

| suite | files | tests |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 166 | 3,250 |
| `@loom/app` (`apps/loom/`) | 324 | 5,611 |

**872 findings, 0 malformed · 116 prerendered pages, 1,304 text junctions, 0 run
together; 3 metadata conventions, 0 unserved ·** `pnpm shoot`: 1280 vs 1280 wide,
390 vs 390 phone, exit 0, no overflow at either size.

The demo lane's own suite goes **643 → 666: twenty-three added, none weakened,
none skipped.**

### The defect matrix

Each defect restored in turn against this commit, the whole lane run against it,
and the lane restored from a clean copy between rows. Baseline **666 passed**.

| defect restored | caught |
| --- | --- |
| `partFromOperations` stops refusing a node the tree still has, so the excerpt outlives the undo | **5 tests** |
| `kept.ts` answers for a held record as well as an applied one | **1 test** |
| `rail.ts` computes the reading and never calls `showKept` | **2 tests** |
| the excerpt gets a condition of its own instead of sharing the offer's | **1 test** |
| the kept excerpt is given the question's moment, so a wide screen hides it | **8 tests** |
| the wide-screen `display: none` is widened to `.demo-part--kept` | **1 test** |
| the kept window is the question's 13rem | **1 test** |
| `part-in-question.tsx` goes back to naming the question, so the kept lead is a paragraph | **1 test** |
| `reversibilityOf` keeps the sentences and stops carrying the operations | **9 tests** |

Nine rows, nine caught — **and it is the second matrix, because the first one
came back with three rows caught by nothing and two of them were the code's
fault rather than the suite's.**

### The three rows that were caught by nothing

**A guard that was unreachable, and is gone.** The kept moment refused an
operation that was not an insert, on its own line, with a comment saying it was
what stopped a fifth caller choosing wrong. Restored, the whole lane stayed
green — and it could not have done anything else. For every operation but an
insert, `subjectOf` is `findNode` against the tree on the stage, so a subject
that exists is a subject the page has, and the refusal below it has already
fired. One refusal was doing both jobs and the second one was a claim no test
could check. It is deleted and the reasoning is written where the surviving
refusal is.

**A guard that was reachable and had no test.** `kept.ts` refuses a record whose
outcome is not `applied`; restoring that came back green too, because the case
the suite had was a hold nobody has answered — which leaves the band exactly
where it is, so the tree-side refusal catches it anyway. The state where the
outcome is the only thing standing in the way is `moved.ts`'s: **a hold whose
page moved under it**, weighed against a tree that has since lost the node. The
guard stays and there is a test that reaches it now. That is the row above, and
it is the twenty-third test.

**A test that was not testing what it said.** The rail's third loop folds onto a
record's existing reading rather than replacing it; replace the spread with a
bare `set` and nothing goes red, because the only entries it writes are landed
records and a landed record has no other reading to lose. The spread stays —
three loops write one map and the way that fails is silently — and the test's
name now says what it can actually catch: that a question's readings and a
landed change's coexist in one map.

## Findings

**Closed one, filed one.**

- **Closed:** `Loom demo`, 27 September — *the demo shows a stranger the change
  and the record, and the inverse is the one third of the claim sixty seconds
  does not reach.* Shape (2), the one that costs no press.
- **Filed:** `Loom demo` — *the rail keeps the scroll it took for the question
  after the question is answered, and what a visitor sees of the payoff card is
  decided by where the browser clamps it.* Measured, with three shapes and a
  recommendation for the one to try first (`roomToLand` keeping the room rather
  than a second `scrollIntoView`, because that one needs no `matchMedia` and does
  nothing at all on a phone).

- **Appended**, to `Loom marketing`'s 28 September entry on the mangled links
  rather than filed as a new one, because that entry asks for evidence: this
  pull request's five `<img>` tags **all came back mangled**, where #434's four
  came back clean. Same form, opposite outcome, ten hours apart — so the `<img>`
  versus `<a>` correlation is the third to be recorded and broken. The
  description was rewritten with markdown image syntax and read back through the
  API; all five are clean. No mechanism offered.

**Re-verified, not re-filed:**

- `21st.dev` `EGRESS_BLOCKED`, a **thirtieth** consecutive run, one call.
- `*.vercel.app` denied from the sandbox (`Loom portal`, 27 September). This
  report and the pull request both say the pictures are from a local production
  build.

## Open questions

Nothing blocking.

- **The third figure's label is under the fade.** At 21rem the window shows
  *3,400* and *24* with their labels and captions and runs the fade through
  *92%*'s. Raising the window would make a card that is already 976px taller
  still, and the fade reads as a page continuing, which is what it is. Recorded
  as a trade rather than filed — if the maintainer wants the third label, the
  number to change is one line in `globals.css`.
- **The demo's sixty seconds now end on the second press with all three claims
  on the screen at once.** Whether the third press is still worth making is a
  question this lane cannot answer from inside it, and the answer would be a
  different unit: the undo's own card is the last frame of the sequence and
  nothing on this run touched it.
