# 0197. A host may ask which way round a palette is, and a frame standing in for the page is handed both ends

**Status:** Accepted
**Date:** 2026-09-27
**Section:** §4b

## Context

[0049](0049-a-theme-is-three-ids-in-the-tree.md) put the theme
in the tree as three registered ids and gave the host one thing to apply:
`themeStyle(theme)`, every custom property a primitive reads. That is complete
for a host drawing a **whole page**, because the root primitive paints
`bg-canvas` itself and nothing above it has to know what colour that is.

It is not complete for a host drawing **part** of a tree. An excerpt rooted at a
band has no root primitive above it, so the frame around it has to paint the
ground the excerpt would have sat on — and the frame is the host's chrome rather
than the tree's content. `themeStyle` hands over seventeen colours and no answer
to the one question the host is actually asking: *is this palette light or
dark.*

So the host writes it itself, and what it writes is a constant while the theme
is data. The demo lane did exactly that, twice in one week, and filed it on
26 September:

- **The excerpt inside the Gate's question** took its ground from the demo
  chrome's own `--surface-stage` (white) and its ink from the tree's palette. On
  26 September the demo's starting theme moved from `editorial` to `midnight`
  and that became `#f3f4f7` on `#ffffff` — **1.10:1**, measured on a production
  build at 390 × 844. Not low contrast: no contrast, on the one frame whose
  whole job is to show a stranger what they are about to lose, at the moment
  they are being asked to decide.
- **The share card** named `editorialPalette` directly, with a comment saying it
  did so because that is what the tree names. It was, and then it was not: a
  link unfurled to a cream page with navy figures and landed on a navy page with
  cyan ones.

Neither was a wrong colour. Both were a second copy of a decision that has one
home, and **no test in either place could see it** — the stylesheet was
self-consistent, the tree was self-consistent, and the disagreement lived in the
gap between them. That is the failure mode 0049 exists to prevent, arriving
through the one seam 0049 did not cover.

The lane closed it locally and filed it anyway, which is the right reading: the
derivation is eight lines, it is not demo-specific, and the next host to frame
part of a tree would have written it a third time.

## Decision

**Two additions, one a measure and one a style object.**

**`paletteScheme(palette)` in `src/theme/measure.ts`** returns `"light"`,
`"dark"`, or `undefined`. It compares the palette's own `fg-default` luminance
to its own `bg-canvas` luminance: whichever is lighter says which way round the
palette is. It joins `chroma` and `scrim` on `PaletteMeasures` as a third
derived reading, on the same terms as both — **measured from the palette, never
declared on it** (0131), and `undefined` rather than guessed when a colour is a
form `channelsOf` declines to read.

**No threshold.** A luminance ceiling would be a number this module had to
defend, and the one it already has — `SCRIM_DARK_CEILING` — answers a different
question (whether a wash can darken what is under it). Comparing a palette's own
ink to its own canvas needs no constant: it is a comparison, not a
classification. Across the twenty-one registered palettes the two groups are
canvases at `L > 0.9` and `L < 0.02`, so nothing sits near a line that does not
exist — and the comparison keeps working for a host palette nobody here has
seen, which a ceiling chosen against these twenty-one would not.

**`themeGround(theme)` in `src/render/theme.ts`**, beside `themeStyle`, returns
`{ backgroundColor, color, colorScheme }` or `undefined`. `bg-canvas` because
that is what the root primitive paints and therefore what is behind any band
excerpted out of the page. `color` alongside it because a frame setting only the
ground leaves anything inheriting its colour reading the *host's* ink on the
tree's paper — the tree's own primitives read `--loom-fg-default` and are
unaffected, and everything the host puts in that frame is not.

**It takes a `ResolvedTheme`, not a `ThemeResolution`.** *The tree names no
theme* stays the host's to answer, because there is no fallback theme and
inventing a ground for an unthemed tree would mount a look the tree does not
name. That is the same bargain `themeStyle` already makes.

Both ends of the pair come from the palette, so a frame re-themes with
everything else, and its contrast is one the palette already owes a reader —
`fg-default` on `bg-canvas` is a painted pairing the contrast bar asserts
(0074). A frame cannot be legible under one palette and not another.

## Consequences

A host framing part of a tree applies two style objects rather than one, and
neither is written by hand. `apps/loom/app/(demo)/_lib/ground.ts` is now four
lines of demo around the runtime's function — its 29 tests pass unchanged
against the moved implementation, which is what says the move changed no
behaviour.

`PaletteMeasures` gains a field. It is a return type rather than an input, so no
host palette stops validating and nothing a host wrote has to be updated; the
one thing that has to move with it is anything asserting the shape whole, and
`measure.test.ts` does.

`@jam-overture/loom/react` gains one exported function and one exported type,
and `@jam-overture/loom` one of each. The generated API reference moves with
them.

`color-scheme` is **not** emitted from the root. `themeStyle` could carry it, and
a page telling the browser which way round it is would get correct form controls
and scrollbars for free — but that changes what every existing page renders, and
it is a separate change with a separate record and its own screenshots. Recorded
here as the open question it is, not taken.

## Alternatives considered

**A field on `ResolvedTheme`.** The shape the finding offered first, and the
palette does already measure itself for `paletteScrim`. Rejected because
`ResolvedTheme` is what the registry *hands back* — three registered documents
and nothing else — and every place that builds one by hand, which includes a
good deal of the test suite and any host assembling a theme without the
registry, would owe a fourth field it cannot compute without importing the
measure anyway. Derived readings already have a home in `paletteMeasures`, and
this is a third one beside two others rather than a new kind of thing.

**A declared field on `paletteSchema`.** Rejected for the reason 0131 rejected it
for chroma and the scrim: every palette must satisfy the schema in full, so every
host palette in existence would stop validating, and a host that did fill it in
could fill it in wrongly. Nothing can check a claim about which way round a
colour pair is. Measuring it cannot be wrong and costs a host nothing.

**A `colorScheme` custom property in `themeVariables`.** Tempting, because it
would reach a host through the cascade with no new export. Rejected because a
host drawing a frame *around* a tree is outside that cascade by definition —
that is what makes it the host's frame — and because `ImageResponse` resolves no
custom properties at all, so the share card, one of the two call sites this
exists for, could not read it.

**Returning `CSSProperties`, as `themeStyle` does.** Rejected: a host reads these
three values as well as applying them. The share card hands them to
`ImageResponse` as literals and the demo's tests compare them to the palette's
slots. A named type stays assignable to `CSSProperties`, so it is still a style
object a frame can be handed whole, and it also answers what the three values
are.

**Leaving it closed in the demo.** The lane that found it had already done the
work and could have stopped. Rejected because the second copy was written a week
after the first, by the same lane, for the same reason — and the cost of the
second was a frame with nothing legible in it. A derivation two hosts have
needed is the runtime's.
