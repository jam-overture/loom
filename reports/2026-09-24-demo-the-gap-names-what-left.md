# The gap names what left it

**Routine:** `Loom demo` · **Branch:** `demo-27-the-gap-names-what-left` ·
**24 September 2026**

**Pull request:** _(filled in on open)_ · **Deployed preview:** _(Vercel's
comment on the pull request)_

(Published unverified against the deployment: `*.vercel.app` is off this
sandbox's egress allowlist, the standing 19 August limit. Every picture below is
a production `next build` of a real commit — `main`'s for the before, this
branch's for the after — served with `next start` and photographed with
`pnpm shoot`.)

The twenty-seventh run of this lane. It is the first one to walk the whole
sixty seconds and then judge the **last frame** rather than the words in it.

---

## What a stranger could not understand before this run

**What had just happened to the page, at the one moment the demo's whole claim
comes true.**

I did what the brief asks and used the surface as a stranger would, against a
real build of `main`, at 1280 × 900, 390 × 844, 1280 × 720 and at 348 × 465 —
the demonstration inside the front door's embed on a phone. The arrival is good
and I could not fault it: one green button, one sentence saying what every ask
meets, the claim at the size of a claim, the four other asks quiet underneath.
The held card is good. The ring on the band is good. That is twenty-six runs'
work and it holds.

Then I measured the stage, and the number is the whole diagnosis:

| | |
| --- | --- |
| the stage's document | **3,339px** |
| visible at 1280 × 900 | **857px** |
| the numbers band, the thing the one invited press is about | **top 2,040px** |

**The press this surface invites is a deletion, and a deletion has no *after* to
look at.** The demo carries the visitor to the change — correctly, and that is
last week's work — and what they arrive at is a blank strip where a band they
had seen for two seconds used to be, carrying a green bar that said:

> **Something was removed here**

That is a sentence about an absence, drawn over an absence. It is accurate and
it is the single least informative thing on the screen at the moment the surface
is making its best argument. A stranger who had not memorised a band 2,040px
down a page they arrived at forty seconds ago is being pointed at nothing and
told that something used to be in it.

And the true answer was already three inches away, on the card, in `text-2xs`:
*“3,400” “24” “92%”*. The record knew exactly what had left. The page, standing
in the gap it left, said *something*.

**On a phone it is worse and it is the frame that ends the demo.** The document
is 6,380px; `SpotlightScroll` carries the visitor to the mark; the card is
thousands of pixels above. What is on screen at the end of the demo's best
moment is one bar of green and the word *something*.

| before — `main` | after — this branch |
| --- | --- |
| [the payoff frame, wide](2026-09-24-demo-the-gap-names-what-left-before.png) | [the same frame](2026-09-24-demo-the-gap-names-what-left-after.png) |
| [the same on a phone](2026-09-24-demo-the-gap-names-what-left-phone-before.png) | [the same on a phone](2026-09-24-demo-the-gap-names-what-left-phone-after.png) |
| [a question about a section that has not arrived](2026-09-24-demo-the-gap-names-what-left-insert-before.png) | [the same question](2026-09-24-demo-the-gap-names-what-left-insert-after.png) |

## What a stranger can understand now

**What the page just lost, named on the page, in the page's own words, in the
space it came out of.**

> **Something was removed here: “3,400” “24” “92%”**

And the same rule pointed the other way, on a change that has not landed yet —
the mark in the seam where a section *would* go now reads what would arrive:

> **Something new would go here: “Opening hours” “Where to find us” “14
> Harbourline Walk, Southbank. Monday to Friday, 7am un…”**

The words are the card's words, cut by the card's function, so the two are
readable against each other in one glance rather than as two accounts of one
event.

## The change

Five files, and the unit is one claim: **a mark on a gap says what is missing
from it.**

### `_lib/plain-change.ts` — one function, two readers

`wordsOfNode` is exported. It is the existing `wordsIn` + `shown` pair the card
is already built from, given a name. The mark and the card cut at the same
length, drop the same word and count the same *and N more*, because a mark that
had cut differently would be this surface contradicting itself about the thing
it had just done, three inches apart, in one glance.

### `_lib/touched.ts` — the half a position could not supply

`TouchedNode` gains `words`. `parentId` and `index` gave a mark somewhere to be
drawn; a gap is empty by definition, so the mark drawn in it had nothing to
name.

**Nothing is fetched and nothing is guessed.** A removal's inverse already
carries the whole removed subtree — `whereItWas` has been reading it for the
position since the file was written — and an insert carries the subtree it is
about to add. The same operation that gives a mark its position now gives it its
words.

**Only the two kinds with a gap carry them**, and that is the rule rather than
an omission: a moved or configured node is still on the page, its mark is a ring
drawn round it, and every word it has is inside that ring. Quoting there would
be reading a band aloud to somebody looking straight at it.

### `_lib/spotlight.ts` — a suffix, not eight new sentences

`labelFor` takes the quotation and appends it. Every existing string is
**unchanged**, and that is deliberate: *“Something was removed here”* is the only
thing true of a change with no words in it — an image, a divider, a band whose
every string is a setting — so it stays the stem, and the quotation is what is
added when there is one. Eight rewritten sentences with the words folded into
each would be two ways of saying one thing, with a silent wrong answer waiting
in whichever a future run forgot.

A mark on a *node* never takes one, for the reason above.

The bar may now wrap. A chip in a corner is sized by its own text and must stay
an inch wide, so it keeps `nowrap`; a bar in a gap has the width of the page's
content column and is now carrying whatever three of the page's own words happen
to be, and held to one line a long one would run off the column and take the
document's scroll width with it — **a mark describing the page by widening it**,
which is the one thing every rule in that file is written to avoid. Measured: no
overflow at 1280 or at 390, and the seams the demo's own changes mark are about
90px and 120px against two lines of an 11px mark, which is about 34.

### `_lib/record.ts` — and the reason none of it reached the screen at first

The first build of this shipped the whole mechanism and produced a screenshot
**identical to the defect**. The cause is worth the paragraph, and it is filed:

The Gate looks twice. An ask is assessed by a server action that has read the
tree; **confirming a hold narrates a second assessment of the same proposal,
folded with no tree in hand** (`actions.ts`), because the surface answering a
question is not the surface that asked it. `assessed()` protects `did` from that
by writing it only when there is a tree — so the held card's sentence survives
onto the applied one. It did not protect `touched`, which the second fold
recomputes: correctly for the kind and the position, and wordlessly.

So every fold that had the words was a fold nobody was looking at, and the one
on screen at the payoff could not quote a thing. `keepingWords` closes it —
matched on node **and** kind, only ever filling in, never overwriting, never
inventing. The general rule is in `FINDINGS.md`, because the shape outlives the
field: *a fold with less in hand than the fold before it must not overwrite what
the earlier one computed.*

### What was not removed

Nothing. Every label is the label it was, with a quotation after it where there
is one. The card keeps its own copy of the words, the full record keeps every
technical section one click down, and the ring, the tones, the placement rules
and the `MAX_SPOTS` budget are untouched. The maintainer's direction holds in
both halves: the plain language got more specific, and the technical record is
exactly as complete as it was.

## Decisions taken that were not specified

- **The stem stays and the quotation is a suffix**, rather than a second table
  of sentences that name the words. Argued above; the deciding reason is the
  wordless change, which still needs *“Something was removed here”* to be true.
- **The mark quotes per *operation*, not per change.** A change with two
  operations takes two different things off two different parts of the page,
  and a mark quoting the change's whole list would name, in one gap, words that
  went from another. The demo's own presets are single-operation, so this costs
  nothing today and cannot be wrong tomorrow.
- **The quotation is capped where the card caps it** (three words, then *and N
  more*), even though a shorter cap would keep every bar to one line. Agreement
  with the card is worth more than a line: they are read together.
- **`keepingWords` fills in rather than merging.** A fresh reading that computed
  words of its own keeps them. The words are never invented and never
  overwritten.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated, nothing left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run and not off
a pipe (`VERIFY_EXIT=0`).

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 159 | 3,029 |
| `@loom/app` | 305 | 5,543 |

The demo lane's own suite goes from **556** to **570** — **fourteen added, none
weakened, none skipped, none rewritten.** Every existing assertion about a mark's
label passed unchanged, which is the point of the suffix: presence and wording
of the stems were never the defect.

`pnpm shoot` — six shots across three viewports, exit 0, **no overflow**:
`scrollWidth 1280 / innerWidth 1280` and `390 / 390`.

### The defect matrix

Each defect restored in turn against the commit, both files run, the tree
returned between rows. Baseline **64 passed** across the two.

| defect restored | caught |
| --- | --- |
| the label drops the quotation it was handed | **3 tests** |
| the second assessment clobbers the words (the defect this run actually hit) | **3 tests** |
| no registry reaches `touchedBy`, so nothing has words | **4 tests** |
| the bar is held to one line again | **1 test** |

Four rows, four caught. The second is the one worth reading: it is not a
hypothetical. It is the state this branch was in for one build and one
screenshot, and no test on `main` could have told me — because every test that
had the words was testing a fold nobody looks at.

**What this suite still cannot do**, said plainly: it asserts the element tree
and the stylesheet's text. It cannot tell you the bar is legible in a 90px seam
at 11px, which is why the pictures are the argument and the tests are the guard.

## Findings

**Filed two, one of them closed by this run.**

- `Loom demo` — **the first correct press a stranger makes is answered with a
  warning**, pinned above the card it is about, in the loudest position on the
  rail. Found by walking the surface, not by reading it. The mechanism is right
  and the measurement behind it is sound; the moment it arrives in is wrong. The
  shape that would close it is in the entry, and it is not removal.
- `Loom demo` — **a second assessment of one proposal replaces a reading the
  first one computed**, and only `did` was protected from it. Closed for
  `touched` by this run, written down because the shape outlives the field.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **twenty-sixth**
consecutive run. The cost this run was one call. What decided this unit was not
a reference gallery: it was measuring how far down a 3,339px stage the one
invited press acts, and then looking at what is on the screen when the visitor
gets there.

## Open questions

Nothing blocking.

- **The diagnosis the brief asks for, stated plainly.** Of the five clunks the
  brief lists, the one this surface still has is *the interesting part is not on
  the arrival screen* — and it is structural rather than a layout mistake. The
  press the demo leads with is a **removal**, chosen for the right reason
  (`presets.ts`: it is the one the Gate holds, and being held is the demo's
  whole point), and a removal's payoff is by definition an absence. This run
  makes the absence speak. The remaining half is that a stranger meets that band
  for the first time about two seconds before it is taken away, which is thin
  ground for a *before*. I did not change the lead preset and recommend nobody
  does — the reasoning in `presets.ts` is stronger than the cost.
- **The caution's timing** (filed above) is the largest thing this walk turned
  up that is not yet done, and it is small.
- **The automatic re-ask** (16 September) is still the largest thing open on
  this surface and still recommends being designed before it is built.

**To see it yourself:** open the preview's `/demo`, press **Take the numbers
off**, then **Apply this change**. The green bar you are carried to is the one
this run is about. Then press **Add the opening hours** on a fresh visit and
look at the amber bar in the seam above the closing panel.
