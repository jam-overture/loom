# 0074. A palette slot that carries text meets AA, and the palette moves rather than the bar

**Status:** Accepted
**Date:** 2026-08-20
**Section:** §4b

## Context

`src/theme/theme.test.ts` grew a contrast suite on 20 August, checking every
foreground/background pairing the primitives put together against WCAG AA in all
three registered palettes. Every pairing passed but one, and that one was
excluded with a comment rather than asserted:

| palette | `fg-subtle` on `bg-canvas` | on `bg-surface` | on `bg-surface-muted` |
| --- | --- | --- | --- |
| `editorial` | **2.41:1** | 2.52:1 | 2.18:1 |
| `minimal` | 3.42:1 | 3.42:1 | 3.11:1 |
| `bold` | 3.72:1 | 3.27:1 | 3.60:1 |

AA is 4.5:1 for body text and 3:1 for text at 18.66px bold or 24px regular.
`editorial` misses both bars on every background. The other two clear the large-text
bar and neither clears the body-text one.

The finding that recorded this
(`FINDINGS.md`, 20 August, filed by `Loom primitives`) said the exclusion wanted
a decision rather than a patch, and named the fork exactly: either `fg-subtle`'s
contract is *large or secondary text only* — in which case the primitives using
it for small text are wrong — or the palettes want a darker subtle.

Six primitives read the slot, at eight call sites. What they put in it is not
large:

| primitive | what it colours |
| --- | --- |
| `loom.footer` | the note row under the columns |
| `loom.tier` | the note beneath a price |
| `loom.milestone` | the marker on a timeline entry |
| `loom.link-list` | a group label |
| `loom.logo-cloud` | the label above the logos |
| `loom.perk` | the excluded and coming-soon markers, and a note |

Every one of those is ordinary body-sized text. Two of them — `loom.perk`'s
markers and `loom.footer`'s note — are the only place a particular fact appears
on the page.

## Decision

**A palette slot that primitives put text in meets 4.5:1 against every background
slot they pair it with, and the palettes were re-coloured to do it.**

| palette | was | is | on canvas / surface / muted |
| --- | --- | --- | --- |
| `editorial` | `#a3a3a3` | `#6a6a6a` | 5.17 / 5.41 / 4.66 |
| `bold` | `#6b6b6b` | `#8a8a8a` | 5.73 / 5.04 / 5.55 |
| `minimal` | `#8a8a94` | `#6e6e78` | 5.04 / 5.04 / 4.59 |

`fg-subtle` joins the pairing table in the contrast suite with all three of its
backgrounds, so the suite now asserts the slot it used to excuse. A second
assertion holds the ink ramp apart — `fg-subtle`, `fg-muted` and `fg-default`
must be three distinct colours in strictly increasing contrast against the
canvas — because the obvious way to overshoot this repair is to darken the
subtle slot until it is the muted one.

**"Recedes" is a smaller difference than it was, and that is the trade.**
`editorial` goes from a 2.41:1 subtle against a 7.47:1 muted to 5.17:1 against
7.47:1. The slot still reads as the quietest of the three, and it no longer
reads as decoration.

## Consequences

- **Every page already rendered in these palettes changes.** Footer notes, tier
  caveats, timeline dates, group labels and perk markers are darker. Nothing
  moves and no layout changes; this is a colour change to one slot in three
  palettes. Four surfaces render these palettes, so all four look slightly
  different the day this merges.
- **The contrast suite now covers every slot a primitive puts text in.** There is
  no excluded pairing left, which is the property that makes it worth running:
  a suite with a documented exception trains a reader to expect exceptions.
- **A fourth palette has a bar to clear.** Anyone adding one — including a host
  replacing `STARTER_PALETTES` wholesale — will fail the suite rather than ship a
  slot nobody can read. Host palettes are not run through this suite, which is a
  gap worth naming: the check lives in the library's own tests, not in
  `paletteSchema`.
- **`bg-surface-muted` is now a checked background.** It was not in the table
  before, and `loom.perk` is the primitive that puts `fg-subtle` on it
  deliberately.

## Alternatives considered

**Give `fg-subtle` a contract of "large or secondary text only" and fix the
primitives.** This was the other half of the finding's fork, and it is the one
that looks cheaper: no shipped palette changes colour, and the eight primitives
using the slot for small text get audited instead. Rejected because the contract
is unenforceable. Nothing in `paletteSchema`, in `definePrimitive` or in the
render walk can tell what size a slot's text will be — a primitive picks a colour
and a font-size independently, and a host's style preset can change the size
afterwards. A rule that every primitive author has to remember, that no test can
check, and that is silently violated the moment somebody reaches for the obvious
slot for a caption, is a rule that will be broken and will not be noticed. The
whole reason the failure sat in three shipped palettes for weeks is that nobody
could see it.

**Lower the assertion to 3:1, which all three would then clear.** Rejected in the
finding and rejected again here. A threshold picked so the existing colours pass
is a test that says nothing; it documents the palette rather than the reader.

**Re-colour only `editorial`, since it is the only one failing both bars.**
Rejected. It leaves two palettes at "passes for large text", which is the
contract this record just declined to adopt, and it leaves the suite with an
exclusion — the same exclusion, two thirds the size.

**Leave it, and let each surface override the slot.** Rejected. The override
would be identical in four surfaces, and a surface that forgot would be the
inaccessible one. A default that every consumer has to correct is the wrong
default.
