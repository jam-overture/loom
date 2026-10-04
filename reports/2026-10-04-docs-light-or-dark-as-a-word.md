# 4 October 2026 — light or dark, as a word

**Routine:** `Loom docs` · **Branch:** `docs-45-which-way-round-a-theme-is` ·
**Section:** §4c

No open pull request from this lane at the start of the run, so this is a fresh
branch off `main` at `e1b33d8`. No maintainer comments were outstanding on any
pull request of this lane's.

The work is the oldest thing on this lane's own list: `paletteScheme`, named as
*what I would write next* by the reports of 30 September, 1 October, 2 October
and 3 October, and losing to a newer arrival every time. It is done.

## What a reader could not find out

[0197](../decisions/0197-a-host-may-ask-which-way-round-a-palette-is-and-a-frame-standing-in-for-the-page-is-handed-both-ends.md)
published two things on 27 September. `themeGround` was documented three days
later, in *Putting it on a page*. **`paletteScheme` was documented nowhere** —
it has a page in the generated API reference, which gives a reader this:

```
const paletteScheme: (palette: Palette) => PaletteScheme | undefined
```

That is a true and complete statement of the signature and it answers none of
the three questions somebody actually has: *what is it for*, *when would I reach
for it rather than `themeGround`*, and *what do I do about `undefined`*.

The generated reference is generated on purpose and this is not a complaint
about it. A signature is what it is for. The third question in particular has an
answer that is nowhere in the type, is not obvious, and is the one a host gets
wrong.

## The plain version, which is one sentence

**It compares the palette's own ink to its own canvas and tells you which of the
two is lighter.** Dark letters on pale paper is `"light"`. The other way round
is `"dark"`.

That is the whole of it, and the section shows the arithmetic rather than
asserting it — both luminances, read with `relativeLuminance`, which is the
function `paletteScheme` itself calls:

| | | |
| --- | --- | --- |
| `bg-canvas` | `#ffffff` | `1.000` |
| `fg-default` | `#0a0a0a` | `0.003` |

> The ink is darker than the paper, so `paletteScheme` answers `"light"`.

## Why a reader needs it at all, which is the part `themeGround` does not cover

The section's one organising idea, and it is a distinction rather than a fact:

- **`themeGround(theme)` hands you three colors.** They are what you *paint*
  the frame with.
- **`paletteScheme(theme.palette)` hands you one word.** It is what you
  *choose* between two things of your own with.

Everything in a host's chrome made of Loom's colors is the first one. This is
for the things that are not, and they all have the same shape — **they take the
word, and there is nowhere to put a hex**: a logo drawn twice, an illustration,
an embed whose options are `"light"` and `"dark"`, `<meta name="theme-color">`.

The section opens on the logo rather than on the signature, because *which file
do you serve* is a question a reader already has and `PaletteScheme | undefined`
is not.

## The half of this that is not documentation

`paletteScheme` has a third answer and **nothing anywhere a reader reaches said
when it happens.** The reasoning is in `channelsOf`'s doc comment, which is not
published prose, and the consequence is in `FINDINGS.md`, which is not a
reader's.

So it is demonstrated. One pair of colors, six spellings, the registry asked
whether each is a legal palette and the measure asked what it makes of it — all
twelve answers computed on the build, none typed:

| the pair written as | `paletteSchema` | `paletteScheme` |
| --- | --- | --- |
| `#111827` · `#f3f4f7` | registers | `"dark"` |
| `#123` · `#eef` | registers | `"dark"` |
| `hsl(220 30% 11%)` · `hsl(220 25% 95%)` | **registers** | `undefined` |
| `rgb(17 24 39)` · `rgb(243 244 247)` | **registers** | `undefined` |
| `midnightblue` · `whitesmoke` | **registers** | `undefined` |
| `#111827ff` · `#f3f4f7ff` | **registers** | `undefined` |

**The first column is the finding.** Every row is a palette that registers,
resolves, re-themes and renders. A host can write a perfectly legal palette in
`hsl()` and lose this measurement with nothing telling them so — and not only
this one. Measured on a palette whose every slot is `hsl()`:

```
auditPalette    26 unmeasured, 0 failures
paletteScrim    undefined
slotChroma      undefined        (0.0857 for the same colour as hex)
```

Four measurements, lost together and silently. That is filed, as an extension of
the 20 August entry that recorded the first of the four, and **explicitly not as
a request** — 0076 settled that Loom offers the bar rather than imposing it, and
the diagnostic this would argue for is recorded there as deferred rather than
rejected. What this run did about it is the only thing in this lane's gift: put
the limit on a page, with the two rules that follow from it.

The second rule is the one the section spends a code block on, because it is the
one that gets written wrong:

```tsx
return scheme === undefined ? undefined : MARKS[scheme]
```

`scheme === "dark" ? dark : light` is the version somebody writes instead, and it
hands a palette written in `hsl()` the mark for a white page.

## Decisions taken that were not specified

**No decision record.** Nothing here touches the tree schema, the delta model or
an `Accepted` record. No primitive is added, no prop is set, `src/` was not
opened: `git diff origin/main -- src/ tools/` is empty.

**Three produced blocks, no new prose numbers.** The section states no count of
anything in words. The split between light and dark palettes is printed by the
component from the list it drew, so `_lib/counts.ts` gained no entry and the
page gained nothing for the number sweep to catch.

**The palettes are grouped rather than tabulated.** A reader sees pale swatches
under `"light"` and dark ones under `"dark"` and has checked the function against
their own eyes without being asked to. The swatch is the pair — that palette's
ink set on that palette's canvas — rather than two squares, because *which of
these two is lighter* is the question and ink-on-canvas is the form it can be
answered from at a glance.

**The spellings are near-identical colors, not identical ones.** `hsl()` and a
named color cannot express an arbitrary hex exactly, and a table claiming they do
would be wrong about something a reader can check. What is identical across the
six rows is which way round the pair is, which is the only property the
measurement is about.

**A three-column markdown table was built and taken out again.** The
`themeGround` / `paletteScheme` contrast was a table first. At 390 pixels its
first cell holds `paletteScheme(theme.palette)` — 27 mono characters — which
squeezed the other two columns into slivers reading one word per line, and
clipped the third at the viewport edge. It is two bullets now: same contrast,
and it wraps. The generic MDX table styling is the site's and not this section's
to change.

## Tests

`pnpm install && pnpm verify` at the repository root, on a `dist` and a `.next`
deleted first: **green, exit 0**, with the status written to a file as the
last thing on its own line and read in a separate command.

| | `main` at `e1b33d8` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 178 files / 3,728 tests | **178 / 3,728** — `src/` was not opened |
| `@loom/app` | 374 / 6,674 | **376 / 6,715** |
| findings ledger | 982 entries, 0 malformed | **983**, 0 malformed |
| `prerender:check` | 124 pages / 1,470 text junctions | **124 / 1,532**, 0 run together |

**+41 tests. Nothing weakened, skipped or deleted**, and no existing assertion
was changed — `_lib/theming-claims.test.ts` gained five and lost none. Both
columns are full runs on a deleted `dist` and `.next`, so the library numbers
being identical is a measurement rather than an inference: `src/` was not
opened.

The junction count is the figure worth a second look. It rose by **62**, which
is this section's produced blocks arriving in the prerendered HTML — every one
of them a place two pieces of text meet across a tag, and **0 run together**.

### The gate was red once, and it was this

The first final run came back `EXIT=1`. `_lib/fences/compiled.test.ts` refused
the theming page's program as stale: a late edit to the prose — two words in a
sentence the phone screenshots sent me back to fix — moved the last code block
down one line, and the generated program still carried `// page.mdx:346`
against a block now on 347. One line, caught by a test built to catch exactly
it, fixed with the documented
`pnpm --filter @loom/app docs:fences` and the gate re-run from a deleted `dist`
and `.next`.

It is in here because of what it says about the order of operations: the fences
are generated from line numbers, so **any** edit to a page after generating them
invalidates the program, including one that changes no code. Worth knowing
before the next run edits a page twice.

## Green is not evidence — fifteen mutations, and two of them were right

Each introduced one at a time against the committed code and reverted before the
next. **Two survived the first pass, and both of them were defects in the tests
rather than in the mutations.** The table below is the second pass, against the
code as it ships.

| what was broken | tests that went red |
| --- | --- |
| the palette list comes back empty | 11 |
| the scheme is reported the wrong way round | 6 |
| the two groups are swapped | 5 |
| **the palettes are printed in alphabetical order** | **4** — was 0 |
| the colour-form table prints no rows | 4 |
| `registrable` is asked of a different palette than the measure | 3 |
| the group count is off by one | 2 |
| a form's answer is printed as the value, so `undefined` is blank | 2 |
| the forms table loses a row | 2 |
| a swatch is painted the canvas twice, so the ink is invisible | 1 |
| the working prints the canvas luminance in both rows | 1 |
| the working's sentence always says *lighter* | 1 |
| **the no-gaps line always says nothing is missing** | **1** — was 0 |
| the page stops asking for the colour-form table | 1 |
| the page stops asking for the working | 1 |

### The two that got through, which is the useful half of this section

**A test derived from the list it checks cannot see the list shrink** — this
lane's own entry of 28 September, arriving in a file written six days later.
The component's order test asked `palettesAnswering` what the order should be
and then checked the page against it. A sort planted inside `palettesAnswering`
moved the page and the expectation together, and thirteen other mutations were
caught while that one was invisible. The expectation now comes from
`SCHEMED_PALETTES`, whose own order is held against `STARTER_PALETTES` — the one
list in this module that is nobody's output.

**A branch nothing can reach has no witness.** The sentence under the two groups
says *every registered palette answers* when the unreadable list is empty and
names them when it is not. Today it is always empty, so *always take the empty
branch* and *take the branch the list says* print the same words and no test
rendering the real list could tell them apart. It is `noGapsLine` now — a
function the test can hand a list of two to — and the branch nobody can reach on
this site is exercised.

Neither was found by reading. Both were found by planting the defect and
watching nothing go red, which is the only reason the pass is run.

## At 390 pixels

`scrollWidth 390 / innerWidth 390` on all three phone shots and `1280 / 1280`
on all three wide ones. `built 2026-10-04T14:20:47.850Z`, served by the harness
itself.

The two tables are measured rather than eyeballed, because the phone is where
this section was rebuilt twice:

```
[data-scheme-working]        350x137    table 348 wide
[data-colour-forms]          350x418    table 348 wide
[data-scheme-group="light"]  350x584
[data-scheme-group="dark"]   350x444    ← 116 past the fold
```

**348 in a 350-pixel box is the number to read.** Both tables sit inside the
column and scroll nowhere — a reader swipes neither. The colour-form table was
built at a `26rem` minimum, which is 416 pixels in that same 350-pixel box, so
it would have had a scroller of its own and a header clipped at *paletteSch*;
it is `21rem` now and the header reads *The answer* rather than *paletteScheme
answers*. The two groups stack to one column, which is why the dark one starts
past the fold.

## Scope

`apps/loom/app/(docs)/` only, plus `FINDINGS.md`, this report, its shot list and
its screenshots. `git diff origin/main -- src/ tools/` is empty, and so is the
same diff against every other route group.

Four files are new — `_lib/scheme.ts` and its test, `_components/palette-scheme.tsx`
and its test. Three are touched: the theming page, its fence context, and
`_lib/theming-claims.test.ts`. One is regenerated:
`_lib/fences/compiled/building-with-loom--theming.tsx`, by
`pnpm --filter @loom/app docs:fences`, which is the documented remedy.

## Findings

**Closed — none by status, one by exhaustion.** `paletteScheme` was not an entry
in the ledger; it was the first line of this lane's *what I would write next* on
four consecutive reports. It is off that list.

**Filed — one**, for `Loom daily build`: *a palette may be written six ways, a
registry takes all six, and four of them silently switch off every measurement
Loom makes of a palette*. An extension of the 20 August entry, with the figures
that argument would need if the deferred diagnostic is ever reopened, and
explicitly not a request to build it.

**Noted — one.** The 2 October class entry on components nothing renders gains a
dated line: this run added three produced blocks and their render test in the
same commit, so the class gained no instance and the list of six is unchanged.

**Not re-filed:** the preview URL is not derivable from the branch name and the
egress policy denies the check that would catch it (27 September); the
screenshot harness photographs an address while the theme lives in
`localStorage`, so these pictures are light (14–16 September); three spellers in
one route group (1 October); the ten British names in the published API
(27 September).

## What I would write next

- **A render test for `sidebar` and `mobile-nav`**, the two of the six remaining
  untested components that are not decoration. They are how a reader reaches any
  page on this site and between them they are the only navigation a phone has.
  This is now the oldest thing on the list.
- **The `signals` door's narrower-door saving in kilobytes rather than in
  files** (23 September, open) — still blocked on the same judgement about
  wording, which is the maintainer's and is in the entry.
- **A worked `<meta name="theme-color">`**, which this section names as a case
  and does not show. It is the one item on its list that a host cannot write
  from the section alone, because it is a Next.js metadata question as much as a
  Loom one.
