# 2026-09-17 — "What the queue would do"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-29-what-the-queue-would-do` (→ `main`), cut from `main` at
`e97b88b`. Not stacked on anything. There were **no open pull requests at all**
in the repository when this run started, so there were no maintainer comments to
address and nothing of this lane's to push onto.

Visuals — a production build of this commit, in a signed-in browser at
`/portal`, with four held proposals on the hold store's own carrier:

| | |
| --- | --- |
| [The front door, with four changes waiting](2026-09-17-portal-what-the-queue-would-do-wide.png) | 1280px — **the change**, four different answers to "which of these is the big one" |
| [The same screen, every disclosure open](2026-09-17-portal-what-the-queue-would-do-open.png) | 1280px — nothing was removed to make the first one readable |
| [a phone](2026-09-17-portal-what-the-queue-would-do-phone.png) | 390px |

**How the populated pictures were taken, stated plainly.** No proposal in them
was made by a model. The server was started with a preload that builds a
`memoryHoldStore()`, `hold`s four `HeldProposal`s into it and assigns it to
`globalThis[Symbol.for("loom.portal.holds")]` before the application's own
module memoises one — the recipe this lane filed on 15 and 16 September. **No
markup was staged and no component was rendered out of context**: the shipped
page code ran its real listing, its real head reads, its real reading of each
proposal against the served tree, the real Next render, shell and stylesheet.
The only fiction is *who proposed these* — a script rather than a model.

---

## What was asked

Nothing in the findings queue outranked the plan and no maintainer comment
existed to address, so this came off the 16 September report's own third
recommendation, which had been open for a day:

> **In this lane: the front door's own queue.** `/portal` shows the same held
> proposals through `answerOutcomes` and does not show what they would do to the
> page.

## What shipped

**The front door's queue says what each waiting change would do to its page.**

| | |
| --- | --- |
| `_lib/waiting-effect.ts` | new — the triage reading: the first steps, the count of the ones it does not show, and how the change stands |
| `_lib/page-name.ts` | `headsOf` keeps the page the name was read off; `namesIn` names pages already in hand; `namesOf` is now the composition of the two |
| `_lib/waiting.ts` | `WaitingChange.effect`, and the reading as an argument rather than a read |
| `_components/waiting-card.tsx` | the section, the preview, the standing, and every step one click down |
| `portal/page.tsx` | one fan-out instead of one and a half |

### The argument this had to answer, and the half of it that was already false

The card had carried its own objection since it was written, and it is a good
one:

> This is deliberately **not** the review card with the buttons taken off. The
> page screen's `HeldProposalCard` can say what a proposal would replace,
> because that screen has read the tree and the reader is looking at it; **this
> one is drawn from a list of holds across every page and has read no trees at
> all.** A "before" that is not on the reader's screen is worse than no before.

The first half is right and is why this is not the review card. What a
reconfigure would **replace** — the value that is there now, the place in the
page, the words arriving and leaving — genuinely needs the page on screen, and
all of it stayed on the page screen. What went on the queue row is the **forward
sentence**, which is self-contained: *"Deletes the card “Every change is a
delta” n_seed9, and the 4 pieces inside it"* needs nothing beside it to be read.

The second half — the cost claim — **was already untrue when it was written.**
`/portal` names every page in both halves of the screen, and a page is named by
reading its head and taking the leading heading off it (`namesOf` → `nameFor` →
`reader.head`). Every page a hold sits on is in that set. The tree was read,
used for one string, and dropped on the floor. So `headsOf` keeps it, `namesOf`
becomes the composition of `headsOf` and `namesIn`, and the reading costs **no
query that was not already being made**.

### The four answers in the first screenshot, which are the point

A queue that lists four waiting changes and reads the same on each has sorted
nothing for the person looking at it. These are the four rows:

| What somebody typed | What the row now says |
| --- | --- |
| *"drop the explainer card, it's in the way"* | **Deletes the card “Every change is a delta” n_seed9, and the 4 pieces inside it.** |
| *"make the intro line a bit warmer"* | **Changes the tone of the prose … n_seed4. Changes the value of the words … n_seed3.** |
| *"add opening hours under the card"* | **Adds the card “Opening hours” n_shot5 at the end of the page. It brings 4 more pieces with it.** |
| *"make the outlined card outlined"* | **This would leave the page exactly as it is.** *Every step of it writes what is already there, so saying yes would change nothing you can see.* |

The fourth row is the one worth defending. It is a change a reader can now
**skip from the front door** — the queue told them it would do nothing, and
before today the only way to find that out was to open it.

### Two things the standing says, and why an obstacle outranks inertness

`standing` is the one field that changes what a reader should do with a row
before they open it, and it is `null` on most rows.

- **"This was worked out on an older version of this page."** The page moved
  under the proposal, so it will not be applied as it stands: turn it down and
  ask again. That is an answer a reader can reach without opening anything, and
  it is the single biggest saving on this screen.
- **"This would leave the page exactly as it is."** Photographed above.

They are reported in that order because they suggest opposite actions and only
one of the two is available. A stale change cannot be said yes to at all; an
inert one can. `inertNote` already withholds itself on a proposal that would not
apply, and `standingOf` keeps the order that implies rather than rediscovering
it.

Whole-proposal inertness only. `inertNote` also reports *some* steps being inert,
which is real detail for the screen with the page on it and, on a row, a caveat
about a change the reader still cannot see.

## What it tells a developer that they could not get from the repo, the logs, or `git log`

**Which of the changes waiting on them is the big one — before they open any of
them.**

- **The repo does not hold the page.** A Loom page is authored by accepted
  proposals into a store; there is no file whose diff is the change being
  weighed.
- **The log does not hold it either**, because a held proposal is precisely the
  change that has not been logged.
- **The store holds the page as it is now** and says nothing about a change that
  has not happened.
- **And the answer is a join.** The delta carries the forward side and the tree
  carries what is there now; *"deletes the card and the 4 pieces inside it"*
  exists in neither on its own. This screen is the only place in the ecosystem
  holding both, across every page at once.

## The high-schooler test

*Could a bright high schooler, who has never read a decision record, say what
happened and what they should do next?*

Applied to the four rows in the first screenshot.

- **Row one.** *"Deletes the card “Every change is a delta” n_seed9, and the 4
  pieces inside it."* with *"It could not be cleanly undone, so a person decides"*
  above it and *"This one can't be undone afterwards"* below. Passes: what goes,
  how much of it, and that there is no taking it back.
- **Row two.** *"Changes the tone of the prose … Changes the value of the words
  …"* Passes, and reads as the small change it is next to row one, which is the
  comparison the screen exists to make possible.
- **Row three.** *"Adds the card “Opening hours” n_shot5 at the end of the page.
  It brings 4 more pieces with it."* Passes.
- **Row four.** *"This would leave the page exactly as it is."* Passes, and it is
  the only row where the next move is *do nothing*.

**The one place a reader has to read two lines rather than one.** Row four says
*"This would leave the page exactly as it is"* and then, under it, *"Changes the
variant of the card …"*. At a glance those argue. The sentence under the heading
resolves it — *every step of it writes what is already there* — and the ordering
is the page screen's, which puts the standing above the steps for the same
reason. It was the alternative that read worse: hiding the step would have been
removing information to make a screen simpler, which is the one thing this
brief says is a misreading of it.

## What I renamed, and what moved behind a disclosure

Nothing was deleted, and nothing was renamed — no route, no heading, no label.
This unit **added** a reading rather than rewording one.

| The runtime's word | What the screen says |
| --- | --- |
| `remove n_seed9 — and everything under it` | *Deletes the card “Every change is a delta” n_seed9, and the 4 pieces inside it.* |
| `configure n_seed4 — tone` | *Changes the tone of the prose “This page is a stored tree…” n_seed4.* |
| every operation inert | *This would leave the page exactly as it is.* |
| the delta carries no operations | *This change asks for nothing.* |
| the steps the preview cut | *and 2 more steps*, then the whole list under **Every step, as the change record has it** |

**What moved behind a disclosure, and what did not.** Every step in the change
record's own words is one click down, including the ones the preview never
printed — a cut that decides how tall a row is must not become a cut that
decides what a reader may find out. The standing's `technical` is down there
beside them. What is on the surface is the two sentences a reader has to see to
choose, which is the rule rather than an exception to it.

**Its own disclosure, not the card's existing one.** *"How Loom decided this"*
answers why the change stopped; *"Every step, as the change record has it"*
answers what the change says. A reader opening either should not have to read
the other, and the two disclosures sit next to the plain sentences they belong
to rather than being pooled at the foot of the card.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green, exit 0** |
| Framework suite | **153 files, 2,721 tests, all passed** |
| Application suite | **272 files, 4,784 tests, all passed** |
| Findings | 667 findings, 0 malformed |
| Prerender check | 107 pages, 850 text junctions, 0 run together |
| Overflow, measured | 1280 vs 1280 on both wide shots, 390 vs 390 on the phone |

**Nothing failed, nothing was skipped, and no test was weakened.**

35 tests are new — 16 on the reading, 7 on the card's new section, 4 on
`headsOf`/`namesIn`, and the rest carried by the fixtures the existing suites
now pass. What each group would catch:

- **The reading** — a deletion of a whole section reads differently from a
  reworded heading, asserted as the difference rather than as two strings; a
  step names its part rather than printing its type; the preview counts what it
  withholds, with the right plural, and says nothing when it is showing all of
  them; every step is in the technical record including the cut ones; a stale
  proposal reports the obstacle; an inert one reports inertness; a proposal that
  is both reports the obstacle; one inert step of two reports neither; an empty
  delta says so rather than rendering a silence; the ordinary change stands at
  nothing; `triageAgainst` answers `undefined` for a page that would not read
  and otherwise reads identically to `triageOf`.
- **The plain-language rule** — every step's words and both standing sentences
  are checked against `RUNTIME_WORDS`, because all of them are read unasked.
- **The card** — the sentences are on the surface with every `<details>`
  removed; they come after *why it stopped* and before *if you say yes*; the
  withheld count renders; a step the preview left out is in the disclosure and
  **not** on the surface, measured by removing the disclosures; the standing
  renders above the steps; it is absent on the ordinary change; a page that
  could not be read says so and keeps the rest of the row.
- **`headsOf` and `namesIn`** — the page comes back and not only its name; a
  page that would not read is **left out** rather than stood in for, which is
  the one difference from `namesOf` and the one that stops a change being
  described against a fiction; every id asked about is still named; and
  `namesIn(await headsOf(…))` equals `namesOf(…)`, which is the guard that
  splitting the function changed nothing the other screens see.

## Findings

**Closed one**, the 16 September report's third recommendation — which was a
recommendation rather than a filed finding, so there is no Status line to edit.

**Filed two:**

1. **`ruleSentence` renders a headed, empty box for a reason code it has never
   heard of.** Found by looking at a screenshot: this run's first fixture used
   two disposition codes that do not exist, and *"Why it stopped"* drew its
   yellow panel with a heading and no sentence. Inside the type system it cannot
   happen; across a `DATABASE_URL` written by an older runtime it can, and the
   lookup is a `Record` index with no fallback. Owned by this lane.
2. **The front door's queue has been photographed populated**, which is the
   second of the three screens the 13 September standing finding named. The
   recipe generalises again, with one thing added: the four disposition reason
   codes a fixture may use are `within-policy`, `confidence-below-floor`,
   `stakes-at-refusal-floor`, `irreversible`, `discards-later-work`,
   `redirected-submission`, `repointed-binding`, `stakes-above-ceiling` and
   `confidence-below-minimum`, and anything else photographs as a silence.

**Re-confirmed, without a new entry:** `pkill -f "next start …"` killed this
run's own shell, exactly as this lane's 11 September finding says it does. The
finding stands and needs no new entry; `setsid` on the server and a kill by pid
is what worked.

## What I did not do

- **No change to the page screen.** `HeldProposalCard` shows what a change would
  *replace* and that is the half which genuinely needs the page on screen. It is
  untouched.
- **No second read anywhere.** The trade this unit makes is that the tree a name
  was read off is kept rather than re-fetched. If it had cost a query per row it
  would not have been worth taking, and the old card's objection would have
  stood.
- **No buttons on the queue row.** Answering a change from a screen that cannot
  show you the change is the quick approval 0019 exists to prevent, and this
  changes nothing about that: the row is a better triage and the same
  hand-off.
- **No guess about which settings are words.** Unchanged from 16 September and
  still `Loom primitives`' to answer.
- **Nothing in `src/`**, and no file outside `(portal)`.

## The run itself

- **The unit was committed before the screenshots were taken**, which is the
  procedure `Loom daily build` filed on 16 September.
- **The screenshot caught a defect in the fixture that no test could have.** The
  first shot showed *"Why it stopped"* as an empty yellow box on two of three
  cards, because two invented reason codes reached a `Record` lookup. It is the
  fixture's fault and the finding above is about the lookup, which is the half
  that is not.
- `/tmp/shot/` is outside the repository and nothing from it is in the commit.
- **Nothing is scheduled and no pull request is subscribed to.**
  `docs/routines.md` and the brief both forbid a follow-up by name.

## Recommendations

1. **`copy` on the starter library, in `Loom primitives`.** Unchanged from
   yesterday and now visible on a second screen: the caveat that fires on an
   undeclared part can reach the front door's queue as well as the page screen.
   Start with `loom.stat`, `loom.quote`, `loom.faq`, `loom.credential`.
2. **The ingestion endpoint and the rollup runner in `Loom daily build`**, still
   the whole distance between `/portal/readers` and the reason `docs/signals.md`
   says a developer opens the portal daily. Recommended by the last three
   reports.
3. **In this lane: `/portal/checkup`, and the 13 September standing finding it
   sits under.** Two of the three screens that finding named have now been
   photographed populated. The checkup is the third and it is the hardest,
   because its red verdict is not merely rare — it is unreachable by any
   sequence of clicks on a running portal. That is a screen whose value is
   entirely in the bad news, and nobody has ever seen it.
