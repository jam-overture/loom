# 2026-09-01 — Everything waiting on you, rebuilt

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-19-everything-waiting-on-you` (→ `main`).

Visuals — real screens from this commit, in a signed-in browser, against a page a
live model actually changed five times during this run:

| | |
| --- | --- |
| [The front door, with a change waiting](2026-09-01-portal-everything-waiting-on-you.png) | 1280px |
| [The same card with the technical record open](2026-09-01-portal-everything-waiting-on-you-open.png) | 1280px |
| [Nothing waiting, which is most days](2026-09-01-portal-everything-waiting-on-you-caught-up.png) | 1280px |
| [The page screen the queue hands you to](2026-09-01-portal-everything-waiting-on-you-page.png) | 1280px |
| [a phone](2026-09-01-portal-everything-waiting-on-you-phone.png) | 390px |

**How honest these are.** `LOOM_ANTHROPIC_API_KEY` is present in this
environment, so nothing was staged. Five requests were typed into the real prompt
box against the seeded tree; four were applied by the Gate on its own and the
fifth — *"Delete every card on this page and all of their headings and
paragraphs."* — was **held**, which is the card in the first two pictures. The
caught-up screenshot is the state after pressing **No thanks** on that same hold,
so the empty queue in it is a queue that emptied rather than one that was never
filled. `DATABASE_URL` is unset here, which is why the durability notice is
showing; that notice is correct and is doing its job.

---

## What was asked

**No maintainer comment is open on any portal pull request.** There is no open
portal pull request at all: **#185, #201 and #208 were closed unmerged on
1 September**, in the clearing of a thirty-deep backlog, and `FINDINGS.md`'s entry
for that says each owning routine should redo its work against current `main`.

So this run is the redo of the most valuable of the three — **#208**, the review
queue — plus what looking at it again found.

## What was on `main`, and what is here now

`/portal`, the portal's front door and the first screen anybody sees after
signing in, was **seven lines and a `redirect` to the page list**. A reviewer
asking *"does anything need me?"* was answered with a list of the places a change
might be waiting, and finding out meant opening every page in turn and scrolling
past a preview to reach the queue inside it.

It is a screen now, and its subject is the one thing on a Loom deployment that is
genuinely urgent: **every change waiting for an answer, on whichever page it is
waiting**, oldest first, led by the sentence somebody actually typed.

### What each answer would do

The brief's first value item is *"the review queue — what is waiting, why, and
**what accepting or refusing it would do**"*. The portal had the first two and
never the third: it described the *change* and never the *answer*. Both the queue
card and the page card now say, above the buttons —

> **If you say yes** — Loom checks its rules once more, then makes the change and
> writes it into the page's history — where you can undo it.
>
> **If you say no** — The change is thrown away and the page is left exactly as it
> is. What was asked for stays in Activity, so nothing is lost.

Where the Gate recorded `reversible: false` the first sentence instead ends
*"This one can't be undone afterwards."* That is the most consequential fact on
the card and it used to be a monospace pair one click down. Both sentences come
from one module, `_lib/waiting.ts`, and the page card's test asserts against that
module rather than against a copy of the wording — so the two screens cannot
drift into describing the same two buttons differently while both stay green.

### The queue offers no Apply button, deliberately

It is assembled from holds across every page and has read no trees, so it cannot
say what any of these proposals would **replace** — the page screen can, because
it rendered the tree and the reader is looking at it. Answering a change from a
screen that cannot show you the change is the quick approval
[0019](../decisions/0019-the-portal-is-a-review-queue-not-a-design-tool.md) exists
to prevent. So the front door does triage and hands the reader to the one place
the question can be answered properly. That is why its one button is outlined
rather than filled: the single filled shape on a screen is the affirmative
action, and nothing on this card affirms anything.

## What I found by looking at it, that #208 did not

Two defects, both found in a screenshot and neither visible to any test.

### 1. The queue could say "Nothing is waiting for you" without having looked

**This is the one that matters, and it is a correctness bug in the screen's only
claim.**

`TreeStore.list` is bounded by contract — one page of trees and a cursor, because
[0020](../decisions/0020-a-store-handle-is-the-scope-of-what-it-can-see.md) will
not let a caller ask a store for everything it holds. `HoldStore.forTree` is the
only listing a hold store offers, so this screen has to fan out one read per tree.
#208 took one listing page, fanned out from it, and **said nothing about the
cursor**. A deployment with more pages than that bound would be told, in the same
confident sentence a fully-swept deployment gets, that it was all caught up —
while a change sat waiting beyond the bound.

An unreadable page was already admitted (*"One page couldn't be checked."*). An
**unreached** page was not, and it is the more dangerous of the two precisely
because nothing fails.

So `waitingSummary` now takes a `Sweep` — `{ unreadable, complete }` — and both
caveats come after the count and never inside it:

> *Nothing is waiting for you. One page couldn't be checked. This deployment has
> more pages than this screen checks.*

and when either is true the screen carries a notice saying what it did not check,
what the limit is, and the one thing a person can do about it — open the page they
are worried about rather than take this screen's word for it. That notice sits
**above** the queue, because the reader who takes the count at face value and
scrolls no further is exactly the reader it is for.

The framework half of this is filed rather than fixed: a hold store with no
deployment-wide read is what makes a complete answer cost one query per page. It
is `src/`, so it is a finding.

### 2. A plain-language sentence with a dangling reference

The rule sentence for `stakes-above-ceiling` read:

> *"Riskier than a request **from here** is allowed to be without asking."*

"From here" points at the *origin* of the ask. On the page screen the origin sits
a line or two above it and the sentence resolves. On the queue — which draws
changes from every page and leads with what somebody typed — "here" has no
referent on screen, and the one sentence explaining why a person is being asked to
decide something reads like the tail of a sentence that was cut.

It is now **"A change this big is not something Loom may make on its own."**
Nothing is lost: the origin is still on the same card, spelled `user-instruction`,
one click down. The guard added for it is about the class rather than that string
— a rule sentence that says *here*, *this page*, *above* or *below* has assumed
which screen it is on, and these are read on three.

That is the fourteenth defect this lane has found by looking at a screen and not
in a test, across eight runs.

## Also in this unit

- **`DEFAULT_LANDING` is `/portal`**, and the rail leads with **Waiting on you** —
  the only nav label that is a sentence about the reader rather than a name for a
  thing. `NavItem` gained `exact`, because `/portal` is the prefix of every other
  route in the rail and without it the front door was the active item on every
  screen.
- **`/portal` came off `guarded-pages.test.ts`'s exemption list, and the suite
  caught that itself.** The exemption was granted because the page was a redirect
  that rendered and read nothing; the assertion beside it — an exempt page may not
  import the store, the write path, the journal or the database — went red on the
  first run and named the file. An exemption should carry an assertion of the
  property it was granted for.
- **`holdsAreDurable`**, so the queue can say out loud whether a change waiting on
  it would survive a restart. The branch itself was already on `main` — #169
  merged in the queue — so this is the one fact about it travelling to the screen,
  and not the database handle.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**Which changes an AI wrote, would not make on its own, and is holding for them
right now — and what saying yes or no would set in motion.**

A hold is the one object in Loom with no second copy. It exists because the Gate
declined to decide alone; it has been accepted into no log, written into no
revision, and committed to no branch. `git log` cannot show it because nothing was
committed. A build log cannot show it because nothing failed. The repository
cannot show it because the change was never made. It is the single piece of state
in the whole system that is *waiting on a human being*, and until this screen the
only way to find one was to guess which page it might be on.

The second answer is smaller and sharper: **whether the answer you are reading is
complete.** A tool that tells you nothing needs you is worth exactly as much as
its willingness to admit when it has not looked.

## Tests

| suite | on `main` | on this branch |
| --- | --- | --- |
| `(portal)` | 971 passed / 76 files | **980 passed / 76 files** |

**Nine net new tests**, three files new (`_lib/waiting.ts` and its test,
`_components/waiting-card.tsx` and its test, `portal/reading-order.test.ts`).
Nothing was weakened, skipped or disabled.

**`pnpm verify` is red on this branch, and every failure is inherited from
`main`.** They are the docs and marketing failures the framework routine
diagnosed this morning, plus the lessons one it filed; **#217 is open and repairs
the first two**. Stated precisely rather than summarised:

- `(docs)` — `scaffold.ts`'s exhaustive refusal table is missing
  `framework-namespace`, from #195 and #191 merging against different bases.
- `(marketing)` — `facts.test.ts` imports `DECISIONS_AT_LEAST` and
  `DELTA_OPERATIONS` from a `copy.ts` that a later squash carried an older copy
  over.
- `(lessons)` — `run.test.ts` fails on `formTree is not defined`, filed to
  `Loom lessons` as a pedagogical choice rather than a repair.

**I did not carry those repairs here.** #217 contains all of them and is open; a
second copy in this branch is the "two open pull requests from one routine
touching one file" that the 28 August finding says produces the conflicts that
cost the maintainer sixteen pull requests. The portal's own suite is green and its
typecheck is clean; nothing in this diff is implicated in any of the three.

## What I did not do

- **`src/` is untouched.** The hold store's missing deployment-wide read is a
  finding, not a fix.
- **No badge on the rail's "Waiting on you".** It is the obvious next thing and it
  is deliberately absent: with `forTree` as the only listing, a count in the shell
  would mean one query per page on *every* screen in the portal rather than on
  one. Worth adding the day the framework finding below is taken, and not before.
- **No decision record.** Nothing here touches the tree schema, the delta model,
  or an Accepted record.
- **The demo's `answer.ts` comment quotes the old rule sentence** and now quotes
  something that no longer exists. It is another lane's file and it is one comment,
  so it is a finding rather than an edit.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **Merge #217.** It takes `main` from *fatal before any test runs, plus twelve
   failures* to one, and every lane's merge gate is red until it lands.
2. **Lesson 09 needs one sentence from `Loom lessons`.** It is the last failure on
   `main` after #217 and both patches are already written out in `FINDINGS.md`.
3. **Nothing blocking on this branch.**
