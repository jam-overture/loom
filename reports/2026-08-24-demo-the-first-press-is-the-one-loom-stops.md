# The first press is the one Loom stops

**Routine:** `Loom demo` · **Branch:** `demo-04-the-first-press-is-the-one-loom-stops` · **24 August 2026**

The fourth run of this routine. The first three fixed where the demo lives, how
its controls are ranked, and whose page is on the stage. This one is about the
single control all three of them left alone: **which change the primary button
actually asks for.**

---

## What a stranger could not understand before this run

I used it as somebody who had never heard of Loom, at 1440×900, 1440×800 and
390×844, and this time the failure is not in the copy, the specimen or the
layout. All three are good. It is one line of configuration, and it cost the
demo its whole argument.

Here is the sixty seconds as it actually ran on `main` this morning:

> Land. Read the bar — *someone else's page, a clinic that doesn't exist.* Read
> the heading — *Ask that page for a change.* Press the one big green button,
> because it is the one big green button. **Re-theme the whole page.** The page
> turns over. A card appears saying it was applied, at revision 1, with an undo.
> Leave.

That visitor has seen *an AI changed a page and you can undo it* — which
`docs/rollout.md` names as the least novel thing here and the thing everybody
else already shows. **They never met the Gate.** They were never told Loom can
decline to act. Nothing was ever at stake, so the record had nothing to be for.

### Why, and it is two files that are each individually right

`session.ts` sets a policy stricter than the shipped default, deliberately, and
says exactly why:

> `user-instruction` may auto-apply `low` here rather than `medium`, which is
> what makes the Gate visible: **a re-theme lands on its own**, and anything
> that restructures the page waits for the visitor to answer it. Under the
> shipped default every one of the demo's changes would auto-apply and the hold
> — the most interesting thing the runtime does — would never appear on screen.

`ask-panel.tsx` names the re-theme as the one thing to press first, and its
reason was also right when it was written:

> it is the only preset whose effect is visible everywhere at once, so it is the
> one that answers "did something happen?" from across a room.

Put those side by side. **A policy was tuned to make the hold visible, and then
the one control the surface was designed to be pressed first was set to the only
preset that policy is guaranteed to let straight through.** The Gate was three
clicks away, behind the third item in a secondary list of four, reached only by
a visitor who kept playing after the payoff.

Neither file was wrong on its own, which is why it survived three runs of people
looking hard at this surface — including mine, twice, before I put the two
files on the same screen. The ranking was reviewed as a ranking question and the
policy as a policy question, and nothing in either review had to ask what the
*first press* demonstrates.

### And a second failure the first one was hiding

Fixing the ranking exposed it immediately. Measured at **1440×800**, an ordinary
laptop: press the primary ask and **Apply this change** and **No thanks** land at
y ≈ 869 in an 800-pixel viewport — **sixty-nine pixels below the fold.** The
demo asks the visitor a question and puts the answer off the screen. Stacked at
390×844 it is worse: the whole panel of secondary asks sits between the button
and the question it raised.

This was invisible while the lead applied on its own, because an applied card
asks nothing. It became the run's second unit the moment the lead started
asking.

## What a stranger can understand now

The same sixty seconds, on this branch:

> Land. Read four lines. *Loom weighs every ask before it lands: some changes it
> makes on its own, some it won't make without asking you first. Either way, it
> writes down what it did.* Press the one big green button: **Take the numbers
> off.**
>
> The page carries you to three figures — *3,400 appointments last year*, *24
> years on the same street*, *92% seen within a week* — ringed in amber and
> chipped **This would be removed**. The rail carries the card to your cursor:
> **Waiting on you.** *Loom will not make this change until you say yes. Riskier
> than a request from here is allowed to be without asking.* Under it, two
> buttons and the delta in the runtime's own words.
>
> Press **Apply this change**. The numbers go, the gap rings green, the counter
> in the bar moves to revision 1, and the card offers **Put it back**.

One press to meet the Gate. One to get past it. One to undo it. Every one of
them the obvious next thing, and none of it new machinery — the pipeline,
the record, the mark and the inverse are exactly what they were yesterday.

The claim a stranger leaves with is no longer *an AI changed a page*. It is
**an AI proposed a change to somebody's page, and something stopped it and asked
me first** — which is the only claim on this surface that nobody else is making.

## The changes, in order of how much they move that

### `_lib/presets.ts` — the table nominates its own lead

`DEMO_LEADING_PRESET` is the removal, and it lives beside the presets rather
than in the panel because it is a claim about the table: which preset earns the
primary slot. The panel reads it and ranks accordingly; nothing else moved.

The re-theme is not demoted so much as re-placed. It is still the first of the
secondary asks, still the best "everything at once" moment on the surface, and
it becomes the primary again automatically once the numbers are off — because
`availablePresets` stops offering a removal with nothing left to remove, and the
panel falls back to the first thing still on the table. That fallback is visible
in this run's `applied` screenshot and it is the pre-existing behaviour doing
something useful rather than anything I wrote.

### `_components/ask-panel.tsx` — one sentence, and it had to be added

A lead the Gate holds means the first press **moves nothing on the page**. A
stranger who has not been told that has pressed the one control this surface
invited them to press and watched it do nothing, and for the two seconds before
they find the amber card that reads as a broken button.

So the panel now says, above every control and before any of them can be
pressed: *Loom weighs every ask before it lands: some changes it makes on its
own, some it won't make without asking you first. Either way, it writes down
what it did.*

It says **some** and never **which**. That is not caution, it is the rule
`presets.ts` already states about every promise on this panel: the verdict is
computed at assessment time against the tree as it stands, so a surface that
predicted it would be wrong the first time the policy or the page moved. Told
that some asks wait, the same two seconds read as the product working.

### `_components/answer-in-view.tsx` — the answer is brought to the visitor

New, small, and the second unit the first one exposed. When a change is waiting
on the visitor, the card carrying the two buttons is scrolled into view, with
`block: "nearest"` — the least movement that puts the question on screen.

Three judgements in it, and each is a decision rather than a detail:

- **Only when something is waiting.** An applied change has already moved the
  page, which is its own announcement, and *Put it back* is an offer rather than
  a question. Dragging the rail for that would be the surface moving for its own
  reasons.
- **Both layouts.** I built it wide-only first, on the reasoning that
  `SpotlightScroll` deliberately declines to move the narrow layout's scroller
  for a held change. Re-reading that component's own comment corrected me: it
  declines because moving to the marked band *"would carry the visitor away from
  the two buttons it is waiting on"*. Scrolling **to those buttons** is the
  other half of that sentence, not a contradiction of it — and the two never
  fire together, because on a narrow screen a held change is precisely the case
  `SpotlightScroll` sits out. One scroller, one opinion, in every state.
- **Reduced motion is honoured**, the same way the stage's scroll honours it.

### `demo/page.tsx` — one clause out, because the bar already said it

The rail's opening paragraph read *"It belongs to a clinic that doesn't exist —
but it isn't a picture. It's data, an AI can rewrite it, and every rewrite
arrives with a record of what was asked, what Loom decided, and how to put it
back."*

The first clause is what the bar says forty pixels above, in almost the same
words. The last clause is the demo's whole claim, stated abstractly, four inches
from the button — a description of a record rather than a record, which is the
failure `WhatHappens` was written to fix in the empty state. It now sits in the
panel, directly above the controls, where it is about to become true.

What is left is the half nothing else covers: *It isn't a picture. It's data,
and an AI can rewrite it.*

## Decisions taken that were not specified

- **No decision record this run.** Nothing here touches the tree schema, the
  delta model or an `Accepted` record. It is a constant, a sentence, a
  sixty-line client component and a clause removed. Nothing was escalated and
  nothing was left out for review.
- **The nomination did not become a `DemoPreset` field.** "Which one leads" is a
  property of the set, not of a member — a boolean on each preset would let two
  of them claim it and let none of them claim it, and neither state has an
  answer. One exported id, one nominee, checked against the table.
- **The promise under the primary button was left exactly as it was.**
  *"The appointments, the years and the waiting time come off the page"* still
  describes the movement and still never predicts the verdict, which is the rule
  the table sets for every promise on the panel. Rewriting it into *"you're
  asking for…"* would have been this surface hedging about its own mechanism one
  line after saying plainly how the mechanism works.
- **The four secondary asks were not folded away.** I considered it — hiding
  them recovers ~264px and would have solved the off-the-fold answer by
  subtraction. It also relitigates the ranking #128 reasoned out carefully, and
  removes four working controls from the arrival screen to fix a problem that
  has a direct fix. The direct fix is the component; the chips stay.

## Real test numbers

`pnpm install && pnpm verify` — **green**, exit 0.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 106 | 1641 |
| `@loom/app` | 123 | 1777 |

Nothing failed, nothing was skipped, and no test was weakened. **Nine tests are
new**, all in this lane, and two of them are the run rather than a check on it:

- **`_lib/pipeline.test.ts` — 1 new, and it is the thesis, executable.** Asking
  for `DEMO_LEADING_PRESET` through the real write path under the real demo
  policy must come back `awaiting-you`, with a held proposal and the page
  unmoved. This is the property that would rot in silence: raise
  `user-instruction`'s ceiling back to the shipped default and every other test
  in this repository still passes, the demo still works, the page still changes
  — and the first press silently stops meeting the Gate, which is the exact
  state this run was opened to fix.
- **`_lib/presets.test.ts` — 1 new.** The nominated lead must be one the
  starting page can honour. The panel falls back to the first available preset
  when it cannot find the nominee, so a bad nomination would not throw or render
  an empty slot — it would quietly promote the re-theme and take the demo's best
  moment back, on the arrival screen only.
- **`_components/answer-in-view.test.tsx` — 6 new, a new file.** Which scroller
  moves, how far, whether it animates, that a re-render is not a new question,
  and that a missing card is not worth throwing over.
- **`_components/ask-panel.test.tsx` — 1 new, 2 rewritten.** The new one asserts
  the claim rather than the sentence: before any button exists to press, the
  panel has already said some asks wait for an answer. The two rewritten ones
  stopped spelling out preset labels and read them off `DEMO_PRESETS` instead —
  the same correction the 23 August run made to the third, for the same reason,
  and this run found the other two by breaking them.

## Findings

**Closed:** none. Nothing in the open queue was owned by this lane except the
chip collision, which is untouched — see below.

**Filed:**

- `Loom demo` → itself: **the diagnosis**, recorded because it outlives the fix
  and because the general shape is worth having. *A control's prominence is a
  claim about what it demonstrates, and that claim is usually settled by code
  somewhere else.* Here it was a policy ceiling two files away, and reviewing
  the ranking without the thing it ranks against is how a surface ends up
  leading with its weakest moment while every file involved reads correctly.
- `@jonathanbravecredit`: **two documents still point at the demo's old
  address, and the brief still opens with a finished task.** `docs/rollout.md`
  says the demo is live at `apps/loom/app/(portal)/portal/demo` — a 308 since 21
  August — and the `Loom demo` brief still leads with *"Two problems to fix
  before anything else"*, the first of which was the first run's whole unit and
  landed on 21 August. Both are one-line edits, neither belongs to a routine,
  and each costs a fresh session its opening minutes.
- `@jonathanbravecredit`: **`21st.dev` is still `EGRESS_BLOCKED`**, verified a
  fourth time from this lane. Dated on the existing entry rather than opened
  again — and this is the first run where the cost is nameable, because the unit
  was a *ranking* decision and a reference gallery is exactly what answers
  "one committing action, and what one line above it has to say".

**No framework gaps, and `src/` was not opened.** Nothing here wanted anything
the published entry points do not already expose, and no primitive was wanted:
the specimen is unchanged.

## The one thing I did not fix, said plainly

**The chip collision is still there**, in this run's `applied` screenshot, on
the same words as last week — *Something was removed here* over *the coast path
with my*. It is the open finding of 23 August, filed by this lane against
itself, and the previous run's recommendation to the maintainer was that it be
the next run's work.

It is not this run's work, and the reason is that this run found something
worse. A chip that overlaps a line of a quote is a blemish on a state a visitor
reaches by choice; a primary button that never demonstrates the product is the
failure the whole lane exists for. Both were mine to choose between and I chose
the one the brief names — *fix the worst one*. The chip is unchanged, still
filed, and still the next thing I would build.

## Open questions

Nothing blocking. Two carried, unchanged by this run:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **"Ask about just this"** — the scope control, reasoned out in my own 22
  August finding. The saving on an eight-band page is still about zero and the
  *claim* is still worth making.

And one new, which is a preference rather than a question: the rail's scroll now
clips the primary button at the top edge when it moves. It is the minimum
movement doing exactly what it was asked to do and I would rather that than a
larger jump, but it is the kind of thing that looks better or worse to a person
than to a measurement.

## The visuals

| | |
| --- | --- |
| [arrival](2026-08-24-demo-the-first-press-is-the-one-loom-stops-arrival.png) | 1440×900. Four lines, then one green button, and the button asks for the thing the Gate stops |
| [held](2026-08-24-demo-the-first-press-is-the-one-loom-stops-held.png) | **1440×800 — the viewport the second defect was measured at.** One press. Amber ring on the numbers, *Waiting on you*, and *Apply this change* / *No thanks* fully on screen where they were sixty-nine pixels under the fold |
| [applied](2026-08-24-demo-the-first-press-is-the-one-loom-stops-applied.png) | one click later: numbers gone, gap ringed green, revision 1, *Put it back* — and the primary has re-nominated itself to the re-theme, unprompted. The chip collision described above is in this frame |
| [phone](2026-08-24-demo-the-first-press-is-the-one-loom-stops-phone.png) | 390×844 on arrival: the rail leads, the frame reads in three lines, the primary is the width of the thumb |

Every screenshot is this branch's `next build` output driven in Chromium — not
the preview, which this environment cannot open (`vercel.app` is not on the
sandbox's egress allowlist; the standing 19 August finding).

**Preview:** PREVIEW_URL

**To see it yourself:** open `/demo` on a laptop-sized window and press the green
button without scrolling. Do not scroll after pressing it either — the point is
that you do not have to. Read the amber chip on the page and the amber badge in
the rail, then press *Apply this change*.
