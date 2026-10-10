# 2026-10-10 — which page to fix first, and the rung the module said did not exist

**Build order section:** §5 — Loom Portal. `/portal/readers` could tell you
everything about a page and nothing about which page. It was alphabetical, and
the module that ordered it had the argument for why written down.

**Branch:** `portal-57-which-page-to-fix-first` (→ `main`), cut from `main` at
`39c6ef3`. Not stacked — the two open pull requests are #566 (`Loom framework`)
and #548 (`Loom primitives`), and neither touches a file here.

**Closes** the 9 October entry in `FINDINGS.md` filed by `Loom signals` and
owned by this lane: *the reader surfaces have never had a landing screen, and
now there is an order to draw one from.* Taken as written, including three of
its four refusals; the fourth is answered differently and the closing note says
why.

---

## The value answer

> *What does this tell a developer that they could not get from the repo, the
> logs, or `git log`?*

**Which of their pages to open this morning, with the reason and the weight.**

> ### Which page should I fix first?
>
> 3 pages are losing readers partway through. They are at the top of this list,
> worst first.
>
> **Start with Autumn arrivals** `t_shop1`.
> 6 in 10 of the people who got as far as the card “What it costs” `n_shop8`
> never went on to the card “Questions people ask” `n_shop11`.
> That is about 337 of the 1240 readers who arrived. It is the most of any page
> here.
> → *Open Autumn arrivals*

Three things have to be true at once for that sentence, and no two of them live
in the same tool anywhere else.

**A page has to be a tree.** An analytics product measures a URL. It can rank
URLs by bounce rate; it cannot say *between the pricing card and the questions
card*, because it has never heard of either. `git log` holds the primitives and
not the page — the tree was never markup in a repository.

**Two pages' losses have to be made comparable**, and raw counts are not.
Every distinct count in this subsystem is generous by the readers who straddled
a roll-up window, and **the straddle rate is each page's own**: a page readers
linger on for twenty minutes against a five-minute window is inflated roughly
fourfold, and one read in ninety seconds is not. Ranking the raw losses ranks
partly by how long readers stay. The correction — `lost ÷ (1 + drift ÷ opened)`
— needs a count taken **at the door** and a count taken **per part**, and a
system that holds only one of the two cannot compute it.

**And the thing being ranked has to be an order rather than a sum.** There is no
deployment-wide figure for readers lost here and 0250 says there will not be
one. The one total on the screen is the arrivals, which is addable for the one
reason nothing else is: a reader arrived at one version of one page and was
counted once.

So the sentence is Loom's own data twice over, and it is the first screen in
this portal that answers *where is the problem* rather than *tell me about this
page*.

---

## What a person reads now

Three things, and the first is the only one above the list.

**The section**, full width above the cards:

> ### Which page should I fix first?
>
> 3 pages are losing readers partway through. They are at the top of this list,
> worst first.
>
> *(the card above)*
>
> 1 of these 4 pages is not in the order. Nothing is wrong with it and nothing
> about it is hidden — what it loses cannot be put on the same scale as another
> page’s, so it is listed without a place in the order.

**The list below it, in that order.** The cards did not move, change or lose
anything; they arrive worst first. The sentence above them changed from *Pages
are listed by name* to *Pages losing the most readers come first.*

**The record, one click down:**

> ▸ How this order is worked out, and the counters behind it
>
> Each page is in this order once, at the newest version its counters have
> finished. Which version each figure came from is on that page’s own card
> below.
>
> A page is placed by the readers it loses at its sharpest fall, put on the
> scale the arrival count is in: `lost ÷ (1 + inflation)`, where the inflation
> is that page’s own `drift ÷ opened` off its own page-view row …
>
> page `t_shop1` · at `revision 0` · lost `570` · inflation `0.694` ·
> readers `336.57` · opened `1240` · share `0.648`
>
> **in the order** · `ranked` × 3
> This page loses readers somewhere, and the loss can be compared with another
> page’s.
> `in the order, by the readers it loses at its sharpest fall`
>
> **not comparable yet** · `unscaled` × 1
> Nothing counted how many readers arrived at this page, so what it loses
> cannot be put on the same scale as another page’s. Every figure on the page
> itself still stands.
> `no page views counted at the door, so its loss is not comparable with another page's`

---

## The two figures, which is the care this unit is mostly made of

`readers` is the loss at the door's scale. `lost` is what the counters say.
They are different numbers for a good reason, and the entry closing with this
branch named the failure to avoid in as many words: *the pair is the straddle
made visible, and it is the two-figure failure the 7 and 8 October entries have
now made twice if they land three lines apart in different units.*

So:

| | where it is | why there |
| --- | --- | --- |
| `readers` — 337 | the surface | it is the figure the order is on, and the door's exact arrival count is in the same units |
| `opened` — 1240 | the surface, beside it | *about 337 of the 1240 readers who arrived* is a sentence whose two halves agree, and it is sayable here and nowhere else in this subsystem |
| `lost` — 570 | the disclosure | the counters' own figure, so a reader checking the portal against them finds a number they can reproduce |
| `inflation` — 0.694 | the disclosure, beside `lost` | it is the whole of the difference between the two, and the sentence above it says so |

`share` is on the surface as the fall sentence, because both of its counts come
off the same rows and it survives the over-count without any correction (0221).

---

## Visuals

**Photographs of the application, signed in, through a production build served
by `pnpm shoot --serve`.** Four pages were staged: each built through the
published builders, written through the published `TreeStore.create`, with
counters through `ReaderTallyStore.apply` and door rows through
`ReaderTallyStore.opened` — including one page deliberately given **no door
row**, so that *out of the order* has something to describe. **The fiction is
the readers**; every figure, every name, every part and the whole order are
computed by the deployment from those rows. The staging module was deleted
before committing and the shot list is beside this report.

| | |
| --- | --- |
| [**the order, as a reader meets it**](2026-10-10-portal-which-page-first-wide.png) | `1680×1000@2x`, `scrollWidth 1680 / innerWidth 1680` |
| [**the record, one click down**](2026-10-10-portal-which-page-first-open.png) | `1680×1500@2x`, the arithmetic, the counters and the legend |
| [**the same, on a phone**](2026-10-10-portal-which-page-first-phone.png) | `390×844@2x touch`, `scrollWidth 390 / innerWidth 390` |
| [**the section and the card it leads with**](2026-10-10-portal-which-page-first-order.png) | `1680×2600@2x`, the first card whole and the second beginning |

The section is the first `h2` at `y 205`, with *Start with Autumn arrivals* at
`y 282` — both above the fold at every viewport, which is the point of a landing
section. The one clipping box every wide shot reports is the collapsed rail,
which is every photograph of this portal and is not this branch's.

**The order itself is measured rather than claimed** (0213). The four page
cards' headings, on the one run, in the order the page lays them out:

| `y` | card | why there |
| --- | --- | --- |
| 582 | Autumn arrivals | `readers 336.57` |
| 2348 | Help and support | `readers 170.62` |
| 4037 | About us | `readers 26.54` |
| 5726 | Pricing | out of the order — `unscaled`, so last, by the shared tiebreak |

Alphabetically that list is *About us, Autumn arrivals, Help and support,
Pricing*, which is what the screen showed yesterday.

### The photograph found a defect no test in this repository could

The disclosure rendered:

> *that page’s own `drift ÷ opened`off its own page-view row*

The source has a real space there, mid-line, between the element and the word.
**It is in the DOM under the transform the tests run through and is not in the
built page** — checked rather than assumed, by rendering the same markup through
`@testing-library/react` and reading `textContent`. Vitest transforms with
esbuild, `next build` with SWC, and the two disagree about the leading
whitespace of a JSXText node that begins mid-line after an element.

`prerender:check` is the tool that exists for exactly this and reported *1755
text junctions, 0 run together* on the run that shipped it: `/portal/readers` is
server-rendered on demand behind a session, so it is not in the 132 pages that
checker walks, and neither is any other screen in this portal.

Fixed with `{" "}`, and guarded at the source — this component's test asserts
that no `</span>` is followed by whitespace and a letter. The general sweep over
the lane is filed rather than done, because forty incidental edits on a branch
about an order is an unreviewable diff.

**Fifth consecutive run where a full-page photograph caught something every test
passed through, and the first where the test was right about its own render and
still wrong about the page.**

The photograph also moved the section from `68ch` to full width: measured
prose above a list of full-width cards read as a sidebar that had drifted to the
top rather than as the thing the list is ordered by.

---

## The high-schooler test, applied

> *Could a bright high schooler, who has never read a decision record, say what
> happened and what they should do next?*

**Screen: `/portal/readers`, the new section and the order of the list.** The
words a person meets are *which page should I fix first*, *3 pages are losing
readers partway through*, *start with Autumn arrivals*, *6 in 10 of the people
who got as far as the card “What it costs” never went on to the card “Questions
people ask”*, *that is about 337 of the 1240 readers who arrived*, *open Autumn
arrivals*, *1 of these 4 pages is not in the order*, *nothing is wrong with it
and nothing about it is hidden*, and *pages losing the most readers come first*.

None of them needs anything explained first, and the screen ends in a link to
the page it just told you to open — which is the first time this surface has had
a primary action at all. It is a measurement and it still takes nothing: the
button opens a page, it does not change one (0031, 0200 clause 4).

### What was renamed, and what moved behind a disclosure

Nothing was removed. Every figure the runtime publishes about the order is on
the screen; four of the six standings below could not be read anywhere before.

| the record says | a person reads | where the record's own form is |
| --- | --- | --- |
| `standing: "ranked"` | **in the order** | the legend, beside `ranked`, with `describeRankStanding`'s own line |
| `standing: "unbroken"` | **losing nobody** | the legend, beside `unbroken` |
| `standing: "unscaled"` | **not comparable yet** — *“nothing counted how many readers arrived at this page”* | the legend, beside `unscaled` |
| `standing: "unopened"` | **nobody marked as arriving** | the legend, beside `unopened` |
| `standing: "unread"` | **nothing counted yet** | the legend, beside `unread` |
| `standing: "inconsistent"` | **the numbers disagree** — *“something other than a published page is reporting in”* | the legend, beside `inconsistent` |
| `readers`, `lost`, `inflation`, `opened`, `share` | *about 337 of the 1240 readers who arrived* | the figure row, all five, unrounded |
| `revision` | **version** | the figure row, as `revision 0` |
| the ranking rule | *pages losing the most readers come first* | `lost ÷ (1 + inflation)`, written out |

The words `tree`, `trees`, `revision`, `node`, `props`, `fold`, `drift`,
`straddle`, `inflation`, `standing` and `continuity` appear nowhere a reader
meets unasked, which `_test/plain-language.ts` asserts over every sentence this
unit can produce — all four summaries, both phrasings of both diagnoses, and all
six standings.

---

## The decisions worth reading

### The order is read out of the runtime, never re-derived

`losesMostRank` is the only rank in `page-order.ts` that is a **position** and
not a rung computed on the screen. The other five are a count, a boolean or a
tier that the screen had already read. This one is three keys deep and the two
figures it compares are only comparable because of a correction the runtime
applies, so a `sort` written in the portal would be a second implementation of
0250 living next to the first — and it would look entirely correct in a
photograph of a deployment whose pages happen already to be in the right order.
The screen's own test pins that there is no `.sort(` in it.

### The pages out of the order are a diagnosis, never a second league table

0250 refuses to rank a page the door cannot scale, for the reason 0221 refuses
it inside one page: there is no safe direction to guess in. A portal that
ranked those among themselves by share would be undoing that refusal one layer
up. So they are a count, one sentence, and a legend keyed by standing — in the
order the runtime handed them over, with a test asserting this screen never
re-sorts them. Their own cards are below with every figure they ever had.

### One rung for all of them, rather than a position each

They get one rank and the shared tiebreak arranges them, which is the half
`page-order.ts` says makes two screens agree about the pages they have nothing
to say about. A page the order never saw at all sorts below every page it did —
absent from an order is not *nothing wrong with it*.

### The verb is the half a count word cannot carry

`1 page of these 2 **are** not in the order` passed every assertion about the
number and is the first sentence a reader distrusts. `pagesCount` gives the
noun and nothing gives the verb, so both diagnoses have two phrasings and the
count chooses. It was the rendered test that caught it, which is the argument
for having one.

### Two widenings rather than two second spellings

`fallSentence` took a `Fall` and now takes the least a fall needs to be said
aloud — a share and two names — because `fix-first.ts` holds the runtime's own
`ReadingStop`: two node ids, no named part, no standing to invent. `readersOutOf`
took a `PageArrivals` and now takes the count off it, because this reading holds
a door row rather than a page's reading. Both are structural widenings that left
every existing caller untouched, and both exist so that one phrase is not spelled
twice. Two spellings of one reading is how a portal comes to say the same
arithmetic in two voices, which reads as two measurements.

### One row per page, said rather than implied

`deploymentReadingOf` can hold two live versions of one page as two rows, on
purpose. **This screen can only ever hand it one**, because a fall is a
comparison between two parts of a page and only one version of a page can be
read from the store — so a page whose counted window has not caught up with a
change is absent from the order for as long as an hour. That count is handed
over (`FixFirst.unjoined`) and the screen says it, with the half a notice has to
carry or it sends somebody hunting: *there is nothing to do about it*, and it
clears itself once a collection window has passed.

### The order is drawn for the deployment and never for one page

`/portal/readers?tree=…` is somebody asking about a page they have already
chosen. *One of your pages is losing readers* about the page named at the top of
that screen is the portal telling a reader something they arrived holding, so
the section is drawn only unscoped.

---

## Gate

`pnpm install && pnpm verify` — status written to a file as the last thing on
its own line and read in a separate command, per `docs/routines.md`.

**Green, exit 0**, on a deleted `dist` and `.next`, against `main` at `39c6ef3`.

| | `main` | + this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 201 files / 4,537 tests | **unchanged** — `src/` was not opened |
| `@loom/app` | 421 files / 7,812 tests | **423 files / 7,881 tests** (+2 files, +69) |
| findings ledger | — | **1,115** entries, 0 malformed |
| `prerender:check` | — | 132 pages, 1,755 text junctions, 0 run together |

**No test weakened, skipped or deleted to get there.** Nothing changed meaning;
every number below is an addition, and the +69 is accounted for exactly:

| file | before | after |
| --- | --- | --- |
| `_lib/fix-first.test.ts` | — | **29** (new) |
| `portal/readers/_components/which-page-first.test.tsx` | — | **14** (new) |
| `every-screen.test.ts` | 726 | **736** — the lane-wide guard walks every file under `(portal)`, so a new component is ten more generated cases without anybody adding one |
| `_lib/page-order.test.ts` | 40 | **47** — five new, and two because `loses-most-first` joins the two `it.each` lists |
| `portal/readers/reading-order.test.ts` | 20 | **25** |
| `_lib/stopping.test.ts` | 24 | **26** — the `fallSentence` widening |
| `_lib/arrivals.test.ts` | 42 | **44** — the `readersOutOf` widening |

Scope is ten files under `apps/loom/app/(portal)/`, `FINDINGS.md`, this report,
a shot list and four photographs. `src/`, `tools/`, `decisions/` and every other
route group are untouched. **No decision record:** 0250 is Accepted and this is a
reading of the artefact it publishes, through published entry points; 0031 and
0200 clause 4 already settle that a measurement here reads and never acts.

---

## Findings

One closed, three appended.

1. **Closed** — the 9 October `Loom signals` entry, with a closing note on the
   one of its four points that is answered differently and why.
2. **A JSX space survives the test transform and not the build**, so a rendered
   test is green on a junction the browser runs together — and `prerender:check`
   cannot see any screen in this portal, because all sixteen are behind a
   session. Closed in the instance, recorded because nothing in the repository
   can catch the next one.
3. **A comment explaining why a screen cannot do something is a dated claim
   about the runtime**, and nothing re-reads one when the runtime changes. This
   is the instance that cost a day; four more are in this lane today and the
   entry names them.
4. **The eleventh consecutive hand-written photograph preload**, and the first
   that had to invent a deployment rather than measurements — which sharpens the
   27 September ask a third time. It also cost two wasted shoots, because
   `pnpm shoot --serve` serves a build rather than making one.

## What this did not do

**It did not put a figure on the deployment.** There is no *your pages lost
4,000 readers this week* and there will not be one: a reader past two falls is
in both counts and a count that has been added cannot be unadded (0158). The
screen is an order, and the only total on it is the arrivals.

**It did not rank the pages the door cannot scale.** See above — that is 0250's
refusal and undoing it one layer up is the single way this reading could have
been quietly wrong.

**It did not touch the cards.** Five readings, every figure, every disclosure:
unchanged. The list they are in is in a different order and the sentence above
it says so, which is the whole of what moved.

**It did not sweep the lane for the junction class.** One component is guarded
and the general regex is filed. A sweep landing with forty incidental edits on
a branch about an order is a diff nobody can review, which is the rule the
18 August redirection set for the rename and holds just as well here.
