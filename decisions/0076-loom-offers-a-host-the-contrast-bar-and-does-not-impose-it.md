# 0076. Loom offers a host the contrast bar and does not impose it

**Status:** Accepted
**Date:** 2026-08-20
**Section:** §4b

## Context

[0074](0074-a-palette-slot-that-carries-text-meets-aa.md) decided that a palette
slot the primitives put text in meets 4.5:1 against every background they pair it
with, and moved three colours so the shipped palettes clear it. Its own
consequences named what it did not settle:

> Host palettes are not run through this suite, which is a gap worth naming: the
> check lives in the library's own tests, not in `paletteSchema`.

The gap is real and structural. `createThemeRegistry({ palettes })` **replaces**
`STARTER_PALETTES` rather than merging with it ([0049](0049-a-theme-is-three-ids-in-the-tree.md)),
so a host supplying its own palettes gets `paletteSchema` — which checks that
every slot holds a colour, and has no idea which slots are read as text on which
others — and nothing else. A host palette with a 2:1 subtle registers, resolves,
re-themes and renders, and the first person to find out is a reader who cannot
read the footer.

The bar itself was not the problem. It existed, in `src/theme/theme.test.ts`, as
a pairing table read off `src/primitives` and about forty lines of WCAG
arithmetic — **inside a test file**, where nothing outside this repository can
reach it.

## Decision

**The bar moves into the library as `auditPalette`, and refuses nothing.**

`src/theme/contrast.ts` exports what the test held privately:
`PALETTE_TEXT_PAIRINGS` (every foreground/background pair a primitive actually
renders, with the primitive named), `contrastRatio`, `TEXT_CONTRAST_MINIMUM`,
and `auditPalette(palette)` returning the measured pairings, the failures, and
the pairings it could not measure. `describePaletteAudit` renders the problems
as lines a person can act on, and is empty when there are none.

It is an audit, not a refusal: the same bargain `auditRegistry` makes, stated in
the same words — **it reports; it does not decide.** A host that wants the
guarantee asserts `failures` and `unmeasured` empty in its own tests. A host with
a brand palette its legal team signed off on is not stopped from shipping by a
library.

`unmeasured` is a first-class outcome rather than a pass. `colourSchema` accepts
`rgb()`, `hsl()`, named colours and eight-digit hex; `contrastRatio` measures
three- and six-digit hex and answers `undefined` for the rest. A named colour
would need 148 entries of CSS vocabulary, `hsl()` needs a parser that is worse
than useless if it is subtly wrong, and an alpha composites against whatever is
behind it — so its contrast is not a property of the two slots at all. Saying "I
could not measure this" is what `not-probeable` already does in the conformance
probe.

The library's own suite is now one call per shipped palette, so 0074's guarantee
and a host's are the same check rather than two that can drift.

## Consequences

- **A host can run the bar Loom holds itself to**, over palettes Loom has never
  seen, in three lines of its own test file.
- **Nothing that registers today stops registering.** No behaviour changes at any
  seam; this is an addition to `@loom/runtime`'s theme exports.
- **The pairing table is public API now.** It names twelve pairings and the
  primitives that render them, so a primitive that starts reading a new
  foreground on a new background has to add a row — and, unlike the table's
  previous home, a host reading the audit's output can see which page a failure
  is on.
- **The gap 0074 named is closed as far as an audit closes it.** A host that
  never runs `auditPalette` is exactly where it was. That is the trade, and the
  next section says why it is the right one for now.

## Alternatives considered

**Enforce it in `paletteSchema`, so an unreadable palette cannot register.** The
strongest guarantee, and rejected. It is a behaviour change to a shipped seam
that would reject palettes legal today — possibly including ones a host is
already running — so a host would upgrade a patch version and find its site does
not boot. It also decides, quietly and in a Zod refinement, a question 0074
deliberately did not: whether Loom *enforces* accessibility on hosts or merely
*meets* it itself. That question deserves a record of its own and the
maintainer's answer, not a schema change smuggled in beside a helper.

**Emit a `RenderOutput` diagnostic in the shape `data-unavailable` uses (0058),
so the page renders and the surface reviewing it is told.** The more interesting
option, and deferred rather than rejected. It puts the answer where a person is
already looking, which is a genuine advantage over a test nobody runs. It costs a
contrast measurement per themed render on a hot path that 0008 keeps pure and
synchronous, and it reports the same fact on every request forever, since a
palette does not change between renders. If it is built, it belongs behind the
resolve step, once, and not in the walk — and it wants `auditPalette` underneath
it either way, which is what this record builds.

**Leave the bar in the test and document it in the deployment guide.** Cheapest,
and what was already happening. Rejected: a rule stated in prose and enforced
nowhere is the exact failure 0074 rejected the "large or secondary text only"
contract over. Forty lines of WCAG arithmetic transcribed by hand into each
host's test file is also how two implementations of one bar start disagreeing.
