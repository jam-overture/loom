# On a phone, the demo ended four thousand pixels away from its own argument

**Routine:** `Loom demo` · **Branch:** `demo-08-the-way-back-to-the-record` · **9 September 2026**

The eighth run of this routine, and the first in thirteen days. The seven before it
fixed where the demo lives, how its controls are ranked, whose page is on the
stage, which change the primary button asks for, what the record says once you
have answered, what the undo promises, and where the mark lands. On a wide screen
that sequence is now whole and it reads.

This run is about the fact that **none of it survives on a phone**, and that the
defect is invisible from a laptop because the two layouts have different
scrollers.

---

## What a stranger could not understand before this run

I drove the built page in Chromium at 1440×900 and 390×844, as somebody who had
never heard of Loom, pressing what the rail puts first. The wide run went exactly
as the last seven reports say it does. Then the same script at 390×844.

Press **Take the numbers off**. The rail scrolls its card into view, the Gate's
question arrives, you press **Apply this change**. The numbers go, the page
carries you to where they were — and this is the frame you are left in:

> A green chip reading **Something was removed here**, above a patient's
> testimonial, on a physiotherapy clinic's page. Nothing else.

Measured: the record card is at **y ≈ −4,281**. The badge that says *Applied*, the
sentence saying *you* allowed it, the rule that held it, the disclosure with the
whole record in it, and **Put it back** — all of it is a screen-and-a-half of
somebody else's page above the visitor, with nothing on screen saying it is there.

So the sixty seconds on the viewport most cold links are opened on ended like
this:

> Land. Read three sentences. Press the green button. Answer the question. Watch
> some numbers disappear. Leave, having seen **an AI change a page** — which is
> the one claim `docs/rollout.md` names as the least novel thing here and the
> thing everybody else already shows.

The record — the entire differentiator, the reason this surface is not a party
trick — was rendered, correct, complete, and off the screen.

### Why no test could have caught it, and why the wide screen hid it

This is the lane's standing diagnosis, four for four before today and now five:
*this surface's failures are not broken machinery; they are machinery that does
not reach the screen, or reaches it in a voice that belongs somewhere else.*

Every part was right. `SpotlightScroll` carries the visitor to an applied change,
and its own module comment argues correctly that a *held* one must not move a
stacked layout because the answer is a button in the rail. `AnswerInView` moves
the rail to the question, and argues correctly that the two never act at once.
Both are true. Neither is about **coming back**, and on a wide screen coming back
is not a thing that exists: the rail is its own scroller, the card does not move
when the stage does, and the two halves of the screen are visible at once by
construction.

Stacked, they are one document. Every opinion this surface has about scrolling is
an opinion about *going*, and the return trip is four thousand pixels the visitor
has to make by hand without being told there is anything at the other end.

## What a stranger can understand now

The same press, on this branch, at 390×844:

> The numbers go, the page carries you to the gap they left, and a dark bar
> arrives at the foot of the screen with a green dot on it:
> **Loom wrote down what it just did. · Show the record ↑**
>
> Press it and you are at the top of the card: *Applied · "Take the numbers band
> off the page." · You said yes. Loom held this change until you answered.
> Without that, nothing on the page would have moved.* · **Put it back**.

And the state before it, which had the same hole in a quieter form. A visitor who
scrolls down to look at the amber ring around the numbers — which is the obvious
thing to do when the rail has just told them *the page is marked where this would
happen* — has scrolled away from the only two buttons that can answer the
question. The bar there reads **Loom is waiting for your answer. · Answer it ↑**,
in amber, and takes them back to the two buttons.

The dot is the same colour as the ring on the band and the badge on the card,
which is this surface's one teaching device and costs nothing to keep using.

## The changes

### `_lib/reach.ts` — two sentences, and why there are exactly two

A mark has exactly two tones (`SpotTone`), so a way back has exactly two things to
say. Both are written to the rule the rest of this surface follows — plain first,
the record one click away — which here means the sentence never describes what the
record *contains*. It says what Loom did, or what Loom is waiting for, and the
button beside it is the click.

`said` is deliberately about **Loom** rather than about the page. A visitor
looking at a green chip already knows the page changed; what they cannot see from
where they are standing is that something wrote it down.

The held sentence is the louder of the two and the only one that is a question,
because a held change is the state this surface cannot proceed from.

### `demo/_components/back-to-the-record.tsx` — an offer, not a third opinion about scrolling

It watches one thing: whether the card it points at is on the screen. That is an
**observation rather than an inference** — the alternative is guessing from a
scroll position how far the visitor has gone, which is wrong the moment the rail's
height changes — and it means scrolling back by hand dismisses the bar without it
having to be told.

It moves nothing on its own. The demo has two opinions about scrolling already and
this is not a third; it appears, it offers, and it goes away.

Three decisions in it worth naming:

- **`start` rather than `nearest`** on the return. The card is what was asked for
  and the top of it is where the account begins; `nearest` stops as soon as the
  card's last line clears the fold, which on an applied card is **Put it back**
  with nothing above it explaining what would be put back.
- **No `IntersectionObserver`, no bar.** Every state it offers a way back to is
  still reachable by scrolling, which is what a visitor on such a browser does
  today. A degraded bar would be worse than none.
- **No card in the document, no observation and no throw.** The bar simply never
  has anything to offer.

### `globals.css` — the two rules a utility class cannot carry

**Hidden above 1024px, in the stylesheet.** The wide layout gives the rail its own
scroller, so the card never leaves the screen and a bar offering to show it would
be the surface talking for its own sake. This is in CSS rather than a `matchMedia`
read at mount deliberately: a media query is right between a resize and a
re-render and a mount-time read is not, on the one surface whose whole job is a
first impression on a viewport nobody controls.

**`visibility` rather than a conditional render.** It lets the bar leave the way it
arrived, and — the half that matters more — it keeps the bar out of the tab order
while it is gone. A bar sitting at opacity zero over the page would still be the
next thing a keyboard visitor reached.

`globals.test.ts` holds both, because a stylesheet is the one part of this
application nothing else can check.

## Decisions taken that were not specified

- **The bar overlays the last ~60px of the specimen page** when a visitor reads
  all the way to the bottom. The alternatives are worse: padding the document
  while the bar is up shifts the page under somebody who is reading it, and a
  dismiss control adds a second thing to press on a surface whose whole problem
  was too many. It is an offer that disappears the moment it is taken or the
  record comes back into view. Left as it is, and said here rather than left to be
  found.
- **It points at whichever change the page is currently about** — `spotlitChange`,
  which already prefers a held change over an applied one. That is the right
  preference here too: a question the visitor has not answered outranks a receipt.
- **The wide layout was not touched at all**, and the screenshot is in the visuals
  to show it. The bar is rendered into the tree there and `display: none` removes
  it; nothing about the rail, the stage, the scroll or a word of copy moved.
- **No decision record.** Nothing here touches the tree schema, the delta model or
  an `Accepted` record. It is a way back to a card that was always being rendered.
  Nothing was escalated and nothing was left out for review.
- **No file outside `apps/loom/app/(demo)/` was opened for writing.** `src/` was
  not opened at all. No framework gap was found and no primitive was wanted — this
  is chrome, and the demo's chrome is this lane's.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, first attempt.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 |
| `@loom/app` | 160 | 2512 |

Nothing failed, nothing was skipped, no test was weakened. **Fifteen tests are
new**:

- **`_lib/reach.test.ts`, four**, in the node suite. That every tone a mark can
  carry has a sentence and a verb — a tone added to `SpotTone` with no entry would
  carry a visitor away from the record and leave them there, and nothing else in
  this repository would notice. That neither sentence uses one of the runtime's
  words, which matters more here than anywhere else on the surface because this is
  the one line with no disclosure under it and no click between the visitor and
  it. That the held state asks rather than reports. That the two moments do not
  arrive wearing the same sentence.
- **`_components/back-to-the-record.test.tsx`, nine**, in the dom suite, with
  `IntersectionObserver`, `matchMedia` and `scrollIntoView` all stubbed because
  jsdom implements none of them and each carries a decision. It appears only once
  the card has actually left the screen; it goes away again when the visitor
  scrolls back by hand; it watches the card it offers to return to and nothing
  else; it stops watching when the change is gone; it lands on the *top* of the
  record and animates unless motion is unwelcome; it says the right one of the two
  things in the right colour; and it breaks nothing when there is no card.
- **`globals.test.ts`, two.** The wide-screen exemption, and the tab order.

## Findings

**Filed:**

- `@jonathanbravecredit`: **`21st.dev` is still `EGRESS_BLOCKED`**, verified an
  eighth time from this lane. As on 27 August, it cost this run nothing: what
  decided the bar's copy, colour and position was driving the built page at
  390×844 and looking at what was on the screen, which no reference gallery can
  answer.
- `@jonathanbravecredit`: **the brief still opens with a task that landed on
  21 August** — the move to `/demo` — fifth consecutive run.
- `Loom daily build` / `@jonathanbravecredit`: **`docs/rollout.md` still says the
  demo is live at `apps/loom/app/(portal)/portal/demo`**, and Phase 0 is described
  against a path that has been a 308 redirect for nineteen days. It is one of the
  two documents every routine is told to read first, so a fresh session reading it
  is told the wrong location for this lane's own surface.
- `Loom demo` → itself: **the return trip is not a scroll opinion**, recorded so
  the next run has the shape rather than the idea. Every scroll component on this
  surface argues about *going*; two of them argue correctly and neither is wrong.
  What was missing was that a stacked layout has one scroller, so *going* to one
  half of the screen is *leaving* the other, and the second half of that sentence
  had never been written down.

**Closed:** nothing. The two open findings owned by this lane are unchanged by
this run and both are still the right size for a unit of their own — the scope
control ("ask about just this", 22 August) and the ring that still encircles a
band that did not change for a `near` mark (27 August).

## The one thing I did not fix, said plainly

**A visitor on a phone still answers the Gate's question without ever having seen
the band it is about.** On a stacked layout `SpotlightScroll` deliberately does
not carry them to a held change — correctly, because it would carry them away from
the two buttons — so the amber ring around the numbers is three thousand pixels
below the question about it. This branch gives them a way *back* from the mark;
it does not put the mark in front of them in the first place. That is a second
claim about what a stacked layout owes a visitor and it belongs in its own unit,
with its own screenshot.

## Open questions

Nothing blocking. Two carried, unchanged by this run:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **"Ask about just this"** — the scope control, reasoned out in this lane's
  22 August finding.

## The visuals

| | |
| --- | --- |
| [before](2026-09-09-demo-the-way-back-to-the-record-before.png) | `main`, 390×844, two seconds after **Apply this change**: a chip, a testimonial, and no record anywhere |
| [after](2026-09-09-demo-the-way-back-to-the-record-after.png) | the same press, same viewport, same scroll, on this branch |
| [waiting](2026-09-09-demo-the-way-back-to-the-record-waiting.png) | the held state, after a visitor scrolls down to look at the mark themselves |
| [record](2026-09-09-demo-the-way-back-to-the-record-record.png) | where **Show the record** lands: the top of the card, not its last line |
| [wide](2026-09-09-demo-the-way-back-to-the-record-wide.png) | 1440×900 on this branch — the bar is in the tree and `display: none`, and nothing about the wide layout moved |

Every pair is the same script driven against two `next build` outputs — this
branch's and `main`'s — so the only difference in the frame is the change. Not the
preview, which this environment cannot open (`vercel.app` is not on the sandbox's
egress allowlist; the standing 19 August finding).

**To see it yourself:** open `/demo` on a phone, or at 390×844 in a desktop
browser's device mode. Press the green button, press **Apply this change**, and
look at the bottom of the screen when the page stops moving. Then press
**Show the record**. For the amber half, press the green button and scroll down
the clinic's page instead of answering.
