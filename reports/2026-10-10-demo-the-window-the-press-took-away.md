# The window the press took away

**Routine:** `Loom demo` · **Branch:** `demo-44-the-window-the-press-took-away`
· **10 October 2026**

The forty-fifth run of this lane, with no open pull request of its own. A fresh
branch off `main` at `39c6ef3`, fetched before branching and before
photographing.

Every picture below is a production `next build` of a real commit, served by
`pnpm shoot --serve` and photographed at 390 × 844, 1280 × 900 and 348 × 465
with reduced motion. **Every number is `pnpm shoot`'s own `measure`**, with the
selectors committed in
`2026-10-10-demo-the-window-the-press-took-away.shots.json` beside this report.
The two `before` pictures are the same harness run against a production build
of `main` at `39c6ef3`, built separately — and both are **byte-identical to the
hashes yesterday's report recorded** (`a3177980…`, `ce9b0d63…`), which is the
cheapest available proof that the left-hand column is the shipped surface and
not a re-staging of it.

**No maintainer comment was outstanding.** Nothing has been said on this
lane's work since #458. #564 — which overrode this lane's own six-times-written
recommendation and asked the maintainer to say if the override was wrong —
merged yesterday as `d924ad5`, and **a merge is `Loom merge`'s and not an
answer**: the one-line revert it offered (`DEMO_OPENING_PRESET = "trim"`) is
still on the table, and this run builds on the order #564 shipped. The four
open pull requests are `Loom portal`'s #573, `Loom lessons`' #572, `Loom daily
build`'s #566 and `Loom primitives`' #548. None touches this lane.

---

## What a stranger could not understand before this run

**On a phone, that the press they had just made had done anything at all.**

The demo's claim is *the page really changes*, and `demo-43` put that claim one
press from arrival. It did — on a wide screen, where the page is 848 pixels of
stage forty pixels from the rail and turns over in full view. On a phone the
same press moved nothing a visitor could see, and took away the one thing on
the screen that was the page.

## What specifically failed, measured before anything was built

I used the surface as a stranger would, on a production build of `main` at
`39c6ef3`, at 390 × 844, and pressed the green button the arrival screen
offers.

| | before the press | after it |
| --- | --- | --- |
| the window onto the top of the page | `y 325`, 350 × 262 | **gone**, and its caption with it |
| the green button | `y 611` | `y 325` |
| the clinic's own `h1`, on the stage | `y 1,515` | **`y 1,998`** |
| the record the press produced | — | `y 981` — 649 past the fold |

So the press that turns **every colour and typeface on the page** over left a
390 × 844 screen holding no part of the page, no mark, and no record — having
just deleted the one window that had been showing the page. What a stranger
saw was a button changing its own label, and a bar at the foot of the screen
saying something had been written down somewhere.

**Nothing here is anyone's mistake and every piece of it is well built.** The
window went quiet at the first press on a premise that was *true when it was
written*, six days ago:

> **The visitor has asked for something.** From the first press onwards every
> screen on this surface already brings the page to them: the question renders
> the band it is about inside itself, answering carries them to the mark on the
> page with `BackToTheRecord` pinned underneath, and a removal's content is in
> the landed card.

Every clause of that was a fact about the press the demo then invited — a
**question** about the stat grid. `demo-43` made the first press the
**re-theme**, and all three clauses are false of it at once: it is applied
rather than held, so no card renders a band; it configures the root, so
`spotFor` refuses to mark it and there is nothing to be carried to; and it
removes nothing, so no card is holding content. Two correct modules, six days
apart, and the hole is between them.

## The change

**The window is drawn when nothing else on the rail is bringing the page to the
visitor** — which is what that paragraph was always claiming, and what
`records.length > 0` was a proxy for.

### `_lib/rail.ts` — the condition is asked of the screen

```ts
const shownElsewhere =
  spots.length > 0 ||
  [...readings.values()].some(
    (reading) => reading.inQuestion !== undefined || reading.kept !== undefined
  )
const itself = thePageItself({ tree, shownElsewhere, landed: landing !== undefined })
```

Two things count, and both are things a card is already **doing** rather than
predictions about what it might: a band rendered inside a card (the part a
question is about, the content a removal is holding), and a mark actually
drawn. `drawn` rather than `spotlit`, for the reason `markedPage` is built from
it two paragraphs up — a change can be worth marking and draw nothing, and this
is the reading that is about what the visitor can see.

The leading ask's preview is deliberately not one of them: it arrives shut, and
a window a visitor has not opened is not a page in front of them.

### `_lib/the-page-itself.ts` — and one more caption

```ts
export const THE_TOP_OF_IT_NOW = "This is the top of it, now."
```

One word longer than the arrival caption, because the window is doing a second
job by then: it is still the referent for *It's the page below*, and it is now
also the evidence that the press did something. The word carries the comparison
without describing it. **It does not say what happened** — that is the record
card's sentence, and a caption competing with it would be the third place one
change is narrated.

`landed` is `rail.ts`'s `landing`, the same boolean the nomination turns on,
and it decides the caption and nothing else: a question **declined** leaves the
page where it was, and a window captioned *now* over an unmoved page would
claim a change nobody made.

## Measured, on the two production builds

### 390 × 844 — the press this run is about

| | before (`main` at `39c6ef3`) | after |
| --- | --- | --- |
| the window, after the press | **gone** | **`y 325`, 350 × 262** — where it was |
| the caption | — | *This is the top of it, now.*, `y 571` |
| the green button | `y 325` | `y 611` — where it was |
| the nearest pixel of the page | `y 1,998` | **`y 505`, in the window** |
| the record the press produced | `y 981` | `y 1,267` |

**The visitor's screen does not move and the band inside it turns over.** The
window and the button are at the same two coordinates they were at before the
press — `y 325` and `y 611` — so what changes between the two pictures is the
page in the window, from dark navy sans to cream serif, ending twenty-four
pixels above the button that turned it over.

### The cost, stated rather than buried

The record card moves **286px further down**, from `y 981` to `y 1,267`. It was
already 649 past the fold and reachable only by the bar pinned to the foot of
the screen — *Loom wrote down what it just did · Show the record ↓* — which
still takes them there in one press. That bar is the reason this trade is
affordable: the record was never on this screen, and the page now is.

### Every other screen, unchanged

| screen | the window | |
| --- | --- | --- |
| arrival, 390 × 844 | `y 325`, 350 × 262 | **picture byte-identical to `main`** |
| a question open | no match | the band it is about is rendered in the card |
| *Repaint the top band* landed | no match | the page is ringed and the visitor was carried to it |
| 1280 × 900, arrival | `0 × 0` | `#ask` `y 259` 391 × 509, rows `467/534/601/668`, footer `y 849` |
| 1280 × 900, one press | `0 × 0` | the card at `y 44`, 391 × 496 |
| the embed, 348 × 465 | `0 × 0` | the green button at `y 325` |

The three wide and embed pictures are **byte-identical to the ones yesterday's
report shipped** — `3b34079e…`, `03f930af…`, `7c20a054…` — so the width this
surface is judged at is untouched by more than an assertion. `globals.css`
takes the window off any layout with the page already beside the rail and off
any frame too short to afford it, and neither rule moved.

### Pictures

| | `md5` | |
| --- | --- | --- |
| [**one press, 390 × 844**](2026-10-10-demo-window-one-press-phone.webp) · [before](2026-10-10-demo-window-one-press-phone-before.webp) | `674ca228…` ← `ce9b0d63…` | **the picture worth opening** — the same screen, with the page turned over in it |
| [the arrival screen](2026-10-10-demo-window-arrival-phone.webp) · [before](2026-10-10-demo-window-arrival-phone-before.webp) | `a3177980…` = `a3177980…` | byte-identical; the screen this run does not touch |
| [a marked change, on a phone](2026-10-10-demo-window-marked-phone.webp) | `1c934553…` | the control: the page is in front of them, so the window stays away |
| [a question open](2026-10-10-demo-window-question-phone.webp) | `ad41aaa6…` | the other control, unchanged |
| [after **Put it back**](2026-10-10-demo-window-put-it-back-phone.webp) | `66d64278…` | the half this run does not fix, and the finding filed for it |
| [1280 × 900, arrival](2026-10-10-demo-window-arrival-wide.webp) | `3b34079e…` — unchanged byte for byte | the wide arrival screen |
| [1280 × 900, one press](2026-10-10-demo-window-one-press-wide.webp) | `03f930af…` — unchanged byte for byte | the wide payoff frame |
| [the embed at 348 × 465](2026-10-10-demo-window-embed.webp) | `7c20a054…` — unchanged byte for byte | inside somebody else's page |

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line
and read in a separate command.

| | `main` at `39c6ef3` | this branch |
| --- | --- | --- |
| the demo lane | 53 files / **837** | 53 files / **844** |
| `@loom/app` (`apps/loom/`) | — | 421 files / **7,819** |
| `@jam-overture/loom` (`src/`, `tools/`) | 201 / 4,537 | **201 / 4,537** — `src/` untouched |
| findings | 1,111 | **1,113**, 0 malformed |
| `prerender:check` | — | 132 pages, 1,755 junctions, 0 run together |

**The left-hand lane figure was measured on this tree rather than derived**:
`git checkout origin/main -- "apps/loom/app/(demo)"`, `vitest run` against the
same installed dependencies, then back. `@loom/app`'s total is given for this
branch only, because that restore was scoped to the lane. `src/` and `tools/`
are identical on both sides — `git diff origin/main --name-only` outside
`apps/loom/app/(demo)/`, `FINDINGS.md` and `reports/` is empty.

**+7 lane tests net, none weakened, skipped or deleted.** No new test file —
every one went into the file that already tested the module it is about:
`the-page-itself.test.ts` +3, `rail.test.ts` +4.

**One test's expectation was reversed, deliberately and not to get green.**
`rail.test.ts`'s *says nothing once a change has landed* asserted the behaviour
this run exists to remove. It is now *stays through a change whose subject is
the page itself*, with the measurement above in its doc comment and the premise
it used to rest on quoted in `the-page-itself.ts`. Nothing else changed
expectation; the two silences that remain — a question open, a marked change —
are asserted where they were, and the second of them is **new**.

**And one fixture was corrected, with its expectations untouched.** `demo-43`'s
*still opens with the moving press after a question the visitor declined*
declined by discarding the hold and nothing else, so the record it read back
still said `awaiting-you` — which marks the page amber for a question nothing
can answer, a state the surface cannot reach. It now declines the way
`actions.ts` does, folding the events onto the card that was waiting. Both
assertions pass unchanged; what the test is about is now a state a visitor can
be in. The helper that does it, `refuse`, is the sibling `allow` has had since
September.

**The test that earns its place over the others** is *says nothing when the
change it landed is marked on the page*. *Repaint the top band* lands exactly
as the re-theme does — one press, no question, a record at the top of the rail
— and the only difference is that the page carries a ring. Without that test
the condition reads as *a change landed* rather than as *the page is not in
front of them*, and the next run to touch it would have no way to tell which.

### The defect matrix

Each defect restored in turn **against the commit**, the demo lane run against
it, and the lane restored between rows. Baseline **844 passed**.

| defect restored | caught |
| --- | --- |
| the window goes quiet at the first press (the behaviour this run replaces) | **3** |
| the caption never says the page has moved | **3** |
| the window is drawn over a page that is already marked | **1** |
| the caption counts records rather than reading what landed | **1** |
| the window is drawn over a card already rendering a band | **0** |

**Four of five by test, and the fifth is the row worth reading.**

**The last one is caught by nothing, and the test written for it says why
rather than pretending otherwise.** `shownElsewhere` asks two things — is a
card rendering a band, is the page carrying a mark — and no state this demo
can reach has one without the other, because they are the same rule read
twice: a band is drawn for the nodes a change touched and refused for the root
(`partFromOperations`), and a mark is drawn for the same nodes and refused for
the root (`spotFor`). So the clause is the half of the claim that is about
cards rather than a branch waiting for a bug. *Never renders a band in a card
without marking the page* asserts that law over every ask this surface offers,
raised and answered, so a new preset — or a free-text ask through the model —
whose part draws where its mark cannot will say so in the file where the
condition is wired. Deleting the clause was the alternative and it was not
taken: it would leave the condition reading *is anything marked*, which is a
smaller claim than the one it is making.

**The fourth is the one `demo-43` predicted.** `landing` and *are there any
records* agree in every state but one — a question the visitor declined — and
the test for it is the only thing standing between the caption and a window
saying *now* over a page nobody moved.

**And the two threes are the behaviour itself**, from both ends: the condition
and the caption each fail three tests when reverted, which is what a reading
wired through two files should look like.

## Decisions taken that were not specified

- **The modifier keeps the name `--arrival`.** It is now narrower than the
  thing: the window stands on the arrival screen and on the screen after a
  change to the page itself. Nothing in either CSS rule depends on which of
  those it is — both are the phone's first screen, both trade the same pixels
  against the same press — so renaming it would have moved four files to change
  one comment. `globals.css` says so where the name is.
- **The ask's preview does not count as showing the page.** It arrives shut,
  and the whole of this condition is about what is in front of a visitor rather
  than about what they could open.
- **The caption is a second constant rather than a sentence built at the call
  site**, for the reason every other sentence on this surface is in `_lib`: a
  string in the markup is a string nothing compares against anything.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart
  from `FINDINGS.md` and `reports/`.

## What was left out

**The undo does not get what the press got.** Pressing **Put it back** on the
card lands the visitor's finger 922 pixels below the window, so the page goes
back in two places and neither is on their screen. Filed, with the measurement
and two shapes, because it is a scroll decision and this surface already has
two components with an opinion about that one scroller.

**Nothing was measured by watching a stranger**, which is still the thing that
would settle this lane's judgement calls and still not available from a
sandbox. What this run measured is where the page is on a visitor's screen at
the moment they have asked for it to change, which is a weaker claim honestly
made.

**The three bands still rely on `pointer-events: none`**, carried a fifth run.
The window this run keeps through one more screen is the fourth band and the
one that does not: it carries `inert`, so the clinic's hero does not put a
second *Book an assessment* in the tab order — which matters more now that the
window is on screen for longer.

**The disclosure chevron is still drawn in three components**, carried an
eighth run. **The folded reasoning on an answered card is still labelled in the
present tense**, carried a tenth.

## Findings

**Filed one, appended to one.**

- **Filed**, for this lane: on a phone the undo lands where the visitor cannot
  see it. Measured on this commit, two shapes, recommendation **(1)** — carry
  them to the window, the movement `SpotlightScroll` already makes in the other
  direction.
- **Appended**, to this lane's 9 October entry *the demo's one teaching device
  is absent from the press every visitor now makes first*: half of it was a
  phone problem and that half is fixed, so its shape (2) — a line in `DemoBar`
  — is now **not recommended** and the entry's recommendation is **(1), leave
  it**. The screen answers *did anything happen?* with the page, which is the
  stronger answer; chrome saying so would narrate what the visitor has just
  watched.

**Re-verified, not re-filed:** `21st.dev` `ENOTFOUND` from `WebFetch`, a
**forty-second** consecutive run, one call. `*.vercel.app` denied from the
sandbox — the preview URL is on the pull request and the pictures are from a
local production build.

## Open questions

**Nothing blocking.** The one judgement worth a second opinion is the 286
pixels the record card moves down the phone's rail: this run spent them on the
page being visible at the moment it changes, on the grounds that the record was
never on that screen and the bar at the foot of it still takes them there in
one press. If the record should have the pixels instead, the revert is
`shownElsewhere: records.length > 0` in `rail.ts` and nothing else.
