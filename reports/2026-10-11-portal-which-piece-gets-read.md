# 2026-10-11 — which piece gets read, and the two shares that are not the same number

**Build order section:** §5 — Loom Portal. `/portal/pieces` was a perfect
catalogue with no reason to open it twice. It now says, for every piece a
project has registered, how much of where it stands readers reached and what
share of the readers who met it read it — and it keeps those two apart, because
they can differ by an order of magnitude.

**Branch:** `portal-58-which-pieces-get-read` (→ `main`), cut from `main` at
`317f8cd`. Not stacked — the four open pull requests are #582 and #566
(`Loom framework`), #581 (`Loom lessons`) and #548 (`Loom primitives`), and none
of them touches a file in this lane.

**Closes** the 11 October entry in `FINDINGS.md` filed by `Loom signals` and
owned by this lane: *a kind of part now has two shares, they can differ by an
order of magnitude, and only one of them is about readers.* Taken as written,
including the pairing rule, the state it names as the one to refuse to draw, and
the three figures it says must never be drawn as people.

---

## The value answer

> *What does this tell a developer that they could not get from the repo, the
> logs, or `git log`?*

**Which of the components they wrote is not working — as a fact about the
component rather than about any one page.**

> ### Which piece should I look at first?
>
> One kind of piece misses more readers than any other on your pages. It is
> named below, with both of the figures that are known about it.
>
> **Start with Card** `loom.card`.
> It stands in 7 places on 3 pages. Readers reached it in 4 of them.
> 2 in 10 of the readers who met it read it.
> It misses more readers than any other piece here.
> → *Look at Card below*

Three things have to be true at once for that, and no two of them live in the
same tool anywhere else.

**A page has to be a tree.** An analytics product measures a URL. It can tell
you a page performs badly; it has never heard of the card inside it, so it
cannot say *the card*, and it certainly cannot add one page's cards to
another's. `git log` holds the component and not the page — the tree was never
markup in a repository, so nothing in the repository knows where `loom.card`
stands or how often.

**A type's placements have to be joined across pages.** *Do readers read the
band I put on nine pages* is a question about the **library**, and until 0257
and 0256 landed it was the one question the counters could not be asked: a
type's placements are scattered across forty readings and nothing joined them.
This screen is that join, drawn.

**And the two answers have to be kept apart.** The share of the places a piece
stands that readers reached, and the share of the readers who met it that read
it, are different questions. On the deployment in the photographs they are
**4 of 7 places** and **2 in 10 readers** — the same piece, the same counters, a
figure nearly three times the other. A card that printed one of those under the
other's label would be wrong by that much, and nothing about it would look
wrong.

So the sentence is Loom's own data twice over, and it is the first screen in
this portal whose subject is a **component** rather than a page, a change or a
rule.

---

## What a person reads now

`/portal/pieces` is unchanged above the fold: the same heading, the same lead,
the same claim that this list bounds what an AI can do to your pages. Three
things are added, all below it.

**The section**, full width above the grid:

> ### Which piece should I look at first?
>
> One kind of piece misses more readers than any other on your pages. It is
> named below, with both of the figures that are known about it.
>
> *(the card above)*
>
> These figures come from 3 pages.

**Two lines on each card**, under a rule, where the catalogue card already says
what the piece is and what you can set on it:

> It stands in 7 places on 3 pages. Readers reached it in 4 of them.
> 2 in 10 of the readers who met it read it.

**The record, one click down:**

> ▸ Why there are two figures, and the counters behind them
>
> `libraryReadingOf` (0257) counts **placements**: one element node of one
> revision of one page. Its `readShare` is `read ÷ (read + skipped)`, a ratio of
> two counts of parts of trees — so no reader is in either term, no roll-up
> window appears in it, and shortening a deployment's window cannot move it.
>
> `libraryReachOf` (0256) weighs each placement by the page views counted at its
> page's own door: `met ÷ counted` … The two answer different questions about
> one type and the answers can differ by an order of magnitude …
>
> Neither `met` nor `openings` is a headcount and neither is rounded into one …
>
> `type loom.card` · `placements 7` · `read 4` · `skipped 3` · `unknown 0` ·
> `readShare 0.571` · `openings 630` · `counted 630.00` · `met 137.75` ·
> `missed 492.25` · `share 0.219` · `atMost 0.246` · `drift 93` · `pending 0` ·
> `exact false`

---

## The state this screen is in most of the time

The staged deployment was photographed twice, and the second photograph is the
one worth looking at. **One of its three pages has no usable count of arrivals**
— and every reader share in the library goes dark, because every kind of piece
stands on that page.

That is not a bug and it is not rare. `KindReach.silence` is `unscaled` where
*any* page a type stands on could not be put on the door's scale, and 0256 is
right to refuse a share over the pages it could price: there is no safe
direction to guess in, which is 0250's refusal for a page out of an order and
0221's inside one page. A deployment of forty pages is likelier to have one such
page than not.

So the commonest job this screen has is to say that clearly:

> **Start with Card** `loom.card`.
> It stands in 7 places on 3 pages. Readers reached it in 4 of them.
> On a page it stands on, nothing is saying when a reader arrives, so there is
> no readership to measure against.
> It is passed over in 3 places, which is more than any other piece here.
>
> 1 page here has no readership to weigh these figures against, so no figure on
> this screen can be given as a share of readers. Nothing is wrong with that
> page and nothing about it is hidden — every figure about the places a piece
> stands still holds, and so does everything on the page's own card.
>
> Pricing `t_price1` — nothing there is saying when a reader arrives.

Three properties, and the screen is mostly made of them:

| | |
| --- | --- |
| the census half never goes dark with it | `readShare` has no reader, no window and no door in either term, so it stands whatever the door is doing |
| the fallback says it is falling back | a card with a places figure and a gap under it cannot be told from a card nobody measured |
| the page is named **with its own reason** | one of these pages is why, and the *why* is the half somebody can act on |

The last one is the thing the photograph caught. The fixture expected
`unmeasured` — no door row at all — and the real deployment reported `unopened`:
a row that exists and says nothing ever began. Opposite remedies, one a row that
expired and the other a sender not marking its openings. The first draft of this
screen carried the per-page reason in its reading and drew only the name.

---

## The pair, which is most of the care this unit is made of

The filing asked for it in as many words: **two labelled figures, never one**,
with *places* and *readers* load-bearing rather than decorative. It is held in
three places, each closing a way the next person could break it.

| where | what it makes impossible |
| --- | --- |
| `howItIsRead` returns **both halves as one value** | a call that produces one figure on its own, so no component can hold one without the other |
| `readers` and `withheld` are **exclusive** | a missing reader figure rendering as a gap rather than as a reason |
| `_components/how-read.tsx` draws them | the same two figures in two shapes on one screen |

The third one is the photograph's. The first build had the section running the
pair together into a single paragraph while the card it links to set them on two
lines — both right about their own arithmetic, and the defect between them. Two
presentations of one reading is how a portal comes to read as two measurements,
and it is the same shape as the pair-in-two-units defect of 7 and 8 October.
**Sixth consecutive run where a full-page photograph caught something every test
passed through.**

### Three figures that are never drawn as people

`met`, `counted` and `openings` are all page-view counts at the door's scale,
and `openings` counts one page view **once per place the piece stands there** —
so none of them is a headcount. All three are in the record and none is on the
surface. This lane shipped the opposite on 8 October, with a share of one part
of a page multiplied by the page's readership printed as a count of readers
larger than the page had; a share of *places* times a readership would be worse,
because its denominator is not people at all.

`LibraryReach.arrivals` — the one addable count of readers here — is in the
record with the sentence that says why it may be added.

---

## Visuals

**Photographs of the application, signed in, through a production build served
by `pnpm shoot --serve`.** Three pages were staged: each built through the
published builders, written through `TreeStore.create`, with counters through
`ReaderTallyStore.apply` (with an `appearances` window, so the straddle is real)
and door rows through `ReaderTallyStore.opened`. **The fiction is the readers**;
every figure, every share, the piece named at the top and the order of the
disclosure are computed by the deployment from those rows. The staging module
was deleted before committing and both shot lists are beside this report.

| | |
| --- | --- |
| [**the screen, as a reader meets it**](2026-10-11-portal-which-piece-wide.png) | `1680×1100@2x`, `scrollWidth 1680 / innerWidth 1680` |
| [**the cards, with the pair on each**](2026-10-11-portal-which-piece-cards.png) | `1680×1700@2x`, all four pieces and both figures |
| [**the record, one click down**](2026-10-11-portal-which-piece-open.png) | `1680×1500@2x`, the two arithmetics, the counters and what is not drawn |
| [**the same, on a phone**](2026-10-11-portal-which-piece-phone.png) | `390×844@2x touch`, `scrollWidth 390 / innerWidth 390` |
| [**one page with no readership, which is the ordinary state**](2026-10-11-portal-which-piece-withheld.png) | `1680×1300@2x`, every reader share withheld and the page that is why |

The section's `h2` is at `y 186` and *Start with Card* at `y 282`, both above
the fold at every viewport, which is the point of a landing section. The one
clipping box every wide shot reports is the collapsed rail, which is every
photograph of this portal and is not this branch's.

The withheld shot is the same build with one page's openings held back
(`LOOM_STAGING_HOLE=1` against the staging module), so the two photographs
differ in the deployment and not in the code.

---

## The high-schooler test, applied

> *Could a bright high schooler, who has never read a decision record, say what
> happened and what they should do next?*

**Screen: `/portal/pieces`, the new section and the two lines on every card.**
The words a person meets are *which piece should I look at first*, *one kind of
piece misses more readers than any other on your pages*, *start with Card*, *it
stands in 7 places on 3 pages*, *readers reached it in 4 of them*, *2 in 10 of
the readers who met it read it*, *it misses more readers than any other piece
here*, *look at Card below*, *these figures come from 3 pages*, and — in the
withheld state — *1 page here has no readership to weigh these figures against*
and *nothing there is saying when a reader arrives*.

None of them needs anything explained first, and the screen ends in a link to
the card it just told you to look at, which is the first primary action this
surface has had for a person who already has a catalogue. It takes nothing: the
link moves the page, it does not change one (0031, 0200 clause 4).

### What was renamed, and what moved behind a disclosure

Nothing was removed, and nothing that was on this screen before moved. Every
figure the two readings publish is on the screen or one click down; six of the
eight states below could not be read anywhere before today.

| the record says | a person reads | where the record's own form is |
| --- | --- | --- |
| `KindReading.readShare` | *readers reached it in 4 of them* | the disclosure, as `read ÷ (read + skipped)` and `readShare 0.571` |
| `KindReach.share` | *2 in 10 of the readers who met it read it* | the disclosure, as `met ÷ counted` and `share 0.219` |
| `placements` | **places** | the figure row, as `placements` |
| `standings.unknown` | *the places anything has been counted for* | the figure row, as `unknown` |
| `silence: "unscaled"` | **not comparable yet** — *“one of the pages it stands on has no count of how many readers arrived”* | the legend, beside `unscaled` |
| `silence: "unopened"` | **nobody marked as arriving** — *“nothing is saying when a reader arrives”* | the legend, beside `unopened` |
| `silence: "uncounted"` | **still being counted** | the legend, beside `uncounted` |
| `silence: "unread"` | **nothing counted yet** | the legend, beside `unread` |
| `silence: "unplaced"` | **not on your pages** | the legend, beside `unplaced` |
| `ReachSilence` on an unscaled page | *nothing there is saying when a reader arrives* | the legend and `WHY_NOT_WEIGHED` |
| `met`, `counted`, `openings`, `missed`, `atMost`, `drift`, `pending`, `exact` | nothing — never on a surface | the figure row, all eight, unrounded |
| `arrivals` | nothing on the surface | the disclosure, with why it is the one count that may be added |
| `byRole` | nothing | the disclosure, with what would have to exist for it to say anything |

The words `tree`, `trees`, `revision`, `node`, `props`, `fold`, `delta`,
`schema`, `seed` and `index` appear nowhere a reader meets unasked, which
`_lib/pieces-read.test.ts` asserts over every sentence this unit can produce —
all four summaries, both phrasings of both diagnoses, all five reasons and both
halves of every pair — and `every-screen.test.ts` asserts over the rendered
markup.

---

## The decisions worth reading

### The catalogue is never reordered by what readers did

The obvious move and the wrong one. *Most skipped first* is right for a list of
pages and wrong for the list of what an AI may build with: the answer to *what
can Loom use* would then change with last week's traffic, and a person who
learnt where a piece was would lose it. So the section names the piece and links
down to its card, the grid keeps the registry's order, and the screen's test
pins that there is no `.sort(` in it and no `<ListOrder>` above it.

### The piece to look at first is read out of the runtime, never chosen here

`mostMissed` and `mostSkipped` are the runtime's two answers and the screen
reads whichever exists, saying **which question it answered**: *misses more
readers than any other* and *passed over in more places than any other* are not
the same claim, and a screen that printed one for both would be wrong exactly
where the two readings disagree — which is the lopsided library, and the one
that most needs reading. This is yesterday's lesson applied: a rank computed in
the portal is a second implementation of a record's arithmetic that looks
entirely correct in a photograph of a deployment whose rows happen already to be
in the right order.

### One join, two readings

Both readings are taken off one list of joined pages, behind one
`skippingComparable` gate. Joining twice would be two chances to hand one
reading a different window from the other, and the two figures on every card
would then be about two different deployments — which is the precise failure the
pair exists to make impossible.

### Three reads, three costs, and none of them the screen

The catalogue is the registry, in memory, and cannot fail; this screen's claim
about what an AI may build does not depend on anybody having visited anything.
So a failed counter read is a **notice** rather than a failure — a red box above
an intact catalogue would report a working page as broken — a failed door read
degrades into `unscaled`, which the screen already draws properly, and a page
whose read did not come back is counted out and said out loud.

### A registered piece with no row is never *unused*

The reading is over the pages a deployment has counted **and joined**, so a piece
standing only on a page in the version gap, or on a page whose read failed, has
no row and is in use all the same. The card says *no page behind the figures on
this screen uses this piece — it may well be on other pages*, which is a fact,
where *nothing uses this* would be a wrong accusation about somebody's code.

### The role grouping is not drawn, and the comment says what would change that

Both readings publish `byRole`. None of it is on this screen, because nothing in
`src/primitives/` declares a role, so every placement lands in the one row for
*parts whose type said nothing* and a grouping with one row is not a grouping.
The disclosure says so **and names the condition**: one declaration per
primitive, no migration, because the join is at read time (0212). That is
yesterday's finding applied — a comment arguing a screen cannot do something is
a dated claim about the runtime, and the cheap habit is to name what would have
to exist.

### Two widenings rather than two second spellings

`plainShare` took a share and now takes the population it is a share of, because
*7 in 10 of the people* is wrong for a kind of piece and a second tenths
phrasing would round one number two ways the first time somebody changed one.
`pagesCount` moved from `_lib/fix-first.ts` to `_lib/vocabulary.ts` on the rule
that file holds: a shape moves to the shared table on the run a **second** screen
needs it. Both left every existing caller untouched.

---

## Gate

`pnpm install && pnpm verify` — status written to a file as the last thing on
its own line and read in a separate command, per `docs/routines.md`.

**Green, exit 0**, on a deleted `dist` and `.next`, against `main` at `317f8cd`.

| | `main` | + this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 205 files / 4,642 tests | **unchanged** — `src/` was not opened |
| `@loom/app` | 424 files / 7,959 tests | **428 files / 8,101 tests** (+4 files, +142) |
| findings ledger | 1,133 | **1,135** entries, 0 malformed |
| `prerender:check` | — | 133 pages, 1,798 text junctions, 0 run together |

**No test weakened, skipped or deleted to get there.** Nothing changed meaning;
every number below is an addition, and the +142 is accounted for exactly. The
`main` column for the four changed files was measured on this branch's base
rather than quoted.

| file | before | after |
| --- | --- | --- |
| `_lib/pieces-read.test.ts` | — | **83** (new) |
| `portal/pieces/_components/which-piece-first.test.tsx` | — | **18** (new) |
| `portal/pieces/reading-order.test.ts` | — | **14** (new) |
| `every-screen.test.ts` | 736 | **753** — the lane-wide guard walks every file under `(portal)`, so two new components are seventeen more generated cases without anybody adding one |
| `portal/pieces/_components/piece-card.test.tsx` | 12 | **17** |
| `_lib/stopping.test.ts` | 26 | **30** — the `plainShare` widening |
| `every-page-list.test.ts` | 20 | **21** — the new list of pages joins the sweep and takes the one exemption, with its argument |
| `_lib/fix-first.test.ts` | 29 | **29** — `pagesCount` moved and is imported from where it now lives |

Scope is twelve files under `apps/loom/app/(portal)/`, `FINDINGS.md`, this
report, two shot lists and five photographs. `src/`, `tools/`, `decisions/` and
every other route group are untouched. **No decision record:** 0256 and 0257 are
Accepted and this is a reading of the artefacts they publish, through published
entry points; 0031 and 0200 clause 4 already settle that a measurement here
reads and never acts.

---

## Findings

One closed, two appended.

1. **Closed** — the 11 October `Loom signals` entry, taken as written: two
   labelled figures, the `unscaled` family refused rather than improvised over,
   the unpriced pages named in their own vocabulary, and `met`, `openings` and
   `counted` kept off every surface.
2. **One page with no readership withholds the reader share for the whole
   library**, which is a property of 0256 and the state this screen will be in
   most of the time. Three things follow and the entry names them, including the
   one the photograph caught: an unpriced page needs its own reason, because
   *no door row* and *a door row saying nobody ever arrived* have opposite
   remedies.
3. **The twelfth hand-written photograph preload**, and the first that located
   the actual obstacle to the harness the 27 September entry asks for: it is not
   what the staging should produce — twelve preloads have answered that — it is
   **where it may live**, because `_test/` is defined as outside the production
   graph and a preload only works if a request path reaches it. Three placements
   are written down with what each costs; the choice is this lane's and is not
   made here.

## What this did not do

**It did not reorder the catalogue.** See above — a list of what an AI may build
with is not a league table, and the link is how somebody gets to the piece that
needs them.

**It did not put a figure on the library.** There is no *your pieces lost 4,000
readers this week*: a share over every kind at once is a share over every (page
view, placement) pair in the deployment, in which a page with forty parts weighs
forty times one with a single band. 0256 refuses to publish one and this screen
does not invent one.

**It did not draw the role rows.** They exist, they are published, and every one
of them in this deployment is the same row. The disclosure says so and says what
would change it.

**It did not sweep the lane for the JSX junction class.** Both new components
are guarded at the source and the general regex over `(portal)` is still filed
rather than done, for the reason yesterday gave: forty incidental edits on a
branch about a reading is a diff nobody can review.
