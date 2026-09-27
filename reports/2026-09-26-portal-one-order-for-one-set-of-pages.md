# 2026-09-26 — "One order for one set of pages"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-36-one-order-for-one-set-of-pages` (→ `main`), cut from `main`
at `b126601`. Not stacked, and `main` was not pushed to.

**Maintainer comments: none to address.** Four pull requests were open when this
run started — #400 (lessons), #401 (primitives), #402 and #403 (framework and
demo) — and **none of them is this lane's**. There is no open portal pull
request, no review comment on this lane's work, and nothing has been filed
against this lane since the 25 September report.

Visuals — a production build of each commit, in a signed-in browser, against one
staged deployment. Both builds were photographed by a server started **after**
that build, and the stale-server trap in the 26 September finding caught this run
once: the `before` server reported `EADDRINUSE` because the `after` server was
still alive, and the first `curl` after it said `200`. The pictures would have
been of the wrong build. It was found because the server log was read as well as
the status code, which is the same two-sources habit the gate rule is written
under.

- [`/portal/checkup` — before](2026-09-26-portal-one-order-checkup-before.png) — 1280px, the defect in one frame: the one page you can check is **fourth**
- [`/portal/checkup` — after](2026-09-26-portal-one-order-checkup-after.png) — 1280px, it is first, and the list says so
- [`/portal/pages` — before](2026-09-26-portal-one-order-pages-before.png) — 1280px
- [`/portal/pages` — after](2026-09-26-portal-one-order-pages-after.png) — 1280px, the page with three changes waiting on an answer leads
- [`/portal/pages` on a phone — before](2026-09-26-portal-one-order-pages-phone-before.png) — 390px
- [`/portal/pages` on a phone — after](2026-09-26-portal-one-order-pages-phone-after.png) — 390px
- [`/portal/history` — before](2026-09-26-portal-one-order-history-before.png) — 1280px
- [`/portal/history` — after](2026-09-26-portal-one-order-history-after.png) — 1280px, the longest history leads and the two empty ones tie-break by name
- [`/portal/checkup/everything` — before](2026-09-26-portal-one-order-sweep-before.png) — 1280px
- [`/portal/checkup/everything` — after](2026-09-26-portal-one-order-sweep-after.png) — 1280px, worst first as before, said out loud

**How the pictures were taken.** Four pages in a memory store built with the
published builders onto `globalThis[Symbol.for("loom.portal.store")]`, three of
them created by the staging script and the fourth the portal's own seed, added by
`ensureSeeded` on the first request — which is what makes it the only checkable
one, and what put it last in cursor order. Holds were placed through
`memoryHoldStore` onto the second carrier. The harness signed itself in by
driving the real form through a shot's `before` approach against a roster this
run chose, which is the route the 22 September entry added and is one step
simpler than minting a cookie. The staging lived in
`apps/loom/node_modules/.shot/` and was deleted before the gate was re-run;
nothing from it is in the diff.

---

## What was asked

The 25 September report's first recommendation, in its own words:

> **One order for one set of pages.** Three screens now count or list the same
> pages under three different rules and it is visible to anyone who opens two of
> them.

The finding behind it was filed on 22 September with two screens in it, re-filed
on the 25th with a third, and both times the entry said the argument belonged to
the run that took it. Nothing outranked it: no open pull request of this lane's,
no maintainer comment, nothing filed against this lane in a day.

## The defect, and the two screens nobody had counted

A sweep of the lane found **six** lists of pages, not three.

| Screen | What it listed, and in what order |
| --- | --- |
| `/portal/pages` | whatever the store returned |
| `/portal/history` — the chooser | whatever the store returned |
| `/portal/checkup` — the chooser | whatever the store returned |
| `/portal/checkup/everything` — the sweep | worst first, then whatever the store returned |
| `/portal/readers` | **by tree id**, through `localeCompare` |
| `/portal` — the failure list on the front door | whatever a fan-out resolved in |

"Whatever the store returned" is a **cursor order**. It exists so a listing can
be resumed, and it is a property of the implementation rather than a decision
anybody made: the memory store walks its keys, a Postgres store walks an index.
So a reader who opened two of these saw one set of pages twice, arranged two
ways, with no way to tell whether the two screens agreed about anything.

The two that had not been counted are the more interesting half, and they are the
reason this was found by sweeping rather than by reading the finding:

- **`/portal/readers` arranged pages by the runtime's own name for them.**
  `left.treeId.localeCompare(right.treeId)` — an identifier as a sort key, on a
  surface whose whole subject is what people did with a page. It is also the one
  place a collation had crept in, which is the hazard the new tiebreak is written
  against.
- **The front door's failure list had no order at all**, and its disclosure pairs
  each row with its own account of what the store said **by position**. Two
  failures could be drawn either way round on two consecutive loads of one
  screen.

## What shipped

**One tiebreak, five orders, and every list saying which one it is in.**

| | |
| --- | --- |
| `_lib/page-order.ts` | new — `PageOrder`, `ORDER_LEAD`, `SAME_AFTER_THAT`, `byName`, `inPageOrder`, `needsYouRank`, `readyToCheckRank`, `mostChangedRank` |
| `_components/list-order.tsx` | new — the sentence, and the argument for the order one click down |
| `_lib/checkup-sweep.ts` | `worstFirstRank` exported; `inWorstFirstOrder` built on `inPageOrder` and taking the names it already had beside it |
| `portal/pages/page.tsx` | `needs-you-first` |
| `portal/history/_components/tree-chooser.tsx` | `most-changed-first` |
| `portal/checkup/_components/checkup-choices.tsx` | `ready-to-check-first` |
| `portal/checkup/_components/sweep-rows.tsx` | `worst-first`, unchanged as a rule and now stated |
| `portal/readers/page.tsx` | `by-name` |
| `_components/unreadable-pages.tsx` | the tiebreak, and the one stated exemption from the sentence |
| `every-page-list.test.ts` | new — the lane-wide guard, over lists found rather than listed |

### The answer is not one order for all six, and that is the decision

Forcing one arrangement on all six would mean five of them leading with something
irrelevant. The sweep would bury a page that **failed** underneath a page waiting
on an answer, on the one screen whose entire job is to report failures — which is
a worse defect than the one being fixed. An order is how a list answers *what do
I do now*, so:

- a list you **act on** leads with the page that needs you;
- a list you **pick from** leads with the pages you can actually pick;
- a list of **results** leads with the bad news.

What is shared is the two things that make six lists legibly one portal:

1. **Every list says which order it is in**, in one sentence, above itself.
2. **Every list has the same tiebreak**, so two screens agree about the pages they
   have nothing to say about — which on a healthy deployment is all of them. This
   is the half that actually removes the cursor order: the bottom of all six lists
   used to be arbitrary and to differ between deployments, and it is now the
   page's own name everywhere.

### The tiebreak, and why it is not `localeCompare`

Case-folded codepoint order, then the id. Both halves are about the same thing.

`localeCompare` is the obvious implementation and the wrong one: its answer
depends on the locale and on which ICU data the runtime was built with, so two
deployments of one portal could arrange one pair of pages two ways — which is the
defect this module exists to remove, moved one layer down and made much harder to
see. `/portal/readers` was already using it. There is a test that fails if
somebody reaches for it again.

Ending on the id makes the order **total**. Two pages can genuinely share a name
— a name is derived from the page's own leading heading (`page-name.ts`), and
nothing stops two pages leading with the same one — and two rows left tied would
fall back to cursor order, which is the bug in miniature.

### What it costs

**Nothing.** Every rung of every rank is a fact its screen had already read: the
waiting counts on `/portal/pages`, the revision on both choosers, the seed
registry (a memoised pure function) on the checkup chooser, the standing the
sweep has just computed, and the names on `/portal/readers`. No screen gains a
read, and each screen's reading-order guard is what says so.

### The one list that does not say what order it is in

The front door's failure list, and the exemption is an argument rather than an
oversight: **every row there needs the same thing from a reader, which is to go
and look at it.** An order sentence names the *top* of a list, so a list with no
top would be claiming a priority it does not have — and on a failure notice, a
reader concluding that the second row matters less is the one wrong conclusion
available. It takes the tiebreak, which is the half that is not optional, and
both of its lists are now built from the same ordered rows.

The exemption is written at the point of use with its reason beside it, which is
the rule `runtimeWordsIn`'s `except` is written under: an exemption a reviewer has
to read is one a reviewer sees. A test fails if an exemption outlives the list it
is for.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**Which of their pages needs them, from whichever list they happen to have open —
and, for the first time, that the lists agree.**

- **The repository cannot answer it.** A hold exists because the Gate declined to
  decide alone (0019); it lives in the runtime's hold store and nowhere else. No
  commit, no build output and no `git log` has ever seen one. `needsYouRank` is
  built entirely out of facts that exist only at runtime.
- **`git log` cannot answer it.** A page created by a host calling `create` leaves
  no commit at all, and `revision` — the rung `/portal/history` ranks on — counts
  accepted deltas rather than commits. The two numbers are not the same number and
  nothing outside the store holds the second.
- **Nothing else knows what a page is called.** The name every one of these lists
  now falls back to is derived from the page's own leading heading at its head
  revision, so it is the name a visitor is currently being served. The heading was
  never written as markup and is not in any file.

The honest scope: this run adds no new fact. What it does is stop the portal
disagreeing with itself about facts it already had — which is the difference
between a reviewer trusting two screens and checking both.

## The high-schooler test

Applied to all six lists.

- **"Pages waiting on you come first."** Passes. Six ordinary words and it names
  the top, which is the only part of an order a person needs told.
- **"Pages Loom can check come first."** Passes, and it is the sentence the
  before-picture makes necessary: a reader looking at three rows they cannot press
  needs to know the pressable one is not further down.
- **"Pages with the most changes come first."** Passes — and it says *most
  changes* rather than *most recent*, because that is what the number is. A
  listing carries no time at all, so a chooser promising recency would be the
  portal inventing the field §1 deliberately kept out of the document. There is a
  test for that sentence not saying *recent*, *latest* or *newest*.
- **"Anything that needs looking at comes first."** Passes.
- **"Pages are listed by name."** Passes, and it is the one order with no rung in
  front of the tiebreak — so it is the one that does **not** also say *after that,
  every list here is in the same order*, because that would be a second sentence
  about nothing.
- **"After that, every list here is in the same order: by name."** Passes, and it
  is the sentence that does the work: it is the only thing on any of these screens
  that answers *do these two lists agree*.
- **What do I do now?** Unchanged on every screen and improved on one: the
  checkup chooser's single action is now the first row rather than the fourth.
- **The disclosure** — *Why this order* — is the one place the runtime appears:
  cursor order, the memory store's keys, a Postgres index, held proposals, the
  revision count, the seed and 0028, the fold's standing, and the tree id as the
  final key. Exactly one click, never further.

## What I renamed, and what moved behind a disclosure

Nothing was removed.

| What it was | What it is now |
| --- | --- |
| six lists of pages in six arrangements, none of them stated | five stated orders and one stated exemption, all ending on one tiebreak |
| `/portal/checkup`'s one pressable row, fourth | first |
| `/portal/readers` arranged by tree id, through a collation | by the name the page gives itself |
| the front door's failure rows and their store errors, paired by position in two independently-ordered lists | both built from one ordered list |
| the sweep's *worst first*, a rule a reader had to infer from four rows | a sentence above the rows |

**What moved behind a disclosure:** the whole argument for the order. That a
store's listing order is a cursor for resuming a paged read rather than an
arrangement anybody chose; that the memory store takes it from key order and a
Postgres store from an index; which fact each list ranks on; and that the tail is
the derived name with the tree id last so the order is total. All of it new;
nothing was demoted from a surface to get there.

**What I deliberately did not rename.** Any route, heading or rail label. This
unit changes what order rows appear in and adds one sentence per list; a rename in
the same branch would make the diff about two things.

## Tests

All numbers are real runs, from a `pnpm verify` redirected to a file with its
exit code read from a second file — never through a pipe, and never with anything
after the gate on the same line (the 12 and 25 September findings).

| | `main` at `b126601` | this branch |
| --- | --- | --- |
| `pnpm install && pnpm verify` | — | **green, exit 0** |
| `@loom/runtime` | 161 files / 3,130 tests | **161 / 3,130** — `src/` was not opened |
| `@loom/app` | 315 files / 6,103 tests (measured on `main`) | **318 / 6,161** |
| findings | 814, 0 malformed | **817**, 0 malformed |
| prerender | — | 112 pages, 1,300 junctions, 0 run together |
| overflow, measured | — | 1280 vs 1280 on every wide shot, 390 vs 390 on both phone shots |

**Nothing failed, nothing was skipped, and no test was weakened.**

**+58 tests**, and the breakdown is worth reading because two of them are not
mine:

- `_lib/page-order.test.ts` — **34**
- `every-page-list.test.ts` — **14**
- `_components/list-order.test.tsx` — **7**
- `_lib/checkup-sweep.test.ts` — 47 → **48**
- `every-screen.test.ts` — 524 → **526**, which nothing in this branch asked for:
  it enumerates every sentence the lane shows unasked and holds each against the
  runtime's vocabulary, so the two new sentences were inside the plain-language
  rule the moment they existed. That is the lane-wide guard doing precisely what
  it was written for.

What each group would catch:

- **The tiebreak.** That it ignores case, so a lower-case heading is not exiled to
  the end. That it falls through to the id, so the order is total and a list
  photographed twice is one list. That it is antisymmetric on every pair.
  **That it does not depend on a collation** — `Über` against `Zebra`, which a
  German collation and a codepoint comparison disagree about, and which is the
  assertion that fails if somebody reaches for `localeCompare` again.
- **The claim of the module**, as its own test: two screens ranking the same pages
  on different facts produce the same list when neither has anything to separate
  them.
- **Each rank's ladder**, rung by rung. The one with most riding on it is that a
  waiting count which **could not be read** ranks above a count that is zero — the
  two were drawn identically until 24 September put a mark on the second, and
  ranked below a known-empty page it would go straight back to where nobody looks.
- **That a count is not an urgency.** A page with twelve waiting changes does not
  outrank one with a single change that has been sitting since July, because the
  queue *inside* both is sorted by how long something has waited (`inQueueOrder`)
  and a page order contradicting it would be this portal disagreeing with itself.
- **The lane-wide guard, in two halves.** Every list of pages goes through
  `page-order.ts`, and every list a reader picks from renders `<ListOrder>`. The
  lists are **found from the filesystem** rather than listed, by the one thing
  React makes compulsory — a rendered element keyed on a tree id — so a seventh
  list is inside both rules the moment somebody writes one. Both halves are
  guarded against becoming vacuous: the detector is asserted to match a real key
  and not to match a proposal id, and the set of six is pinned.
- **Both ends of the plain-language rule on one render:** the sentence is free of
  the runtime's vocabulary and the disclosure beside it is full of it. That pair
  is what makes "nothing is ever removed" a property rather than a claim.
- **That `by-name` does not claim a top**, and that the four ranked orders do.

### The one existing assertion that changed, and why it is not a weakening

`sweep-rows.test.tsx`'s *"adds nothing to a row with nothing to add"* read
`container.textContent` for the absence of the word *disagree*. The list now
carries a sentence above it whose disclosure explains that two screens listing the
same pages used to disagree — so a rule about a **row** was being decided by prose
that is not on any row. It reads the `<li>` now. The subject was always the row;
nothing about a clean row is unchecked.

The other changed assertion is `inWorstFirstOrder`'s stability test, and it came
out stronger. It used to assert that pages of one standing keep the order the
store listed them in. It now asserts they are arranged by name — which keeps the
property the old test was defending (*two presses cannot reshuffle the quiet half
of the screen*, because the name order is total) and adds the one it could not
have (*the quiet half agrees with every other list in the portal*).

## Two defects a screenshot found, and neither had a failing test

The fifth consecutive run in which looking at the screen found what the suite
could not — though this time one of them was found by looking at a **log** rather
than at a picture, which is the same habit applied one step earlier.

1. **The `before` pictures were nearly of the `after` build.** The server from the
   previous shoot was still running, so `next start` on the rebuilt tree exited
   with `EADDRINUSE` and the `curl` that followed answered `200` from the old
   process. Every check that a lane would normally make said the server was up.
   It was caught because the server's own log was read beside the status code and
   the two disagreed — `✓ Ready` was absent and `Failed to start server` was
   there. The 26 September finding predicts this exact failure and says a report
   that does not know which build its pictures are of should not be trusted; this
   one is the first in this lane that can say how it knows.
2. **`prettier` has no configuration in this repository**, and running it on an
   existing file rewrites the whole file — semicolons, an 80-column wrap, the lot.
   Eight files in this lane were reformatted end to end before anything was
   committed, turning a 200-line change into a 1,100-line one. Reverted and every
   edit redone by hand. Filed, because the next lane to reach for the obvious
   formatter will do the same thing and may not check the diff first.

## Findings

**Filed two. Closed one — the oldest open item in this lane.**

1. **Closed: three screens count the same pages under three different rules.**
   Six, and all six now say which order they are in and share one tiebreak. The
   entry's own recommended answer — *the orders are right and what is missing is a
   sentence on each* — was right, and it is a property here rather than a sentence
   somebody has to remember to write.
2. **Filed: `prettier` reformats this repository's files.** No `.prettierrc`, no
   `format` script, no lint step in `verify`. Recorded with the settings that
   reproduce the house style closely (`--no-semi --print-width 98 --trailing-comma
   es5`), and with the measurement that they do **not** reproduce it exactly on
   three of four lane files — so the recommendation is a checked-in config or an
   explicit note that formatting is by hand, rather than a lane guessing.
3. **Filed: `/portal/readers` groups a page's versions with a collation.**
   `revisionReadings` sorts on `treeId.localeCompare(treeId)`. The **screen's**
   order is fixed here; the grouping inside the reading is not this unit's and is
   left where it is, with the argument written down.

## What I did not do

**I did not touch a route, a heading or a rail label.** This unit is about what
order rows appear in. A rename in the same branch would make the diff about two
things, which is the thing the redirection brief warns against by name.

**I did not give `/portal/readers` a rank.** One page's readers are not more
urgent than another's, and inventing a rung — most-read-first — would need a
per-page derivation over per-part, per-revision counters that this screen does
not currently make. By name is the honest order for that list and the sentence
says so rather than leaving a reader to work it out.

**I did not rank pages by how many changes are waiting on them.** The argument is
in the module and is above.

**I did not change what `/portal` counts.** The front door's reach is a partition
of counts rather than a list, so it has no order to state. Its failure *list* is
in this diff; its numbers are not.

**Nothing is scheduled and no pull request is subscribed to.**

## Recommendations

1. **A checked-in formatter, or a line in `docs/routines.md` saying there is
   none.** Finding 2. It cost this run about twenty minutes and it will cost the
   next lane the same, or worse — a reviewable diff turned into an unreviewable
   one, with a green gate either way.
2. **The sweep's own front-door state**, carried from the 25 September report and
   still an escalation rather than a unit.
3. **`copy` on `loom.action`, `loom.button` and `loom.link`**, in
   `Loom primitives`. Carried from 19 September, still the cheapest thing on this
   list, and still unfiled against that lane by this one — which is now this
   lane's omission twice over rather than a recommendation.
