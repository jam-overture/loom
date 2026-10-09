# 2026-10-08 — what readers did, and the part they reach and never touch

**Build order section:** §5 — Loom Portal. The reader card has said what people
*saw* since it was written. This is the half about what they **did**, and it
replaces two readings this lane had computed for itself.

**Branch:** `portal-55-what-readers-did` (→ `main`), cut from `main` at
`19e0f16`. Not stacked — the one open pull request is #548, `Loom primitives`'
`primitives-55-the-page-read-rather-than-scanned`, which touches no file here.

**Closes** the 8 October entry in `FINDINGS.md` filed by `Loom signals` and
owned by this lane: *the share of readers who did something is a band's figure
and never a control's, and `unwalked` is the one state to refuse to draw.* Taken
as written, including all three of its warnings.

---

## The value answer

> *What does this tell a developer that they could not get from the repo, the
> logs, or `git log`?*

**Which part of their page readers reach in numbers and never touch.**

> *Readers get to the card “Delivery and returns” and do nothing in it — about
> 200 of the 320 readers got that far, and not one of them pressed, followed or
> opened anything inside it.*

Nothing in the ecosystem can say that sentence, and the reason is structural
rather than commercial. An analytics product measures a URL: it does not know
the page is made of parts, so it cannot name one. It also cannot tell a **band
nobody used** from a **heading nobody could use**, because both report nothing —
and that distinction is the whole claim. A press is filed against the control
and credited to the regions it happened *inside* (0167), so a part with nothing
inside it reports a nought for ever whether or not anybody pressed it. Dividing
that nought by its reach prints *0% of readers acted here* against every word on
the page.

`pageActionOf` has the one fact that tells them apart — whether a part bears
element parts — and it is a property of the tree, which is the thing only this
system has. That is why the claim is made of regions and withheld of leaves, and
why `untouched` is said of nothing else.

It is also the **second** reading on this surface a proposal could be written
from, after where reading stops (0221). *Readers reach this band and touch
nothing* is a sentence a model can act on.

---

## What a person reads now

A section of its own on each card, between what readers saw and what the last
change did:

> ### What did readers do here?
>
> **About 117 of the 320 readers** who arrived did something on this page —
> pressed something, followed a link, or opened something out.
>
> - Readers get to **the card “Delivery and returns”** and do nothing in it —
>   about 200 of the 320 readers got that far, and not one of them pressed,
>   followed or opened anything inside it. It is the part of this page with the
>   most readers and the least to show for them.
> - The part of the page that saw the most of that was **the card “Pick a plan”**
>   — 128 of the 300 visits that got that far used something in it.
> - **the heading “Pick a plan”** was pressed 112 times — more than anything
>   else here.
> - **the prose “Monthly or yearly, cancel whenever you l…”** was opened out 41
>   times. Something people want is tucked away in there.
>
> 6 of this page's 10 parts have nothing inside them — a heading, a line of
> prose, a button — so no share of readers is given for them. An action is
> counted against the parts it happened inside, and there is no inside to a
> word.
>
> › **Every part, and what was counted against it**

And on a page where nothing is ignored, in the tone this portal keeps for a good
result rather than as a missing line:

> *Every part of this page that holds other parts, and that anybody got to, was
> used by somebody. There is no section here that readers reach and never
> touch.*

---

## Visuals

**Photographs of the application, signed in, through a production build served
by `pnpm shoot --serve`.** Counters were staged into a real
`memoryReaderTallyStore()` through the published `ReaderTallyStore.apply` and
`ReaderTallyStore.opened`, and a second page was created through the published
builders so that an *ignored* region has somewhere to be — the page the portal
seeds has two regions and both were used. **The fiction is the readers**; the
pages, their parts, their words, their names and every figure on the screen are
computed by the deployment from those rows. The staging module was deleted
before committing and the shot list is beside this report.

| | |
| --- | --- |
| [**the two cards**](2026-10-08-portal-what-readers-did-wide.png) | `1680×1000@2x`, full page, `scrollWidth 1680 / innerWidth 1680` |
| [**the record, one click down**](2026-10-08-portal-what-readers-did-open.png) | `1680×1000@2x`, every part with its standing and its counters |
| [**the same, on a phone**](2026-10-08-portal-what-readers-did-phone.png) | `390×844@2x touch`, `scrollWidth 390 / innerWidth 390` |

The section is the **second** `h3` on each card at `y 623`, above the fold at
both viewports. The one clipping box both wide shots report is the collapsed
rail, which is every photograph of this portal and is not this branch's.

---

## The photograph found a defect that every test passed through

**This is the part of the run worth reading, and it is the second time in two
days.**

The first draft gave every part its figure in people the same way: the part's
share, multiplied by the exact count of readers who arrived. The photograph:

> **About 98 of the 320 readers** who arrived did something on this page …
>
> *(two lines down)*
>
> … was the card “Every change is a delta” — **about 239 of the 320 readers**
> used something in it.

Two hundred and thirty-nine of the people on a page a hundred of them did
anything on. Both numbers came out of correct code: the first is a share of the
**page** against the page's readership, the second is 74% of the readers of
**one card** against the same readership. A different denominator wearing the
same words.

**Nothing failed and nothing could have.** Every test in this lane is scoped to
a module or a component, and each sentence is right about the division it made.
The property that broke is *between* them — which is exactly the shape this lane
filed on 7 October, and the instrument that found it both times was a full-page
photograph with the figures legible in it.

Three things came out of it:

- **The rule, stated where the arithmetic is.** `readersBehind` takes a
  parameter named `pageWideShare`, and its doc comment says what the figure is
  not. A share may be applied to the arrivals only where the share is of the
  whole page.
- **The guard is an inequality, not a string.** Over every sentence the section
  draws: *no figure under the page-wide headcount may exceed it.* A third
  spelling of this mistake has to beat that rather than an expected sentence.
- **The fix was to stop saying it in people.** The honest per-region figure is
  its share applied to its **own** reach in people — *about 112 of the about 125
  readers who got that far* — an estimate standing on an estimate, with two
  `about`s in one sentence. Regions keep two counts off one row, said as counts:
  the straddle is on both sides of that division, and the section above already
  says how generous the raw counts are.

---

## Two readings were deleted, and that is the point of the branch

This lane built `pageUse` and `unplacedUse` in `_lib/reading-view.ts` when the
region counter first became readable and nothing in the framework interpreted
it. The framework now answers both exactly, and better:

| this lane's | the framework's | what changes |
| --- | --- | --- |
| `pageUse.whole` — the largest `engaged` any row reports, over the largest `views` any row reports | the **root's own row** | a maximum over rows is the root's on a healthy window and a different number for an hour after an upgrade |
| `pageUse.region` — withheld when its engagement equals the page's | the most-used part **below depth 0** | *everybody who did anything did it in the pricing band* is now said where it used to be a blank |
| `unplacedUse` — presses, opens and closes with nowhere to go | `PageAction.unwalked` | counts **submissions** too, and is decided by the framework rather than by a predicate here |
| *(nothing)* | `PageAction.mostIgnored` | the sentence this card could not say |
| *(nothing)* | `usesPerReader`, `shutAgain`, three standings, `leaves` | the record, one click down |

**They are gone rather than kept beside it**, and that is this run's reading of
its own 7 October finding: *a lane adding a better figure beside a worse one
ships both unless something makes it choose.* `highlightsOf`'s `mostClicked` and
`mostOpened` moved for the weaker reason that they are about doing and
everything else it returns is about attention.

---

## The high-schooler test, applied

> *Could a bright high schooler, who has never read a decision record, say what
> happened and what they should do next?*

**Screen: `/portal/readers`, the new section on every card.** The words a person
meets are *what did readers do here*, *about 117 of the 320 readers who arrived
did something on this page*, *readers get to the card “Delivery and returns” and
do nothing in it*, *the part of the page that saw the most of that*, *was
pressed 112 times*, *was opened out 41 times*, and *there is no section here
that readers reach and never touch*. None of them needs anything explained
first, and the last line of the section is the one a person acts on.

### What was renamed, and what moved behind a disclosure

Nothing was removed. Every figure the deleted readings produced is on the
surface or in the record, and five more are in the record that were nowhere
before.

| the record says | a person reads | where the record's own form is |
| --- | --- | --- |
| `engaged` on the root | **about 117 of the 320 readers … did something** | the disclosure's `engaged` column and the share paragraph |
| `engaged` on a region | **128 of the 300 visits that got that far used something in it** | the same column, per part |
| `standing: untouched` | **readers get to … and do nothing in it** | the disclosure, as `untouched — 1`, with the runtime's sentence |
| `standing: unknown` | *(never on the surface)* | the disclosure, with why a leaf is in it |
| `bearsParts: false` | **6 of this page's 10 parts have nothing inside them** | the `standing` column, as `unknown` |
| `activations` | **was pressed 112 times** | the `uses` column and the counters paragraph |
| `opens` | **was opened out 41 times** | the same |
| `usesPerReader` | *(not on the surface)* | the disclosure, named *per reader*, never `%` |
| `shutAgain` | *(not on the surface — see findings)* | the disclosure, uncapped, with why |
| `unwalked` | **something was used here, and nothing said where** | the notice's disclosure, with the sender to fix |
| `leaves` | **so no share of readers is given for them** | the sentence itself, and the standings |

The words `engaged`, `activated`, `disclosed`, `unwalked`, `within`, `node`,
`tree` and `revision` appear nowhere on the surface of this section, and a test
asserts it over the whole rendered surface with the disclosures excluded.

---

## The decisions worth reading

### The claim about an absence is made of regions and withheld of leaves

This is the finding's first warning and it is the module's whole honesty. A
leaf's `engaged` is zero by a filing rule, so a share built from it measures
nothing — and a screen that drew it would rank the page's parts by how little
each one is a container. `n_buy` in the fixtures is the case: fourteen presses
against it, standing `acted` because that is a use of its own, share withheld,
and never `untouched` whatever happens to it.

### `unwalked` draws no share at all, rather than a share with a caveat

The second warning. A page that holds presses and credits a reader inside
nothing has every share at nought and every region reading as untouched, with
the counters looking perfectly healthy. So the section draws the notice and
**nothing else** — no headcount, no ignored region, no most-pressed part. A
figure beside that notice would be the failure the notice is about.

### A region's figure is in visits and the page's is in people

Not a shortcut: see the defect above. The page-wide share is a share of
everybody and may be applied to the arrivals; a region's is a share of the
readers who got to it and may not. The ignored region's **reach** is in people,
because that figure is `pageReachOf`'s own and is already drawn in the section
above — one arithmetic for it, not two.

### Ties break on reading order rather than on an identifier

`pageUse` broke a tie on reach and then on `nodeId.localeCompare`. A reader
comparing two cards can see which of two parts comes first on the page and
cannot see which identifier sorts earlier, so the ranking is stable *and*
visible. It is the rule `mostIgnored` already uses, spelled the same way.

### The occurrence sentences moved out of the attention list

*Fourteen presses* and *nine openings* were three lines of the card's highlights
with *people stayed longest on the introduction* sitting between two of them. A
reader working out whether anybody uses their page had to assemble the answer
out of a list sorted by nothing. The list keeps attention; the section keeps
doing; and within the section the headcounts come before the event counts, so
nothing invites a reader to add a count of people to a count of presses.

---

## Gate

`pnpm install && pnpm verify` — status written to a file as the last thing on
its own line and read in a separate command, per `docs/routines.md`.

**Green, exit 0**, on a deleted `dist` and `.next`, against `main` at `19e0f16`.

| | `19e0f16` + this branch |
| --- | --- |
| `@jam-overture/loom` | 195 files / 4,334 tests — unchanged by this branch, `src/` was not opened |
| `@loom/app` | **414 files / 7,413 tests** |
| findings ledger | **1,076** entries, 0 malformed |
| `prerender:check` | 128 pages, 1,586 text junctions, 0 run together |

**No test weakened, skipped or deleted to get there.** Across the five test
files this branch touches: **132 tests before, 168 after (+36)**, two of the
five being new. Twelve tests were **moved** out of `reading-view.test.ts` with
the two readings they were about, and every property they pinned is re-asserted
in `_lib/doing.test.ts` (35 tests) off `pageActionOf` — the page-wide headcount,
the region below it, the ranking by count rather than by share, the
deterministic tie, the region with no denominator of its own, the page nobody
used, the actions with nowhere to go, and the rule that a reading is never both
at once. Three of them say something different now and each says so in its own
comment.

Scope is nine files under `apps/loom/app/(portal)/`, `FINDINGS.md`, this report,
a shot list and three photographs. `src/`, `tools/`, `decisions/` and every
other route group are untouched. **No decision record:** this is a reading over
data the record already holds, through a published entry point, and 0031 already
settled that a measurement reads and never acts.

---

## Findings

Two appended, one closed.

1. **Closed** — the 8 October `Loom signals` entry. All three warnings taken as
   written.
2. **A share of one part of a page, multiplied by the page's readership, is a
   count of people larger than the page has.** Closed in the instance, recorded
   because it is the second instance in two days of a class only a photograph
   has ever caught.
3. **`shutAgain` is in a disclosure rather than on the surface**, and the
   judgement is written down so the next run can overturn it on purpose. What
   would earn it a line is a ranking by the *worst* ratio rather than by the
   most-opened part, which needs a floor under `opens` nobody has chosen.

## What this did not do

**It did not put a people-figure on a region**, which is the defect above and is
deliberate for as long as the only honest form is an estimate on an estimate.

**It did not rank by `shutAgain`**, which is finding 3.

**It did not touch `PageAction.role`.** A leaf readers reached with no uses
against it is a button nobody pressed or a heading nobody could press, and the
tree cannot say which — `Loom primitives`' open entry of 6 October, filed twice
and still the thing that would turn the quietest half of this reading into a
finding.

**It did not answer on a version gap.** The reading is withheld with the other
four, for the reason the card's own comment gives: *readers ignore the second
band* about a version nobody is being served is a finding somebody would act on
and should not.
