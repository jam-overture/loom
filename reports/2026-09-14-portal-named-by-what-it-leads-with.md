# 2026-09-14 — "Named by what it leads with"

**Build order section:** §5 — Loom Portal.

**Branch:** `portal-27-named-by-what-it-leads-with` (→ `main`), cut from `main` at
`f62b9bc`. Not stacked on anything; no open pull request in this lane.

**Preview:**
https://loom-git-portal-27-named-by-0b618b-jpizzolato36-6341s-projects.vercel.app

Visuals — a production build of this commit, in a signed-in browser:

| | |
| --- | --- |
| [What's changed, scoped to the page](2026-09-14-portal-named-by-what-it-leads-with-history.png) | 1280px — **the change** |
| [The same screen, every disclosure open](2026-09-14-portal-named-by-what-it-leads-with-history-open.png) | 1280px |
| [The page before the ask](2026-09-14-portal-named-by-what-it-leads-with-page-before.png) | 1280px — the card, and the rail beside it |
| [The page after it](2026-09-14-portal-named-by-what-it-leads-with-page.png) | 1280px |
| [The front door](2026-09-14-portal-named-by-what-it-leads-with-front.png) | 1280px |
| [a phone](2026-09-14-portal-named-by-what-it-leads-with-phone.png) | 390px — 390 vs 390, no overflow |

**Taken from a running portal, with nothing staged.** A `next start` of this
commit, signed in, the seeded page at revision 0, one thing typed into the prompt
box — *"Delete the card"* — answered by a real model and allowed by the Gate.
Every string in the pictures is a string this code produced from that. This is
the first unit from this lane in four whose subject is reachable by clicking, and
it is reachable because the thing worth photographing here is what a *healthy*
portal says.

---

## What was asked

The brief's highest-priority thread since 18 August: **plain language is the
default, the technical record is one click away, nothing is ever removed.** One
screen at a time, and `FINDINGS.md` before choosing.

No maintainer comment has landed on any pull request of this lane, so there was
nothing outranking the plan.

**The plan said something else first, and it turned out not to be available.**
Step 4 of [`docs/signals.md`](../docs/signals.md) — the reader view, which the
plan calls "the commercial reason the portal gets opened daily" — is gated on
step 3 being on `main`, and #295 landed step 3 this morning. So this run went to
start it, and found that step 3 shipped *modules*: nothing in this application
calls `ingestReaderSignals`, nothing constructs a tally store, and nothing runs a
rollup. A screen written today would read a table no code path writes to. That is
filed rather than worked around — the reasoning is under **What I did not do**
— and this run took the unit below instead, which is the open finding of
11 September this lane owns.

## The defect

**A card was named by its heading *and* its body, and the body crowded the
heading out.**

`partNameOf` asked every node the same question — *what text is under you?* — and
joined the answer with a space. That join was itself a fix, found the hard way on
10 September: the runtime's `textOf` concatenates, so a card holding a heading
and a paragraph came back as `Every change is a deltaNothing here was…` and read
as a typo.

The join solved the typo and exposed the real problem, which is that a name has a
budget of forty characters and a container spends all of it on the wrong half.
The seeded card holds a heading *"Every change is a delta"* and a paragraph
*"Nothing here was written as markup. A proposal produced it."*, and it was named

> the card **“Every change is a delta Nothing here wa…”**

The one phrase that identifies the card is followed by a run-on that reads as a
transcription error, and the ellipsis falls in the middle of the half that
identifies nothing. Three of the five rows of the live review queue looked like
this on 11 September.

This is not one screen's defect. `partNameOf` feeds the review queue's sentences,
the history screen's revisions and inverses, the checkup's list of differences,
and every plain sentence the portal writes about a part. It is the most-read
string in the portal.

## Neither candidate rule survived

The finding named two, and asked whoever took it to pick:

- "first run only for an element with element children"
- "first run only when there is more than one"

Both are written about the **number** of runs, and the case that separates a name
from a mangling is not a count.

> A paragraph holding *"Free returns on"* and a link saying *"everything"* has
> two runs and one sentence. A card holding a heading and a paragraph has two
> runs and two things.

Counting cannot tell those apart, and either rule truncates the paragraph
mid-sentence — which is the same defect one shape along, since an inline link in
a sentence is not a thing inside a container, it is part of what the container
says.

What decides it is whether the node says anything **itself**:

> **A part that says something itself is named by everything it says. A part
> that says nothing itself is named by the first thing inside it that does.**

A direct text child makes a node a passage whatever else it holds, so the inline
link stays inside the sentence and the join — still correct, still load-bearing —
is the whole answer there. A node with no text of its own is a container, and it
is named by the first child that says anything.

**Recursively**, which is what makes this one rule rather than a rule per depth:
a page leads with its card, which leads with its heading, which says *Loom*. And
**skipping the silent ones**, which is what stops a card whose first child is an
image coming back unnamed.

## The second caller, which had never been looked at

The finding warned that `saidBy` was load-bearing for `page-name.ts` as well and
that both callers should be read before the join changed. That was right, and
the direction was the other way round: **`pageNameOf` never called `saidBy` at
all.** It asked the runtime for `textOf`, which concatenates.

So a heading re-authored into two runs — which is what changing half a headline
produces — was `Autumnarrivals` in the largest text on the busiest screen, while
every sentence below it on the same screen said *Autumn arrivals*. One page, two
spellings of its own name, and the wrong one in the `<h1>`.

That is now the second caller of one rule rather than a second copy of a similar
one. `saidBy` is gone as a name; its behaviour is the passage half of `leadOf`.

## What moved, and what did not

Nothing was deleted, and the distinction is worth being exact about, because
"name it with less" is the shape of change this principle exists to catch.

| Was, on the surface | Is |
| --- | --- |
| the card “Every change is a delta Nothing here wa…” | the card “Every change is a delta” |
| the page “Loom This page is a stored tree, rend…” | the page “Loom” |
| `Autumnarrivals` as a page's name | Autumn arrivals |

**A name was always a forty-character quote**, so no reader has ever seen a
card's body in one. What changed is *which* forty characters they get — the ones
that tell two cards apart, rather than a truncation of the one that does not. No
information that was on a screen has left it.

Where a part's full text lives, unchanged by this, and visible in the
`page-before` picture: on the page itself in the preview pane, and in the rail
beside it, where every text run under a container is its own row at its own
indent — *"Every change is a delta"* and *"Nothing here was written as mark…"*
under **Card**. The id did not move — 22 August settled that identity is not
technical detail — and the registered type is exactly where 12 and 13 September
put it, which the `history-open` picture shows: one click down, *What the record
says* carries `add n_seed9 loom.card into n_seed10 at 2`, the delete operation as
the runtime wrote it, `confidence 0.95`, the proposal id, and the model that
interpreted it.

## Findings

**Closed:** *a card is named by its heading and its body, and the body crowds the
heading out* (11 September), with the reasoning for rejecting both rules it
proposed written into the entry rather than left in a diff.

**Filed:**

- *step 3 of the signal plan is on `main`, nothing in the deployment calls any of
  it, and so step 4 still has no input* — owned by `Loom daily build`, three
  named pieces, none of them a screen.
- *the screenshot harness cannot sign in and cannot press anything, so every
  picture of the portal is taken by a private script* — owned by this lane, with
  a proposed shape and an explicit note that it is not this lane's to decide
  alone.

No decision record. Nothing here touches the tree schema, the delta model, or an
Accepted record: the whole change is a derivation over content the portal had
already read, which is the same move `page-name.ts` and 0041 make.

## Tests

All numbers are real runs of this commit.

| | |
| --- | --- |
| `pnpm install && pnpm verify` | **green**, exit 0 |
| Framework suite | **149 files, 2,571 tests, all passed** |
| Application suite | **248 files, 4,258 tests, all passed** |
| Findings | 626 findings, 0 malformed |
| Prerender check | 101 pages, 786 text junctions, 0 run together |

**Nothing failed, nothing was skipped, and no test was weakened.**

One existing assertion was rewritten, and it is the one that proves the change
landed: `reversal.test.ts` pinned the sentence a destroyed card's inverse
produces, and pinned it *with the run-on in it*. It now reads
`Puts the card “Every change is a delta” n_seed9, with the 4 things that were
inside it, back inside n_seed10.` — the rest of the line, including the count and
the place, is untouched.

Tests added, and what each one would catch:

- **`leadOf` joins a passage's own runs with a space** — the 10 September defect,
  kept rather than re-found.
- **it names a container by the first thing inside it that says anything** — the
  finding this unit closes.
- **it descends until it finds something said** — a page leading with its card's
  heading, which is what makes this one rule instead of a special case.
- **it reads a passage whole when an element is inline inside it** — the inline
  link, and the test that fails if either candidate rule is ever substituted for
  this one.
- **it skips a silent child rather than giving up at it** — a card behind an
  image, which would otherwise come back unnamed.
- **it says nothing for a part that says nothing**, in both shapes: a childless
  element and one holding only silent children.
- **it leads a slot by what was put in it** — slots hold things the way elements
  do and must lead the same way.
- **`pageNameOf` puts a space between two runs of one heading** — the second
  caller, and the `Autumnarrivals` defect that had survived in it.
- **`placeNameOf` does not quote a container by the words of anything inside it**
  — rewritten to assert the *new* subject reading beside the unchanged place
  reading, so the two names cannot quietly converge.

## The high-schooler test

Applied to `/portal/history`, which is the screen in the pictures.

*Could a bright high schooler, who has never read a decision record, say what
happened and what they should do next?*

The whole of a revision card, as photographed:

> **Revision 1**
> Deleted the card “Every change is a delta” `n_seed9` and everything inside it.
> reviewer@example.com asked for this. The AI says it is very sure.
> If you undo this, Loom puts back:
> Puts the card “Every change is a delta” `n_seed9`, with the 4 things that were
> inside it, back inside `n_seed10`.
> **[ Undo this change ]**

What happened, who asked, how sure it claimed to be, what undoing it would
restore, and one button. **Before this run both of those sentences read
*the card “Every change is a delta Nothing here wa…”***, in a screen whose
purpose is telling one destroyed thing from another. Passes.

The failure it fixes was one of *scanning* rather than of vocabulary — every word
in the old string was a person's word — which is why no test caught it and a
screenshot did. It is worth naming as its own category: the 18 August redirection
is usually read as "stop printing `loom.card`", and this is the other half of it.
A sentence can be entirely plain and still unreadable at a glance.

The same sentences render in the review queue from the same function. That path
is not in these pictures, because the Gate allowed this change outright and so
nothing was held — which is the honest state of a portal whose rules let a
signed-in reviewer delete a card, and not something to stage around.

What a reader still cannot do from this screen is see a card's body without
opening the page or clicking the part. That is the honest limit of a name, and
this run did not try to widen it. The `page-before` picture shows where the body
did not go: the rail on the right carries *"Every change is a delta"* and
*"Nothing here was written as mark…"* as their own rows under **Card**, which is
the same information at one more indent.

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**Which part of a page a proposed change would destroy, by the words a reader
can see on it.**

A Loom page is not markup in a repository. The tree lives in the store, authored
by accepted proposals, so there is no file to diff and no line number to quote —
and once a removal is applied the node is gone from the tree entirely. The
forward delta records the id it deleted and nothing else (0016). The *only*
surviving account of what a destroyed card said is the inverse, replayed
backwards out of the log, which is what the history screen already computes for
every row.

That has been true since 10 September. What was not true until today is that the
name it produced was one a person could read at a glance, and a name nobody can
scan is not an advantage over a `git log` that does not hold it either.

## What I did not do

- **No reader-signal view (step 4).** Filed instead: *step 3 of the signal plan
  is on `main`, nothing in the deployment calls any of it, and so step 4 still
  has no input.* Three pieces are missing before a screen has anything to read —
  a receiver for a batch, the two stores constructed on this deployment's handle,
  and something that runs the rollup — and none of them is a screen, which is why
  they are filed against `Loom daily build` rather than taken here. The tempting
  workaround is to seed tallies the way the tree is seeded, and it is the wrong
  one: a seeded tree demonstrates a structure anybody can check against the
  builder in source, and seeded reader counts are fabricated measurements of
  people who did not exist, shown on the one screen whose entire value is that
  its numbers are real.
- **No consolidation of the naming functions.** The 12 September finding stays
  open. This run added no fourth format; it replaced one of the three's input.
- **No change to `placeNameOf`.** Its argument got *stronger* rather than weaker:
  a place quoted by its lead is not just long, it goes stale the moment that
  heading is re-authored. The doc comment and its test now say that instead of
  the old length argument.
- **Nothing in `src/`**, and no screen outside `(portal)`.
- **No route renamed.** Everything this run touched is already on its plain name.

## The run itself

- **The screenshot harness cannot sign in and cannot press anything**, and this
  screen needs both — a session, and a change that does not exist until somebody
  asks for one. `pnpm shoot` opens a fresh context per shot, so a session cannot
  survive between them, and the sign-in is a form POST rather than an address.
  This run drove the browser directly, using the same Chromium the harness
  locates, the same viewports, the same reduced motion and the same overflow
  measurement, and waiting on a selector rather than on the network. Filed, with
  a proposed shape, because about ninety of that script's hundred lines are the
  harness's own job and re-writing them is exactly what 0117 was meant to end.
- **And it re-created a hazard the harness documents.** The first attempt clicked
  `form button[type="submit"]` for the prompt box, hit the topbar's **sign out**,
  and photographed the sign-in page believing it was the screen behind it — which
  is the failure `Shot.waitFor` warns about, reached from a direction that
  warning does not cover. Caught by looking at the picture, which is the argument
  for this lane's whole practice of taking one.
- **Nothing is scheduled and no pull request is subscribed to.** `docs/routines.md`
  and the brief both forbid a follow-up by name.

## Recommendations

1. **Wire the signal seam before this lane takes step 4.** It is three small
   pieces and none of them is a screen. If `Loom daily build` takes them, the
   portal's reader view is a run's work immediately after, and it is the thing
   the plan says makes the portal worth opening daily.
2. **`/portal/rules` next, unless you say otherwise.** It is the screen this lane
   has looked at least under the 18 August rule, and it is where a person goes
   when a change was refused and they want to know what would let it through —
   which is the review queue's unanswered second question.
