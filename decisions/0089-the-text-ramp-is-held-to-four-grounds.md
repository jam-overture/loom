# 0089. The text ramp is held to four grounds, and a pairing is measured whether one primitive paints it or two compose it

**Status:** Accepted
**Date:** 2026-08-24
**Section:** §4b

## Context

[0074](0074-a-palette-slot-that-carries-text-meets-aa.md) put every palette slot
that carries text at 4.5:1, and `auditPalette` is that rule as a function. What
it measures is `PALETTE_TEXT_PAIRINGS`, a hand-written list whose own comment
says of itself:

> Read off `src/primitives` rather than imagined, which is what makes the check
> worth failing over.

It was, once. Then the library grew from a few dozen primitives to fifty-five,
and nobody re-read it. On 22 August `Loom primitives` filed the first evidence:
the comparison band rendered three pairings the list did not have, and had
**designed around two more that fail** — `accent` and `fg-subtle` on
`accent-subtle` — which nothing in the repository would ever have said out loud.
On 23 August the same lane filed a second: a token is a promise about where a
value came from, never a promise that it differs from the one beside it.

The failure mode is worse than a missing row, because of what an audit's silence
looks like. A pairing nobody listed produces no failure, and no failure is
exactly what a passing palette produces. A host asserting `failures` empty gets
a green tick that means *nothing here was measured*.

Deriving the list from the components turns out to be almost entirely
mechanical. A probe can call each primitive, walk what it returned, and read
back every `var(--loom-…)` a component put in `color` and `background`. Two
things come out of that with no judgement in them at all:

- an ink set **under a ground the same primitive painted** — `loom.callout` puts
  `fg-default` on the `bg-surface-muted` it drew;
- an ink set with **no ground of its own** — `loom.perk`'s excluded note is
  `fg-subtle` on whatever it was placed in.

The second kind is the interesting one, and it is why the hand-written list was
never going to be complete. [0008](0008-the-renderer-is-a-total-pure-projection.md)
forbids the renderer from enforcing parentage, so a floating ink lands on
whatever ground a container gives it, and *which* containers is not a fact about
the primitive that floated the ink.

Which leaves one question the probe cannot answer. `loom.action` puts children
on `accent`. `loom.page` puts them on `bg-canvas`. Both set a colour beside the
ground; nothing in either component says that the first is a filled control that
has already answered what colour its label is, while the second is a page
surface where a child brings whichever ink it likes. Holding a palette to
`fg-muted` on `accent` would be a bar no palette can pass — it is 1.00:1 in
`slate` and would be 1.00:1 in any palette written to fix it, because the two
slots are meant to be the same colour family.

## Decision

**Four grounds carry the text ramp: `bg-canvas`, `bg-surface`,
`bg-surface-muted` and `accent-subtle`.** They are declared in
`PALETTE_TEXT_GROUNDS`, and they are the whole of what this decision asserts
that a machine could not have derived. Every other ground a primitive puts
children on is one where the primitive has answered the ink itself, and the
pairing that matters there is already measured as painted.

**Every pairing carries a basis, and the basis decides what a failure means.**

- **`painted`** — one primitive sets ink and ground. No tree can avoid it, so
  `PaletteAudit.failures` carries it and a host asserts that list empty. This is
  0074, unchanged.
- **`composed`** — an ink placed on a ground the ramp is held to. Reachable in a
  legal tree. `PaletteAudit.composedFailures` carries it, and it is **reported
  rather than asserted**.

**The declared list is checked against the components on every run.**
`registryPairings` derives what the library renders and `pairings.test.ts` fails
if `PALETTE_TEXT_PAIRINGS` is missing any of it, carries a row nothing renders,
or **declares as `composed` a pairing some primitive paints**. That last one is
the assertion that keeps the split from becoming a place to put an inconvenient
failure: the softer tier cannot be reached by relabelling.

**Loom's own palettes do not all clear the composed half, and that is recorded
here rather than fixed.** Nine shortfalls across eight palettes, pinned by name
in `contrast.test.ts` so a tenth fails the build:

| Pairing | Worst | Palettes under 4.5:1 |
| --- | --- | --- |
| `fg-subtle` on `accent-subtle` | 3.76:1 (`carbon`) | `bold`, `slate`, `midnight`, `carbon`, `plum`, `forest`, `ember`, `obsidian` |
| `accent` on `accent-subtle` | 4.43:1 (`plum`) | `plum` |

Seven of the eight are dark palettes, and the cause is one line in `derive.ts`.
Every ink is solved against *"the worst of the three grounds it is rendered on"*
— canvas, surface and the muted well. `accent-subtle` is a fourth ground
children land on and it is in nobody's list, so in a dark palette, where it sits
at lightness 16 against a muted well at 8, it is the tightest ground in the
palette and no ink was ever measured against it.

## Consequences

**A primitive that renders a new pairing brings the pairing with it.** The row
still has to be written, but the test names it, with the primitives that produce
it. The class of failure this closes is the one where nobody knew there was
anything to write.

**`auditPalette` takes the pairings as an argument.** A host passes
`registryPairings(registry, PALETTE_TEXT_GROUNDS)` and gets the bar held to the
primitives it actually registered, rather than to ours. The default is Loom's
own list, so nothing that called it with one argument changed.

**Two failures are visible that were not.** `describePaletteAudit` prints them,
said to be composed, so an empty description still means a clean palette.
Neither is new — both have been in the library since the palettes were derived —
and what is new is that they are counted.

**The fix is a design decision with a measured cost either way, and it is not
made here.** Both candidates were measured across all twenty-one palettes:

- **Move the panel.** Take `accent-subtle` away from `fg-subtle` — 2 to 6 points
  of lightness in the eight. In a dark palette that means *darker*, and the
  canvas is at 10 while `accent-subtle` needs to reach about 10.4 in `carbon`.
  The tinted panel stops being distinguishable from the page.
- **Move the ink.** Solve `fg-subtle` against `accent-subtle` as the derivation
  already solves it against the other three — 2 to 8 points. It collapses the
  ramp: `fg-subtle` against `fg-muted` falls from about 1.34:1 to between 1.05:1
  and 1.25:1, and at `carbon`'s 1.05:1 the quiet ink and the muted ink are the
  same colour. That is precisely the second finding above, caused deliberately.

A third exists and is larger: light mode puts `accent-subtle` at the muted
well's own lightness and dark mode puts it eight points the other side of the
canvas, so the dark branch does not follow the light branch's rule. Making them
agree is a change to every dark palette in the library, which is more than a
contrast fix and wants looking at rather than deriving.

**`derive.ts` is left alone.** The one-line fix — adding `accentSubtle` to the
grounds inks are solved against — is correct for a palette derived *tomorrow*
and would silently disagree with the twenty-one literals committed today, which
[0077](0077-a-palette-is-derived-once-and-committed-as-literals.md) makes the
source of truth. Rule and literals move together or the rule is a comment.

## Alternatives considered

**Derive the four grounds instead of declaring them.** Two rules were tried
against the library. *A ground is filled when the primitive painting it also
sets an ink there* marks `bg-canvas` filled, because `loom.page` sets a default
ink on the page root — and `fg-subtle on bg-canvas` is a pairing the footer
genuinely renders. *A ground is open when any primitive leaves the ink
inherited* marks `accent` open, because `loom.icon` has a bare tone. Both are
plausible and both are wrong, in opposite directions, which is the signal that
the question is not answerable from the components. Declared, with this record
behind it.

**Hold composed pairings to the bar and fix the palettes.** The honest version
of "a check that ships red is worthless". Rejected for this run rather than in
principle: it is a visual change to eight shipped palettes, both directions cost
something real, and choosing between them on an unattended run — under a brief
that says not to redesign what works — would be a routine making a design
decision on the maintainer's behalf. Pinning the nine and putting the two costs
in front of him is the same information at a fraction of the risk.

**Leave composed pairings out of the list.** The smallest diff, and it keeps
`describePaletteAudit` empty for every shipped palette. Rejected because it is
the fault this record exists to fix, one level up: an audit silent about the
pairings it would fail, and silence that reads as a pass.

**Report composed failures without pinning them.** A count in the audit and no
assertion anywhere. Rejected because an unpinned report is a number nobody
diffs; the pinned list is what makes a ninth palette or a third pairing fail the
build rather than lengthen a paragraph.

**A `distinction` check, for two tokens a reader must tell apart.** What the
23 August finding asks for, and the reason `fg-subtle` collapsing into
`fg-muted` above is measurable at all. Deliberately not built here: contrast
between two inks is not the same question as legibility of one on a ground, the
bar for it would be invented rather than borrowed from WCAG, and this run had a
bar it did not have to invent. Filed, with the numbers.
