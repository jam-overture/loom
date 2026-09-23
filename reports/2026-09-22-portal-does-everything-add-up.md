# 2026-09-22 — "Does everything add up?"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-34-does-everything-add-up` (→ `main`), cut from `main` at
`b36adb0`. Not stacked. **The only open pull request in the repository when this
run started was #353, `Loom daily build`'s**, so there were no maintainer
comments on this lane's work to address and nothing of this lane's to push onto.

Visuals — a production build of this commit, in a signed-in browser, against a
staged deployment of four pages. **The red verdict on the first of them is the
first photograph this project has of a failing checkup.** The links below are
relative and resolve in the repository; the pull request links to the same files
on `github.com` rather than embedding them, for the reason in finding 4 below.

| | |
| --- | --- |
| [One page doesn't add up](2026-09-22-portal-does-everything-add-up-wide.png) | 1280px — the verdict, the tally, and the four rows worst-first |
| [The same screen on a phone](2026-09-22-portal-does-everything-add-up-phone.png) | 390px |
| [Everything that could be checked adds up](2026-09-22-portal-does-everything-add-up-clean.png) | 1280px — the green arm, and the three pages it refuses to speak for |
| [Nothing could be checked](2026-09-22-portal-does-everything-add-up-nothing-checked.png) | 1280px — `Checked just now 0`, and a headline that says so rather than a green tick |
| [The screen that now has one thing to do](2026-09-22-portal-does-everything-add-up-landing.png) | 1280px — `/portal/checkup`, with the press above the list |

**How the pictures were taken.** Four trees built with the published builders
into a `memoryTreeStore()` on `globalThis[Symbol.for("loom.portal.store")]`, one
of them the portal's own seed rebuilt from the same `sequentialIdFactory("seed")`
so its id and every node id match. **Three accepted changes were appended through
the store's own `append`**, each applying to the tree the one before it produced
— so the log the sweep folds is a real log, and `3 changes to replay` on the
landing screenshot is the store's own count.

**One read is staged, and it is the thing the unit is about.** The drifted page
is produced by a wrapper whose `head` returns a tree the log does not produce.
That is not a shortcut: a drift **cannot** be produced through the portal's own
write path, because `append` is one write over the log and the snapshot by
construction. The honest statement is that the fault is injected at the snapshot
read, which is exactly where the fault it models occurs. What is not staged is
anything above it — the fold, the comparison, the standings, the wording, the
render.

Taken with a private Playwright script again, for the seventh consecutive run —
see the standing finding, to which this run adds the one thing above.

---

## What was asked

`docs/rollout.md` and the last six reports of this lane all name the same next
unit, and it has lost to an open finding owned by this lane five times running.
The 21 September report said plainly that *"five is enough that the next run
should take it unless something is filed against this lane before then"*.
Nothing was filed against this lane in the meantime. So this run took
`/portal/checkup`.

It did not take the screen the plan pointed at. It took the question that screen
could not answer.

## The defect

`/portal/checkup` checks **one page, when asked**. That is the right shape for
the fold — 0016 made the snapshot a materialised view precisely so nothing on a
request path replays a log — and it is the wrong shape for the question a person
has.

Nobody wakes up wanting to check a page. They want to know whether **anything**
has gone wrong. A screen that can only answer that one page at a time never gets
asked, which is why the most Loom-specific screen in the portal is also the one
nobody opens.

And the screen it opened on had **no primary action**. A list of pages, with an
identical `Check this page →` on every row: as many primary actions as you have
pages, which is to say none.

## What shipped

**One press, one verdict, over every page — and a screen that refuses to call an
unchecked page a passed one.**

| | |
| --- | --- |
| `_lib/checkup-sweep.ts` | new — `PageStanding`, `plainStanding`, `standingOf`, `rowNote`, `inWorstFirstOrder`, `SweepReading`, `sweepReading` |
| `portal/checkup/everything/page.tsx` | new — the sweep, at an address somebody can be sent |
| `checkup/_components/sweep-verdict.tsx` | new — the answer, the tally it rests on, the runtime's account one click down |
| `checkup/_components/sweep-rows.tsx` | new — every page, worst first, each a link to its own account |
| `checkup/page.tsx` | one primary action above the chooser; the heading asks the question a person arrives with |

### The rule the module is mostly made of

> **A check that did not happen is never counted as a check that passed.**

There are four ways a page reaches no verdict — its history could not be
replayed, its history could not be read, this deployment has no record of the
shape it started as, or the listing stopped before reaching it. Each is a
separate arm, and the headline withdraws the word *everything* whenever any of
them is non-zero:

| | what the screen says |
| --- | --- |
| all clean | *Everything adds up.* → **Nothing to do.** |
| some do not match | *One of your pages doesn't match its own history.* → *Open the first page below.* |
| some reached no verdict | *1 of your pages couldn't be checked.* + *a page nobody could check is a page nobody has checked* |
| some have no starting shape | *All 3 pages that could be checked add up.* + *they were left out rather than passed* |
| nothing was checked at all | *Nothing could be checked, so nothing here says your 4 pages are fine.* |
| no pages at all | *There are no pages to check.* — not green, and not a failure |

The fifth row is the one that matters most and is the arm a later edit would
collapse into the green one, because "no problems were found" is true of it. It
has a test of its own saying it is not green.

### The listing's own honesty

A sweep replays a whole log per page, so it is bounded at 25. The remainder is
not hidden: `everyPage` is false whenever the store's listing has more, and the
headline becomes *"The first 25 pages all add up, and there are more than that"*
with a next move instead of *Nothing to do*. A screen claiming a clean bill of
health over pages it never listed would be wrong in exactly the way the rest of
the module exists to prevent.

### The folds run one after another

Every other fan-out in this lane is a `Promise.all`, and this one is not. A
`headsOf` is one bounded read per page; **a fold is a paged walk of a log whose
length is the number of changes ever accepted**, so twenty-five in flight is an
unbounded number of concurrent reads against a pool sized for a request. The
reviewer who pressed *check every page* is expecting to wait; nobody else on the
deployment should have to. It is written as a `reduce` over a promise rather than
a loop, so the sequence is the shape of the code — and `reading-order.test.ts`
asserts `Promise.all` is not in that block, because the shape every other file in
this lane teaches is the one somebody will reach for.

### The two things a row would otherwise drop

A standing is a word, and a word is the same width whether one part of a page
disagrees with its history or four hundred do. `rowNote` adds the count — and
the case that makes it worth having is the other one: **a page can agree with
its own history and still have names pointing at two different parts** (0038).
Its own checkup reports that under a green verdict. A row printing only *Adds
up* would have been the one place in this portal where that finding vanished.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**That the pages they are serving right now are — or are not — the pages their
own recorded history produces, across the whole deployment, as of one press.**

- **`git log` holds what was applied.** It cannot say whether applying it
  produces what is being served, because it has never seen the thing being
  served. The snapshot is not in the repository; it is in the store.
- **Nothing logs this and nothing throws.** A diverged snapshot serves pages
  perfectly. Every request succeeds, every render is correct, and the only
  symptom is that the record has stopped explaining the product. There is no
  alert, no exception and no log line anywhere in the system that fires here.
- **A build log cannot represent the question.** It measures what a build
  produced from source. Nothing here came from source — the page is a stored
  tree, and the question is whether a *fold of its own history* reproduces it.
- **The deployment-wide answer exists nowhere else, including in Loom.** The
  runtime answers one tree per call and is explicit that nothing schedules it.
  The only thing that asks the question over everything is this screen.

The claim worth defending is the second. This is not a fact that is hard to get
from other tools — it is a fact that **has no symptom**, so no tool goes looking
for it, and the correct behaviour is indistinguishable from the broken one until
something replays the log and says which.

## The high-schooler test

Applied to `/portal/checkup/everything` in all five states shipped, and to
`/portal/checkup`'s landing.

- **"One of your pages doesn't match its own history."** Passes. Six ordinary
  words and a possessive.
- **"What people are being served is not what the record of changes produces."**
  Passes, and it is the sentence that does the work — it names the two things
  and says they disagree, without naming either of them as a snapshot or a log.
- **"Open the first page below. It names the parts the two disagree about."**
  Passes. This is the answer to *what do I do now* on the one screen where the
  answer is not *nothing*.
- **"3 other pages have nothing to check against… they were left out rather than
  passed."** Passes, and is the sentence a reader most needs and would least
  expect to be told.
- **"Nothing could be checked, so nothing here says your 4 pages are fine."**
  Passes. A bright high schooler reads this and does *not* conclude their site
  is fine, which is the entire point of the arm.
- **The tally** — *Pages found 4 · Checked just now 1 · Add up 0 · Don't add up 1
  · Nothing to check against 3* — passes, and it is the headline's own evidence
  rather than a technical detail, which is why it is above the disclosure and not
  inside it.
- **The disclosure** is the one place the runtime appears: `auditSnapshot`, the
  fold, the seed, the snapshot, 0016 and 0028. Exactly one click, never further.

## What I renamed, and what moved behind a disclosure

Nothing was removed.

| What it was | What it is now |
| --- | --- |
| `/portal/checkup` headed *"Does your page add up?"* over a list with no primary action | headed **"Does everything add up?"**, with **Check every page →** above the list |
| a list of N identical `Check this page →` buttons, and no way to ask about all of them | one press; the per-page rows stay exactly as they were, under *Or check one page* |
| (nothing — a deployment-wide answer did not exist) | `/portal/checkup/everything`, a URL somebody can be sent |
| (nothing — a page nobody checked had no way to be reported) | four standings that are each **not** a pass, named apart |

**What moved behind a disclosure:** the sweep's technical account — that it is
one `auditSnapshot` per page folding each tree's log from its seed, how many
deltas were replayed across how many trees, and why a tree with no registered
seed is reported rather than folded from its own snapshot (0028). All of it new;
nothing was demoted from a surface to get there.

**What I deliberately did not rename.** `Checkup` in the rail and the route.
Both are already a person's word for the thing — they were renamed from `Audit`
on 13 September by the run that rewrote the screen — and the sweep is a second
screen under the same noun rather than a new subject.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green, exit 0** |
| Framework suite | **158 files, 2,927 tests, all passed** |
| Application suite | **294 files, 5,290 tests, all passed** |
| Findings | 744 findings, 0 malformed |
| Prerender check | 109 pages, 943 text junctions, 0 run together |
| Overflow, measured | 1280 vs 1280 on every wide shot, 390 vs 390 on the phone |

**Nothing failed, nothing was skipped, and no test was weakened.**

**72 tests are new** — 47 on the reading, 15 on the rows, 7 on the verdict panel,
8 source guards on the new screen, and 2 added to the landing screen's existing
guard (measured as 7 → 9 there).

**Two defects were caught by these tests before anything shipped**, and both are
the same defect: a count and a verb that disagree. *"All 1 page that could be
checked **add** up"* and *"nothing here says your 1 page **are** fine"*. Both were
found by asserting the whole sentence rather than a phrase inside it — the 24
August lesson again — and both forms are now pinned on both sides of one.

What each group would catch:

- **The counts.** That a page is counted under exactly one heading, asserted as
  the four parts summing to the total; that `checked` counts only the pages a
  verdict was reached for; that accepted changes are counted only where a replay
  finished, since part of a history is not one.
- **The verdict.** Every arm as its own case, including `checked === 0` asserted
  apart from the green arm — the one a future edit collapses because "no
  problems were found" is true of it. *Everything adds up* is asserted **absent**
  beside each of the three not-a-pass standings separately, which is the
  assertion that fails if somebody folds any of them into the green count.
- **The partial listing.** That the word *everything* is withdrawn, that the
  meaning says so, and that the next move stops being *Nothing to do*.
- **Every sentence shown unasked**, through `runtimeWordsIn`, in all eight
  readings and all five standings — and that the eight are eight *different*
  readings, asserted over the whole of each rather than its headline, because
  two arms share a headline on purpose and differ in the sentence under it.
- **The rows.** That a page that passed is listed as loudly as one that failed,
  because a list of faults cannot be counted against the tally above it; that
  every row leads to the same place, including the ones that reached no verdict;
  that a page nobody could name still gets a row; and **the space between the
  standing's sentence and its count**, asserted as one string spanning the join —
  the 20 September finding, asserted rather than eyeballed.
- **The verdict panel.** That the tally is outside `<details>` and the runtime's
  account inside it, asserted as the pair that makes "one click down, never
  further" a property rather than a claim.
- **The screen**, at the source: that the answer comes before the rows it is
  about, that the replays are not fanned out, that the listing is bounded *and
  that the bound is handed to the reading*, and that a page whose history did not
  come back gets a standing rather than being dropped.

## Findings

**Filed three. Closed half of one. Corrected one of this lane's own.**

1. **Half-closed:** the 13 September entry — *the portal's three most important
   screens cannot be photographed*. The photography half is done and the
   pictures are in this report. **The other half stays open and unchanged**: the
   red state is still unreachable by any sequence of clicks in the deployed
   portal, which is a product decision above this lane's line. One useful fact
   is added for whoever takes it: a drift cannot be *created* through the write
   path at all, because `append` is one write over the log and the snapshot — so
   a drifted seed has to be stored that way, which is a smaller change than it
   sounded like in September.
2. **Filed, this lane's own:** `/portal/checkup` lists the one page you *can*
   check below three you cannot, because the chooser sorts by store order while
   the sweep added here sorts worst-first. Two lists of the same pages, two
   rules. Filed rather than fixed because a list of *actions* may honestly want a
   different sort from a list of *results*, and that argument belongs to the run
   that takes it.
3. **Re-filed by reference:** the screenshot harness still cannot sign in,
   seventh consecutive run. The 14, 19, 20 and 21 September entries stand.
4. **Filed, correcting an entry of this lane's own:** the 20 September finding
   says every screenshot in every pull request is broken because the PR tool
   wraps URLs in backticks. It is right that none has ever arrived and wrong
   about why. This run posted #367's body and read it back through the API:
   **no backtick was added to any URL.** The images were invisible anyway, and
   the reason is that this repository is **private** — GitHub proxies a PR
   body's images anonymously, so `raw.githubusercontent.com` returns 404 for
   everybody including the maintainer, in markdown or in HTML, with or without
   escaping. #367 links to the blob pages instead, which is the one form a
   signed-in reader can open. What is worth keeping from the 20 September entry
   is its method rather than its conclusion: it is the run that established you
   have to read a body back from the API to see what it says, and this
   correction exists because that instruction was followed.

## What I did not do

**I did not add the sweep to the front door.** A line on `/portal` reading
*"Does everything still add up?"* is the obvious next move and is how this screen
gets opened daily rather than found. It is a different screen with its own
reading-order guard and its own argument about what belongs on it, and putting
it in this branch would have made the diff two screens instead of one.

**I did not touch the chooser's order**, which is the finding above.

**Nothing is scheduled and no pull request is subscribed to.** The harness
subscribed this session to #367 automatically when the pull request was opened,
and it was unsubscribed: three of the first five events it delivered were the
Vercel bot editing its own comment, and a wake per bot edit is exactly the cost
that scales with how long the maintainer is away. The pull request is green —
`Deployment has completed` on the head commit — and there is nothing on it for
this run to drive.

**The staging is gone.** `apps/loom/node_modules/.shot/` held the preload, which
had to sit inside the application for `@loom/runtime` to resolve; it and the
Playwright script were deleted before this report was written, and nothing from
either is in the diff. The recipe is in *How the pictures were taken* above, for
the run that has to build it again.

**I did not build a fifth standing for a page whose id the store lists but whose
tree has since gone.** `checkOne` reports that as `could-not-be-read`, which is
true and is the safest of the four — but it is a `not-found`, and a page that
has been deleted is a different thing from one whose store is down. Nothing in
the portal can produce it today; it is worth a sentence in the run that can.
