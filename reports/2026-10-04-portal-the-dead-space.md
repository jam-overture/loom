# 2026-10-04 — the dead space, on the other sixteen screens

**Build order section:** §5 — Loom Portal. The maintainer's instruction, direct,
mid-session.

**Branch:** `portal-48-the-dead-space` (→ `main`), cut from `main` at `ef48c4d`.
Not stacked. `main` was not pushed to.

---

## The instruction

> *"There is a lot of dead space on several of the portal views. I think we need
> to utilize it better."*

Sent with a screenshot of `/portal/pages/[treeId]/versions` on a display about
2000 pixels wide, with the content in a 1010-pixel column and the right half of
the window empty.

**It is the second time he has said it.** `_components/screen.tsx` landed on
3 October in answer to *"the portal is too vertical in the main content pane"* —
and converted **two of eighteen screens**, leaving the rest as a queue in a
report. The screen he opened four hours later was one of the sixteen.

So this run is not a new idea. The rule, the primitive and the argument were
already on `main` and are not restated here. What this run does is **finish it,
and make finishing it the state the repository enforces** rather than a sentence
somebody has to remember.

---

## What shipped

| | |
| --- | --- |
| 25 call sites across 16 files | `<div className="flex max-w-3xl … p-8">` → `<Screen>` |
| 15 of those screens | the opening heading and lead wrapped in `Measured`, so the words keep their measure |
| `_components/screen.tsx` | `Measured` takes the element it is; `CardGrid` added |
| `/portal/pieces`, `/portal/rules` | their catalogues become grids |
| `/portal/pages/[treeId]/versions` | the drawn page and the account of the change, side by side |
| `/portal`, `/portal/pages` | their two hand-rolled grids adopt `CardGrid` |
| `every-screen-width.test.ts` | **new** — the rule, over every screen found on disk |
| `screen.test.tsx` | +5, and the ceiling of 29 caps lowered to 1 |

**+39 tests. Nothing weakened, nothing skipped, nothing removed from any screen.**

---

## Visuals

**Photographs of the application, signed in, through a production build served by
`pnpm shoot --serve`,** at `1680×1000@2x` to show what a wide display now gets.
The shot list is committed beside this report. The versions screen's progression
was staged by a `--import` preload that applies three real `configure` deltas
through the published `TreeStore.append`; the tree, the fold, the replay, the
render and the layout are the shipped code, and **the only fiction is who asked
for the three changes**.

| | |
| --- | --- |
| [**the screen he sent**](2026-10-04-portal-dead-space-versions-wide.png) | the drawn page on the left, what made it on the right |
| [**the same, on a phone**](2026-10-04-portal-dead-space-versions-phone.png) | `390×844@2x`, stacked, `scrollWidth 390 / innerWidth 390` |
| [**the pieces**](2026-10-04-portal-dead-space-pieces-wide.png) | four across instead of four down |
| [**the rules**](2026-10-04-portal-dead-space-rules-wide.png) | nine cards, three columns — the whole governance model on one screen |
| [**the pieces on a phone**](2026-10-04-portal-dead-space-pieces-phone.png) | one column, no overflow |

The rules screen is the one to look at. Nine rule cards were nine screens of
scrolling down a 768-pixel strip; they are now one screen you can read without
moving, and the thing the screen is *for* — seeing what the AI is and is not
allowed to do here, as a whole — is finally something the layout lets you do.

---

## The decisions worth reading

### The width was the easy half, and `Measured` is why it is not a regression

Dropping a cap trades a column of empty space for paragraphs 140 characters
wide, which is worse. `screen.tsx` said so when it landed and that is the reason
nobody had dropped the caps in the first place.

So every screen's opening heading and lead went into `Measured` in the same
edit, and the three screens whose header carries an action row keep the row
outside the measure, where a row of links belongs. The screens read at the same
line length they always did; what changed is everything that is *not* a
sentence.

### `Measured` renders the element it is

Fourteen of the fifteen places a measure was wanted are a screen's opening
`<header>`, and a `<header>` is a landmark a screen reader offers to jump to. The
two ways of writing this without a prop are both worse: a `<div>` inside the
`<header>` keeps the landmark and adds a wrapper holding one number, and putting
`max-w-[68ch]` on the `<header>` itself puts that number in fourteen files, which
is how one measure stops being one measure.

### `CardGrid`, because by the end there were five copies of it

Two screens had already written `repeat(auto-fill, minmax(min(100%, …), 1fr))`
by hand, and this run was about to write three more — **two of them reaching into
`page-card.tsx` for the minimum**, which is a *page* card's number borrowed by a
screen about pieces. The shape is the shared thing and the number is the
caller's, so the number is a prop: 288 for a page thumbnail, 320 for a piece,
380 for a rule.

Both existing call sites were converted too. Leaving two hand-rolled copies
beside a component written for exactly them is the drift this lane files findings
about.

### The versions screen is a split, not a widening

Its subject is a *drawn page*, and a drawn page has no measure — it wants
everything it is given. But a reader on that screen is comparing two things,
*what the page looks like* and *what the change did to make it look like that*,
and a single column makes that a scroll between them. `Columns` puts the stage
in `main` and the account beside it, so stepping a version moves both halves at
once where before the second one moved off screen.

### The guard is the actual deliverable

`every-screen-width.test.ts` asserts one property over **every screen found on
disk**, not over a list:

> **A screen's outermost element is `Screen`, and nothing in it pairs a width
> with the screen's own padding.**

Both halves are load bearing. The first alone passes a file that renders
`<Screen>` and then puts `max-w-3xl p-8` on a div inside it; the second alone
passes a file that drops the cap and keeps a hand-written container, which is the
same screen one refactor from the cap returning. It was checked by putting a cap
back: both halves fail.

One exception, `/portal/sign-in`, written as a list of one at the point of use
with its reason — it is the only page reachable without a session, it is drawn
without the rail as a centred hero, and a 1440-pixel-wide sign-in form with one
field in it is not a better use of the space.

### The ceiling came down from 29 to 1

`screen.test.tsx` shipped a ratchet: *never more than 29 caps in the lane*, with
the instruction **lower it when something converts; never raise it.** It is 1 now.

It also counts comment-free source, which it did not before — three of the last
four "caps" it was counting were the words `max-w-3xl` inside `screen.tsx`'s own
explanation of why screens should not have one. A ceiling a paragraph can raise
drifts away from the thing it bounds.

The one survivor is named in the test: the single-item list holding the decision
card on `/portal/pages/[treeId]/proposed/[proposalId]`, under two full-width
drawings of a page. It is the one place in the group where a cap does the job
`Measured` does everywhere else, on something that is not quite prose.

---

## What this tells a developer that they could not get elsewhere

Nothing new — this run moved no information onto any screen. **That is the
honest answer and it is the right work anyway:** every screen in this portal
already showed something no repository, log or `git log` holds, and half of them
were showing it down a 768-pixel strip on a 2000-pixel display. The value was
already there; what was wrong was that reading it cost three screens of
scrolling.

The rules screen is the clearest case. *Which rules can refuse a change outright,
which only stop and ask, and how close any of them has come to firing* is a
question about this deployment that exists in no other tool. It is the same nine
cards it was yesterday. Today you can see all nine at once.

---

## Gate

`pnpm install && pnpm verify` — **exit 0**, read from a file written as the last
act of its own line.

| | `main` at `ef48c4d` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 177 files / 3,699 | **177 / 3,699** — `src/` untouched |
| `@loom/app` | 374 / 6,662 | **375 / 6,701** |
| findings | 978 | **980**, 0 malformed |
| `prerender:check` | — | 124 pages, 1,470 junctions, 0 run together |
| `pnpm shoot` | — | `1680 / 1680`, `390 / 390` — no overflow at either |

No decision record. `Screen`, `Measured` and `Columns` are 3 October's and their
argument is unchanged; `CardGrid` is a fourth of the same kind, and a guard is a
test.

## Findings filed

1. **A rule shipped with a queue, and a queue in a report is not a mechanism.**
   This lane's own, about how it ships rules rather than about layout: when a
   rule lands with its conversions incomplete, what is left over belongs in a
   failing-if-it-grows guard, not in a paragraph. *A rule whose enforcement is
   "remember to look" is enforced by whoever happens to look* — the second time
   this lane has paid for that sentence.
2. **The bound is 1440 and his display is about 2000**, so a band of roughly 500
   pixels survives this change by design. Filed as a question for him rather
   than decided here, because the two kinds of content disagree: a card grid is
   what the bound was written for and is right at 1440, and a *stage* — a drawn
   page — wants every pixel there is.

## What I did not do

- **I did not change the 1440 bound.** See the finding. Picking a new number
  from the one screenshot in hand would be optimising against a sample of one,
  and it would change every screen in the group.
- **I did not restructure any screen beyond its layout.** No section moved
  between screens, no wording changed, nothing was removed. `git diff` on this
  branch contains no new sentence a reader will meet except the ones in the
  guard.
- **I did not touch `src/`.** `git diff origin/main -- src/ tools/` is empty.
- **I did not give the card grids equal heights.** On `/portal/rules` the rows
  align to their tallest card, so there are gaps. Masonry is a real change with
  real cost and this run was already wide; the gaps are visible in the
  screenshot and are the obvious next thing if they bother him.
