# The press that moves the page

**Routine:** `Loom demo` · **Branch:** `demo-43-the-press-that-moves-the-page`
· **9 October 2026**

The forty-fourth run of this lane, with no open pull request of its own. A
fresh branch off `main` at `e8047d0`, fetched before branching and before
photographing.

Every picture below is a production `next build` of a real commit, served by
`pnpm shoot --serve` and photographed at 1280 × 900, 390 × 844 and 348 × 465
with reduced motion. **Every number is `pnpm shoot`'s own `measure`**, with the
selectors committed in `2026-10-09-demo-the-press-that-moves-the-page.shots.json`
beside this report. The three `before` pictures are the same harness run
against a production build of `main` at `e8047d0`, built separately — and all
three are **byte-identical to the hashes yesterday's report recorded for
`main`** (`e8fd0ea8…`, `8498ace7…`, `cccd3199…`), which is the cheapest
available proof that the left-hand column is really the shipped surface and not
a re-staging of it.

**No maintainer comment was outstanding.** Nothing has been said on this lane's
work since #458. The two open pull requests in the repository are
`Loom portal`'s #563 and `Loom primitives`' #548; neither touches this lane.

---

## What a stranger could not understand before this run

**That pressing the thing the demo invites them to press does anything to the
page.**

It is the whole of the brief's first failure mode — *too many steps before
anything happens* — and it has been this lane's standing open question since
3 October, carried six runs on a recommendation of *leave it and measure*. This
run took the other shape, and the override is the part of it that deserves the
maintainer's eye rather than the code.

## What specifically failed, diagnosed before anything was built

I used the surface as a stranger would, on a production build of `main` at
`e8047d0`, and timed the invited path by presses rather than by seconds.

| | the invited path on `main` |
| --- | --- |
| press 1 — the green button, *Take the numbers off* | **nothing on the page moves.** A question card appears in the rail, 391 × 503 at `y 43` |
| press 2 — *Apply this change*, inside that card | the stage is carried to a band the visitor has never seen, about four thousand pixels down at 390 × 844, and a green chip says **Something was removed here** |

**So the demonstration of "the page really changes" was, in order: a press that
changes nothing, then a deletion of content the visitor had never laid eyes
on.** Nothing about it is false and every piece of it is well built — three
runs of this lane have worked on making press 1 read as the product working
rather than as a broken button, and all three were the right work. None of them
makes a press that moves nothing the better opening for a surface whose claim
is that the page really changes.

And one row below that green button sat *Re-theme the whole page*, marked
`GOES AHEAD`, which does the entire sixty seconds in a single press.

## The change

**The demo opens with a change the Gate applies, and hands the green button to
the change the Gate holds the moment one of the visitor's own is on the page.**

Two beats, each complete:

| | the invited path on this branch |
| --- | --- |
| press 1 — the green button, *Re-theme the whole page* | the page turns from dark navy to cream serif **in view**, and the complete record lands at the top of the rail: what was asked, what Loom weighed on both questions, the rule that read them, **Put it back**, and *That is the whole loop* |
| press 2 — the same green button, now *Take the numbers off* | *Pressing this raises a question, not a change.* The Gate stops it, and the preview of the band comes back with it |

### `_lib/presets.ts` — a second nomination, and a flag

```ts
export const DEMO_OPENING_PRESET: DemoPresetId = "palette"

export const leadingAsk = (
  available: readonly DemoPresetId[],
  landed: boolean
): DemoPreset | undefined => {
  const offered = offeredPresets(available)
  const wanted = landed ? DEMO_LEADING_PRESET : DEMO_OPENING_PRESET

  return offered.find((preset) => preset.id === wanted) ?? offered[0]
}
```

`landed` is **required**, for the reason `whatEachWillSay`'s own history gives:
its one caller is `rail.ts`, which holds the answer two lines above the call
(`landedOnYourPress`), and a defaulted parameter is a parameter a later run can
stop answering with the whole suite green.

### `_lib/rail.ts` — one argument

```ts
const nominated = waiting === undefined ? leadingAsk(available, landing !== undefined) : undefined
```

`landing` rather than `records.length`, and the distinction is the demo's:
an ask that was *raised* has moved nothing, so a visitor looking at a page that
has not moved is still on their first press. (The rail nominates nothing at all
in that state, because a question is open — so the two rules agree, and a test
holds the join rather than letting either carry the other.)

### Not one string in the panel moved

The sentence under the green button is `composeChange`'s own answer about the
button above it (`what-it-will-say.ts`), so it changed from *Pressing this
raises a question, not a change* to *Pressing this changes the page straight
away. Low risk — so Loom does it without stopping to ask, and writes down what
it did* **without a word being written**. The same is true of the chip on every
row and the count above them. That is 2 October's unit paying for itself: the
order of the demo can be reconsidered in one constant because nothing on the
screen is typed.

### The preview goes, and comes back with the press that needs it

`DEMO_OPENING_PRESET`'s single operation configures the root, and
`partFromOperations` refuses the root by a rule it already had — a preview of
the whole page beside the whole page. So *Show what would come off the page*
leaves the arrival screen, and returns on the second beat, which is exactly the
press that names something out of sight. **Nothing was added to make that
happen**; the refusal was already written and is now load-bearing, so
`before-the-press.test.ts` holds it rather than the comment.

### And the way back now points at the record

Found while photographing, and fixed in the same unit because this run creates
the state that exposes it. `BackToTheRecord`'s arrow was a literal `↑`, with a
comment saying why: *"the card is above the visitor"*. That was true of every
state that could reach the bar — all of them produced by a press that carried
the visitor *down* the page to a mark. The opening press scrolls nothing, so on
a phone the record lands **below** them, measured at `y 981` of an 844px
viewport: the bar was right to appear and pointing the wrong way. The direction
is now read off the same `IntersectionObserver` entry that says the card is
gone.

## Measured, on the two production builds

### 1280 × 900, the arrival screen

| | before (`main` at `e8047d0`) | after |
| --- | --- | --- |
| the green button | *Take the numbers off* | ***Re-theme the whole page*** |
| the verdict under it | *Pressing this raises a question, not a change.* | ***Pressing this changes the page straight away.*** |
| `#ask` | `y 259`, 391 × **541** | `y 259`, 391 × **509** |
| the four rows | `499 / 566 / 633 / 700` | `467 / 534 / 601 / 668` — **32px up** |
| disclosures on the rail | **3** (`442`, `779`, `823`) | **2** (`747`, `791`) |
| the rail's footer | `y 881` — **59 past the fold** | `y 849` — **27 past the fold** |
| the rail's content | 935 in an 857px scroller | **903** in 857 |

**The arrival screen got 32 pixels shorter, and they came from a preview that
no longer has a subject.** Nothing was cut to find them.

### 390 × 844, the arrival screen

| | before | after |
| --- | --- | --- |
| `#ask` | `y 611`, 350 × 589 | `y 611`, 350 × **558** |
| the first row | `y 883` — 102 past the fold | `y 835` — **54 past the fold** |
| the rail | 390 × 1299 | 390 × **1267** |

And the pairing on the phone's first screen changed in a way nothing planned
for: the rail renders the top of the page under the claim (`ThePageItselfView`,
captioned *This is the top of it*), and the green button under that now
promises *every colour and typeface on the page changes at once* — about the
thing directly above it. It used to promise a stat band four thousand pixels
further down.

### What one press produces, which is the comparison this run is about

| | after press 1, before | after press 1, after |
| --- | --- | --- |
| the stage | unchanged | **cream, serif, every colour and typeface** |
| the rail's newest card | a question, 391 × 503 at `y 43` | the **complete applied record**, 391 × 496 at `y 44` |
| **Put it back** | not reached | `y 415` — **on the first screen** |
| *That is the whole loop* | not reached | on the first screen |

The right-hand column is **one press** from arrival. The left-hand column needs
a second one, and the second one lands on a part of the page the visitor has
never seen.

### Pictures

| | `md5` | |
| --- | --- | --- |
| [**one press, 1280 × 900**](2026-10-09-demo-press-one-press-wide.png) | `03f930af…` | **the picture worth opening** |
| [the arrival screen](2026-10-09-demo-press-arrival-wide.png) · [before](2026-10-09-demo-press-arrival-wide-before.png) | `3b34079e…` ← `e8fd0ea8…` | the green button and its verdict, both changed, neither typed |
| [the second beat](2026-10-09-demo-press-second-beat-wide.png) | `4b5aceac…` | the handover: the same green button, now the Gate's, with its preview back |
| [the arrival screen on a phone](2026-10-09-demo-press-arrival-phone.png) · [before](2026-10-09-demo-press-arrival-phone-before.png) | `a3177980…` ← `8498ace7…` | the preview and the press are now about the same thing |
| [one press on a phone](2026-10-09-demo-press-one-press-phone.png) | `ce9b0d63…` | the handover, and the way back pointing **down** at the record |
| [what the first press used to produce](2026-10-09-demo-press-first-press-wide-before.png) | `cccd3199…` | `main`'s question card, for the comparison above |
| [the question, on the second beat](2026-10-09-demo-press-question-wide.png) | `049439d5…` | the Gate's moment, unchanged, one press later than it was |
| [the embed at 348 × 465](2026-10-09-demo-press-embed.png) | `7c20a054…` | the whole first beat above the fold in somebody else's page |

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | `main` at `e8047d0` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 199 files / 4,465 | **199 / 4,465** — `src/` untouched |
| `@loom/app` (`apps/loom/`) | — | 419 files / **7,650** |
| the demo lane | 53 files / **823** | 53 / **837** |
| findings | 1,094 | **1,096**, 0 malformed |
| `prerender:check` | — | 129 pages, 1,644 junctions, 0 run together |

**Every left-hand figure was measured on this tree rather than derived**: the
lane's changes stashed, `vitest run` and `findings:check` against the same
installed dependencies, then popped. `@loom/app`'s total is given for this
branch only, because the stash was scoped to the lane.

**+14 lane tests, all written, none weakened, skipped or deleted.** No new test
file — every one went into the file that already tested the module it is about:
`presets.test.ts` +5, `rail.test.ts` +3, `back-to-the-record.test.tsx` +3,
`pipeline.test.ts` +1, `what-it-will-say.test.ts` +1,
`before-the-press.test.ts` +1.

**Twelve existing tests changed fixture and not meaning.** Nine render tests in
`ask-panel.test.tsx` are about the panel's behaviour *with a held lead* — the
verdict under the button, the hedge it replaces, the lead's exclusion from the
rows it marks — and now ask the shared nomination for the second beat rather
than the first (`led(ALL, true)`), which is the same preset they were written
against. Two `rail.test.ts` assertions moved from the arrival screen to the
press after it, for the same reason. None of their expectations changed.

**The test that earns its place over the others** is `rail.test.ts`'s *hands
the green button and the preview to the Gate's ask once a change has landed*.
Four readings have to agree for the demo's second beat to exist — the press
applies rather than being held, `landedOnYourPress` sees the change at the
head, the nomination flips, and the preview arrives with it — and each of them
is correct about itself while the sequence is broken.

### The defect matrix

Each defect restored in turn **against the commit**, the demo lane run against
it, and the lane restored between rows. Baseline **837 passed**.

| defect restored | caught |
| --- | --- |
| the demo's policy stops applying the ask it opens with | **27** |
| the handover runs backwards | **16** |
| the green button never hands over to the Gate's ask | **12** |
| the demo opens with the ask the Gate holds (the behaviour this run replaces) | **7** |
| the nomination falls through to nothing instead of the table | **4** |
| the arrival screen previews the whole page under its own button | **4** |
| the handover counts records rather than the change on the page | **1** |
| the way back points up at a record below the visitor | **1** |

**Eight of eight by test.** Three rows are worth reading.

**The first** is the one this run added a test for and is the row a policy
retune would walk into: it is not a ceiling change — there is no ceiling below
`low`, and dropping the demo's own override changes nothing for a low-stakes
re-theme — it is `protectedPropKeys: ["loom:theme"]`, which is a plausible
thing for this lane to declare one day and which turns the opening press into a
question. Both of the new property tests are among the 27. (The two retunes
that break the *held* half — no auto-apply for `user-instruction`, and
everything auto-applying — are caught at 70 and 71, by the test that has
guarded that half since September.)

**The seventh is caught by exactly one test, and it is the one written for it.**
`landing` and *are there any records* agree in every state but one: a question
the visitor **declined**. There is a record, the page has not moved, and
`records.length` would hand the green button back to the ask they just refused.
That test is the whole justification for the argument being `landing`.

**The eighth is the arrow**, and it is one test because it is one character —
but it is the character a visitor reads as an instruction.

## Decisions taken that were not specified

- **`DEMO_LEADING_PRESET` keeps its name and its meaning.** It is still the
  preset the Gate holds and still the one `pipeline.test.ts` pins as held; what
  changed is *when* it leads. Renaming it would have been a fifty-line
  mechanical diff across eight files for a word, and the pair reads: the
  opening ask opens, the leading ask leads from then on.
- **The revert is one line and it is asserted.** Setting `DEMO_OPENING_PRESET`
  to `DEMO_LEADING_PRESET` restores exactly the single lead this replaced, and
  `presets.test.ts` fails if the two are ever made equal — so a run that takes
  that option says so loudly instead of leaving two records arguing for an
  order the code no longer has.
- **The rows were not reordered.** With the re-theme on the green button the
  first row is *Repaint the top band*, the second `GOES AHEAD` — so the two
  that go ahead are adjacent and the three that ask you first follow. Promoting
  the held ask to the top of the list was tried and thrown away: the handover
  already puts it under the visitor's hand on the second press, and reordering
  `DEMO_PRESETS` would have moved a row order five runs have measured for the
  sake of an adjacency the sequence supplies.
- **The share card was deliberately not moved with the button.** Filed below
  with three shapes and a recommendation to leave it: it is the only picture of
  this surface whose subject is the Gate.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart
  from `FINDINGS.md` and `reports/`. `git diff origin/main --name-only` outside
  those three is empty.

## What was left out

**Nothing was measured by watching a stranger**, and that is still true and
still the thing that would settle this. What this run did instead is measure
what each first press *delivers*, which is a weaker claim honestly made rather
than a sixth deferral.

**The three bands still rely on `pointer-events: none`**, carried a fourth run.

**The disclosure chevron is still drawn in three components**, carried a
seventh run.

**The folded reasoning on an answered card is still labelled in the present
tense**, carried a ninth run.

**The panel still says *more* on one path through a change and not the other**
(8 October, this lane's, recommendation *leave it*) — untouched, and this run
does not change its terms.

## Findings

**Filed two, closed one.**

- **Closed**: the 3 October entry this lane owns — *the demo's one invited
  press still does not move the page* — **by shape (2), against its own
  standing recommendation**. The closing note on the entry is written for the
  maintainer rather than for the next run: what the entry asked for, why it
  could not be had, what was measured instead, and the one line that reverses
  the whole thing.
- **Filed**, for this lane: the social card still pictures the ask the arrival
  screen no longer leads with. Three shapes, recommendation **(1)** — leave it
  — because the card's subject is the Gate and that is the better card.
- **Filed**, for this lane: the surface's one teaching device, the mark, is
  absent from the press every visitor now makes first, because `spotFor`
  refuses to ring the root and is right to. Two shapes, neither recommended,
  with the picture.

**Re-verified, not re-filed:** `21st.dev` `ENOTFOUND` from `WebFetch`, a
**forty-first** consecutive run, one call. `*.vercel.app` denied from the
sandbox — the preview URL is on the pull request and the pictures are from a
local production build.

## Open questions

**One, and it is the maintainer's.** This run overrode a standing
recommendation its own lane wrote six times. The code says the override was
right and the pictures are the argument; the judgement is not this lane's to
make alone. If the hold should still open the demo, the revert is
`DEMO_OPENING_PRESET = "trim"` and nothing else.
