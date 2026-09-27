# Which way round a theme is — the eight lines two hosts wrote, moved to the one place that owes them

**Routine:** `Loom daily build` (framework, `src/` except `src/primitives/`, and the application shell)
**Date:** 2026-09-27
**Section:** §4b
**Branch:** `framework-57-which-way-round-a-theme-is` — branched off `origin/main` at `207e450`; this lane had no open pull request of its own
**Record added:** [0197](../decisions/0197-a-host-may-ask-which-way-round-a-palette-is-and-a-frame-standing-in-for-the-page-is-handed-both-ends.md)

> **No screenshot, and the reason is the point.** This change moves a derivation
> and paints nothing new: the demo already had the fix locally, so a before-and-
> after of the frame it fixed would be two identical pictures. The visual that
> carries the argument is the measurement below, which is the evidence 0197's
> *no threshold* claim rests on and which nothing in the repository had printed
> before.

## What was completed

`Loom demo` filed on 26 September that **a host cannot ask a resolved theme which
way round it is**. `themeStyle(theme)` hands over every custom property a
primitive reads, which is everything a host drawing a *whole* page needs — the
root primitive paints `bg-canvas` itself. A host drawing *part* of a tree has no
root primitive above the excerpt, so its frame must paint the ground the excerpt
would have sat on, and the runtime had no answer to the only question that frame
asks: **is this palette light or dark.**

So that lane wrote the answer twice in one week, as a constant, while the theme
is data. The second copy cost **1.10:1** — `#f3f4f7` on `#ffffff`, measured on a
production build at 390 × 844 — on the one frame whose whole job is to show a
stranger what they are about to lose, at the moment they are being asked to
decide. Nothing errored and no test in either place could see it, because the
stylesheet was self-consistent and the tree was self-consistent and the
disagreement lived in the gap.

**Both shapes the finding offered, because they are two different things.**

| | where | what it is |
| --- | --- | --- |
| `paletteScheme(palette)` | `src/theme/measure.ts` | a **measure**: `"light"`, `"dark"`, or `undefined`, from the palette's own ink against its own canvas. Joins `chroma` and `scrim` on `PaletteMeasures` as a third derived reading |
| `themeGround(theme)` | `src/render/theme.ts` | a **style object**: `{ backgroundColor, color, colorScheme }`, beside `themeStyle(theme)` in `@jam-overture/loom/react` |

`themeGround` takes a `ResolvedTheme` and not a `ThemeResolution`, which is the
bargain `themeStyle` already makes: *the tree names no theme* stays the host's to
answer, because there is no fallback theme and inventing a ground for an unthemed
tree mounts a look the tree does not name (0049). That single line is what is left
of `apps/loom/app/(demo)/_lib/ground.ts` — and **its 29 tests pass unchanged
against the moved implementation**, which is the whole claim that this move
changed no behaviour.

## The measurement, which is this report's visual

Every registered palette, its canvas and ink luminance, the scheme
`paletteScheme` reads off them, and the contrast of the pair `themeGround` hands
a frame. Printed by running the code, not transcribed.

| palette | scheme | L(bg-canvas) | L(fg-default) | frame contrast |
| --- | --- | --- | --- | --- |
| `minimal` | light | 1.0000 | 0.0030 | 19.80:1 |
| `editorial` | light | 0.9541 | 0.0030 | 18.93:1 |
| `bold` | dark | 0.0030 | 0.9131 | 18.16:1 |
| `paper` | light | 0.9344 | 0.0062 | 17.50:1 |
| `slate` | light | 0.9548 | 0.0055 | 18.11:1 |
| `sage` | light | 0.9338 | 0.0066 | 17.38:1 |
| `blush` | light | 0.9510 | 0.0051 | 18.17:1 |
| `harbour` | light | 0.9741 | 0.0058 | 18.35:1 |
| `citrus` | light | 0.9467 | 0.0073 | 17.40:1 |
| `lilac` | light | 0.9504 | 0.0051 | 18.17:1 |
| `graphite` | light | 0.9560 | 0.0058 | 18.03:1 |
| `clay` | light | 0.9149 | 0.0066 | 17.06:1 |
| `linen` | light | 0.9210 | 0.0066 | 17.16:1 |
| `midnight` | dark | 0.0092 | 0.9047 | 16.13:1 |
| `carbon` | dark | 0.0077 | 0.9186 | 16.79:1 |
| `plum` | dark | 0.0083 | 0.9041 | 16.36:1 |
| `forest` | dark | 0.0125 | 0.9217 | 15.55:1 |
| `ember` | dark | 0.0084 | 0.9095 | 16.42:1 |
| `dusk` | dark | 0.0104 | 0.8987 | 15.70:1 |
| `obsidian` | dark | 0.0070 | 0.9065 | 16.78:1 |
| `tide` | dark | 0.0136 | 0.9168 | 15.20:1 |

**Twelve light, nine dark. The darkest light canvas is `clay` at 0.9149 and the
lightest dark canvas is `tide` at 0.0136** — a gap of 0.90 on a scale 1.00 wide,
with nothing in it. That is what makes the absence of a threshold a property
rather than an omission: there is no line to put anywhere. **The lowest frame
contrast of the twenty-one is 15.20:1**, against a 4.5:1 bar, because both ends
of the pair come from the palette and it is the pairing the contrast bar already
asserts (0074). `measure.test.ts` and `render/theme.test.ts` hold all three of
those claims.

## Decisions taken that were not specified

**Both shapes, not one.** The finding offered a field on `ResolvedTheme` *or* a
`themeGround`, and called the second the smaller ask. Neither alone was right:
the CSS-shaped helper is what a host applies, and the light-or-dark reading is a
fact about a *palette* that a host may want without any frame — a catalogue
sorting palettes, an audit, a probe. So the measure went where the other two
derived readings live and the style object went beside `themeStyle`, and the
second is written in terms of the first, so they cannot disagree.

**`ResolvedTheme` gains nothing.** It is what the registry hands back — three
registered documents — and every place that builds one by hand, which includes a
good deal of the test suite, would owe a fourth field it cannot compute without
importing the measure anyway. Recorded as the first rejected alternative in 0197.

**`color-scheme` is still not emitted from the root.** `themeStyle` could carry
it and a page telling the browser which way round it is would get correct form
controls and scrollbars for nothing. That changes what every existing page
renders, so it is a separate change with its own record and its own screenshots,
and it is written into 0197 as an open question rather than taken here.

**A cross-lane test was replaced rather than weakened.** The first version of
*moves both ends together* asserted that `editorial`'s ink is not `bold`'s canvas.
It failed — both are `#0a0a0a` — and the failure was correct: the assertion was
about two unrelated palettes rather than about the function. It was replaced by
the real claim, which is that the pair clears the text bar under all twenty-one
palettes. Written down because a red test that is right about the wrong thing is
the easiest kind to talk yourself past.

## The diff that crosses a lane boundary, and why

Two files outside `src/`:

- **`apps/loom/app/(demo)/_lib/ground.ts`** — the duplicate this change exists to
  remove, collapsed to a type alias and a one-line delegation. Removing it is the
  entire value of the finding, which its own author filed asking for exactly this
  (*"the reason it is filed rather than left closed is that the derivation is not
  demo-specific"*). No call site changed and no test changed.
- **`apps/loom/app/(docs)/_lib/api/reference.generated.json`** — regenerated with
  `pnpm --filter @loom/app docs:api`, because two new exports on
  `@jam-overture/loom` and `@jam-overture/loom/react` make the committed
  reference stale and `extract.test.ts` fails on the drift. 16 entry points,
  1,110 exports.

**A note on the demo's lane, for the maintainer rather than for a routine.** This
lane's brief says the demo is its own (*"The demo, which is yours"*) and
`docs/routines.md` says `Loom demo` has owned `(demo)` since 20 August. The brief
wins by that file's own rule, and the file is the one describing today's reality —
`Loom demo` filed this finding and is writing reports. **The framework brief is
stale on this point and should be corrected in one direction or the other**, and a
routine should not be the one to choose. The edit above is four lines inside the
file the finding names and has no open demo pull request to collide with.

## Findings

**Closed — one, owned by this lane.**

- *a host cannot ask a resolved theme which way round it is* (`Loom demo`,
  26 Sep) — both shapes shipped, no threshold, and the one line of demo left
  around it is the `undefined` case.

**Filed — one, and it is this lane's own trap sprung again.**

- *the stale-`main` trap has a second half: `git status` reports the stale branch
  as up to date with `origin/main`.* The 20 September entry was right about the
  fault and does not name the thing that makes it convincing. This session's
  clone arrived with `HEAD` detached at `207e450` and a local `main` at `cc462bd`,
  **ten commits behind** — and `git checkout main` printed *"Your branch is up to
  date with 'origin/main'"*, because the remote-tracking ref in the clone was
  stale too. Both were stale, so both agreed.

  **What it cost, and why it is worth a second entry.** The first thing read on
  that branch was `decisions/`, where `0194` was **absent** — a record the
  26 September framework report says it added, whose number the index carried as
  *No record on this branch*. So the visible symptom of a stale checkout was *a
  decision record missing from a merged pull request*, with `package.json` reading
  `@loom/runtime` beside it and `LICENSE` behaving as though licensing were still
  open. Ten minutes went into tracing a deletion that never happened. The remedy
  is one line and it is `git fetch origin main && git checkout -B <branch>
  origin/main`; the entry proposes a `pnpm preflight`, because this is now the
  second thing a run has to remember rather than be told.

## Open questions

1. **Should `themeStyle` emit `color-scheme` at the root?** It would get correct
   native controls, scrollbars and form widgets on every Loom page for one line.
   It also changes what every existing page renders, so it wants its own record
   and three palettes' worth of pictures. Not this change.
2. **Does anything else hold a second copy of a theme decision?** Two were found
   by one lane in one week and only because a palette moved. A check that fails
   when a stylesheet constant equals a palette slot is conceivable and probably
   not worth it; a *convention* that a host never writes a palette's colour into
   CSS is worth stating somewhere, and `(demo)/_lib/chrome.ts` already lives by it.
3. **Whose is the demo?** Above, under the cross-lane note. A stale brief is the
   one thing a routine genuinely cannot fix for itself.

## Tests

`pnpm verify` green, read from a file written as the last thing on its own line.

```
$ pnpm verify > verify.log 2>&1; echo "EXIT=$?" > verify.exit
$ cat verify.exit
EXIT=0
```

| | |
| --- | --- |
| root suite | **165 files, 3,209 tests**, 0 failed |
| `@loom/app` suite | **310 files, 5,381 tests**, 0 failed |
| findings | 833, 0 malformed |
| prerender | 112 pages, 1,300 text junctions, 0 run together; 3 metadata conventions, 0 unserved |
| new tests | 6 — four on `paletteScheme` and `paletteMeasures`, four on `themeGround` |
| demo tests re-run against the moved implementation | **29, unchanged, all passing** |

**One failure on the way, stated rather than smoothed over.** The first full
`pnpm verify` came back `EXIT=1` on
`tools/decisions/decisions.test.ts`: 0197 cited 0049 by a filename guessed from
memory (`0049-a-theme-is-three-registered-ids-on-the-root-node.md`) rather than
its real one (`0049-a-theme-is-three-ids-in-the-tree.md`). The citation check
caught it as blocking, which is what it is for. Fixed and the gate re-run whole;
the number above is the second run's.

**Nothing was skipped and nothing was weakened.** The one test that was rewritten
is described under *Decisions taken that were not specified* and the rewrite made
it stronger.
