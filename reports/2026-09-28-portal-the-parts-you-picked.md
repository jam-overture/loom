# 2026-09-28 — "The parts you picked"

**Build order section:** §5 — Loom Portal. **`docs/portal.md` phase 2, the
inspector.**

**Branch:** `portal-40-the-parts-you-picked` (→ `main`), cut from `main` at
`777baf6`. Not stacked. `main` was not pushed to.

**No open pull request of this lane's** when this was cut. #424 (the plan) and
#425 (phase 1, the front door) were both merged, so `docs/routines.md` step 3's
*push onto the branch you already have open* did not apply.

**No maintainer comments to address**, and no review comments on this branch.

### `main` moved under it, twice, and one of them was this lane's

`origin/main` went `777baf6 → 657d27e` between the push and the deployment, and
GitHub reported the pull request `dirty`. `main` was merged in and resolved
cleanly — **no conflicted file**, which is what the three-files table in
`docs/routines.md` predicts for a branch whose only shared file is the
append-only `FINDINGS.md`.

What matters more than the conflict is what arrived. **#441 is the portal
lane's**, cut from `73559cc` and landed while this was being built — two defects
the maintainer found on the deployed portal, one of them *the rail stayed
expanded after a pointer click*. It touches `_components/shell/sidebar-nav.tsx`
and `portal/sign-in/`; this branch touches neither, and `git diff` between the
two changed no file twice.

Two consequences, both taken:

- **Every picture in this report was re-taken on the merged head**, because #441
  changed a shell component that appears in every portal screenshot. The ones
  below are from `built 2026-09-28T18:25:19.232Z`, with #441 in them. **They came
  back byte-identical** — `git status` reports no change to any of the three —
  which is the right answer rather than a failed re-take: #441's fix is a blur on
  a pointer press, so it changes what the rail does after a click and not what an
  un-hovered rail looks like. Worth stating, because a reader diffing this branch
  will see no image change and should not have to wonder whether the claim above
  is true.
- **The clipping-box finding was re-measured after it**, since #441's subject
  *was* that rail. Identical numbers. Recorded in the finding as a third tree
  rather than left as a two-sided claim that had gone stale.

Two portal branches open at once is the thing `docs/routines.md` step 3 exists to
prevent, and it happened here. It cost nothing — the files do not overlap — and
it is worth naming rather than passing over: this run checked for an open pull
request of its lane at the start and there was none, so the check is not the
thing that failed. Two runs of one lane overlapped in time.

---

## Visuals

A production build **on the merged head**, photographed by a server the harness
started after it (`built 2026-09-28T18:25:19.232Z`), in a signed-in browser
against the seeded page `t_seed1`.

| | |
| --- | --- |
| [**before**, on `main`](2026-09-28-portal-the-parts-you-picked-before-wide.png) | two parts clicked; **only the second survives**, and neither is drawn |
| [**after** — two parts inside one card](2026-09-28-portal-the-parts-you-picked-after-wide.png) | both outlined, both drawn, and the ask widened to the card that holds them |
| [**after**, on a phone](2026-09-28-portal-the-parts-you-picked-after-phone.png) | 390px, `scrollWidth 390 / innerWidth 390` |
| [**after** — two parts at opposite ends](2026-09-28-portal-the-parts-you-picked-spread-wide.png) | nothing smaller than the page holds them, and the screen says so |

The before picture was taken from `main` itself — checked out, rebuilt,
photographed, and checked back — rather than described, because the difference
this change makes is one a sentence flattens: the same two clicks produce *one*
selection on `main` and there is no picture of it anywhere on the screen.

---

## What shipped

| | |
| --- | --- |
| `_lib/selection-scope.ts` | new — the smallest part holding everything picked, and the four sentences that say so |
| `_components/picked-parts.tsx` | new — each picked part drawn on its own, through `renderLoomExcerpt` |
| `_components/selection-context.tsx` | a set rather than a node; `pick` toggles, `clear` lets all go |
| `_components/preview-surface.tsx` | every picked part outlined; a click on the page itself clears |
| `_components/selected-node.tsx` | one full block per picked part, in the order the page holds them |
| `_components/prompt-box.tsx` | reads the scope, and **states the widening beside the button** |
| `_components/tree-outline.tsx`, `outline-row.tsx` | `aria-pressed`, a picked count, a way out |
| `_lib/outline.ts` | `parentId` recovered from `outlineTree`; `nodeId` is a `NodeId` again |
| `_components/preview-surface.test.tsx` | new — the pane had no test and the marking stopped being *move the mark* |

### `renderLoomExcerpt` existed, and the portal had never called it

`docs/portal.md` recorded this on 27 September as the largest piece of assembly
§5 was sitting on. Its own docstring has said *"a preview, an inspector and a
side-by-side are all the same shape"* for weeks. This is that call, and the whole
of phase 2's picture half is one function the framework already published.

**The one interesting decision is where the render happens.** Three ways exist to
draw an excerpt of a selection the server does not know about:

1. **Pre-render every row's excerpt on the server** and ship the map down. This
   is what `_lib/outline.ts` already refuses, in its own words: *"a row holding
   its own subtree would send every node down the wire once per ancestor."* The
   page's rendered markup, once per level of nesting, to draw a handful of it.
2. **Fetch the excerpt on click.** `selected-node.tsx` settled the same question
   for credits: *"a click that costs a round trip to the log would make the
   outline feel like it was loading something."*
3. **Send the tree once and render in the browser.** One copy of the page's data
   — smaller than the rendered markup of it this screen already ships — and every
   pick after the first is free.

The third, and it is only available because the seam is pure: `renderLoomExcerpt`
is a total projection over a tree in memory, 0008 made the renderer degrade
rather than throw, and the four primitives this deployment registers are plain
components over plain props. Nothing about it is server-only. **0018 is satisfied
because this reaches the framework exactly where a host does** — the published
`@jam-overture/loom/react`, and the registry the portal builds through the SDK.

### Picking toggles, and there is no modifier key

The maintainer asked for *"1 or more nodes"*. The desktop answer is ⌘-click, and
it fails the test this surface is held to: a person who does not know the chord
can never pick two parts, and nothing on the screen would teach them. So clicking
a row or a part picks it, clicking it again lets it go, and clicking the page
itself — not any part of it — lets everything go.

The cost is honest and small: switching from one part to another is two clicks
rather than one. The rail answers it where it arises, with `2 of 10 picked`
beside the count that was already there and a way out next to it.

**What is deliberately not on the screen is an instruction.** *"Click another
part to pick it too"* is a sentence a surface writes when its behaviour needs
explaining. Clicking a second row and watching it join the first is discovered by
doing it once. What nobody discovers — that several picks are drawn together, in
the order the page holds them rather than the order they were clicked — is in the
legend, which is where the rail already keeps what a reader came for.

### The widening, said out loud — this is the load-bearing half

A scope narrows interpretation, and there is exactly one subtree. **A set of
three parts cannot be a scope.** Three answers exist and two are worse:

| | |
| --- | --- |
| refuse to scope, ask about the whole page | correct and useless: careful picking counted for nothing |
| scope to the first, or the largest | **silently drops the others** — the failure 0019 names |
| scope to the smallest part holding all of them, **and say it is bigger** | nothing dropped, and the reader knows before they press |

`_lib/selection-scope.ts` is the third. It returns four answers rather than two,
because *the whole page* arrives by two routes and a reader deserves to know
which: nothing picked is a default, and parts picked at opposite ends of a page is
a consequence. A screen giving both the same sentence would be hiding the
consequence inside the default.

The sentence sits in `PromptBox`, on the surface and not behind a disclosure,
because a consequence a reader has to open something to find is one they meet for
the first time in their page's history. It is said **once**: the excerpt pane
sits directly above the box, so a reader meets the pictures and then the
consequence, and the copy nobody reads is the one not next to the button.

Two parts with nothing smaller than the page between them post **no scope at
all** — the same `""` the screen has always posted when nothing is picked, which
`actions.ts` reads as *no scope* and omits. One encoding, not two spellings of it.

### Nothing was removed to make room

- **Every picked part gets the full rail block** it got when it was the only one
  — the name, the kind, the id, the pointing sentence, the credit, and the
  `What this addresses` disclosure. The alternative was a compact list with the
  detail collapsed behind a row, and that is a screen made simpler by removing
  what it used to say.
- **The renderer's diagnostics** for an excerpt go behind a disclosure rather
  than being dropped. This is the only screen in the portal where they can be
  read for **one part** rather than for a whole page.
- A part that is no longer in the tree says so and says nothing is broken, rather
  than drawing an empty box. `found: false` is the seam's answer and the reason
  this does not scan diagnostics for it.

### Two small repairs to the view model, both forced by the above

`OutlineRow.nodeId` had been widened to `string`, and the widening was never
true — the id comes out of the tree. What it cost is that a row could not be
handed to anything in the published API asking for a `NodeId` without a cast, and
`renderLoomExcerpt` is exactly that. `addressing` has carried branded ids across
the same boundary since the file was written, which is the proof a brand survives
the wire: it is a compile-time fact with nothing left at runtime to serialise.

`parentId` was dropped by the view model although `outlineTree` knows it.
Recovering it afterwards is a second traversal per row, and without it the
ancestry walk would have to infer nesting from a run of depths — the same answer
derived from a weaker fact. A depth run is a shape that *implies* nesting; a
parent is the nesting.

---

## What this tells a developer that they could not get from the repo, the logs, or `git log`

**Two things, and the second is the one no other tool can do at all.**

1. **What one part of a page looks like, alone, in the page's own theme** — a
   part that was never written as markup, lifted out of a document it only exists
   inside, wearing the theme the document mounts. `git log` has deltas; the repo
   has no markup to look at; the build log has a page. None of the three can show
   you a card without the page around it.
2. **What a change you are about to ask for would actually cover.** *"The 2 parts
   you picked all sit inside one part, so that is what Loom will be asked about —
   which means it may change other things inside it too."* That sentence is
   derived from the tree, the registry and what the reader just clicked. It has
   no equivalent anywhere: it is not in the log, because the change has not been
   asked for yet.

The high-schooler test, applied to this screen: *what happened* — I picked two
things and here they are. *What do I do next* — type a sentence in the box under
them, and it will be about the card, not just the two. Both are readable without
having read a decision record, and neither says node, tree, delta, scope or
ancestor.

---

## Tests

`pnpm verify` **green, exit 0**, read from a file written by the last command on
its own line, on a `.next` deleted first — `docs/routines.md`'s rule, and the
compound-command trap it names is the reason nothing follows the gate on that
line.

Taken on the merged head, after `origin/main` moved to `657d27e`.

| | `main` at `657d27e` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 166 files / 3,250 | **166 / 3,250** — untouched |
| `@loom/app` | 323 / 5,595 | **326 / 5,644** |
| findings | 871, 0 malformed | **873**, 0 malformed |
| prerender | 116 pages, 1,304 junctions | **116 / 1,304**, 0 run together |

**49 tests added, none weakened, none skipped.** The findings figure for `main`
was read from the file (`grep -c '^## '` over `git show origin/main:FINDINGS.md`)
and the two are this diff's. The `main` app figures are this branch's
measurement less the 49 this diff adds and the 3 files it adds — **arithmetic
rather than a second reading, and said so rather than presented as one.**

It is arithmetic that survived a moving base, which is some evidence it is
right: before the merge this branch read 5,638 against a `main` of 5,589, #441
added 6 to `main`, and 5,595 + 49 is the 5,644 measured afterwards. Everything
else in the table was read from the run.

Where they went:

- `_lib/selection-scope.test.ts` — **16, new.** Built over a real two-card tree
  rather than hand-written rows, because the rule under test is about ancestry
  and a hand-written `parentId` is exactly where a wrong one would hide.
- `_components/picked-parts.test.tsx` — **11, new.** The property is not that
  React rendered something: it is that **an excerpt of one card does not carry
  the other card's words**, which is what a pane quietly drawing the whole page
  would fail and a smoke test would not see.
- `_components/preview-surface.test.tsx` — **6, new.** The pane had no test at
  all. It earns one now because the marking stopped being *move the mark* and
  became *clear every one, then set the picked ones* — the same code for one
  part and different code for two.
- `tree-outline.test.tsx` **+7**, `prompt-box.test.tsx` **+4**,
  `selected-node.test.tsx` **+3**, `outline.test.ts` **+1**,
  `reading-order.test.ts` **+1**.

`reading-order.test.ts` pins phase 2's order as a property rather than a habit:
the pictures come between the page and the box, because the sentence saying what
a change would cover is *in* the box and a reader who has already typed is not
reading it.

---

## Findings

**Filed two, closed none.**

1. **Every portal screenshot reports a clipping box, and it is the sidebar doing
   what it was built to do.** Measured on three trees with identical numbers —
   `main` at `777baf6`, this branch, and the head merging #441, whose subject
   was that rail — so it is neither this diff's nor something #441 fixed. The rail is 56px with
   `overflow-hidden` and widens on hover, which no shot list can do. The finding
   is not the rail — it is that the instrument #433 added has no way to be told
   *this clip is the point*, and a line printed on every shot of a surface is a
   line that stops being read. `Loom daily build`'s, with a recommendation:
   an attribute the component declares, not an exclusion list in the shot list.
   **It is also 0202's own re-check**, arriving where that record could not look:
   its silent sweep was 32 shots over four surfaces, and the portal is in none of
   them because every screen but the sign-in needs a session and is reachable
   only through a `before` (0182). The first shot taken of this surface with the
   instrument attached fired, on something deliberate — the case 0202 says *"will
   need re-checking when it next fires."*
2. **A part the page cannot be clicked to reach is picked, and the page says
   nothing at all.** Known and deliberately not solved here. Outlining the part
   around it is the silent widening 0019 refuses; three directions are written
   down and the one this lane would build is *scroll it into view without
   outlining it*. This lane's, filed rather than built because it changes the
   preview pane rather than the inspector.

---

## What I did not do

**No decision record.** Nothing here contradicts one or needs one: 0199 already
authorises rendering the selection in isolation and says 0019's three panes stand
exactly as written, and this builds inside both. The widening rule is 0019's own
*state rather than perform* applied to a set, which is an application of a record
rather than a new one.

**No property inspector, and no moving a node by hand.** `docs/portal.md`'s
*Still not in scope*, unchanged. Nothing on this screen types a value into a
field, and the only way to change what is selected is still to ask.

**I did not touch `src/`**, and I found no framework gap — which is worth saying
because the plan predicted one and there was none. `renderLoomExcerpt`,
`pathToNode` and `outlineTree`'s `parentId` were all already published, and the
third had simply been dropped by this lane's own view model.

**I did not edit another surface's route group**, and nothing outside
`apps/loom/app/(portal)/`, `FINDINGS.md` and `reports/` is in the diff.

**Nothing is scheduled and no pull request is subscribed to.**

---

## Recommendations

1. **Phase 3 next** — versions and the progression. Its mechanism is the one this
   change just built: an excerpt rendered from a tree the log produced rather
   than from the head. *What it would look like with this proposal applied* is
   the review queue's most-asked question and has never been answerable by eye,
   and it is now two arguments away from being so.
2. **The `unaddressable` finding is small and worth doing inside phase 3**, while
   the preview pane is open anyway.
3. **`completed`, for `Loom daily build`** — signals step 2, approved 13
   September, still unbuilt, still the difference between measuring attention and
   measuring outcome. Third report in a row to say so.
