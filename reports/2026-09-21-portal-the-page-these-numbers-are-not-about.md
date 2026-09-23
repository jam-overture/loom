# 2026-09-21 — "The page these numbers are not about"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-33-the-page-these-numbers-are-not-about` (→ `main`), cut from
`main` at `b10a9ab`. Not stacked. **The only open pull request in the repository
when this run started was #353, `Loom daily build`'s**, so there were no
maintainer comments on this lane's work to address and nothing of this lane's to
push onto.

Visuals — a production build of this commit, in a signed-in browser at
`/portal/readers`, against a deployment of three pages chosen so that all three
states the screen can now be in are in one photograph.

| | |
| --- | --- |
| [Three pages, three answers](2026-09-21-portal-the-page-these-numbers-are-not-about-wide.png) | 1280px — **the change**: the notice on the first card, the line under the heading on the other two, and the whole of the third card's comparison block |
| [The same screen, every disclosure open](2026-09-21-portal-the-page-these-numbers-are-not-about-open.png) | 1280px — the collection window, both version numbers, and the instant as the record holds it |
| [a phone](2026-09-21-portal-the-page-these-numbers-are-not-about-phone.png) | 390px |

**How the populated pictures were taken.** Three trees built with the published
builders into a `memoryTreeStore()` on `globalThis[Symbol.for("loom.portal.store")]`,
and **182 reader-signal batches run through the runtime's own `rollUp`** and
applied to a `memoryReaderTallyStore()` on
`globalThis[Symbol.for("loom.portal.readerTallies")]` in five windows, each with
its own `at`, which is what gives the three cards three different *counted up to*
moments. Every counter in the pictures is the runtime's fold of batches shaped
the way a browser sends them; the shipped page code does its own reads, its own
naming fan-out and the real Next render.

**One thing in the staging is set rather than produced, and it is the thing the
unit is about.** The trees are stored at revisions 6, 3 and 1 by setting
`revision` on the snapshot handed to `create`, rather than by appending six
deltas. `head()` answers the same tree either way and the portal reads nothing
else off it — but the honest statement is that the *gap* between the page and its
counters is arranged, not grown. What is not arranged is what the screen does
with it.

Taken with a private Playwright script again, for the sixth time — see the
standing finding, which this run has added one useful detail to.

---

## What was asked

`FINDINGS.md` held an open entry owned by this lane, filed by `Loom daily build`
on **14 September**, and it is the one this run took:

> **The tallies lag the buffer by a window, and a screen that does not say so
> will look broken.** … *"Before versus after a change* is the measurement the
> portal exists to show, and it is the measurement someone will go looking for
> **immediately after making the change**. On a deployment collecting hourly they
> will find the old revision's counters and a new revision with nothing against
> it, which looks exactly like a change that broke the measurement. The truthful
> reading is *"nothing has been counted for this revision yet"*, and **only the
> screen can say it**."

An open finding owned by this lane outranks the plan. This one also has the
sharpest claim on the plan's own list: the reader screen is where *before versus
after a change* lives, and the finding is that the screen was wrong about which
change it meant.

`/portal/checkup` is deferred a fifth time. It has now lost to an open finding
five runs running, which is the right order every time and is still worth saying
plainly rather than in passing.

## What shipped

**The screen now says which version of your page these numbers are about — and
the one section that used to vanish rather than answer cannot vanish any more.**

| | |
| --- | --- |
| `_lib/reading-view.ts` | `RevisionReading.countedAt`; `CountingStanding` and `countingStanding`; `Comparison` and `comparisonOf`; `visitsHeard`, `standingNote`, `standingAdvice` |
| `readers/_components/counted-against.tsx` | new — which version, how old, and what to do; the collection window one click down |
| `readers/_components/since-the-change.tsx` | drawn unconditionally; a lead sentence for all three comparisons; the heading loses a claim it could not support |
| `readers/_components/page-reading.tsx` | takes `live`; the header sentence is `visitsHeard` |
| `readers/page.tsx` | one fan-out over the pages instead of two, and it keeps the revision |

### The defect, in the form it actually reached a reader

A page changed twice in the last hour drew this, with every number on it real:

> **40 visits to this page have reported back since it was last changed. That is
> revision 4.**
>
> *(…four sentences of readings…)*
>
> **What the last change did to your readers**
> Revision 4 against revision 3, part by part.

The page being served was revision **6**. So the first sentence is false — those
visits reported back *before* the last change, not since it — and the heading is
false twice over, because the comparison it labels is between two versions
neither of which is the page. A reader either takes the old version's figures for
the new one's, or concludes their change broke the measurement and goes looking
for a fault that does not exist.

Nothing threw. Nothing was empty. **Every number was correct and every sentence
around them was wrong**, which is precisely why the finding said only the screen
could fix it.

### The answer was already in the room

`readers/page.tsx` fetches every page the counters mention, to name its parts
from the page being served. A tree carries its revision. The screen was reading
the one fact that settles this, taking the names off it, and dropping it.

So the read costs nothing new. It costs one read *fewer*: `partNamesFor` and
`pageNamesFor` were two fan-outs over the same list, so every page in the
deployment was fetched twice per render to answer two halves of one question.
`pagesServed` answers three from one.

### Four states, not a boolean

| | what the reader is told |
| --- | --- |
| `current` | *These are the numbers for the version you are serving right now.* |
| `behind` | *You have changed this page twice since then, and nothing has been counted for revision 6 yet.* |
| `unread` | *We couldn't read the page itself just now, so we can't tell you whether this is the version you are serving.* |
| `replaced` | *The page being served is revision 1, which is older than these numbers — something has put a different page at this address.* |

The two that could have been folded away are the two worth arguing for.

**`unread`** is a failed read of the *page*, on a screen whose subject is the
*counters*. Everything on the card still stands, so this is not the screen
failing — but reporting it as `current` would be exactly the confident claim this
surface refuses to make, and a boolean has nowhere to put it.

**`replaced`** should never happen: a revision only climbs. It is a case of its
own because the alternative is falling through to `current` and printing *these
are the numbers for the version you are serving* over numbers about a page that
is gone.

### What a person is told to do, which here is usually nothing

The state a reader actually arrives in is `behind`, because they arrived
*because* they made the change. The honest answer is **wait**, and it has to be
said out loud:

> Nothing is wrong and there is nothing to fix: readings are held for about an
> hour before they are counted, so a change you have just made takes a while to
> show up here.

That sentence is the whole of this unit's value to a person. Without it the
screen is silently telling them to go and debug a page that is working.

### The section that answered by disappearing

`SinceTheChange` was drawn under `shifts.length > 0`. So the most valuable
section on the card — *the one measurement that justifies Loom existing*, by its
own module comment — was simply **not on the screen** whenever there was nothing
to list, and three completely different facts arrived as that same blank:

- a page nobody has changed yet,
- a change that replaced every part anybody had reported on,
- a change too recent to have been counted.

The third is the state of every page for the first hour after somebody works on
it, which makes the blank the *common* case rather than the edge one.

The card's own doc comment already condemned this in so many words —
*"a page whose sections silently disappear when their number is zero leaves a
reader unable to tell Loom looked and there was nothing from Loom did not
look"* — and the section breaking the rule was the one the rule was written for.

`Comparison` has **no empty arm**. There is always a fact, so the section cannot
be absent, and a later edit cannot quietly take it away. On a page with one
counted version it now reads:

> Nobody has reported on an earlier version of this page, so there is nothing to
> compare revision 1 against yet. **Your next change to this page is what gives
> this section something to say.**

Which is the "what do I do now?" answer for a screen state that previously had
no screen.

### One word in a heading

*The last change* is a claim about the page being served. When the counters are
behind it, the comparison is real and is about an earlier pair — so the heading
reads **"What the last counted change did to your readers"**, and the sentence
that qualifies it lives once, in `CountedAgainst`, beside the counts it is about
rather than repeated inside the comparison where the two copies would disagree
the first time either was edited.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**That the numbers they are staring at are about the previous version of their
page — which version, how far behind, when it was last added up, and that there
is nothing to fix.**

- **`git log` holds what was applied**, and would tell them the page is at
  revision 6. It cannot tell them that the measurement they are reading is about
  revision 4, because it has never heard of a counter.
- **An analytics product cannot represent the question.** It measures a URL. The
  URL did not change; the tree did. There is no product outside this one in which
  *"this figure is about a different version of this page"* is a sentence that can
  be formed, because nothing else knows a page has versions that readers are
  counted against separately.
- **The store knows the page and not the counters; the counters know the version
  and not the page.** The gap exists only where the two are read together, and the
  only thing that reads both is this screen. That is why the finding was filed
  against a lane that owns no data.
- **Nothing logs it and nothing throws.** 0158 makes counting and forgetting one
  operation, so a version with no counters is the runtime working correctly. The
  correct behaviour is indistinguishable from the broken one *unless a screen says
  which*, and there is no alert, no exception and no log line anywhere in the
  system that fires here.

The claim worth defending is the second. This is not a fact that is hard to get
from other tools — it is a fact **other tools cannot state**, because the noun it
is about does not exist for them.

## The high-schooler test

Applied to `/portal/readers`, every card on it, in all three states shipped.

- **"You have changed this page twice since then, and nothing has been counted
  for revision 6 yet."** Passes. One runtime word, `revision`, which is a label
  the reader can match against a row on `/portal/history` — see *what I did not
  rename* below.
- **"Nothing is wrong and there is nothing to fix."** Passes, and it is the
  sentence that does the work. A bright high schooler reading it knows to wait.
- **"Counted up to 19 September 2026 at 14:05 UTC."** Passes. Five words and a
  moment, and it answers *how old is this* before a reader has to wonder.
- **"Nobody has reported on an earlier version of this page… Your next change to
  this page is what gives this section something to say."** Passes. This is the
  screen that used to be blank.
- **"These are the numbers for the version you are serving right now."** Passes,
  and is the one sentence here that says *nothing is happening* — which is why it
  is a quiet line rather than a notice.
- **The disclosure** is the one place the runtime's account appears, and it is
  what a disclosure is for: the collection window, both version numbers side by
  side, and the instant as ISO-8601.

## What I renamed, and what moved behind a disclosure

Nothing was renamed. **Nothing was removed.**

| What the screen said | What it says now |
| --- | --- |
| *"40 visits to this page have reported back **since it was last changed**. That is revision 4."* over counters two changes old | *"40 visits have reported back on revision 4 of this page."* + the notice naming revision 6 |
| (nothing — no version was named as current, ever) | *"These are the numbers for the version you are serving right now."* |
| (nothing — the numbers had no age) | *"Counted up to 19 September 2026 at 14:05 UTC."* |
| a **missing section** where the comparison would be | *"Nobody has reported on an earlier version of this page…"*, and two other worded answers |
| *"What the **last** change did to your readers"* about a pair that was not the last change | *"What the last **counted** change did to your readers"* |

**What moved behind a disclosure:** the collection window and why it causes the
gap, the counted and served version numbers side by side, and the rollup instant
as the record holds it. All of it new — nothing was demoted from the surface to
get there.

**What I deliberately did not rename, and why.** `revision` is on
`_test/plain-language.ts`'s list of runtime words, and every sentence this run
added uses it. The exemption is taken at the point of use, in two assertions,
with the reason written there: `/portal/history` numbers its rows *Revision 4*,
`RevisionLink` addresses them, and a reader matching a number on this screen
against a row on that one needs the same label. Renaming it to *version* on one
screen would leave the portal calling one thing two names, and renaming it on all
of them is the giant rename the brief says not to do. **The concept is said as
*version* in prose throughout** — *"the version you are serving"*, *"an earlier
version of this page"* — and the numbered label stays `revision N`. If that
trade is wrong, it is one decision in one place rather than forty.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green, exit 0** |
| Framework suite | **156 files, 2,857 tests, all passed** |
| Application suite | **288 files, 5,106 tests, all passed** |
| Findings | 727 findings, 0 malformed |
| Prerender check | 109 pages, 859 text junctions, 0 run together |
| Overflow, measured | 1280 vs 1280 on both wide shots, 390 vs 390 on the phone |

**Nothing failed, nothing was skipped, and no test was weakened.**

**41 tests are new** — 23 on the readings, 13 on the new component, 2 on the
card, 3 source guards — measured as 91 → 132 over the four files. One existing
test was rewritten: *"says nothing about a change when there is only one version
to go on"* asserted the silence this unit exists to end, and is now
*"says there is nothing before this version rather than dropping the section"*.
Two others were updated for the card's new input.

What each group would catch:

- **`countedAt`.** The newest rollup across a version's parts rather than the
  oldest or one part's; each version's moment kept to itself; each page's kept to
  itself when several arrive in one read. A version photographed as an hour older
  than it is would look entirely correct in a screenshot.
- **`countingStanding`.** All four arms, as four separate cases — including
  `replaced` asserted apart from `unread`, which is the one a future edit would
  collapse because it "cannot happen".
- **`comparisonOf`.** That it **never answers with an empty list of shifts**,
  which is the assertion that would fail if somebody reintroduced the silent
  section by the back door; and that a pair with no shared parts is
  `nothing-shared` rather than `shifts: []`.
- **The sentences.** That `visitsHeard` stops saying *since it was last changed*
  when that is not true — asserted both as the exact new string and as a
  `not.toContain` on the old claim, because the first alone would pass a rewrite
  that reintroduced the phrase elsewhere in the sentence. Plurals in both forms.
  *Once*, *twice*, *3 times*. The plain-language rule over every sentence shown
  unasked, in all four states.
- **The component.** Every sentence; the quiet tone for `current` asserted as the
  **absence** of `data-tone` and the notice tone for the other three asserted as
  its presence; the record asserted *inside* `<details>` and asserted **absent**
  from the surface, which is the pair that makes "one click down, never further"
  a property rather than a claim; and **the space between the sentence and the
  moment**, as one string spanning the join — the 20 September finding, asserted
  rather than eyeballed, because a `toContain` on either half passes either way.
- **The wiring**, at the source, in `reading-order.test.ts`: the card is handed
  the served revision, the page is read once rather than twice, and a page whose
  read failed is **missing** from the map rather than defaulted to a number.

## Findings

**Closed one. Filed two.**

1. **Closed:** the 14 September `Loom daily build` entry, which is this unit.
   Both mechanisms it named were taken, and the second was taken further than
   asked — the screen reads the served revision rather than inferring staleness
   from a missing row. Its diagnosis was right in every particular and the
   closure says so.
2. **Filed, this lane's own:** the comparison list carries a row for the **root**,
   which is reached by every page view that reports anything and therefore reads
   *"about the same"* on every page, forever. Correct arithmetic, structurally
   incapable of saying anything. Filed rather than fixed because dropping rows
   from a comparison is a separate decision with a real argument against it — the
   root's counts are the denominator of every other row — and the recommendation
   is neither: move it into the sentence above the list, where it is the
   denominator rather than a competitor.
3. **Re-filed by reference:** the screenshot harness still cannot sign in, sixth
   consecutive run. One detail added that each run rediscovers and that is not
   about signing in: a `NODE_OPTIONS=--import` preload resolves modules relative
   to **itself**, not to the working directory, so a staging script in a scratch
   directory cannot import `@loom/runtime` at all — and it runs twice, once in
   the launching process and once in the server.

## What I did not do

**I did not touch the front door, `/portal/pages` or the page screen.** Each of
them prints counts from stores of its own, and whether any of those has the same
class of gap is a question I did not investigate and will not assert. This unit
is one screen, and the claim it makes is about that screen's two reads.

**I did not change what `reachShifts` compares**, which is the finding above.

**`/portal/checkup` is deferred for the fifth run.** It remains the plan's own
recommendation and it has now lost to an open finding owned by this lane five
times in a row. That is the correct order each time — but five is enough that the
next run should take it unless something is filed against this lane before then.
