# 2026-09-05 — Four units in one tree, and the tone the merge demanded

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-23-four-units-one-tree` (→ `main`).

Visuals — a production build of this commit, in a signed-in browser, photographed
with the recipe #234 filed and verified:

| | |
| --- | --- |
| [The front door, all clear](2026-09-05-portal-four-units-one-tree.png) | 1280px |
| [Nothing yet, for comparison — the same screen family, the other state](2026-09-05-portal-four-units-one-tree-nothing-yet.png) | 1280px |
| [The page screen, with the review queue settled](2026-09-05-portal-four-units-one-tree-page.png) | 1280px |
| [a phone](2026-09-05-portal-four-units-one-tree-phone.png) | 390px |

Put the first two side by side. That is the whole of the second half of this run:
a **green solid card** for *"You're all caught up."* and a **dashed slot** for
*"Nothing has been answered yet."* Until today both were the dashed slot.

---

## What was asked

**No maintainer comment is open on any portal pull request.** #219, #227, #234 and
#240 carry only the deployment bot's comments and my own.

But there *is* a standing maintainer instruction, and it decided this run. It is
in `FINDINGS.md`, filed by `@jonathanbravecredit` on 28 August with the record of
the sixteen pull requests closed unmerged:

> **Before starting a unit, check whether you already have an open pull request.
> If you do, continue it rather than branching again from `main`** — push onto
> that branch. Two open pull requests from one routine touching one file is a
> conflict you are creating for yourself, and the cost lands on the maintainer,
> not on the run.

This lane had **four** open. Three of them — #219, #234, #240 — edit
`_components/shell/nav-items.tsx`. All four edit `FINDINGS.md`. That is the exact
shape that closed sixteen pull requests a week ago, and the next unit cut from
`main` would have made it five.

So the plan did not decide this run. That did.

## What shipped, first half: the four units are one tree

`portal-23` is `main` with #219, #227, #234 and #240 merged into it in order, and
**`pnpm verify` green on the result**. Nothing was rewritten and nothing was
dropped: every commit from all four branches is in the history, and the four pull
requests can be closed in favour of this one rather than re-done.

| Merged | What it is | Conflicts |
| --- | --- | --- |
| **#219** `portal-19` | The front door — everything waiting on you, wherever it is | — |
| **#227** `portal-20` | What a green check actually checked | `FINDINGS.md` |
| **#234** `portal-21` | Is anybody trying to get in? | `FINDINGS.md`; `nav-items.tsx` auto-merged |
| **#240** `portal-22` | What Loom is allowed to do here | `FINDINGS.md`; `nav-items.tsx`, `write.ts` auto-merged |

**Three conflicts, all in `FINDINGS.md`, all the same conflict**: two branches
appending a block of findings at the same point in the file. Resolved by keeping
both, in date order. Nothing was reworded and no finding was dropped.

`nav-items.tsx` auto-merged across three branches and I read the result rather
than trusting it — that file is the one the closure finding names as the shape
that does not combine. It is correct: `Waiting on you` leads the rail (#219),
`Rules` sits beside `Pieces` (#240), and the `Sign-ins` reasoning is intact
(#234). The rail's own filesystem test covers the new entry automatically,
because it derives what it checks rather than listing it.

## What shipped, second half: what the merge made possible

Two things only became available once the four were in one tree, and both of them
are things this lane had already filed against itself.

### The plain-reading helper had reached seven copies

#240's comment said this in as many words: *"the plain-reading test helper is now
in three copies, and the two it was meant to be merged with are on unmerged
branches… this is the last time that is defensible."* With the branches merged,
it is seven — the same eight lines of `readFileSync`, `join(process.cwd(), "app",
"(portal)", …)` and the same comment-stripping regex, written out in seven
`reading-order.test.ts` files.

Sharing those eight lines is the smaller half. **The larger half is that a
per-screen guard only guards the screens somebody wrote one for.**

- `_lib/screen-source.ts` — `portalScreens()` enumerates every `page.tsx` under
  `(portal)` from the filesystem, the way the rail's items are already checked
  against it; `portalFile(…)`, `screenSource(file)` and `isForwarding(source)`
  are the rest.
- `every-screen.test.ts` — the rules that hold everywhere, run over whatever the
  filesystem holds. **No reversal** of a row or column, over the whole lane
  rather than seven page files. **The subject before the technical record** — the
  governing principle, mechanised: a screen may not open a `<TechnicalDetail>`
  before it has said what a reader is looking at. **A heading in the portal's own
  case.**
- The seven per-screen guards keep only what is true of their own screen. Their
  prose is untouched.

A guard that runs on the screens somebody remembered is a guard that misses the
screen nobody thought about. **`/portal/trust` had never had one**, and it is
where the first run of this one found a defect.

### `empty` was doing two jobs, and one of them was the opposite of the other

Three notices in this portal announced a **good result** inside the dashed box
whose documented meaning is *"there is nothing here yet"*:

| Where | What it said |
| --- | --- |
| `/portal` | **You're all caught up.** |
| the page screen's review queue | **Nothing is waiting for you.** |
| `/portal/trust` | **It was never wrong by more than a coin flip.** |

None of those is an absence. Every one is Loom having done its job and having
something to report — and a reader who does not open a disclosure was meeting a
blank slot where a clean bill of health should be.

**The tell was in the copy, which had started arguing with its own container.**
The calibration one read *"That is the result, not an empty section"*. The other
two carried a disclosure headed *"What an empty queue does and doesn't mean"*.
When a writer has to explain away a border, the border is wrong.

So `StateNotice` has a fourth tone. `settled` — solid rather than dashed, in the
same green the portal already uses for a change that went through. It is the one
tone with nothing to do: a person who is caught up is not being asked for
anything, and inventing a button for them would be inventing work.

The sentence apologising for the container is gone from the calibration notice.
Nothing else was removed — the small-sample caveat it was attached to now reads
*"read it as a good sign rather than as a guarantee"*, which is the same fact
without the apology.

### And `empty` now cannot compile without an answer to "what do I do now?"

The brief's third rule is that every screen answers it, and an empty state is
where a new person actually starts. `StateNotice`'s props are a discriminated
union now: **`tone="empty"` without an `action` — or without a `title` — is a type
error.**

A test could only have checked the screens somebody wrote a test for. This
catches the screen nobody thought about, on every screen, forever. It is asserted
with `@ts-expect-error`, which fails the typecheck if the line stops being an
error, so it cannot rot into a comment.

### The error screen was the last one in lower case

`something here failed`, and a button reading `try again`. Every other action in
this portal reads *"Apply this change"*, *"No thanks"*, *"Try the demo"*. It is
**Something went wrong** and **Try again** now, and the notice under it reads
*"This page didn't finish loading."*

The brief names error states as one of the two things a new person meets first.
A person who has just hit a failure is deciding whether this software is looked
after, and the screen greeting them was the one screen not holding to the
portal's own voice. `every-screen.test.ts` pins it: I reverted the heading by
hand to check the guard bites, and it does.

## Tests

`pnpm install && pnpm verify` **green, exit 0** — typecheck, both suites, and
`next build` across all six route groups. Nothing weakened, nothing skipped.

| Suite | Files | Tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 (untouched by this diff) |
| `@loom/app` | 172 | 2747 |

The four merged branches together bring `@loom/app` to 170 files / 2643 tests.
**This run's own half adds 2 files and 104 tests** on top of that:

- **`_lib/screen-source.test.ts` — 9, new file.** The enumeration finds the routes
  that exist and not one that does not, keeps a dynamic segment as Next writes it,
  returns each screen once in route order, and leaves the route group out of the
  route. Then the distinction `isForwarding` exists for, asserted against the two
  real files: `/portal/trees/[[...rest]]` is a forward and `/portal/sign-in` is
  not, **and the sign-in file really does call `redirect`** — which is the case a
  heuristic keyed on that call got wrong, and would have quietly excused the one
  page every signed-out visitor lands on.
- **`every-screen.test.ts` — 99, new file.** Mostly `it.each` over the lane, which
  is the point: the count is the number of files, so a new screen is inside the
  guard the moment it exists. Two of them guard the guard — an enumeration that
  silently returned nothing would let every rule below it pass over an empty list
  and report green.
- **`state-notice.test.tsx` — 3 net new (5 → 8)**, including the two
  `@ts-expect-error` assertions and the tone's own visual property: `settled` is
  not dashed, and is not merely *different* from `empty` but specifically carries
  the applied colour.
- **`review-queue.test.tsx`** and **`error.test.tsx`** updated to the new strings
  and the new tone. Both got *stronger* rather than adjusted: the review queue
  now also asserts the card is not dashed.

## Three things a screenshot found and the tests did not

Consistent with every run since 20 August. The first is fixed here; the other two
are filed.

1. **The sign-in trap, exactly as #234 described it.** My first run of the
   screenshot script waited for a URL matching `/portal`, which `/portal/sign-in`
   satisfies — so it photographed the sign-in page believing it was the portal. I
   caught it by looking at the image. The script waits for the path to stop
   containing `sign-in` now, and every shot asserts it did not bounce.
2. **`pkill -f "next start"` killed my own shell**, mid-run, which is the second
   trap in the same finding. Recorded again because it cost a command.
3. **`<h1>{treeId}</h1>`.** The largest text on the busiest screen in the portal
   is a machine identifier. Filed — see below.

That is the nineteenth defect this lane has found by looking at a screen rather
than in a test, across twelve runs.

## The high-schooler test

*Could somebody who has never read a decision record say what happened and what
they should do next?*

Applied to the front door, the page screen, the calibration screen and the error
screen this run. From the first screenshot, unaided: *Nothing needs me. Loom
stops and asks when it isn't sure, and it hasn't had to. While I'm here I could
check whether the AI has been getting the ones it didn't ask about right. Also,
this queue won't survive a restart because there's no database.*

The change that matters is that the first sentence now arrives from the **shape**
of the card and not only from its words. Green and solid says *fine*; dashed says
*empty*. A person skimming gets the right answer without reading.

Where it stops, correctly: `t_seed1`, `loom.card`, `revision 0` — names.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

Unchanged from #219's answer, because most of this diff is #219: **what is
waiting on you, wherever it is.** A hold exists only because the Gate declined to
decide alone; it lives in the runtime's hold store and no repository, build log
or `git log` has ever seen one.

This run's own half does not add a fact. It makes one legible: **`git log` can
tell you a check passed; nothing can tell you at a glance that a review queue is
empty because everything was judged rather than because nothing has happened
yet.** Those are opposite situations and the portal drew them identically. The
honest framing is that this is the difference between a developer trusting the
screen and re-deriving it, and a screen nobody trusts is worth what a screen
nobody opens is worth.

## What I did not do

- **`src/` is untouched.** Nothing was wanted from it.
- **No decision record.** A notice's tone and a test's location are portal
  decisions; nothing here touches the tree schema, the delta model, or an
  Accepted record.
- **No count badge on the rail.** It is the obvious next thing and it is
  deliberately absent: `_lib/waiting.ts` fans out one hold read per page because
  `HoldStore` has no deployment-wide read, and putting that in the shell would
  run it on **every screen** rather than on one. That is the framework finding
  #219 filed, and the badge is worth adding the day it closes — not before.
- **`/portal/pieces` still puts the way out between the heading and its own
  sentence on a phone.** #240 filed it; the fix belongs in the run that rewrites
  that screen, and this diff does not touch it.
- **No follow-up scheduled.** Token discipline.

## Recommendations

1. **Merge #243 (this one), then close #219, #227, #234 and #240 as superseded.**
   Their commits are all in this tree. Merging any of them afterwards is a
   conflict against work already landed.
2. **The three lines in `docs/routines.md` about commit identity**, which #234
   asked for and is now the fifth occurrence across four lanes. A routine cannot
   write the governance it is bound by.
3. **Nothing blocking.**
