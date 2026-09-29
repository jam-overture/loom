# 0204. A rule with no fill beside it is measured in ΔE, not in contrast ratio

**Status:** Accepted
**Date:** 2026-09-29
**Section:** §4b

## Context

On 26 September this lane found two lines drawn in `border-subtle` that were not
visible on the `bold` palette — `loom.orbit`'s guides, which had been drawing
nothing since the primitive shipped, and `loom.logo`'s plate. It fixed both,
wrote down the rule the pair suggested, and filed the rest of the library as an
audit it had not run:

> **A border beside a fill may be subtle. A border that is the whole mark takes
> `border-default`.**

The entry also stated the reason, in contrast-ratio terms: on `bold` a
`border-subtle` hairline is `#1f1f1f` against `#1a1a1a`, *"five points of
luminance"*, so it is *"not subtle; it is not there."*

Running the audit produced a table that appeared to demolish the remedy.
Measured against the ground each line is actually drawn on, WCAG contrast ratio
says:

| | `border-subtle` | `border-default` |
| --- | --- | --- |
| editorial · `bg-surface` | 1.154 | 1.260 |
| editorial · `bg-surface-muted` | 1.005 | 1.086 |
| bold · `bg-surface` | 1.056 | 1.213 |
| bold · `bg-canvas` | 1.201 | 1.379 |

Every cell is within 1.4 of 1.0, which is the ratio of a colour with itself. Read
literally, that table says both tokens are equally invisible everywhere, the
26 September fix bought nothing, and the audit should propose `border-strong` or
nothing at all.

**That reading is wrong, and the repository had already written down why.**

## Decision

**Whether a reader can tell a rule from the ground behind it is a ΔE question,
and `src/theme/separation.ts` is the instrument.** A contrast ratio is not a
second opinion about it; it is an answer to a different question.

`separation.ts` exists because of this exact class of mistake and says so in its
own words: a contrast ratio *"compares luminance, and two slots can differ in hue
while matching in luminance"*, so asking WCAG's question about a pair a reader is
merely meant to **distinguish** — rather than to **read text off** — reports
pairs as identical that are plainly different, and misses pairs that differ in
luminance alone by less than an eye can resolve. It measures CIE76 ΔE against a
**published** just-noticeable difference of 2.3 rather than a threshold invented
to fit these palettes.

The same four rows, measured that way:

| | `border-subtle` | `border-default` |
| --- | --- | --- |
| editorial · `bg-surface` | 6.48 | 9.06 |
| editorial · `bg-surface-muted` | **0.90** | 4.15 |
| bold · `bg-surface` | **2.49** | 7.80 |
| bold · `bg-canvas` | 9.02 | 14.32 |

So the 26 September remedy is right and the contrast table was the wrong lens:
the change is a three- to fourfold increase in separation, not a rounding error.

Two further things follow, and they are the reason this is a record rather than
a commit message.

**The defect is not something the dark palette does.** The worst pair in the
starter set is `editorial`'s — 0.90, *below* the just-noticeable difference, on a
light palette — and `paper` and `sage` are also under the floor on their muted
ground. `bold` on `bg-surface` is 2.49, which clears 2.3 by eight per cent.
`border-subtle` is at or under the visibility floor on **four of the eight
starter palettes**, on whichever ground happens to sit near it, and framing it as
a `bold` problem is what kept the other three unlooked-at.

**`border-strong` is not the alternative.** It measures 82–98 — near-black on a
light palette — so a table ruled in it has no hierarchy left between the one rule
under its header and the rules between its rows. `loom.table` and
`loom.comparison-table` keep `border-strong` for the header rule and take
`border-default` for the row rules, and the gap between the two is the point.

**The rule lives in one function.** `hairline()` in `src/primitives/tokens.ts`
returns the token a standalone rule takes, with the measurement above as its
docstring. Forty scattered `border-default` literals would be forty places for
the next person to re-derive this, and the question has now been re-opened twice
— on 26 September for `loom.orbit`, and on 27 September for `loom.backdrop`'s
`grid` paint, whose comment calls itself *"the 26 September audit's rule arriving
at its first case."*

## Consequences

- **Eighteen lines changed token**, across eleven primitives and the library
  stylesheet: the rules between table and comparison rows, the cell rules of a
  grid table, the separator between FAQ questions, a ruled feed's row rules, the
  rail down a timeline, the chevron between breadcrumbs, the flanking hairlines
  of a `diamond` divider, the rules under a nav and a banner and over a footer,
  a card's footer rule, a code panel's bar, a device frame's chrome and pin
  strip, an event's time divider, and two scrollbar thumbs.
- **What did not change is the more useful half.** Every four-sided `border` in
  the library stays `border-subtle` — a card, a badge, a tier, an icon plate, a
  dashed empty state — because each is read by the fill inside it. So is
  `.loom-pager`'s hover border, which arrives in the same declaration as a
  `background-color`. That is the "beside a fill" half of the rule, and it is
  about two thirds of the token's uses.
- **A sweep enforces it**, in `library.test.ts`: no side-specific border
  longhand, and no `scrollbar-color`, may name `--loom-border-subtle` anywhere in
  the emitted stylesheet. It names the offending selectors rather than counting
  them.
- **The starter palettes are not changed and this does not ask for them to be.**
  Whether a palette should offer a slot between `border-default` (ΔE 4–15) and
  `border-strong` (ΔE 82–98) is `src/theme/`'s question; the library has a usable
  answer without one. Filed rather than proposed.

## Alternatives considered

**Leave the token and change the palettes.** The most direct fix: raise
`border-subtle` until it clears the floor on every ground. Rejected as this
lane's to take — it is `src/theme/`'s file — and rejected on its merits too,
because `border-subtle` is *correct* for the two thirds of its uses that are box
edges, and raising it to suit the rules would coarsen every card in the library.
The two uses want different values, which is what having two tokens is for.

**A `rule` slot in the palette.** Name the thing directly: every palette declares
the colour a standalone hairline takes. Cleanest in principle, and it is a
palette schema change that eight registered palettes and every host palette would
have to answer — an escalation, for a gap `border-default` already fills. Left as
the shape to reach for if `border-default` later turns out to be wrong for some
palette rather than for some ground.

**Per-site judgement, no helper.** What the 26 September entry implied: audit,
fix each site, move on. Rejected because the question came back twice in three
days and both times the answer had to be re-derived from the palette values. A
named function with the table in its docstring is the cheapest way to stop that,
and it is the pattern `monospace()` already sets in the same file.

**Measure it by eye from the specimen sheet.** The finding asked for a
photograph, and the photograph is real and is in the report. It is not sufficient
on its own: the sheet is 16,000 pixels tall under two palettes, the differences
are one-pixel lines, and *"a rule that is missing because its primitive was never
placed looks exactly like a rule that is missing because it is `#1f1f1f`."* The
photograph confirms; the measurement decides.
