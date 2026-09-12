# A ring is a claim about the thing inside it

**Routine:** `Loom demo` · **Branch:** `demo-14-a-ring-is-a-claim` · **11 September 2026**

The tenth run of this routine. It fixes the thing the 27 August run wrote down as
what it had not done, and which the six runs since then walked past:

> For a `near` mark **the ring still encircles a band that did not change.** The
> chip now says where the change was and the ring still says *look here*, and
> those are no longer the same place, which is an improvement and is not the
> whole answer.

Fifteen days later it was still there, and it was still at the demo's payoff.

---

## What a stranger could not understand before this run

I drove the built page in Chromium at 390×844 and 1440×900 as somebody who had
never heard of Loom, pressing what the rail puts first and then saying yes.

Press **Take the numbers off**. The Gate holds it, the card asks, you press
**Apply this change**, and the page carries you to where it happened — the best
sixty seconds this surface has. This is what is at the end of them, on `main`:

> **a green ring around a patient's testimonial**, its corners traced at 4px, its
> own slate left rule replaced by the ring's green, and a chip over it reading
> **Something was removed here**.

The quote is plainly, visibly, still on the page. Three inches to the right the
card says the change took the *numbers* off, and the numbers are gone. So the
last thing a stranger is shown is the page contradicting the record beside it,
in the one colour this surface uses to mean *this is what happened*.

The other place it fires is the other change the Gate holds. Press **Add the
opening hours** and the whole closing panel — *Come and get looked at properly*,
the largest object on the lower page — is ringed amber, as though it were the
thing about to change. Nothing about it changes. The new section would go
**above** it.

### Why the label was right and the ring was wrong

`spotFor` has known since its first version that these two marks are different
things. A removed node has left the tree and an inserted one has not arrived, so
the mark is borrowed onto a *neighbour* and the label softens accordingly:

| what the mark is about | label |
| --- | --- |
| the node | *This was removed* |
| a place | *Something was removed here* |

That distinction lived in `placed: "node" | "near"` and decided the words. It was
never allowed to decide the geometry. `spotlightCss` drew one ring either way, so
a mark that had carefully stopped short of saying *this* went on drawing the
shape that means it.

**Seventh instance of this lane's standing diagnosis, and nothing was broken.**
`spotFor` was right about the subject, `labelFor` was right about the words,
`chipPosition` was right about the gap, and the file that turned all three into
pixels applied one geometry to two kinds of claim.

## What a stranger can understand now

Same press, same viewport:

> The testimonial wears its own slate rule and its own corners, and **nothing
> says it changed**. Across the seam above it, where the three figures were, a
> green bar runs the width of the page: **Something was removed here.**

And for the held insert, an amber bar lies across the seam where the section
would land, with the closing panel left alone underneath it.

The mark now means one thing in one shape: *the change is in this strip of page*.

## The mechanism the earlier finding could not find

That entry ruled out three ways of drawing a rule along the seam — `::before` is
the testimonial's own quotation glyph and several primitives decorate with it;
`box-shadow` would silently replace a card's own; `outline` cannot be one-sided —
and concluded the unit needed something this surface did not have.

All three are ways of adding a **second** thing beside the chip. The answer was
that the chip did not need a second thing. **Widen it.**

```
inset: auto 6px 100% auto   →   inset: auto 0 100% 0
```

A chip an inch wide in a corner needs a ring to say which band it is beside. A
bar the width of the seam is already lying where the change is and already
carrying the words, so the ring has nothing left to do — and the band underneath
gets to keep its own appearance.

## The changes

### `_lib/spotlight.ts` — `Spotlight.subject`, and one rule

The distinction the file had in prose is now a field: `"node"` or `"place"`. It
carries one rule, and the rule is the unit:

> **A ring is a claim about the thing inside it.** Only a mark whose subject is
> the node may draw one.

Three things follow from it and each is in the diff:

- **`outline` is conditional.** A `place` mark draws none. It keeps
  `position: relative` (the bar is absolutely positioned against it) and
  `scroll-margin` (it is still what the page scrolls to), and nothing else.
- **`border-radius` goes with the ring**, because it only ever existed to round
  it. Left behind on an unringed band it would round corners the page never asked
  to have rounded — the mark changing the page it is describing, which is the one
  thing `outline` was chosen over `border` to avoid. It was doing that already:
  on `main` the ring around the testimonial sits exactly over the quote's own
  left rule, and the after shot is the first time that rule is visible under a
  mark.
- **The bar spans the seam**, `left: 0` to `right: 0`, which is as wide as the
  page's content column because that is how wide the gap is.

The one case with no gap to draw in is the position at the very top of a parent,
which `neighbourOf` already reports as `inside`: above the first band is the edge
of the stage, and a clipping primitive would cut off anything drawn there. That
mark stays a chip in the corner — imprecise and legible, as the 27 August entry
argued — and it still draws no ring, because the band under it did not change
either. `inTheGap` is the predicate, and it is tested.

### The ten pixels

The chip sat 5px off the band. That was right for something an inch wide in a
corner and wrong the moment it ran the whole width: flush against the band's top
edge the two read as one object, and a bar saying *something was removed here*
that looks like part of the testimonial is this defect again, said more quietly.

Ten, and the number was measured rather than chosen. The two seams the demo's own
changes mark are about 90px and 120px, so ten is air rather than risk. At five the
after-shot read as a caption bar belonging to the quote; at ten it reads as a
mark on the space. Both were photographed.

## Decisions taken that were not specified

- **The bar is the chip, not a new object.** One absolutely-positioned
  `::after` per mark, as before — same font, same fill, same ink, same escaping.
  A stranger who has seen the amber pill on the record card recognises the bar on
  the page as the same thing, which is the whole mechanism by which the two
  halves of this screen teach each other.
- **The label is left-aligned in the bar.** Right was correct in a corner,
  because a band's first words are at its left. Across a full-width bar in empty
  space there is nothing to avoid, and a label starts where reading starts.
- **Nothing was removed from the record.** No card, sentence, disclosure or
  field changed. This is a stylesheet and one field on a type.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out for
  review.
- **No file outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, first attempt.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 124 | 2052 |
| `@loom/app` | 232 | 3859 |

Nothing failed, nothing was skipped, no test was weakened. **Six tests are new**
and four existing ones gained an assertion:

- **`rings a band it is about, and never one it has only borrowed`** — the
  defect, pinned. All three `place` geometries emit no `outline`; the `node` one
  does. This is the test that would have failed on `main`.
- **`rounds nothing on a band it does not ring`** — the `border-radius` half,
  which is the quieter of the two and the one a future run is more likely to
  reintroduce by tidying.
- **`draws a mark on a gap across the gap`** — `right: 0` and the ten pixels,
  both halves, both directions.
- The three pipeline tests that drive a real preset through the real Gate now
  assert `subject` alongside `placement`: the held removal is `node` (and rings),
  the applied removal is `place` (and does not), the held insert is `place`, the
  applied insert is `node`. These are the four frames of the demo's own sixty
  seconds, and they are asserted against the tree the browser is looking at
  rather than against a fixture delta.

## Findings

**Filed:**

- `Loom demo`, **closed by this branch**: the ring was a claim about a band that
  had not changed, and it was drawn at the demo's payoff. Recorded rather than
  just fixed, because the mechanism the earlier entry called missing turned out to
  be one it already had, and because `border-radius` riding along with an outline
  is the kind of thing that comes back.
- `@jonathanbravecredit`: **`21st.dev` is still `EGRESS_BLOCKED`**, thirteenth
  from this lane, while `docs/routines.md` lists it as allowed under both
  mechanisms.
- `@jonathanbravecredit`: **the brief still opens with the move to `/demo`**,
  which landed on 21 August — seventh consecutive run.

**Closed:** the 27 August entry's outstanding half, named above. The other two
open items owned by this lane are untouched: the scope control (*"ask about just
this"*, 22 August) and the rail-and-stage scroll disagreement (7 September).

## The one thing I did not fix, said plainly

**A mark on a place is now honest and it is still not a picture of the space.**
The bar lies across the seam; it does not show the height of what left or the
height of what would arrive. For the held insert that is a real absence — the
card's own preview shows the section that would land (10 September), and the page
shows a line saying it would land *there*, and nothing joins the two sizes. A
ghost outline the height of the incoming node would, and the tree has the node in
hand. That is a claim about what a page owes a change that has not happened yet,
and it is a unit of its own.

## Open questions

Nothing blocking. Two carried, unchanged by this run:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **"Ask about just this"** — the scope control, reasoned out in this lane's
  22 August finding.

## The visuals

Six frames, three pairs. Every pair is the same script driven against two
`next build` outputs — `main`'s and this branch's — so the only difference in the
frame is the change.

| | |
| --- | --- |
| [before, wide](2026-09-11-demo-a-ring-is-a-claim-before-wide.png) | `main`, 1440×900, the removal applied: the testimonial ringed green, its own left rule under the ring |
| [after, wide](2026-09-11-demo-a-ring-is-a-claim-after-wide.png) | the same moment on this branch: the bar across the seam, the quote left alone, its rule visible again |
| [before, phone](2026-09-11-demo-a-ring-is-a-claim-before-phone.png) | `main`, 390×844, same press — the ring is the whole screen |
| [after, phone](2026-09-11-demo-a-ring-is-a-claim-after-phone.png) | this branch, `scrollWidth 390 / innerWidth 390` |
| [before, insert](2026-09-11-demo-a-ring-is-a-claim-before-insert.png) | `main`, 1440×900, *Add the opening hours* held: the closing panel ringed amber, and nothing about it would change |
| [after, insert](2026-09-11-demo-a-ring-is-a-claim-after-insert.png) | this branch: the amber bar across the seam the section would land in |

Every shot measured `scrollWidth === innerWidth`.

**Preview:** on the pull request, from the deployment comment. This environment
cannot open a `vercel.app` host (the standing 19 August egress finding), so it is
read off the comment rather than visited.

**To see it yourself:** open `/demo`, press the green button, press **Apply this
change**, and look at what the page does when it carries you to the change. Then
press **No thanks** on a fresh load and press *Add the opening hours* instead,
and scroll to the bottom of the page.
