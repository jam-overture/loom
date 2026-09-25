# The frame the press produces belongs to the question

**Routine:** `Loom demo` · **Branch:** `demo-28-the-frame-the-press-produces` ·
**25 September 2026**

**Pull request:** #394 · **Deployed preview:** added to the pull request body
once Vercel reports it (`*.vercel.app` is off this sandbox's egress allowlist —
the standing 19 August limit — so it cannot be verified from here).

Every picture below is a production `next build` of a real commit — `main`'s
`d82dcac` for the *before*, this branch's for the *after* — served with
`next start` and photographed with `pnpm shoot` at 1280×900 and 390×844.

The twenty-eighth run of this lane, and it closes the finding the
twenty-seventh filed by **changing nothing about the thing the finding was
about**.

---

## What a stranger could not understand before this run

**That the press worked.**

The demo invites exactly one press — *Take the numbers off*, the green button,
the change the Gate holds, which is the whole argument. I did what the brief
asks and pressed it as a stranger would, against a real build of `main`, and
measured what arrived:

| the frame the one invited press produces | 1280 × 900 | 390 × 844 |
| --- | --- | --- |
| the card the press produced — the question | top **397** | top **112** |
| above it, pinned, in amber | the caution, **103px** | the caution, **cut to 40px** |
| ask controls on screen | two — and the nearest of them **entirely behind the caution** | **none at all** |
| first words read, top-left of the rail | *“One question is still waiting on you…”* | *“…so that question would be set aside.”*, its first line **sliced through the middle** |

So: a stranger presses the one green button on the screen, everything works,
and the loudest thing that appears is an amber warning about a mistake they
have not made — read *before* the question it refers to, so the sentence
cannot mean anything yet. On a phone it is not even a whole sentence. It is the
tail of one, severed mid-glyph, with no control anywhere on the screen that it
could be about.

Both halves of that were filed on 24 September by this lane. What the finding
did not have, and what a ruler supplied, is the cause.

## The cause, which is in neither of the two files that look wrong

Two decisions, in two files, each defensible on its own, are one decision:

- `AnswerInView` carried the new card into view with **`block: "nearest"`** —
  the minimum movement — argued on the grounds that a visitor who has just
  pressed something should see the consequence arrive under their cursor.
- `record-card.tsx` carried **`scroll-mt-28`**, seven rem of clearance, so the
  card would not land *underneath* the caution that `AskPanel` pins to the top
  of the rail while a question is open.

The minimum movement is the movement that leaves the ask panel in the scroller.
The caution pins itself to the top of whatever is left there. So the clearance
was not protecting the card from the strip — **it was the reason there was a
strip to be protected from**, and on a phone the 112px it reserved is precisely
the band the severed sentence was drawn in.

Neither file was wrong about itself. Nothing could have caught it, because the
two facts lived apart and the defect is only in their product.

## What a stranger can understand now

**That the press worked, and what it produced.**

The card lands at the top of its scroller, which leaves the panel — and with it
the caution — behind. The arrival frame is the question and nothing else:

> **Waiting on you** · *“Take the numbers band off the page.”* · Loom will not
> make this change until you say yes. · **What Loom weighed:** how much damage
> could this do — *Some risk*; can it be taken back — *Yes*. · This comes off
> the page, and everything under it goes too: *“3,400” “24” “92%”* ·
> **Apply this change** · No thanks · › Show the full record

…beside the page it is about, with the amber ring on the numbers band and the
chip reading **This would be removed**. The change and the record of it, side by
side, with nothing else competing.

| | before — `main` | after — this branch |
| --- | --- | --- |
| the frame the press produces, wide | [1280 × 900](2026-09-25-demo-the-frame-the-press-produces-before-wide.png) | [the same frame](2026-09-25-demo-the-frame-the-press-produces-after-wide.png) |
| the same on a phone | [390 × 844](2026-09-25-demo-the-frame-the-press-produces-before-phone.png) | [the same frame](2026-09-25-demo-the-frame-the-press-produces-after-phone.png) |

Measured on the same builds:

| | before | after |
| --- | --- | --- |
| **1280 × 900** — card | top 397 | top **44**, flush under the bar |
| **1280 × 900** — caution | pinned, 44–147 | **off screen**, −132 to −29 |
| **1280 × 900** — *Apply this change* | y 814 | y **461** |
| **390 × 844** — card | top 112, bottom 889 (**past the fold**) | top **0**, bottom 777 |
| **390 × 844** — caution | on screen, clipped to 40px | **off screen**, −167 to −72 |
| **390 × 844** — *Apply this change* | y 803, 11px of clear space under it | y **691**, and the whole card fits |

The phone row is the one I would point at: **the entire question — badge,
utterance, the two things the Gate weighed, what comes off the page, and both
buttons — is now on one phone screen.** Before, the frame opened on a broken
sentence and closed with *Apply this change* eleven pixels off the bottom edge.

### And nothing was lost

The obvious objection to taking the caution off that frame is that it was put
there for a measured reason: on 23 September this lane proved that a stranger
does press a second ask before answering the first, and that without a warning
the question dies silently. **That warning is untouched — not one character, not
one class.** What changed is where the press leaves the visitor, and the caution
was always welded to the controls rather than to the press:

[The same visitor, scrolled back to the controls](2026-09-25-demo-the-frame-the-press-produces-after-controls.png) —
the caution pinned at the top of the rail at 44–147, in amber, with the four
asks it is about beginning at 103 directly under it, and the question below.

Verified on the production build at both sizes, at every scroll position I could
reach: **with any ask control on screen the caution is on screen too, and with
the card at the top of the rail neither is.** Every property the 23 September
unit was measured for — on screen, above the controls, amber, before the press —
holds. What it has stopped doing is greeting a visitor who has done nothing
wrong.

[The payoff frame, still intact](2026-09-25-demo-the-frame-the-press-produces-after-applied.png) —
press *Apply this change* and the sixty seconds end with the green bar in the
gap reading **Something was removed here: “3,400” “24” “92%”**, and the card at
the top of the rail saying *You said yes. Loom held this change until you
answered. Without that, nothing on the page would have moved.* That is the 24
September unit, unharmed and now arriving at the top of the rail rather than
under a warning.

## The change

Four files, and the unit is one claim: **where the card lands and how much room
it leaves above itself are one decision, so they live in one place.**

### `_lib/arrival.ts` — new, and it is the whole unit

Two exports and the measurement that ties them.

- **`ANSWER_ARRIVES`** — `"start"`. Where `AnswerInView` carries the waiting
  card.
- **`clearanceFor(block)`** — `""` for `start`, `"scroll-mt-28"` for anything
  else. A card carried to the top of its scroller has left the panel behind, so
  nothing can be pinned over it and nothing has to be left room for. A card that
  stops short has the panel above it, the caution pins to the scroller's top
  edge, and then the clearance is not optional.

Both halves read from here. A later run that reaches for the smaller movement
gets the clearance back **in the same edit**, rather than discovering it in a
screenshot three weeks later — which is exactly how this one was discovered.

### `answer-in-view.tsx` — one word, and the argument it retires

`block: ANSWER_ARRIVES`. The trade `nearest` was argued on is not a trade: *a
visitor should see the consequence arrive under their cursor rather than have
the panel they were reading thrown across the rail* — except that **the panel
they were reading does not survive the press.** The green button is withdrawn
while a question is open (`AskPanel`) and the preset leaves the list
(`already-asked.ts`). The minimum movement was preserving continuity with a
panel that is no longer there.

### `record-card.tsx` — the clearance, read rather than held

`clearanceFor(ANSWER_ARRIVES)`, joined into the class list, which today
contributes nothing. The comment that argued for `scroll-mt-28` is kept and
answered rather than deleted: it was right about the mechanism and wrong about
the direction.

### `ask-panel.tsx` — comments only, and one of them was a false measurement

The block arguing the sticky strip said `block: "nearest"` was *“the right
rule”* and described the frame it produced as one with four live buttons on it.
Both were measured and both are wrong: at 1280×900 the nearest ask is entirely
behind the strip and at 390×844 there is no ask on the screen at all. The
comment now carries the numbers and points at `arrival.ts`. The strip's own
markup is unchanged.

### What was not changed

The caution's words, tone, placement, stickiness and offsets. `set-aside.ts`.
The withdrawal of the green button and of the asked-for preset. The marks, the
spotlight budget, the record, the disclosure. The maintainer's direction holds
in both halves: the plain language is untouched and the technical record is
exactly as complete as it was — what moved is which of them a stranger meets
first.

## Decisions taken that were not specified

- **The card goes to the top rather than the caution being hidden.** The
  finding offered two shapes — hold the caution until the controls are in view,
  or until a second press is attempted. Both are machinery: an observer, a
  hidden state, an accessibility trade about a warning that is in the document
  but not on the screen, and a reveal that either shifts the layout under a
  moving cursor or reserves a blank band for itself. Moving the card needs none
  of it, because the caution is *already* conditional on the panel being in the
  scroller. This is the same fix the finding asked for, made by the shorter
  route.
- **`start` rather than a computed scrollTop.** `scrollIntoView` honours the
  card's own scroll margin in both scrollers and on both layouts, which is what
  keeps the fragment (**Answer it first ↓**) and the automatic scroll reading
  one property instead of two.
- **`clearanceFor` returns a class string rather than a boolean.** The card
  should not have to know *what* the clearance is, only that it is not its call.
  A boolean would leave `scroll-mt-28` written in the card, which is the half of
  the coupling that drifted.
- **The old clearance is preserved for every other landing** rather than
  deleted. It was correct for `nearest`; it is dead code only for as long as the
  landing stays `start`, and the test that asserts it is what brings it back.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated, nothing left out.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run and not off
a pipe (`VERIFY_EXIT=0`), on a clean tree at this branch's head.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 160 | 3,073 |
| `@loom/app` | 310 | 5,914 |

802 findings, 0 malformed · 112 prerendered pages, 1,285 junctions, 0 run
together · `pnpm shoot`: 1280 vs 1280 on every wide shot, 390 vs 390 on the
phone, exit 0, no overflow.

The demo lane's own suite goes from **570** to **580** — **ten added, none
weakened, none skipped.**

**One existing assertion changed meaning, and it is the unit.**
`record-card.test.tsx`'s *“leaves room for what the rail pins above it”* asserted
`scroll-mt-28` on the card. It now asserts that the card carries **no** scroll
margin *and* that `clearanceFor(ANSWER_ARRIVES)` is empty — so the claim is no
longer a constant but the pairing, and the sibling test asserts the clearance
comes straight back for any other landing. `answer-in-view.test.tsx`'s two
`block: "nearest"` expectations became `ANSWER_ARRIVES`, with one keeping the
literal `"start"` beside it so the constant cannot be quietly changed to satisfy
its own test.

### The defect matrix

Each defect restored in turn against the commit, the three files run together,
the tree returned between rows. Baseline **83 passed**.

| defect restored | caught |
| --- | --- |
| `ANSWER_ARRIVES` goes back to `nearest` — the card stops short again | **3 tests** |
| `clearanceFor` never reserves anything, whatever the landing | **7 tests** |
| the card hard-codes `scroll-mt-28` again instead of reading the pairing | **1 test** |
| `AnswerInView` hard-codes its own block and ignores the shared decision | **2 tests** |

Four rows, four caught. The second is the one that matters most: it is the state
this lane would be in if a later run "tidied away" a clearance that looks like
dead code, and it would put the card back behind the strip the moment anybody
touched the landing.

**What this suite still cannot do**, said plainly: every claim in the tables
above is a scroll position in a real browser, and no `vitest` run can see one.
The tests guard the two values and their pairing. The pictures are the argument.

## Findings

**Filed one, closed one.**

- **Closed** — `Loom demo`, 24 September: *the first correct press a stranger
  makes is answered with a warning, in the loudest position on the rail.* Closed
  by this branch, and the entry records that **the caution itself did not
  change**, which is the outcome the finding predicted was possible and asked
  for.
- **Filed** — `Loom daily build`: *a shot list can press and wait and cannot
  scroll*, so a lane that pins something to a scroller can photograph the state
  a press lands on and not the state a visitor scrolls to. One of the five
  pictures here — the one that answers the obvious objection, showing the
  caution still above its controls — was taken by a scratch Playwright driver
  rather than by `pnpm shoot`, which
  [0116](../decisions/0116-a-screenshot-is-taken-by-the-repository-and-playwright-is-never-a-dependency.md)
  exists to keep from becoming normal. It is the second finding of this shape;
  the 17 September one asks for the state the browser holds *before* the load,
  this one for the state a visitor reaches *after* it, and both are one field on
  a shot.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, a **twenty-seventh**
consecutive run, one call. What decided this unit was not a reference gallery: it
was pressing the one button the demo invites and measuring, in pixels, what came
back.

## Open questions

Nothing blocking.

- **The two scrollers no longer agree about height, and I do not think they
  should be made to.** On a wide screen the stage scrolls to the ringed band
  (`SpotlightScroll`) and the rail now scrolls to the top of the card, so the
  ring sits around y 400 while the card starts at 44. Both are fully in the
  frame and each is where its own half wants it; an alignment rule between two
  independent scrollers would be a third opinion about scrolling, and this
  surface already had trouble with the second. Raising it because the next run
  will see it in a screenshot and wonder.
- **The embed.** At 348 × 465 — the demonstration inside the front door's embed
  on a phone — the card also lands flush at the top, so the badge and the
  utterance are the first things in the box. *Apply this change* is at 742 in a
  465px frame, which is a scroll away, and was before this change too: the card
  is 828px tall there. Nothing in this run makes it worse and nothing in it
  makes it better; it is the next thing I would measure.
- **The caution covers the two asks nearest it when the list is pinned under
  it.** Expected of any sticky header over an opaque bar, and the buttons are
  hidden rather than half-pressable, so it reads as content passing underneath.
  Recorded rather than filed.
