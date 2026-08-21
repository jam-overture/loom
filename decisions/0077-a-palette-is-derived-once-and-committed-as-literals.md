# 0077. A palette is derived once and committed as literals

**Status:** Accepted
**Date:** 2026-08-21
**Section:** §4b

## Context

The starter library shipped three palettes, three font packs and three style
presets. The maintainer asked for a robust set — around twenty of each — so that
a demo can re-theme a page into something genuinely different rather than into
one of two other blues.

Scaling the *count* is easy. Scaling it **correctly** runs into the thing
[0074](0074-a-palette-slot-that-carries-text-meets-aa.md) established: a palette
is not seventeen free choices. Twelve of the pairings the primitives put
together have to clear 4.5:1, and those constraints interlock — darkening a
canvas to make an accent legible moves the three ink slots read on it, and the
muted well is a tighter ground than the canvas for two of them. Twenty palettes
hand-picked from a colour tool is twenty chances to ship one that registers,
resolves, re-themes, renders, and cannot be read.

A second question arrived with the first, and it is the more interesting one.
If a machine can derive a palette that clears the bar, **why is the palette in
the repository at all** — why not let a model choose colours per proposal?

[0049](0049-a-theme-is-three-ids-in-the-tree.md) already answers that for the
runtime: a theme is three registered ids, so a re-theme is one `configure` that
is inspectable, gateable and reversible, and a proposal "names `bold`; it cannot
invent seventeen colours". What 0049 does not say is where the seventeen colours
*come from* in the first place, which is the question a host with a brand
actually has.

## Decision

**Derivation is a build-time tool. The committed literals are the source of
truth. Selection at runtime stays a registered id.**

Three parts, and the order matters:

1. **`src/theme/derive.ts`** takes a mode and three hues — canvas, accent,
   secondary — and returns a `Palette`, binary-searching the lightness of every
   slot a primitive reads as text until it clears 4.75:1 against the *tightest*
   of the three grounds it is rendered on. It is exported, because a host
   substituting their own palettes wholesale is the case `createThemeRegistry`
   was built for and the case that most needs this.
2. **`src/theme/palettes.ts` holds the output as plain hex literals.** Nothing
   is derived at import time. A palette is reviewed by looking at it and diffed
   by reading it, and a page whose colours are computed by a function nobody
   read is a page nobody approved. Hand-tuning a committed palette afterwards is
   allowed and expected; the audit, not the tool, is what holds.
3. **The audit is the invariant, in two places.** `theme.test.ts` runs
   `auditPalette` over every registered palette, and `derive.test.ts` runs the
   derivation at twenty-four hues in both modes. The second is what makes the
   *rule* trustworthy rather than the eighteen instances of it: a rule that
   happens to work at the hues we shipped is not a rule.

**And the derived set stops at eighteen palettes, seventeen font packs and seven
style presets** — twenty-one, twenty and ten in total. The first two numbers are
the ask. The third is not, and the reason is in the shape of a preset: four
radii, eight spacing steps, three durations and a density word. Past about ten,
two presets differ by two pixels, render pages nobody can tell apart, and a
model choosing between them is choosing noise it will be graded on. Ten entries
that each move visibly on spacing, radius or motion is the honest version of
"twenty".

## Consequences

- **A host with a brand colour has an answer.** `canCarryText(brand, canvas)`
  says whether it can be `accent`, and when it cannot — a mint, a bright yellow
  — the honest places are `border-accent` and `brand-secondary`. That is the
  call `minimal` made by hand a week ago; it is now a function.
- **The tool will disappoint someone, on purpose.** A brand yellow handed to
  `accent` comes back dark enough to read rather than yellow. There is a test
  asserting exactly that, so it is documented behaviour rather than a surprise.
- **The catalogue grew from nine entries to fifty-one**, and every one of them —
  id, name, description — goes into the model's context on every proposal
  (`interpreter.ts` passes `themeCatalogue` to `buildUserMessage`). That is real
  and permanent, and it is the cost this record signs off: fifty-one short lines
  buys a demo that can show a genuinely different page, and the ceiling on it is
  0014's grammar budget rather than anyone's patience. If it ever needs cutting,
  cut *presets and packs* before palettes — the palettes are what a viewer sees.
- **A dark palette is not a mode.** Eight of the twenty-one have a dark canvas
  and nothing switches on `prefers-color-scheme`; they are chosen by id like any
  other. A host that wants automatic dark mode still has to do it themselves, by
  resolving a different theme per request — which is a host concern and stays
  one.
- **The three hand-authored palettes keep their place at the head of every
  list.** They are what the four surfaces wear and what the re-theme tests are
  written against; the derived eighteen are range behind them.

## Alternatives considered

**Let a model choose colours per proposal.** The question that prompted this.
Rejected on four counts, and the first is the one that decides it: nothing could
check the result. A generated palette would have to be audited per request, and
the honest response to a failure is refusing the change — a model that can
propose an unreadable page and be told "no" is strictly worse than one that
cannot propose it. Beyond that: the slots carry semantics no schema states
(`accent` is ink, `accent-subtle` is a tile, `brand-secondary` is an area — the
aurora finding of 20 August is what getting that wrong looks like); a
seventeen-hex `configure` inverts to another seventeen hexes and reads as noise
in a review, which is how a reviewer ends up approving what they did not read;
and two pages themed in two sessions drift into two nearly-identical palettes
with no "the brand" left.

**Generate at import time from the specs.** Keeps the specs as the source and
the file short. Rejected: the palette in the diff is what a reviewer approves,
and a spec plus a function is not a colour. It would also make every rendered
page depend on the version of a solver rather than on a value.

**Ship twenty style presets to match the number asked for.** Rejected, and said
out loud rather than quietly under-delivered. The marginal presets would be
range on paper and noise in the catalogue.

**Put the derived set in `apps/loom` as a host's own registration.** Genuinely
arguable — it is what `createThemeRegistry({ palettes })` is for, and it would
keep the shared catalogue at nine entries. Rejected because these are not a
brand: they are a general colour vocabulary, which is the thing that makes a
starter library a library rather than one site's stylesheet.
