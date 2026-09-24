# 0187. A frame with no picture in it does not take the picture's shape

**Status:** Accepted
**Date:** 2026-09-24
**Section:** §4b

> **Why this number.** `0186` is taken by this branch's other record; `0185` is
> claimed by #378. This is the next free number on `main` and on every open
> branch.
>
> **Why `Accepted`.** It contradicts no `Accepted` record, touches no schema, no
> tree and no delta, and changes rendering inside `src/primitives/` only. What it
> states is a rule three primitives in this library had already answered three
> different ways.

## Context

Six primitives in the library draw a frame for an optional picture:
`loom.article`, `loom.book`, `loom.listing`, `loom.product`, `loom.recording`
and `loom.frame`. Every one of them reserves the picture's proportions with an
`aspect-ratio`, and every one of them has an author who thought about what
happens when the picture is absent. They did not reach the same answer, and none
of them wrote the answer down where the next one would find it.

The question only became measurable when bands started placing these cards.
**The catalogue ships no image source at all, by test** — a standing rule, and a
correct one — so every card in every band is the absent case, and the absent case
turned out to be the ordinary one rather than an edge.

Three findings, three days, same fault:

| when | primitive | what a photograph showed |
| --- | --- | --- |
| 2 September | `loom.recording` | a card with no panel starts its text at the card's edge while its neighbours start 11rem in — filed, three options listed, **skipping the panel** chosen |
| 23 September | `loom.recording` | in the *stacked* arrangement the same skip was not enough: `aspect-ratio: 1 / 1` on a frame with a play mark and no artwork is a 350-pixel void. Fixed, and the rule written in the band's report |
| 24 September | `loom.book`, `loom.listing` | the first bands to place six of each, with no art on any of them: six 2:3 panels 350px tall, and six 4:3 panels taking a quarter of every card |

The 23 September entry stated the rule and did not generalise it, deliberately:
it named `loom.listing` as having the same shape and left it alone, because
*"changing a primitive on an argument rather than on a picture is what produced
this defect."* That was right. The pictures now exist.

## Decision

**An `aspect-ratio` reserves the shape of a picture. A frame with no picture in
it does not get one, and takes only the size of whatever it is actually
carrying.**

What "whatever it is carrying" means is the part that differs per primitive, and
the rule is deliberately about the ratio rather than about the frame:

- **Carrying nothing** — drop the frame. `loom.recording` already does this.
- **Carrying a mark** — the frame is the mark's height. `loom.recording`'s play
  mark, at `4.75rem`.
- **Carrying a region** — the frame is as tall as what is in the region.
  `loom.listing`'s frame holds the `flags` slot, which is why it cannot simply
  drop the frame: a band that moved its badges depending on whether a photograph
  was found would be two layouts nobody chose. Bare, the ratio goes and the
  strip is a row of badges tall; with neither a picture nor a flag, there is
  nothing to carry and no frame.
- **Carrying the object's own shape** — keep the ratio and take a token width.
  `loom.book` is the case that makes this clause necessary: a book is a physical
  object, and the primitive argues at length that a blank panel with a spine
  reads as *this edition's cover is not to hand* and that a shelf should line up
  whether or not every cover was found. Both stay true at `4.5rem` of width and
  neither survives at 350px. The row rendering is untouched, because a flex
  basis beats a width on a flex item.

**What the rule is not.** It is not *drop the frame when there is no picture*.
That is one primitive's answer to it, taken by the one whose frame carries only a
mark, and generalising it would break the two whose frames carry something else.
The 2 September finding listed *always draw the panel* as an option and declined
it for `loom.recording`; `loom.book` took it and was right to. Neither of those
choices is what was wrong. **The ratio was.**

## Why it belongs in a record rather than in three doc comments

Because it has now been rediscovered three times in three weeks by three
different bands, each time from a photograph, and each time the run that fixed it
wrote the reasoning into the primitive it was holding. A rule stated in
`loom.recording` is not a rule a run writing `loom.book` reads. Six primitives
draw an optional picture today and the library is not finished.

It is also the sharpest available example of a thing this lane keeps relearning:
**a defect that no assertion can see.** Every one of these renders cleanly,
satisfies every schema, produces no diagnostic, and measures no overflow. The
only instrument that finds it is a picture of a card with nothing in it, which is
why the fixture of every primitive taking an optional image should contain one —
filed as a consequence on 23 September and restated here as the practice this
record expects.

## Alternatives considered

**Leave it per primitive and let each band fix what it photographs.** What has
been happening. It works, at the cost of one run each, and it produced a library
where three primitives answer one question three ways with no way to tell which
is deliberate.

**Make the ratio conditional in the shared stylesheet, once, for all six.** The
tempting generalisation, and it is wrong for `loom.book`, which wants to keep
the ratio and lose the width. The variation between the four cases above is
real, and a single rule would have to pick one of them and be wrong about the
others — which is the mistake this record exists to stop repeating, not a shape
to automate.

**Give the primitives a placeholder image.** Rejected on sight. A library that
shipped its own picture would be a library with a literal in it, and the absent
case would stop being visible to the next band — which is the one thing that has
been finding these.

## Consequences

- `loom.book` and `loom.listing` change what they draw for a card with no
  picture. `loom.recording` already complied and is untouched;
  `loom.article`, `loom.product` and `loom.frame` are **not audited here** and
  are the open half, filed rather than guessed at — each needs a band placing
  six of them and a photograph, which is the method this record is arguing for
  and not something to short-cut on the strength of having just written it.
- Two existing assertions in `library.test.ts` changed, both deliberately and
  both with the old wording quoted beside the new one. One said *three listings,
  three media panels — the plot has no photograph and still has a frame*; the
  plot has no flag either, so it now draws none. The other counted six book
  panels and now also counts the two that are a spine's width. No test was
  weakened and none was skipped.
- A card with no picture belongs in the fixture of every primitive that takes an
  optional image. Filed as a consequence on 23 September, restated here, and now
  true of both primitives this record touches.
- The rule is about the **ratio**, so it costs nothing to a deployment that has
  its photography: a band that sets `image` or `cover` on every card renders
  exactly as it did before this record.
