# The undo nobody could see

**Routine:** `Loom demo` · **Branch:** `demo-45-the-undo-in-view`
· **11 October 2026**

The forty-sixth run of this lane, with no open pull request of its own. A fresh
branch off `main` at `a6d3021`, fetched before branching and before
photographing.

Every picture below is a production `next build` of this branch, served by
`pnpm shoot --serve` and photographed at 390 × 844, 1280 × 900 and 348 × 465
with reduced motion. **Every number is `pnpm shoot`'s own `measure`**, with the
selectors committed in `2026-10-11-demo-the-undo-in-view.shots.json` beside this
report.

**No maintainer comment was outstanding.** Nothing has been said on this lane's
work since #458. The four open pull requests are `Loom portal`'s #584, `Loom
daily build`'s #583 and #566, and `Loom primitives`' #548. None touches this
lane.

---

## What a stranger could not understand before this run

**That the button saying *Put it back* had put anything back.**

The demo's claim is *the page really changes, and the change can be undone*, and
the second half of that is the part no competitor shows. `demo-44` put the first
half one press from arrival on a phone: the opening press turns the page over
inside a window the visitor is looking straight at. Its inverse is pressed on
the record card, most of a screen further down, and the page went back in a
window 922 pixels above them.

## What specifically failed, measured on the commit that is now `main`

The sequence a stranger follows: press the green button the arrival screen
offers, then **Put it back** on the card it produces. At 390 × 844, on
`main`'s own build:

| | |
| --- | --- |
| the record card the visitor's finger is on | `y 20`, 350 × 512 |
| the window, with the page back in its first palette | **`y −922`** |
| the stage | about 1,400px below the card |

So the page really did go back, in two places, and **neither was on the screen
of the person who asked for it.** What they got was the card rewriting itself
under their finger — *The page is back as it was, and this record is how it got
there* — which is true, and is a sentence rather than the thing.

**Nothing here was anyone's mistake.** `SpotlightScroll` carries a phone *down*
to the mark a change drew and declines when there is no mark, which is right
about the stage: the re-theme configures the root, so `spotFor` marks nothing
and there is nothing down there to be carried to. `AnswerInView` declines on a
phone for the other half of the same reason. Neither is wrong. What neither knew
is that there was now a 262px window of the page 922 pixels **up**.

## The change

**The window says who moved it, and a visitor who is not looking at it is
carried there.** Twenty lines of component and one field on a reading.

### `_lib/the-page-itself.ts` — one field, set by the answer that sets the caption

```ts
return {
  tree: { ...tree, root: band },
  caption: landed ? THE_TOP_OF_IT_NOW : THE_TOP_OF_IT,
  ...(landed ? { moved: String(tree.revision) } : {}),
}
```

One field rather than a second boolean, because the caption and the movement are
the same fact read twice: a window that says *now* is a window a press has just
changed. The revision rather than the record id, for the reason
`SpotlightScroll`'s token gives — the effect must re-run when a visitor asks for
something new and must not re-run because the rail re-rendered. Every landing
here produces a revision, an undo included, and a question the visitor declined
produces neither a revision nor a landing.

### `demo/_components/page-in-view.tsx` — and two refusals

```ts
const box = onto.getBoundingClientRect()

if (box.height === 0) return
if (box.top >= 0 && box.bottom <= window.innerHeight) return
```

**No box is no movement, and that is how two scrolls stay out of each other's
way.** `globals.css` takes the window off the layout at `lg`, which is the width
at which the rail becomes a scroller of its own and `AnswerInView` re-lands the
card in it. Neither component reads the other and neither reads a width: one
walks up from the card to the first ancestor that scrolls, the other measures
the window's box, and one CSS fact decides both.

| | the rail scrolls by itself | the window has a box | who moves |
| --- | --- | --- | --- |
| 1024px and up | yes | no | `AnswerInView` re-lands the card |
| below it | no | yes | this, to the window |

**And *carry them to it* is read strictly, as *it is not in front of them*.**
The same token reaches this component on the opening press, where the window is
at `y 325` of an 844px screen and the visitor is looking at it. Moving then
would undo what `demo-44` measured. The photograph below is the proof that it
does not: that screen came back byte-identical.

`center` rather than `start`, which is the block `SpotlightScroll` uses for a
band shorter than three quarters of the viewport. Its ceiling is not copied:
`globals.css` caps this window at 15rem, and the two sizes where the cap does
not apply are the two where the window is not drawn at all.

## Measured, on the production build

### 390 × 844 — after **Put it back**

| | before (`main` at `a6d3021`) | after |
| --- | --- | --- |
| the window | **`y −922`** | **`y 291`, 350 × 262** |
| the caption, *This is the top of it, now.* | off the screen | `y 537` |
| the clinic's own heading, inside the window | off the screen | **`y 425`** |
| the green button for the next ask | — | `y 577` |
| *Show the record ↓* | — | `y 804`, 40px above the fold |
| the record card the press was made on | `y 20` | `y 1,233` — 901 past the fold |

**The cost, stated rather than buried.** The card the visitor's finger was on
goes 1,213 pixels down, which is the exact mirror of the trade `demo-44` made in
the other direction and is affordable for the same reason: the bar pinned to the
foot of the screen — *Loom wrote down what it just did · Show the record ↓* —
is at `y 804` and takes them back in one press. The page they asked for was
never on that screen; now it is.

### Every other screen, unchanged — and five of them byte for byte

| screen | `md5` against 10 October | |
| --- | --- | --- |
| arrival, 390 × 844 | `a3177980` = `a3177980` | the window at `y 325`, the press at `y 611` |
| **one press, 390 × 844** | `674ca228` = `674ca228` | **the clause that declines, photographed** |
| a marked change, 390 × 844 | `1c934553` = `1c934553` | no window: the page is ringed and `SpotlightScroll` owns the scroller |
| 1280 × 900, arrival | `3b34079e` = `3b34079e` | the window has no box; `#ask` at `y 259`, footer at `y 849` |
| the embed, 348 × 465 | `7c20a054` = `7c20a054` | no box either; the green button at `y 325` |

**The second row is the one worth reading.** The press that lands with the
window already in front of the visitor is handed the same token as the undo, and
the picture of it is the same file it was yesterday. That is the refusal proved
by a photograph rather than by an assertion.

### 1280 × 900, after **Put it back** — the other half of the table

| | |
| --- | --- |
| the rail | `x 848 y 44`, 432 × 857, holding 2,425 |
| the newest card | `y 44`, 391 × 512 — `AnswerInView` put it at the top |
| the window | `0 × 0` — no box, so this component declined |

### Pictures

| | `md5` | |
| --- | --- | --- |
| [**after Put it back, 390 × 844**](2026-10-11-demo-undo-put-it-back-phone.png) · [before](2026-10-10-demo-window-put-it-back-phone.png) | `05b216c7` ← `66d64278` | **the picture worth opening** — the page the visitor asked to put back, on their screen |
| [one press, 390 × 844](2026-10-11-demo-undo-one-press-phone.png) | `674ca228` — unchanged byte for byte | the screen this must not move, and does not |
| [the arrival screen](2026-10-11-demo-undo-arrival-phone.png) | `a3177980` — unchanged byte for byte | |
| [a marked change, on a phone](2026-10-11-demo-undo-marked-phone.png) | `1c934553` — unchanged byte for byte | the control: no window, so nothing to carry anybody to |
| [1280 × 900, arrival](2026-10-11-demo-undo-arrival-wide.png) | `3b34079e` — unchanged byte for byte | |
| [1280 × 900, after Put it back](2026-10-11-demo-undo-put-it-back-wide.png) | `0846a2c9` | the layout where the other scroll owns the movement |
| [the embed at 348 × 465](2026-10-11-demo-undo-embed.png) | `7c20a054` — unchanged byte for byte | inside somebody else's page |

**The before picture is the one 10 October's report shipped**, and the five
byte-identical hashes above are why it is a fair comparison: `(demo)` on `main`
is identical to the commit it was taken at (`git diff 0915330 origin/main --
"apps/loom/app/(demo)"` is empty), and every screen this run does not touch came
back as the same file.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, with the status written to a
file as the last thing on its own line and read in a separate command. It was
read that way twice, and the first time it mattered: the run's own notification
said exit code 0 while the file said **`EXIT=2`**, which is the compound-command
trap `docs/routines.md` names, and the failure under it was real — `tsc` caught
a `ResolvedTheme | undefined` handed to an `exactOptionalPropertyTypes` prop in
a test file `vitest` does not type. Fixed, re-run, green.

| | `main` at `a6d3021` | this branch |
| --- | --- | --- |
| the demo lane | 53 files / **844** | 54 files / **859** |
| `@loom/app` (`apps/loom/`) | — | 426 files / **7,975** |
| `@jam-overture/loom` (`src/`, `tools/`) | 205 / 4,642 | **205 / 4,642** — `src/` untouched |
| findings | 1,135 | **1,136**, 0 malformed |
| `prerender:check` | — | 133 pages, 1,798 junctions, 0 run together |

**The left-hand lane figure was measured on this tree rather than derived**:
`git checkout origin/main -- "apps/loom/app/(demo)"`, the two new files removed,
`vitest run` against the same installed dependencies, then back. `src/` and
`tools/` are identical on both sides — `git diff origin/main --name-only`
outside `apps/loom/app/(demo)/`, `FINDINGS.md` and `reports/` is empty.

**+15 lane tests net, none weakened, skipped or deleted.**

| | |
| --- | --- |
| `page-in-view.test.tsx` | **+8** — the one new file, for the one new component |
| `the-page-itself.test.tsx` | **+4** — the name the lookup uses, and the join, as the journey |
| `_lib/the-page-itself.test.ts` | **+3** — the field, its two silences, and the name |
| `_lib/rail.test.ts` | **+0 tests, +5 assertions** inside tests it already had |

**No test's expectation was reversed**, which is the difference between this
run and the last one: nothing here replaces a behaviour, it adds one to a state
that had none.

**One of the five assertions cost a round and is worth the sentence.** *Shows
the page going back, in the same window it came forward in* now also asserts
that the undo's token differs from the press's, and the first attempt read the
forward rail *after* the undo had been written. The store is one, so that rail
was this session's single record against the already-undone tree — a state no
visitor is ever in, and the assertion failed. Reading it before the undo is
both correct and the order a visitor does it in, and there is a comment in the
test saying so.

### The defect matrix

Each defect restored in turn **against the commit**, the demo lane run against
it, and the lane restored between rows. Baseline **859 passed**.

| defect restored | caught |
| --- | --- |
| the window never says which press moved it | **4** |
| the window answers to no name | **4** |
| the same token for every landing, so an undo does not re-run the effect | **3** |
| the window is put at the top of the screen rather than centred | **3** |
| it moves a visitor wherever the window is, in front of them or not | **2** |
| the read is written as the top edge alone | **1** |
| the scroll is not rendered beside the window | **1** |

**Seven of seven, and an eighth row is why the component is twenty lines rather
than twenty-two.**

The first version had two guards: `box.height === 0` for *the window has no box
on this screen*, and the viewport read for *they are already looking at it*.
Restoring the first as a defect was caught by **nothing** — and the reason is
not a missing test. An element with no boxes reports a rect of all zeros, and
all zeros is inside every viewport, so the second read already answers the
first. The wide shot's own measurement says it: `#the-page-itself x 0 y 0 0x0`.

So the guard was two lines that could never run, and a second place for a later
run to disagree with this one about what *no box* means. It is one named read
now — `offTheirScreen` — with both halves of the argument above it, and the row
above (`the read is written as the top edge alone`) is what keeps it from
quietly becoming half of itself. **The matrix deleted code rather than
demanding a test, which is the first time it has done that in this lane.**

**The two fours are the field and its name**, from both ends: `moved` and
`THE_WINDOW` each fail four tests when broken, which is what a fact wired
through a reading, a section and a client component should look like.

## Decisions taken that were not specified

- **One field on the reading rather than a second boolean.** The caption and
  the movement are the same fact read twice — a window that says *now* is a
  window a press has just changed — so `moved` carries the revision and
  `landed` sets both. Two switches would be two places to disagree about which
  press moved the page.
- **The revision rather than the record id.** `SpotlightScroll`'s own argument:
  the effect must re-run when a visitor asks for something new and must not
  re-run because the rail re-rendered. Every landing here produces a revision,
  an undo included.
- **No referee between the two scrolls.** The 10 October entry's recommendation
  allowed for one. It is not needed: `display: none` at `lg` is the same CSS
  fact as *the rail is a scroller of its own*, so the component that reads a box
  and the component that walks for a scroller are already exclusive, and each
  still reads the fact it depends on rather than a width.
- **The window's name lives in `_lib`.** For the reason every sentence on this
  surface does: a name written twice goes quiet the first time one of the two
  is edited, and a scroll that does nothing is the quietest failure here.
- **No decision record.** Nothing touches the tree schema, the delta model or
  an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart
  from `FINDINGS.md` and `reports/`.

## What was left out

**The undo is visible and still not watchable.** The opening press turns the
page over in place, under the visitor's eye. The undo cannot: the write lands,
the window repaints, and only then does the effect carry them to it — so they
arrive at a window that already changed. Filed, with the shape that would close
it (carry them on the press rather than on the result, which the form already
knows a round-trip earlier) and the shape that would not.

**Nothing was measured by watching a stranger**, which is still the thing that
would settle this lane's judgement calls and still not available from a sandbox.
What this run measured is where the page is on a visitor's screen at the moment
they have asked for it to be put back.

**The three bands still rely on `pointer-events: none`**, carried a sixth run.
**The disclosure chevron is still drawn in three components**, carried a ninth.
**The folded reasoning on an answered card is still labelled in the present
tense**, carried an eleventh.

## Findings

**Filed one, closed one.**

- **Closed**, this lane's 10 October entry — *on a phone the undo lands where
  the visitor cannot see it*. Shape (1), with the closing measurement in the
  entry and shape (2) explicitly not needed.
- **Filed**, for this lane: the undo is visible and is not watchable, because
  the visitor is carried to a window that changed before they got there.
  Measured on this commit, two shapes, recommendation **(1)** and **not on any
  schedule** — it is the difference between *cannot see* and *cannot watch*,
  and only the first was costing the demo a moment.

**Re-verified, not re-filed:** `21st.dev` `ENOTFOUND` from `WebFetch`, a
**forty-third** consecutive run, one call. `*.vercel.app` denied from the
sandbox — the preview URL is on the pull request and the pictures are from a
local production build.

## Open questions

**Nothing blocking.** The one judgement worth a second opinion is where the
visitor is left standing after an undo: this run puts the page on their screen
and the record card 901 pixels below it, with the bar at `y 804` taking them
back in one press. That is the mirror of the trade `demo-44` made and it is made
for the same reason — the thing they asked for should be the thing they can see.
If the record should keep the screen instead, the revert is deleting
`{page.moved && <PageInView token={page.moved} />}` from `the-page-itself.tsx`
and nothing else.
