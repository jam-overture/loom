# The still life goes behind one click, and the proof comes above the fold

**Routine:** `Loom demo` · **Branch:** `demo-37-the-proof-above-the-fold`
· **3 October 2026**

The thirty-eighth run of this lane, with no open pull request of its own and
none open in the repository at all. So: a fresh branch off `main` at `ef48c4d`.

Every picture below is a production `next build` of a real commit, served by
`pnpm shoot --serve` and photographed at 1280 × 900, 390 × 844 and 348 × 465
with reduced motion. The `before` pictures are the same harness run against
`main` at `ef48c4d`, built separately. **Every number is `pnpm shoot`'s own**,
not a script's — see *What was measured, and with what* below, which is the
first time that sentence is true in this lane.

**No maintainer comment was outstanding.** Nothing has been said on this lane's
work since #458, and that question was answered by the run of 1 October.

---

## What a stranger could not understand before this run

**That Loom answers different asks differently — and that they could check it
without scrolling.**

The run of 2 October put a counted claim on the arrival screen:

> **You can ask for 5 changes here. Loom will make 2 on its own and ask you
> first about 3.**

and gave each of the four remaining asks the Gate's own verdict as two words at
the end of its row — *GOES AHEAD*, *GOES AHEAD*, *ASKS YOU FIRST*, *ASKS YOU
FIRST*. That is the one fact no competitor's demonstration can carry, and it is
the whole reason the count is a measurement rather than a better promise.

**And every one of those four rows was under the fold.** Measured on a
production build at 1280 × 900: the rail's scroller is 857px, its content was
1,277px, and the first row sat at y 841 against a 900px viewport — four pixels
over. The claim was on the screen and nothing that made it checkable was. A
stranger with sixty seconds read a number and was asked to take it on trust, on
the one surface whose entire argument is *you can see what it decided*.

**What was in the way was a still life.** The largest single element on the
arrival screen was a **358px** re-rendering of the clinic's stat band — the
preview of what the green button would take off. It is not wrong, the reason it
is 21rem is argued at length in `globals.css`, and the thing it does is real: it
makes the one invited press concrete. It is also, on a wide screen, a second
drawing of a band that is on the page eighteen inches to the left, sitting in
the 400 pixels between a claim and its proof.

It is now **one click away**, and what the click says is the sentence that used
to stand over it:

> ▸ **Show what would come off the page**

| | |
| --- | --- |
| [**the arrival screen, wide**](2026-10-03-demo-the-proof-above-the-fold-after-wide.png) · [before](2026-10-03-demo-the-proof-above-the-fold-before-wide.png) | **the picture worth opening** — the claim and all four verdicts on one screen |
| [the arrival screen, phone](2026-10-03-demo-the-proof-above-the-fold-after-phone.png) · [before](2026-10-03-demo-the-proof-above-the-fold-before-phone.png) | three of the four rows on the first screen, where none were |
| [one click later, wide](2026-10-03-demo-the-proof-above-the-fold-after-opened-wide.png) · [on a phone](2026-10-03-demo-the-proof-above-the-fold-after-opened-phone.png) | **nothing is removed** — the band is back, unchanged |
| [what it took to see a row before](2026-10-03-demo-the-proof-above-the-fold-before-asks-wide.png) | the old rail, scrolled to the last ask |
| [the question, one press later](2026-10-03-demo-the-proof-above-the-fold-held-unchanged.png) | **unchanged, byte for byte** |
| [the payoff, two presses later](2026-10-03-demo-the-proof-above-the-fold-applied-unchanged.png) | **unchanged, byte for byte** |
| [the embed at 348 × 465](2026-10-03-demo-the-proof-above-the-fold-embed-unchanged.png) | **unchanged, byte for byte** |

## What specifically failed, diagnosed before anything was built

Used cold, against a production build of `main`, the arrival screen fails the
fourth of the five ways the brief names — *the interesting part is below the
fold* — and it fails it at the exact point where the surface stops being a
claim and starts being evidence.

It is worth being precise about which part is interesting, because the obvious
answer is wrong. The interesting part is **not** the page changing: an AI
rewriting a page is the least novel thing here and `docs/rollout.md` says so.
The interesting part is that **four asks, computed against this tree under this
policy, divide into two Loom will do on its own and two it will stop and ask
about** — and that a stranger can press one fifteen seconds later and watch it
come true. That is the demonstration. It began four pixels below the screen.

## The change

Three files, and the shape of it is one field.

### `_lib/in-question.ts` — the sentence gets an imperative

`PartInQuestion` gains `invitation`, set on the `ask` moment and on no other.
It comes from a four-string table keyed on the operation, **read on the same
line as the lead**:

```ts
lead: where === "kept" ? KEPT_LEAD : LEADS[operation.op],
where,
...(where === "ask" ? { invitation: INVITATIONS[operation.op] } : {}),
```

That one line is the whole defect-prevention argument. A disclosure has words
on the outside and words on the inside, and the failure nothing would catch is
the two coming to describe different changes — a control reading *Show what
would come off the page* opening onto something being **added**, with every type
satisfied and no test red. Both strings are derived from one operation by one
function, so the only way to cross them is to edit two tables of four lines in
one file, visibly.

Its **absence** is how the other two moments say they are not folded: a
question's excerpt stands open beside the two buttons it is waiting on, and a
kept excerpt is the only place on a wide screen the removed content exists at
all. `globals.css` already argues both; this is the same two decisions carried
in the value.

### `_components/part-in-question.tsx` — two shapes, chosen by that field

An excerpt with an invitation is a `<details>` whose `<summary>` is the
invitation. One without is the `<section>` it has always been.

`<details>` rather than state, and this component has a reason of its own on top
of the ones `technical-detail.tsx` records: it is rendered on the **server**,
through a callback `page.tsx` hands the rail, so a disclosure built out of
`useState` would mean the first thing under the demo's one green button could
not exist until a bundle arrived. The browser supplies the control, the
keyboard, the screen-reader semantics and find-in-page for nothing.

**And the markup got better rather than merely different.** The branch that
left is the one that printed the ask's lead as a `<p>` while the other two
printed an `<h4>` — it existed because the ask panel has no heading for an `h4`
to be a sibling of, so that excerpt had to be the one of the three announcing no
subsection. A `<summary>` announces none either, and it is a control. The two
moments left are the two that are in a card, and both have a sibling to be level
with.

### `globals.css` — a `<details>` lays itself out

`details.demo-part { display: block }` and the 6px the flex `gap` was giving
moves onto the band. A disclosure's contents are a single slot the browser
supplies and hides, and `display: flex` on the element makes that slot a flex
item — which works in the browsers this surface is photographed in and is a
property of their shadow DOM rather than of anything written down.

**Both rules are last in the block**, and that is not tidiness — see *It went
red* below.

### `ask-panel.tsx` — one comment, no markup

`{leading?.part}` is untouched. Its comment's argument for sitting *after* the
reversed opening block rather than inside it survives the fold rather than being
made moot by it, and the surviving version is measured: inside, everything below
the verdict moves down by the control's 21px and its gap, and at 348 × 465 that
is the frame where the whole argument is already fighting for 465 pixels.

## Measured, on the two production builds

Viewport coordinates, from `pnpm shoot`'s `measure`. The selectors are committed
in `2026-10-03-demo-the-proof-above-the-fold.shots.json` beside this report, so
the table re-runs.

**1280 × 900 — the width this surface is judged at. The fold is 900.**

| | before (`main` at `ef48c4d`) | after |
| --- | --- | --- |
| the rail | 857px scroller **holding 1,277** | 857 **holding 935** |
| the count | y 259, 391 × 37 | 259 — unmoved |
| the lead, its promise and its verdict | y 312, 391 × 115 | 312 — unmoved |
| **the excerpt** | y 442, **391 × 358** | y 442, **391 × 16** |
| ask row 1 | y 841 — **4 past the fold** | y **499** |
| ask row 2 | y 908 — 71 past | y 566 |
| ask row 3 | y 975 — 138 past | y 633 |
| ask row 4 | y 1042 — **205 past** | y **700** |
| *or type your own* | y 1149 — 349 past | y 807 — 7 past |
| the one link out, to `/docs` | y 1223 — 401 past | y 881 — 59 past |

**Nothing above the excerpt moved by a pixel**, which is the property that makes
this safe: the claim, the button, the promise and the Gate's verdict are at the
same three coordinates in both builds. What changed is one box going 358 → 16,
and everything under it coming up 342.

**All four rows are now on the first screen**, and so is everything else on the
rail but 59px of its footer.

**390 × 844. The fold is 844.**

| | before | after |
| --- | --- | --- |
| the rail | 1,355 tall — 592 past the fold | **1,013** — 250 past |
| the excerpt | y 540, 358 tall — 54 past | y 540, **16** tall |
| ask row 1 | y 939 — 158 past | y **597** |
| ask row 3 | y 1073 — 308 past | y **731** |
| ask row 4 | y 1156 — 375 past | y 814 — **33 past** |

**Three of the four rows land whole and the fourth's label is on the screen**,
where before not one of them was. The phone is also where the trade is real and
it is stated against itself below.

**348 × 465 — the embed inside the front door, on a phone. Byte-identical.**
`md5 5e8fca8c6c7486f5fb64dbd20fd5dbf2`, the same hash the 2 October run
recorded. Everything that moved was already below that frame's fold: the
excerpt began at y 540 against a 465px viewport. The verdict's third line is
still clipped by **6px** — unchanged, not fixed here, and the reason is the one
the 1 October run gave.

**And the two frames after a press are byte-identical too.** The question
(`79cae639175ffc88a14d8c04a2f22cbe`) is the hash the 1 and 2 October runs both
recorded — now across **five** separately built commits. The payoff card after
applying matches its own `before` exactly, which is the first time this lane has
been able to say that: the rail above it stopped being taller than its scroller,
so there is no scroll clamp left to differ by a pixel.

## What it costs, stated against itself

**A stranger loses the free preview of what the green button names.** They keep
the button's label, `presets.ts`' own promise — *the appointments, the years and
the waiting time come off the page* — and the Gate's computed verdict under it,
all three above the fold at both sizes, and the band is one press of a native
control away with no script. That is the maintainer's direction applied exactly:
*plain language is the default, the technical record is one click away, nothing
is ever removed.* A rendering of a part of somebody else's page is the second
category.

**On a phone the cost is largest and it was smaller than this lane assumed.**
The finding that asked for this guessed the excerpt was *the only thing on the
first screen that looks like the page*, and argued for a disclosure open below
`lg` and shut above it. Measured, what the phone actually had was the **top
304px of a 358px band** — the harness reports it 54 past the fold — and not one
of the four rows. It now has three rows whole. The honest residue is that a
phone visitor who presses for the band gets it, and that the band it is a
rendering of is four thousand pixels down the stage.

**The layout-conditional default was refused, and the reason is worth keeping.**
CSS cannot set `open`. So *open below `lg`, shut above* is either a `matchMedia`
read at mount — which this surface has refused in writing, because a media query
is right between a resize and a re-render and a mount-time read is not — or a
second copy of the excerpt in the document, on the one surface whose claim is
that no second copy of this page exists anywhere. Neither is worth it for a
default the measurement says is not needed.

## What was measured, and with what

**This is the first run in this lane to measure with the harness instead of a
script it then deleted.** `pnpm shoot` takes `measure` on a shot — a list of
selectors, a printed line per match with `x y w×h`, `holding N in M` for a
scroller and `← N past the fold` against that shot's own viewport. It shipped on
2 October as [0213](../decisions/0213-the-harness-reads-a-box-it-prints-the-number-and-the-judgement-stays-in-the-report.md),
closing an entry this lane had filed and appended to across five consecutive
runs.

**It was reached for second**, and that is a finding rather than an apology:
`docs/routines.md` is *read first, every run* and its screenshot recipe does not
contain the word `measure`. This run wrote the sixth private `playwright-core`
script, drove the page, read `getBoundingClientRect` in an `evaluate`, and found
the instrument afterwards by reading the finding that asked for it. About twenty
minutes. The script is deleted and the selectors are committed instead.

**Every `after` picture here is byte-identical to a fresh shot taken from the
final committed build**, re-run after the gate went green on the head commit:
all seven `md5`s match. They are pictures of the code in this pull request and
not of an intermediate one. The shot list is committed beside this report.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | `main` at `ef48c4d` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 177 files / 3,699 | **177 / 3,699** — `src/` untouched |
| `@loom/app` (`apps/loom/`) | 374 / 6,662, 0 skipped | **374 / 6,674**, 0 skipped |
| the demo lane, measured | **740** in 49 files | **752** in 49 files |
| findings | 978 | **981**, 0 malformed — three filed, one closed |

**+12 lane tests, all written**: four in `in-question.test.ts`, five in
`part-in-question.test.tsx`, three in `globals.test.ts`. Both totals moved by
exactly 12, so none of it is a file-driven sweep — no test file was added, and
every test was written. One existing test was rewritten and
one gained two assertions, because their subject changed; nothing was weakened,
skipped or deleted. 124
prerendered pages, 1,470 text junctions, 0 run together.

**The test that earns its place over the others** is *keeps the band in the
document, byte for byte, behind the control*. Every other assertion here is
about pixels reclaimed, and the one thing that must not be true of a surface
whose argument is that the record is complete is that folding quietly became
hiding. It asserts the band is in the document, with the clinic's own figures in
it, and that it is word-for-word the band the question's excerpt draws — because
it is the same band, one tree rendered twice. Its sibling in `globals.test.ts`
sweeps every `display: none` in the stylesheet for the same reason, and that
test's own comment is now stronger than it was: a `display: none` reaching this
excerpt would no longer hide a preview, it would leave a control offering to
show the page and opening onto nothing.

### It went red, and the way it did is in the stylesheet now

Two tests failed on the first run, both in `globals.test.ts`, both under names
that had nothing to do with what was wrong: *gives an ask's preview a taller
window than a question's*, and *clips the band to a window, fades the cut, and
makes none of it pressable*. The second reported `expected '\n margin-top: 6px;\n'
to contain 'overflow: hidden'`.

`globals.test.ts` reads a rule by name with a regex that takes the **first**
match in the file — and `details.demo-part > .demo-part-stage {` contains
`.demo-part-stage {`. The new rules had been written above the ones they
override, so two assertions about the preview's window were silently reading the
disclosure's spacing. The remedy is placement, both rules last in the block, and
the ordering is **asserted** now rather than remembered, because the symptom
points at the wrong file: the red tests are about the window and the edit is
twenty lines away.

### The defect matrix

Each defect restored in turn **against the commit**, the demo lane run against
it, and the lane restored from `HEAD` between rows — safe only because the unit
was committed first, which is this lane's own finding of 1 October being obeyed
rather than rediscovered. Baseline **752 passed**.

| defect restored | caught |
| --- | --- |
| the excerpt is never folded — `invitation` is set on no moment | **10** |
| every moment is folded, so a question hides the band it waits on | **7** |
| the disclosure's rules move above the ones they override | **4** |
| the two tables are crossed, so the control names the wrong change | **3** |
| the band is not in the document until the fold is opened | **2** |
| the ask's excerpt takes the question's modifier and is hidden at 1280 | **2** |
| the disclosure keeps the shared flex layout | **2** |
| the band loses the space the flex gap was giving it | **2** |
| the disclosure arrives open, so it reclaims nothing | **1** |
| the lead is printed inside the fold as well as on the control | **1** |
| the group is on the summary, so the chevron never turns | **1** |
| the reduced-motion rule is written inside a layer, so the utility wins | **1** |
| the reduced-motion rule names the chevron and not the label | **1** |

**Thirteen of thirteen**, and the two the matrix was really built for are the fourth
and the fifth. *The two tables are crossed* is the failure the whole shape of
this change exists to make unreachable — a control naming a different change
from the thing behind it, with every type satisfied — and it is caught by the
assertion that holds the pair as a pair rather than against four literals, which
would have passed just as happily with the tables swapped. *The band is not in
the document* is the one that would have been a lie rather than a bug: pixels
reclaimed, every picture better, and *nothing is removed* quietly false.

## And one thing the instrument found that nobody was looking for

**Two shots of the opened excerpt, from two separately started servers on the
same build, came back with different bytes.** At 1280 × 900 the difference was a
435 × 21 region — the summary's own text. At 390 × 844 it was a 13 × 14 box —
the chevron. Both were captured part-way through a 150ms transition.

`pnpm shoot` photographs every page with **reduced motion already requested**,
so a page honouring that request could not have produced two different pictures.
The flake was the symptom and the product was the defect: this stylesheet's
`prefers-reduced-motion` rule names `.loom-reach` and nothing else, so a visitor
who has asked their system for less motion was getting a rotating arrow and a
fading label from four controls whose whole job is to be instantaneous — the
three disclosures the rail already had, and the one this run made.

Four lines, unlayered, because the transitions come from Tailwind utilities and
Tailwind orders its layers `theme, base, components, utilities`: the same rule
written inside `@layer components` loses to the thing it is turning off and goes
on animating with every test green. That is the twelfth row of the matrix below,
and it was **caught by nothing** on the first attempt — the assertion checked
brace *lines* rather than brace *balance*, which is a check that passes on a
layered rule. It is balance now and it catches it.

With the rule in, the same two shots from two separately started servers are
byte-identical, and so are the other five frames.

## Decisions taken that were not specified

- **One disclosure, shut at every width.** The alternative the finding floated
  is unwritable and the measurement says unnecessary; both arguments are above.
- **The invitation is derived, not typed.** A hand-written summary beside a
  computed lead is the drift `WEIGHED_QUESTIONS` was made a shared constant to
  prevent one surface up, and the matrix's fourth row is what it costs.
- **The summary is sentence case while the two disclosures lower down are
  uppercase mono.** Deliberate: those two name parts of *this surface* — *or
  type your own*, *what happens when you ask* — and this one is a sentence about
  **the clinic's page**, sitting among the promise and the verdict, which are
  sentences in the same register at the same size. The mono uppercase on this
  rail means *a label on the instrument*.
- **The reduced-motion rule was taken rather than filed**, although it reaches
  the two disclosures this unit does not otherwise touch. It is four lines of
  this lane's own stylesheet, it is the fix for a defect the run's own pictures
  proved, and a `wait` step in the shot list would have hidden it instead.
- **The chevron is a third copy and was not extracted.** Filed instead; the unit
  is about what a stranger sees, and the extraction opens two files it has no
  other reason to touch.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `git diff origin/main --name-only` outside those
  three is empty.

## What was left out

**The folded reasoning on an answered card is still labelled in the present
tense** — this lane's open finding of 30 September, carried a third run. It is a
copy decision about the payoff card and folding it into a unit about the arrival
screen would make both harder to review.

**The lead press still does not move the page.** Filed today as this lane's open
design question, with the one thing this run changed about it: two asks marked
*GOES AHEAD* — a one-press change, needing no answer — are now on the arrival
screen at 1280 × 900 for the first time.

## Findings

**Filed three, closed one, appended none.**

- **Closed**: this lane's 1 October entry *the demo's first screen spends 42% of
  itself on a still life*. Its 2 October note moved the recommendation to (2),
  fold the excerpt, and (2) is what was built. The closing note carries the
  measured table and the reason the layout-conditional default was refused.
- **Filed**, for `Loom daily build` (`docs/routines.md`): `measure` shipped on a
  shot three days ago and the recipe every routine reads first does not mention
  it, so this run wrote the sixth private script before finding it. Four
  sentences in a section that already exists, and it closes a pattern this file
  has recorded five times. With one line beside it: the image already ships
  `playwright-core` at `/opt/node-tools/node_modules`, so the documented
  `npm install` step can be skipped.
- **Filed**, for this lane: the demo's one invited press still does not move the
  page, and for the first time the press that does is on the arrival screen.
  Three shapes, recommendation (1), and the measurement that would settle it is
  the one a sandbox cannot take.
- **Filed**, for this lane: the same disclosure chevron is now drawn in three
  components of one directory and the third copy is this run's.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **thirty-fifth**
consecutive run, one call. `*.vercel.app` denied from the sandbox
(`Loom portal`, 27 September) — the preview URL is on the pull request and the
pictures are from a local production build.

## Open questions

**One, and it has a recommendation.** Whether the demo's one invited press
should be a change that goes ahead rather than one the Gate holds. It is in
`FINDINGS.md` and in the comment on the pull request.
