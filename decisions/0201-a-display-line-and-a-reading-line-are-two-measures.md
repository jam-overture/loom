# 0201. A display line and a reading line are two measures

**Status:** Accepted
**Date:** 2026-09-28
**Section:** §4b

## Context

A band that holds text has to decide how wide that text may run. `loom.hero`
decided it once, in one constant, and held the heading slot and the lead
paragraph to the same number:

```ts
const TEXT_MEASURE = "44rem"

rise(1, loom.slots["heading"], { maxWidth: TEXT_MEASURE })
rise(2, children, { maxWidth: TEXT_MEASURE, … })
```

The comment above it was about reading — *a headline set across 68 characters
reads as a paragraph* — and it is correct. What it does not say is that the
number it picks is a number of **pixels**, and that the two things it is applied
to are set at wildly different sizes. 704px is:

| at | is | which is |
| --- | --- | --- |
| a 20px lead (`minimal-sans` step 4) | ~52 characters | a reading measure |
| a 72px headline (`minimal-sans` step 8) | ~19 characters | a column |
| an 88px headline (`bold-sans` step 8) | ~16 characters | a narrower column |

So one constant was right for the paragraph and wrong for the headline, and the
failure is invisible to every check in this repository: nothing overflows, no
diagnostic is emitted, every palette assertion passes, and `pnpm verify` was
green throughout. The marketing lane filed it on 20 September, re-photographed
it on 26 September, and it was eight days open when this was written — *the
first screen a stranger meets has had no action on it for six days, and it is
the single most expensive thing on this surface that this lane cannot reach.*

Measured on the front door's own forty-five-character headline at 1280×900,
before:

| palette | headline | measure | lines | primary action's top edge |
| --- | --- | --- | --- | --- |
| `minimal` | 72px | 704px | 3 | 681px |
| `editorial` | 72px | 704px | 3 | 652px |
| `bold` | 88px | 704px | 3 | 714px |

**The decisive evidence that the number was load-bearing is that another lane
compensated for it.** `minimal-sans` caps its top step at 72px, and says why in
its own comment:

> Step 8 is 72 and not more. `loom.heading` maps level 1 to the top step and
> `loom.hero` holds its text to a 44rem measure, so an ambitious top step does
> not produce a bigger headline — it produces the same headline on four lines.
> Tuned against a render rather than against the numbers.

A font pack in `src/theme/` was tuned around a layout constant in
`src/primitives/`. Nothing was wrong with the tuning; it was the correct local
response to a constraint that should not have existed.

## Decision

**A band caps a display line and a reading line separately, and the display cap
is a backstop rather than a setting.**

Three parts, in the order they bind:

1. **Two constants, never one.** A region that holds a heading and a region that
   holds prose get their own measures, even where the two numbers happen to
   agree today. One constant applied to both is a claim that a 72px line and a
   20px line want the same character count, and that claim is false at every
   font pack in the library.

2. **The display cap stops being the constraint inside the band it is drawn
   for.** `loom.hero`'s is `64rem`, which is 1024px against the ~980px a `wide`
   page actually gives the band — so on the page the library is designed around,
   the band's own edges decide and the constant decides nothing. It bites on a
   `width: "full"` page and on a viewport wider than the wide page, which are
   the two places a display line genuinely runs away. A cap that changes the line
   count on the default page is a layout decision taken on the font pack's
   behalf, which is exactly what produced the `minimal-sans` comment above.

3. **The number is chosen against a render, and the render is photographed.**
   What a measure is worth is the line count it produces, and that cannot be
   derived: it depends on the face, the weight, the tracking and the copy. Every
   candidate here was rendered under all three starter palettes and measured, and
   `56rem` — the value the arithmetic suggests — was rejected because it fixes
   the two 72px packs and leaves `bold-sans` on three lines, which is the old
   defect with a better number in it.

After, on the same tree and the same viewport:

| palette | measure | lines | primary action's top edge |
| --- | --- | --- | --- |
| `minimal` | 984px | 2 | 598px (−83) |
| `editorial` | 984px | 2 | 587px (−65) |
| `bold` | 980px | 2 | 612px (−102) |

## Consequences

**The reading measure was left at `44rem` deliberately, and that is the part
most likely to be read as an oversight.** It is 52 to 56 characters of a lead
across the three starter packs, which is inside the range a reading measure
wants — so the one constant was accidentally correct for the one of its two jobs
nobody complained about. The unit is still wrong in principle: a reading measure
should be `ch`, so it tracks the pack rather than the root font size, and
`READABLE_MEASURE` in `tokens.ts` is already written that way. Re-expressing it
here would narrow the lead by about 120px under `minimal-sans` and move pixels
on every page in the repository to fix nothing that is wrong. Noted rather than
changed.

**The display measure stays a length, and cannot be otherwise from where it
sits.** The right unit for a display measure is the headline's own characters.
The cap sits on a wrapper around the `heading` slot; the slot's content is any
node at all, and its size is `loom.heading`'s business (0051). A `ch` on that
wrapper would be the **body** font's character, which is a worse lie than a
length is. Moving the cap onto the heading element — where `ch` would be true —
would put a `max-width` on every heading in the library, including the ones
inside a `loom.section` and a `loom.card` that are correctly governed by their
container. That is a larger change than this finding asks for and is not ruled
out by this record.

**`minimal-sans`'s top step is now free to move.** Its comment's premise is
gone: an ambitious top step will now produce a bigger headline rather than the
same headline on four lines. Filed for that pack's owner rather than changed
here — `src/theme/` is not this lane's.

**This is a rule for the port, not a fact about one primitive.** Any band that
caps a region it did not author answers the same question, and the ones worth
reading against it are the containers that hold a heading and prose together.

## Alternatives considered

**One measure, widened.** Set the single constant to `64rem` and let the lead
run 1024px too. Cheapest possible change and it makes the headline right. It
also sets the lead at about 76 characters, which is past the measure
`READABLE_MEASURE` exists to hold, so it trades a headline defect for a prose
one. The whole content of this record is that the two numbers are not one
number.

**No cap on the headline at all; let the band decide.** Correct on a `wide`
page, which is why `64rem` is a backstop rather than a setting. It is wrong on
a `width: "full"` page and on a 2560px viewport, where a 72px line would run
about 71 characters. The cap exists for the case the band's edges do not cover.

**A measure per font pack.** Put the display measure in the pack beside
`scaleRamp`, since the pack is what knows how wide its own characters are. It is
the most correct answer and it is a schema three registered packs depend on,
which makes it `src/theme/`'s rather than this lane's — and it would not have
closed the finding any faster, because the number still has to be chosen against
a render. Worth doing; not this.

**Leave it and shrink the type instead.** The option already taken once, in
`minimal-sans`. It works, it is invisible, and it makes every future pack pay
for a constant in another lane's file.
