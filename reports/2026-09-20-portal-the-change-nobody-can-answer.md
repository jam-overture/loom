# 2026-09-20 — "The change nobody can answer"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-32-the-change-nobody-can-answer` (→ `main`), cut from `main`
at `0aa38ef`. Not stacked. **There were no open pull requests in the repository
when this run started**, so there were no maintainer comments to address and
nothing to push onto.

Visuals — a production build of this commit, in a signed-in browser, against a
deployment of two pages: one with an answerable change and a change this build
cannot read, one with an answerable change alone.

| | |
| --- | --- |
| [The queue, with a stuck row in it](2026-09-20-portal-the-change-nobody-can-answer-queue.png) | 1280px — **the change**: the first card, and the second sentence of the count above it |
| [The same screen, every disclosure open](2026-09-20-portal-the-change-nobody-can-answer-open.png) | 1280px — the store's account of the row, and nothing removed to make the surface calm |
| [Your pages](2026-09-20-portal-the-change-nobody-can-answer-pages.png) | 1280px — two marks on one row, and the count that stayed at what can be answered |
| [The page screen](2026-09-20-portal-the-change-nobody-can-answer-page.png) | 1280px — the same row in the queue it is actually on |
| [a phone](2026-09-20-portal-the-change-nobody-can-answer-phone.png) | 390px |

**How the populated pictures were taken.** Two trees built with the published
builders into a `memoryTreeStore()` on `globalThis[Symbol.for("loom.portal.store")]`,
and two held proposals put through a real `memoryHoldStore().hold()` on
`globalThis[Symbol.for("loom.portal.holds")]`. **The `unreadable` half of one
listing is injected rather than produced**, and that is worth stating plainly: a
memory hold store keeps objects rather than rows, so it can never fail to parse
one. What is injected is exactly the shape `postgresHoldStore` builds from a row
it can place and cannot read — a `HoldPosition` and the sentence
`parseHeldProposal` failed with. Everything else in the pictures is the shipped
page code doing its own reads, its own naming fan-out and the real Next render.

Taken with a private Playwright script again, for the fifth time — see the
standing finding.

---

## What was asked

`FINDINGS.md` held an entry filed **this morning** by `Loom daily build` and
owned by this lane, and it is the one this run took:

> **Three screens read `forTree` and all three take `.held` and drop the rest.**
> … A new field with no reader, and it is yours.

[0175](../decisions/0175-a-listing-skips-the-row-it-cannot-read-and-fails-the-one-it-cannot-place.md)
gave `HoldStore.forTree` and `waiting` a second half — a listing answers
`{ held, unreadable }`, where an `UnreadableHold` is a row the store could
**place** and this build could not **read**. The framework's half landed. The
portal's half did not exist.

An open finding owned by this lane outranks the plan, and this one is also the
plan: the review queue is the first thing on the list of where the portal's
value is, and a queue that silently drops a row is a queue with a hole in it.

## What shipped

**The row nobody can answer, on all three screens that had been dropping it —
in its place in time, with no buttons pretending otherwise.**

| | |
| --- | --- |
| `_lib/unreadable-change.ts` | new — `UnreadableChange`, `unreadableChangesIn`, `inQueueOrder` over both kinds of row, `unreadableClause`, `pagesWaitingSummary`, `unreadableMark` |
| `_components/unreadable-change-card.tsx` | new — the card, on both queue screens |
| `_lib/waiting.ts` | `inQueueOrder` re-homed as `waitingSince`; `waitingSummary` takes the stuck rows and will not call an empty queue empty |
| `portal/page.tsx` | the fan-out keeps `unreadable`, the queue is one merged order, the caught-up notice is drawn on `rows` |
| `portal/pages/page.tsx` | a second mark per row; the header sentence is `pagesWaitingSummary` |
| `portal/pages/[treeId]/page.tsx`, `_components/review-queue.tsx` | the same, on the screen where the change actually lives |

### The defect, in the form it actually reached a reader

A page whose only waiting change is one of these drew this:

> **You're all caught up.**
> *When Loom is unsure about a change, it stops and asks you here instead of guessing. Nothing has stopped for you on any page.*

In a green box. Over a queue with something stuck in it.

That is the confident empty state in its purest form — **the screen asserting
the opposite of what is on it, with the counter-evidence three lines below** —
and it is the failure this surface has been rebuilt against since 18 August. The
whole fix on the front door is one word: the notice is drawn under
`rows.length === 0` rather than `changes.length === 0`, and `rows` is both kinds.
Because that is the sort of word a later edit puts back, it is guarded at the
source in `reading-order.test.ts`, which is how this lane tests a file no test
can reach.

### Why the row is a card in the queue and not a warning above it

The obvious build is a notice at the top: *"1 change couldn't be read."* It is
smaller, it is easier, and **it throws away the only fact the row carries.**

An `UnreadableHold` has no utterance, no rule, no stakes and no effect — every
one of those lives inside the shape this build rejected. What survives is a
position: a proposal id, and the instant it stopped. So *when* is all there is,
and it is the thing worth having. In the screenshot the stuck row is dated
**30 July** and sits above two answerable changes from 14 and 18 September,
which is a reader learning at a glance that this has been sitting there for
seven weeks. A count at the top of the screen cannot say that, and a box at the
bottom of the list says the opposite.

0175 sorts `unreadable` in `compareHolds` order beside the rows that parsed for
exactly this reason — *"a caller can render it in place rather than re-joining
two lists"* — and taking that up is not tidiness. A queue is ordered by how long
something has waited. That is its entire claim. A row lifted out of the order
has had its one fact removed.

Vercel does not put failed builds in a separate list either. They are in the
deployments list, in time order, marked.

### The two numbers that must not become one

*"5 changes are waiting for your answer"* over a queue where one of them cannot
be answered is a promise the screen does not keep. So every count on these three
screens counts **what a person can answer**, and the rest is a second sentence
and a second mark:

```
2 changes are waiting for your answer, across 2 pages. 1 more was found and
couldn't be read; it's in the list below.
```

On the pages index this settles the question the finding raised explicitly —
whether *waiting* means **answerable** (4, with a mark) or **in the queue**
(5, with a mark). It recommended the first and this takes it, because of what
the number is for: a reviewer reads that index to decide which page to open and
how much of their afternoon it costs, and an unreadable row costs them nothing.
**A 5 that is really a 4 sends somebody to a page to answer a change that cannot
be answered.**

The clause has one piece of grammar worth the sentence it took. *"1 more"* is
right beside four other rows and a small lie beside none — more than what? A
queue whose only row is one nobody can read is precisely the case a reader meets
where the screen would otherwise say *you're all caught up*, so it is the one the
wording must get right, and `unreadableClause` takes the count of the other rows
for that reason alone.

### What a person is told to do, when the answer is "not you"

Every screen in this portal answers *what do I do now?*. This is the one row
where the honest answer is **not you**, and saying so is worth more than a link:

> Waiting won't clear it and neither will opening the page — whoever looks after
> this deployment needs to. Nothing has been lost: the change is still exactly
> where it was.

The second clause is the one this card exists for. An unreadable **page** — the
`UnreadablePage` this screen has had since 17 September — sends a reader to the
page, where they will see for themselves. An unreadable **row** must not: the
page screen reads the same store and fails on the same row. *Telling somebody to
go and look at a thing that cannot be looked at is worse than telling them
nothing*, and merging the two facts would have done exactly that. They are
separate sentences, from separate readings, in that order.

There are no buttons and no greyed-out pair. A disabled *Apply this change*
invites a reader to wonder what they are missing; **"There's nothing here to say
yes or no to, because nothing here can tell you what you'd be agreeing to"** is
the fact.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**That somebody is waiting on them for a change no version of their software can
open — and which change, since when, and that it is not their problem to
solve.**

- **`git log` holds what was applied.** A held proposal was never applied; that
  is what being held means. A row that cannot be parsed has never been anywhere
  but the hold store.
- **The store holds the row and nothing that reads it.** A `SELECT` returns the
  bytes. It does not know that this build's schema rejects one column, which is
  the entire content of the finding.
- **An error tracker would never see it.** Nothing throws. 0175's rule is that a
  listing *skips* the row it cannot read rather than failing — so the queue is
  correct, the four changes beside it are answerable, and the fifth is simply
  not in the answer. **There is no exception, no log line and no alert.** The
  only place this fact can surface is a screen that asks for the second half of
  the listing, and until today nothing did.
- **And the sharpest one:** the pairing of *a change is waiting on you* with
  *and your software cannot read it* is a statement about a review queue, which
  nothing without one can make.

The claim worth defending is the third. This is a fact about a deployment that
is **invisible by construction to every general-purpose tool**, because the
runtime handles it correctly and correctly means quietly.

## The high-schooler test

Applied to all three screens this run touched.

- **The card's heading — "This change can't be read."** Passes. Six words, no
  runtime vocabulary, and it is the first thing on the card because a row with
  no quote at the top is otherwise something the reader has to decode.
- **The card's two sentences.** Pass. *"…couldn't make sense of what it says"*
  and *"Waiting won't clear it and neither will opening the page — whoever looks
  after this deployment needs to."* What to do next is stated rather than
  implied, and what it says is that it is not theirs.
- **The front door's count.** Passes. Two sentences, each a claim a person can
  check by counting cards.
- **The pages index row — "1 waiting on you · 1 can't be read".** Passes, and
  this is the row that failed hardest before: a page whose only change is
  unreadable had **no mark at all**, on an index whose entire job is telling a
  reader which page needs them.
- **The disclosure** is the one place a runtime word appears, and that is what
  it is for. `a stored hold did not parse: disposition`, verbatim, beside the
  proposal id — the only thing that tells two of these apart and the only thing
  the person who *can* fix it needs.

## What I renamed, and what moved behind a disclosure

Nothing was renamed — no route, no heading, no label. **Nothing was removed.**

| What the screens said | What they say now |
| --- | --- |
| (nothing — the row was not on any screen) | *This change can't be read. · waiting since 30 July 2026 at 12:00 UTC* |
| **You're all caught up.** over a queue with a stuck row in it | *Nothing is waiting that you can answer. 1 change was found and couldn't be read; it's in the list below.* |
| A pages-index row with no mark on it | *1 waiting on you · 1 can't be read* |
| *"2 changes are waiting for your answer."* over three rows | *"…for your answer. 1 more was found and couldn't be read; it's in the list below."* |

**What moved behind a disclosure:** the proposal id, the store's own account of
which field disagreed, and the likeliest cause (a row written by a newer build
than the one running). The reassurance that 0175 makes true — *Loom skipped this
one row rather than failing the whole list, so everything else on this page is
still answerable* — is down there too, beside the account rather than on the
surface, because it is a fact about the runtime rather than about the reader's
page.

**What went on the surface that could have hidden:** which page the row is on,
by the 22 August rule, on the front door where the queue is drawn from several.
It is omitted on the page screen, where the page is the screen.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green, exit 0** |
| Framework suite | **156 files, 2,844 tests, all passed** |
| Application suite | **284 files, 5,013 tests, all passed** |
| Findings | 715 findings, 0 malformed |
| Prerender check | 109 pages, 859 text junctions, 0 run together |
| Overflow, measured | 1280 vs 1280 on all four wide shots, 390 vs 390 on the phone |

**Nothing failed, nothing was skipped, and no test was weakened.**

44 tests are new — 30 on the readings, 10 on the card, 4 source guards on the
front door — and two existing suites were updated for the changed signatures.
What each group would catch:

- **The reading.** The moment a row stopped, read rather than printed; the
  store's account carried verbatim; and the plain-language property over both
  sentences, which is the hardest case on this surface because the honest
  technical description of this row uses four words off the list.
- **`inQueueOrder`.** Both kinds in one order; an unreadable row that is older
  sorts first, one that is newer sorts last, and one in between sorts in
  between — **asserted as three separate cases**, because a merge that parked
  them at one end would look entirely correct in a screenshot of a deployment
  where they happen to be at that end. Stable on a tie, so one store
  photographed twice is one screen. Does not mutate its arguments.
- **The counts.** `unreadableClause` drops the word *more* when there is nothing
  for it to be more than; agrees with itself in both plurals both ways; and
  leads with the space that joins it to the sentence before it.
  `pagesWaitingSummary` never folds a stuck row into the count, skips a page
  whose queue could not be read rather than counting it either way, and points
  at the marked page rather than at a list of changes it does not have.
- **The card.** Every sentence; the page named on one screen and not on the
  other; **no `<a>` anywhere on it**, which is the assertion that would fail if
  somebody added the link the neighbouring component has; and the technical
  record asserted *inside a closed `<details>`* rather than over `textContent`,
  which jsdom reads either way.
- **The wiring**, at the source, in `reading-order.test.ts`: the fan-out keeps
  `unreadable`, the queue is one merged order, the card is rendered, and the
  caught-up notice is **not** drawn on `changes.length === 0`.

## Findings

**Closed one. Filed one.**

1. **Closed:** this morning's `Loom daily build` entry, which is this unit. The
   count recommendation it made was taken and the reason is in *The two numbers
   that must not become one* above.
2. **Filed, this lane's own:** a JSX expression beside a word renders without
   the space between them, and `prerender:check` cannot see the screens where it
   happened. Both marks this run added shipped as `{count} can&rsquo;t be read`
   and both rendered **`1can't be read`**. A photograph found it — the fourth
   time this lane has filed that sentence. Two things should have caught it: the
   tests, which passed because a `toContain` on either half is satisfied by the
   run-together string; and `prerender:check`, which exists for exactly this and
   reads prerendered pages only. **Every screen in this route group is `ƒ`**,
   because every one reads a session cookie — so the one class of defect the
   repository has a dedicated tool for is the one class it cannot check here.
   Fixed in both places by moving the wording into `unreadableMark`, one string
   with one assertion on the whole of it. The recommendation — a source-level
   junction lint, which would need no server and would cover all four surfaces —
   is `Loom daily build`'s, because the tool is.

**Re-filed by reference, not as a new entry:** the screenshot harness still
cannot sign in. This is the fifth picture of this portal taken by a private
Playwright script. The 14 and 19 September entries stand unchanged and the ask
is still the smaller of the two on the table: **a `signIn` step, or any way to
run a script before the first `goto`.**

## What I did not do

**`/portal/checkup` is deferred again**, for the fourth run. It remains the
plan's own recommendation and it keeps losing to an open finding owned by this
lane, which is the right order — but four is enough times that it is worth
saying plainly rather than noting in passing. It is the next unit unless
something is filed against this lane before then.

**I did not touch `waiting`**, the deployment-wide listing. It answers a
`HoldPage`, which is a `HoldListing` and a cursor, so it has the same second half
and the same problem — but nothing in the portal calls it: the front door fans
out over `forTree` per listed page, which is why `Sweep.complete` exists at all.
A reader for a listing no screen uses would be a second unreadable-row path with
no picture of it, and the first one is what this run is.
