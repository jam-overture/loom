# “Put it back” says what it is

**Routine:** `Loom demo` · **Branch:** `demo-06-put-it-back-says-what-it-is` · **26 August 2026**

The sixth run of this routine. The first five fixed where the demo lives, how its
controls are ranked, whose page is on the stage, which change the primary button
asks for, and what the record says once a visitor has answered. Together they
built a sequence a stranger can live in sixty seconds:

> **Loom proposes, the Gate stops it, you are asked, you say yes, it lands.**

This run is about **the press after that** — the only control the payoff card
offers — and what it does when a stranger presses it.

---

## What a stranger could not understand before this run

I built the branch's predecessor and drove it in Chromium at 1440×800 and
390×844, as somebody who had never heard of Loom. Arrival is good. The first
press is good. The hold is good. *You said yes* is on the card where the last run
put it. Then I pressed the one button left — **Put it back** — and watched
nothing happen.

Here is the screen, two seconds after that press:

- The page had **not moved**. The numbers band was still gone.
- The counter in the bar still said **revision 1**.
- A second card had appeared above the first, amber, reading:

> *“Undo revision 1.”* · **Waiting on you**
> Loom will not make this change until you say yes.
> asked by a demo visitor

Everything there is correct, and it is [0032](../decisions/0032-an-undo-is-a-proposal-not-a-rewind.md)
working exactly as designed: an undo is a change of its own rather than a rewind,
so it is interpreted, assessed and gated like any other — and this one
restructures the page near the root exactly as the change it reverses did.
Nothing should be exempted from the Gate to make the demo tidier.

**What is wrong is everything on the screen that promised otherwise**, and there
turned out to be three of them rather than the two the last run's finding named.

### One: the button, unqualified

*Put it back* is the only control on the card a visitor reaches at the end of the
sequence, and it is a flat promise. This is the same defect the 24 August run
fixed one control earlier — the primary ask is also held, and pressing it also
moves nothing — and the fix there was one sentence above the buttons saying that
some asks wait for an answer. That sentence lives in `AskPanel`. An applied card
is four inches and one press away from it.

### Two: the frame, using a word that means the wrong thing

`WhatHappens` step three promised *“a button that **really** puts the page
back, because undoing is a change of its own rather than a rewind.”* The word is
there to mean *a real change, not a rewind* — the interesting claim. A stranger
reads it as **immediately**.

### Three, and this is the one the finding did not name: the card spoke in the runtime's voice

`“Undo revision 1.”` is `revertRevision`'s synthesised utterance, and
`src/write/revert.ts` is right to synthesise it. It says why, plainly: the
utterance behind a revert *“is not a sentence someone typed — it is the revision
number they named.”* That is true of the log.

The demo then printed it **in curly quotes, at `text-md`, in the position the
card reserves for the one line a visitor wrote themselves or pressed.** Every
other card in the rail quotes a sentence a person could have said — *“Take the
numbers band off the page.”* This one quotes the runtime's bookkeeping and
attributes it to the visitor, three lines above `asked by a demo visitor`.

The measure of how wrong that is was already in this lane's own test suite.
`what-happens.test.tsx` carries a list called `NOT_YET_EARNED` — nine words the
frame may not put in front of a stranger before the surface has earned them —
and **`revision` is the fifth of them**. The frame is held to that by an
assertion. The card three presses later led with the word, in quotation marks.

So the sixty seconds ended like this:

> Land. Press the green button. **Waiting on you.** Press **Apply this change**.
> The numbers go, the gap rings green, the counter moves. Read the card: *You
> said yes.* Press **Put it back** — the only thing left to press. Nothing moves.
> A card appears quoting you saying *“Undo revision 1.”* Leave.

What that visitor leaves with is *the undo is broken, and it is talking to
itself.* The claim on offer was **undoing is a change like any other, and Loom
weighs it the same way — which is why you get asked twice.**

## What a stranger can understand now

Same sixty seconds, on this branch, from the moment the change lands:

> **Applied.** *This change is live on the page beside you. “Put it back” undoes
> it.* · *You said yes.*
> — then the button, and directly under it, in the rail's quiet type:
>
> **Undoing is a change of its own, so Loom weighs it like any other. It may wait
> for your yes.**

Press it, and the card that appears is headed **“Put it back.”** — the words on
the button they just pressed, quoted back to them, because that is what they
said. The amber badge says **Waiting on you** and the sentence under it says
*Loom will not make this change until you say yes*, and now that is the second
time in a minute a stranger has met that sentence rather than the first time
they have met a broken button.

And the runtime's own words went where the plain-language rule says they go. Open
*Show the full record* and **the proposal** now begins:

```
THE PROPOSAL
asked          Undo revision 1.
               Undoes revision 1, applied 2026-08-26T19:55:36.461Z from proposal…
interpreter    loom/revert
authored by    runtime
confidence     1.00
```

Nothing was removed. `record.utterance` is untouched; one sentence moved from the
light into the disclosure, and the words the visitor pressed took its place.

## The changes, in order of how much they move that

### `_lib/undo.ts` — new, and mostly a claim about *whose sentence this is*

Three strings and one predicate, in one file, because they are one claim seen
from three places and the surface was making a different one at each.

`UNDO_LABEL` is exported rather than written on the button, and `askedLine`
composes the quotation from it. That is the whole reason the module exists rather
than a string living in the component: **the quotation and the control cannot
drift apart.** Rename one and both change; `undo.test.ts` asserts the quotation
*against the label* rather than against a literal of its own, so a test that
still passes is a test that still means what it says.

`isUndo` reads `provenance.interpreter === REVERT_INTERPRETER` — the runtime's own
stamp on a delta its own planner computed — rather than pattern-matching the
English. A preset whose utterance happens to talk about undoing is still a
preset, and a revert is a revert whatever its utterance says. That is the
difference between reading provenance and reading a sentence, and there is a test
for each direction.

`UNDO_CAUTION` says **may** and never **will**. That is not hedging: the verdict
is computed at assessment time against the tree as it stands, so a surface that
predicted it would be wrong the first time the policy or the page moved. It is
the same rule `presets.ts` gives for every promise on this surface, and
`undo.test.ts` holds the string to it.

### `_components/record-card.tsx` — one line under a button, one substituted quote, one row in the dark

The caution sits **inside the undo's own form**, under the button rather than
beside the record's other prose, because it is about a control and not about the
change. It is `text-2xs` and muted: the same weight `AskPanel` gives the promise
under its primary ask, for the same reason — what the button says is the ask,
what this says is the consequence, and a visitor deciding whether to press
something wants both without the button becoming a paragraph.

The quotation reads `asked.plain`. The disclosure gains `asked` **only when the
line above is not the utterance**, which is one card in five — a row repeating the
sentence three inches above it is the clutter this rail has spent five runs being
cut back from, and there is a test that an ordinary ask grows no such row.

### `_components/what-happens.tsx` — one word out, one clause in

Step three now reads *“…and a button that puts the page back. Undoing is a change
of its own rather than a rewind, so it is weighed the same way.”* The interesting
claim survives; the word that read as *immediately* is gone, and the sentence now
sets the expectation the next press will meet. It still passes `NOT_YET_EARNED`.

## Decisions taken that were not specified

- **No decision record this run.** Nothing here touches the tree schema, the
  delta model or an `Accepted` record. Nothing was escalated and nothing was left
  out for review.
- **The button was not reworded**, though the 25 August finding offered it as
  option 1. *Ask to put it back* makes the one control on the payoff card sound
  tentative, and the demo's problem has never been that it over-claims about the
  page — it is that it under-explains the Gate. The finding's own recommendation
  was option 3 and it was right.
- **`src/write/revert.ts` was not touched and should not be.** The synthesised
  utterance is correct for the log, which is where it lives. The defect was
  entirely in what this surface chose to quote, so it is fixed entirely here. No
  finding was filed against the runtime for it.
- **`applied`'s meaning was left alone.** It reads *“This change is live on the
  page beside you. ‘Put it back’ undoes it.”* — another unqualified promise, and
  it now sits three lines above a caution that qualifies it. Changing both in one
  unit would have been two arguments about one card at once, and the caution is
  the load-bearing half. It is worth a look next run.
- **A misattribution was corrected on the way past, in this lane only.** The
  claim *an undo is a change rather than a rewind* is
  [0032](../decisions/0032-an-undo-is-a-proposal-not-a-rewind.md). The 25 August
  finding attributes it to 0028, which is *a tree is auditable only if its host
  can reproduce the seed* — a record this lane also cites, correctly, twice, for
  the seed an undo is planned from. I wrote 0028 into four new comments before
  checking and then corrected them. The finding's body is left as its run wrote
  it; only this run's own citations point at 0032.
- **The undo of an undo was left alone.** Answer the held undo and the page comes
  back, with a card offering *Put it back* again — which would put the numbers
  band back off. Correct, honest, and a loop a visitor can follow. Nothing to fix.

## Real test numbers

`pnpm install && pnpm verify` — **green**, exit 0.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 108 | 1695 |
| `@loom/app` | 133 | 1891 |

Nothing failed, nothing was skipped, no test was weakened.

**It was not green on the first attempt, and that is worth stating.** The first
full run failed at `@loom/app`'s typecheck with two `TS2375`s in the new test
file: a fixture helper typed as `ChangeRecord["interpretation"]`, which under
`exactOptionalPropertyTypes` is `InterpretationView | undefined` and therefore not
assignable to the optional property it was filling. Every test passed; the types
did not. Fixed by naming the type the helper actually returns, and re-run clean.

**Eleven tests are new**, all in this lane, in one new file and two existing ones:

- **`_lib/undo.test.ts` — 7 new, a new file.** That an ordinary ask is quoted in
  its own words and grows no technical half; that an undo is quoted as the button
  and never contains the word `revision`; that the runtime's utterance survives as
  the technical half; that the undo is recognised by the interpreter the runtime
  stamped rather than by the English (asserted in both directions — a preset that
  *talks* about undoing is not one); that an un-interpreted ask falls through to
  its own words; and that the caution says *may* and never *will*.
- **`_components/record-card.test.tsx` — 3 new.** That the caution is in the
  light, not the disclosure, and inside the undo's own form; that an undo is
  quoted as the button and not as the revision number; that the runtime's
  utterance is under the disclosure. Plus one guard that an ordinary ask is not
  suddenly quoted twice.
- **`_lib/pipeline.test.ts` — 1 new.** The whole third press through the real
  write path: ask for the leading preset, confirm the hold, revert revision 1, and
  assert the outcome is `held`, the head is still at revision 1, and `askedLine`
  substitutes. This is the one that matters, because **the thing that rots is not
  the function, it is the supply.** A `revertRevision` that stopped stamping its
  own interpreter would leave `undo.test.ts` passing on its fixture while the card
  quietly went back to quoting `Undo revision 1.` at a stranger. It also pins the
  caution to a real state: if a policy retune ever let this undo through, the
  caution would be hedging about something that cannot happen, and this test would
  say so.

The three new card tests were confirmed to fail against the unmodified component
before being kept — **3 failed, 11 passed** — so none is asserting something that
was already true. The fourth (the no-double-quote guard) passes both ways by
design: it exists to catch a regression this change could have introduced.

`src/` was not opened. No framework gap was found and no primitive was wanted.

## Findings

**Closed:** the 25 August *“Put it back” does not put it back on the first press*
— option 3 taken, as recommended, plus the half that entry did not name.

**Filed:**

- `Loom demo` → itself: **the runtime's own sentence reached the one line
  reserved for the visitor's.** Recorded because the *shape* is now three for
  three: a policy ceiling two files from the button it silenced (24 August), a
  field four surfaces print and this one carried unread (25 August), a string the
  runtime is right to compose and this surface was wrong to quote (today). In
  none of the three was anything broken. The question to ask of a string here is
  not *is it true* but **whose sentence is it, and is this the place that
  sentence is spoken.**
- `@jonathanbravecredit`: **`21st.dev` is `EGRESS_BLOCKED`**, a sixth
  verification. Dated on the standing entries rather than re-argued.
- `@jonathanbravecredit`: **the brief's opening instruction and `docs/rollout.md`
  are five days stale** — third consecutive run. The count is the only new
  evidence and it is the reason for dating it: nothing in the repository can fix
  it, because a routine cannot rewrite the brief it is bound by.

## The one thing I did not fix, said plainly

**The chip collision is still there, and this is the fourth run in a row.** It is
visible in this run's screenshots: *Something was removed here* landing on *the
coast path with my* at 1440×800.

I am not going to keep restating the reason, because at four deferrals the
restatement is the problem. So: **it is the next unit, ahead of anything else in
this lane**, and the last run left it measured rather than described — the
collision is always on a `near` mark, the free space is the gap the missing node
left directly above the neighbour, and `spotlight.ts`'s `labelFor` already knows
that case at `placed === "near"`. It is a browser and one sitting.

What I took instead was the press that reads as broken, and I would take it
again: a chip overlapping a line of a quote is a blemish on a state the visitor
reached, and the third of the demo's three presses appearing to do nothing is the
sequence failing at its last step. But that argument does not survive a fifth
telling.

## Open questions

Nothing blocking. Two carried, unchanged by this run:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **“Ask about just this”** — the scope control, reasoned out in this lane's
  22 August finding.

## The visuals

| | |
| --- | --- |
| [before](2026-08-26-demo-put-it-back-says-what-it-is-before.png) | `main` this morning, two seconds after **Put it back**. The page has not moved, the bar still says revision 1, and the new card quotes the visitor saying *“Undo revision 1.”* |
| [after](2026-08-26-demo-put-it-back-says-what-it-is-after.png) | the same press, same viewport, same scroll position, on this branch. The card is headed *“Put it back.”* — and nothing else about the state has changed, because nothing else was wrong with it |
| [caution](2026-08-26-demo-put-it-back-says-what-it-is-caution.png) | the payoff card *before* that press: the undo, and the line under it that now says what pressing it will do |
| [record](2026-08-26-demo-put-it-back-says-what-it-is-record.png) | the undo's card with the disclosure open. **The proposal** begins `asked · Undo revision 1.` — the runtime's own sentence, whole, one click down |
| [phone](2026-08-26-demo-put-it-back-says-what-it-is-phone.png) | 390×844, both cards after the press. The quotation and the caution both hold |

Every screenshot is this branch's `next build` output driven in Chromium at
1440×800 and 390×844 — not the preview, which this environment cannot open
(`vercel.app` is not on the sandbox's egress allowlist; the standing 19 August
finding). The before/after pair is the same script against the two builds, so the
only difference in the frame is the change.

**Preview:**
`https://loom-git-demo-06-put-it-back-8b679f-jpizzolato36-6341s-projects.vercel.app/demo`

One push, one preview, built `Ready` on the first attempt.

**To see it yourself:** open `/demo`, press the green button, press **Apply this
change**, and then read the line under **Put it back** before pressing it. Press
it, and read the first line of the card that appears. That line is the run.
