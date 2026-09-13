# 0131. What a palette cannot say about itself is measured from it, never declared on it

**Status:** Accepted
**Date:** 2026-09-11
**Section:** §4b

> **Why this number.** The highest record on `main` is `0130`, written this
> morning by the primitives lane. This lane's own open branch tops out at
> `0122`, four pull requests are open, and any of them may claim the next free
> number without seeing the others — so this one was chosen after re-reading
> `main`, as [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
> asks.
>
> **Why `Accepted`.** It adds derived output to a seam and refuses a schema
> change. It contradicts no `Accepted` record, touches neither the tree nor the
> delta model, and nothing built has to migrate: a palette that validated
> yesterday validates unchanged, and every palette ever registered gains the
> two measures without being edited.

## Context

[0130](0130-atmosphere-is-a-wrapper-and-the-paints-are-one-vocabulary.md) gave
the library atmosphere — `loom.backdrop`, which paints behind a band, and
`loom.overlay`, which puts words over a picture. Building them produced two
findings on the same morning, both owned by this lane, and they are the same
gap seen from two sides.

**A paint assumes there is chroma to spend.** `backdrop.ts` spreads
`accent-strong` and `brand-secondary` as large soft areas. Under `bold` — gold
and red — the result is the best the library has ever looked. Under `editorial`,
where both slots are slate, the identical code at the identical opacity is a
grey blob, because a low-chroma tint spread over a light canvas is
indistinguishable from dirt. The lane mitigated it with one opacity serving both
palettes, which is one number answering two questions. What it could not do is
find out which palette it was in: `var(--loom-accent-strong)` is a string to
everything except the reader's eye, and CSS cannot ask how much colour is in it.

**A dark wash is not expressible.** The standard way to keep type legible over a
photograph is a dark scrim with light letters. `bg-overlay` is a *surface* —
`#ffffff` under nine of the starter palettes — so reading it as a scrim gives
white on white. A hard-coded black would render one page correctly and break
[0049](0049-a-theme-is-three-ids-in-the-tree.md) for every other palette, so it
was not written; what shipped is a bright veil with dark type, which is honest,
re-themes correctly, and is not the cinematic look the library therefore does
not have.

Both findings proposed the same shape of answer: a palette should **declare**
what it cannot currently say — how much chroma its accent has, or a slot
meaning *a ground that darkens what is under it*.

## Decision

**Both are measured from the palette's existing slots and emitted as custom
properties. Neither is added to `paletteSchema`.**

`src/theme/measure.ts` exports `paletteMeasures`, and `themeVariables` emits
what it finds:

- `--loom-<slot>-chroma` for the five slots a palette puts its colour in — the
  accent tier and the brand tier — as CIELAB chroma normalised against the most
  sRGB can hold, unitless so `calc()` can multiply by it. `bold`'s
  `accent-strong` measures **0.584**; `editorial`'s measures **0.121**;
  `graphite`'s is **0.054**. That ratio is the finding, as a number a stylesheet
  can read.
- `--loom-scrim` and `--loom-scrim-fg`, **a pair and never a colour**, because
  the guarantee is what is being handed over.

**A scrim is the palette's own body-copy pair, whichever way round is darker.**
Under a light palette the ink becomes the ground and the page becomes the ink;
under a dark palette they stay as they are. Both ends come from the palette, so
a scrim re-themes with everything else, and its contrast is one the palette
already owes a reader — `fg-default` on `bg-canvas` is a painted pairing the
contrast bar asserts (0074). Measured over the twenty-one starter palettes, every
scrim ground sits under **0.015** relative luminance and every pair clears
**15.2:1**.

**Measured rather than declared, and that is the decision rather than an
implementation detail.** Three reasons, in the order they weigh:

1. **A declared field would break every host palette.** Every palette declares
   every slot, deliberately (0049) — so a new slot is not an addition, it is a
   validation failure for every palette anyone has ever written. A measure costs
   a host nothing and arrives for palettes that were registered months ago.
2. **A declaration can be wrong and nothing would know.** Nothing checks a claim
   about how much colour a colour has. A measurement cannot disagree with the
   colour it measured.
3. **The library already measures palettes and reports.** `auditPalette` weighs
   contrast, `auditSeparation` weighs difference; this weighs chroma and
   darkness. It reports and does not decide (0076) — how strong a wash to draw is
   the primitive's call.

**What cannot be measured is omitted, never defaulted.** A palette written in
`hsl()` gets no chroma variables and no scrim, so a primitive's own `var()`
fallback resolves — the rule `--loom-mono-family` already follows (0085). A
scrim that might be inverted is worse than no scrim.

## Consequences

- **Seven new custom properties on a themed root**, 219 bytes, the same 219 in
  every palette. Each chroma is emitted to a fixed three decimal places, so its
  text length does not vary: a page describing a tree stays byte-identical in
  every palette, which is what 0049 promises and what a marketing page now
  measures and prints.
- **Five citations in `src/theme/` were pointing at the wrong record** and were
  corrected in passing: the rule about a variable nothing reads is 0085, and
  0084 is a real record about two-dimensional bands, which is the kind of wrong
  citation that resolves and reads plausibly.
- **The seam is built and nothing reads it yet.** `loom.backdrop` and
  `loom.overlay` are `Loom primitives`' files and this lane does not edit them;
  the finding filed back to that lane carries the two rules ready to paste. A
  variable no primitive consults is a comment pretending to be a seam (0085), so
  this is a debt with a named owner rather than a finished feature.
- **`src/theme/lab.ts` is new and `separation.ts` now imports it.** The CIELAB
  conversion existed once, privately; a second copy would have been two answers
  to where a colour sits. `relativeLuminance` moved the same way, into
  `contrast.ts`, where WCAG's curve already lives.
- **A host can ask these questions in TypeScript too**, not only in CSS:
  `paletteMeasures` is part of the published surface, so a host's own test can
  assert that its brand palette has a scrim that darkens.

## Alternatives considered

**A declared `chroma` field on the palette.** What the finding proposed. Rejected
for the three reasons above, and one more that decided it: a host who has to
write a number will write the number that makes the page look right today, and
the value will then be wrong for every other paint that reads it.

**A new `scrim` slot pair in the vocabulary.** Also what the finding proposed,
and the stronger of the two proposals — it would let a palette choose a branded
wash, a deep navy rather than its own near-black ink. Rejected for now because
seventeen slots became nineteen for every palette in existence, including every
host's, to express something that is derivable from two slots they have already
declared. **It stays live**: if a palette ever wants a scrim that is not its own
ink inverted, the honest shape is an *optional* slot that overrides the measure,
which is a smaller record than this one and does not invalidate anything.

**Chroma per palette rather than per slot.** One `--loom-chroma` would have been
one variable instead of five. Rejected because it answers the wrong question: a
palette whose accent is grey and whose secondary is vivid would report *plenty*
to a paint that is about to spread the grey one. The paint knows which slot it
is spreading; the palette does not.

**HSL saturation instead of CIELAB chroma.** Cheaper — the derivation tool
already works in HSL. Rejected because `hsl()` calls a pale mint and a deep
forest equally saturated, and the whole point of the number is to predict what a
reader will see.
