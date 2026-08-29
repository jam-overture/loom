# The last button in the demo was the one that lied

**Routine:** `Loom demo` · **Branch:** `demo-06-the-undo-is-a-change-too` · **29 August 2026**

The sixth run of this routine. The five before it fixed where the demo lives, how
its controls are ranked, whose page is on the stage, which change the primary
button asks for, and what the record says once a visitor has answered a hold.
Between them they built a sequence: **Loom proposes, the Gate stops it, you are
asked, you say yes, it lands.**

This run is about the press *after* that sequence — the one a stranger makes last
and leaves with.

---

## What a stranger could not understand before this run

I used it as somebody who had never heard of Loom, at 1440×900 and 390×844. The
arrival is good. The first press is good. The hold, the two buttons, the green
ring on the page, *You said yes* — all good, and all of it the last four runs'
work. Then I pressed **Put it back**, which is the only control left on the card,
and this is the card I was left holding:

<img alt="the payoff card on main after pressing Put it back: it says Put it back undoes it, and there is no such button on it" src="reports/2026-08-29-demo-the-undo-is-a-change-too-before.png">

Read it cold. It says *“Put it back” undoes it* and there is no **Put it back** on
it. The button I had just pressed had removed itself, the page had not moved, and
nothing on the card said why. What actually happened is above and off-screen: a
second card, *“Undo revision 1.” · Waiting on you*, because **the Gate weighed the
undo too**.

That is 0028 working exactly as designed and nothing in the runtime is wrong. An
undo is a change of its own rather than a rewind, so it is interpreted, assessed
and gated like any other — and putting a band back restructures the page at the
same depth as taking it off did. Nothing here should be exempted from the Gate to
make the demo tidier: **the Gate weighing the undo is a better claim than the one
the button was making.**

### It is not an edge case, and nobody had measured it

I ran every preset through the real write path — ask, answer if held, then undo —
and read what came back:

| preset | undo |
| --- | --- |
| `trim` — **what the big green button asks for** | held, `stakes-above-ceiling` |
| `band` | held, `stakes-above-ceiling` |
| `promote` | held, `stakes-above-ceiling` |
| `palette` | applies on its own, `within-policy` |
| `backdrop` | applies on its own, `within-policy` |

**Three in five, including the one the demo leads with.** The 25 August finding
that named this defect had the diagnosis right and no numbers; on the numbers it
is the ordinary path rather than a corner of it.

### Two things promised otherwise, and there was a third nobody had seen

The finding named two, and both are fixed here:

- The button said **Put it back**, unqualified, and was the only control on the
  payoff card.
- `WhatHappens` step three promised *“a button that **really** puts the page
  back, because undoing is a change of its own rather than a rewind.”* The word
  *really* was doing the opposite of its job — it means *a real change, not a
  rewind*, and a stranger reads it as *immediately*.

The third came out of reading the component while fixing them, and it is the
worse of the three. The card withdrew the undo on **any** answer from the server:

```tsx
{record.revision && !undoReport && ( … Put it back … )}
```

`undoReport` is set the moment `undoRevision` returns *anything*. Correct for the
undo that **landed**; wrong for every other outcome. So on the primary path the
button vanished because the undo was being *held* — the change is still live, the
offer is still real, and the card had taken it away while continuing to name it
in its own sentence. And answer that hold with *No thanks* and it never came back
at all: a visitor who turned down their own undo had no second way to ask for it.

That is the same shape this lane keeps finding, and it is worth naming again:
**this surface's failures are not missing machinery, they are the machinery not
reaching the screen.** Nothing was broken. `revertRevision` did what 0028 says.
The Gate did what the policy says. `report.ts` had every word needed to explain
it. The card asked the wrong question of the answer it was handed.

## What a stranger can understand now

Same sixty seconds, on this branch. The payoff card, before the press:

<img alt="the payoff card on this branch: under Put it back, a line reading Undoing is a change of its own, so Loom weighs it too — it may ask you first" src="reports/2026-08-29-demo-the-undo-is-a-change-too-card.png">

> **Put it back**
> *Undoing is a change of its own, so Loom weighs it too — it may ask you first.*

And after it:

<img alt="the same card after pressing Put it back: the button and its line are still there" src="reports/2026-08-29-demo-the-undo-is-a-change-too-after.png">

The button is still there, the card's own sentence still names something that
exists, and the question the press produced is in the rail above it, scrolled
into view by `AnswerInView`:

<img alt="the rail after pressing Put it back: a Waiting on you card reading Undo revision 1 above the applied card" src="reports/2026-08-29-demo-the-undo-is-a-change-too-question.png">

What a stranger leaves with is no longer *an AI put it back, except it didn't*.
It is **an AI will not even undo its own change without asking me** — which is a
stronger thing than the button was promising and is the actual product.

## The changes, in order of how much they move that

### `_lib/undo.ts` — new, and it is two decisions rather than a string

`answer.ts`'s shape, for the same reason: the words and the rule about when to
say them belong somewhere a test can hold them, not inside a component.

**`UNDO_IS_A_CHANGE`** is the line. What decided the wording was `presets.ts`'s
own rule about every promise on this surface, which binds this one: a control may
describe *the movement* it asks for and may never predict *the verdict*, because
the verdict is computed against the tree at assessment time and a surface that
guessed would be wrong the first time the policy or the page moved. Two of the
five undos here do land unasked. So it says **may**, and never which — and it
says *why*, because "this might not work straight away" would cover the surprise
and teach nothing, while *undoing is a change of its own* is the thing a stranger
cannot infer and is what 0028 is.

**`undoStillOffered`** is the third defect above, as a function. The button is
withdrawn on exactly one outcome — **the page went back** — and stays on offer
through every outcome that leaves the change standing.

### `_lib/report.ts` — one field, because `recorded` could not answer this

`WriteReport` gains `moved`: *whether the page a visitor is looking at moved
because of this.* It is the distinction `recorded` cannot make. A held undo is a
complete success by every measure the runtime keeps — proposal written, custody
taken, question asked, card rendered — and the page is exactly where it was. A
control deciding whether it still has anything to offer is asking about the
page, not about the write.

It is derived from the state in every constructor, never asserted at a call site,
through a **total record** over `ChangeState` rather than `state === "applied"`.
The reason is the failure mode: a state added to the shared table would otherwise
default silently to "the page moved", which is the answer that makes a control
withdraw itself, and is wrong for every state on the list but one.

### `_components/record-card.tsx` and `what-happens.tsx` — the line, and the frame

The line goes *under* the button rather than inside it, which is the shape
`AskPanel` already uses for the promise under its primary ask: what the button
says is the ask, what the line says is what asking means here. Step three keeps
the claim it was reaching for and drops the word that misfired — *“a button that
puts the page back. Undoing is a change of its own, so Loom weighs that one
too.”*

<img alt="the three steps, with step three reworded" src="reports/2026-08-29-demo-the-undo-is-a-change-too-steps.png">

## Decisions taken that were not specified

- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. It renders a consequence of 0028 that the runtime
  already had and this surface was hiding. Nothing was escalated and nothing was
  left out for review.
- **The Gate was not relaxed for undos**, which was the tempting fix and the
  wrong one. The demo exists to show the Gate; exempting the one change that
  makes the Gate visible twice would be staging it.
- **The card does not point at the question it produced**, though that is the
  sentence I wanted. It cannot: nothing on a record says which change an undo is
  undoing, so a card cannot know that the held card above is *its* undo, and the
  client-side answer goes stale the moment the visitor answers. Filed for
  `Loom daily build` with the field that would fix it. What shipped instead —
  keep the offer standing — is honest without it.
- **The undo's own card still says “Undo revision 1.”** in the slot reserved for
  the visitor's own words. Filed rather than fixed, because overriding it would
  put a sentence in quotation marks that nothing in the log ever said, on the one
  surface whose argument is that the account is the runtime's own. Two honest
  routes are in the finding.

## Real test numbers

`pnpm install && pnpm verify` — **one failure, and it is not this branch's.**

| suite | files | tests | result |
| --- | --- | --- | --- |
| `@loom/runtime` | 111 | 1741 | green |
| `@loom/app` | 135 | 1976 | 1975 passed, **1 failed** |

The failure is `app/(marketing)/_lib/facts.test.ts` — `FACTS.decisions` says
`"94"` and `decisions/` holds 95 records. **It fails on a clean checkout of
`main`**, verified by stashing this run's whole diff and running that file alone,
so it was red before this branch existed and is red for every lane this week. It
is `Loom marketing`'s file and its lane's claim; a demo run editing the marketing
route group to green its own merge gate is the boundary this repository is
careful about. Dated as the sixth occurrence in `FINDINGS.md`, with the one-line
fix the 19 August entry named.

`pnpm typecheck` and `pnpm build` are both green, on the runtime and on the app.
Nothing was skipped and no test was weakened.

**Fifteen tests are new**, all in this lane, in one new file and four existing
ones:

- **`_lib/undo.test.ts` — 7 new, a new file.** That the offer stands through a
  held undo, through a declined one, and through a form that never reached the
  runtime, and is withdrawn on the one outcome that empties it. That the line
  says *may* and never *will*, and says why.
- **`_lib/report.test.ts` — 2 new.** That `moved` is true of exactly one of the
  nine states, asserted by filtering the whole table rather than by naming
  `applied` — so a state added without a decision fails here.
- **`_components/record-card.test.tsx` — 2 new.** That the line is on the card
  *and shares a parent with the button*, because a caption elsewhere on the card
  is not this; and that a card with nothing to put back explains nothing.
- **`_components/what-happens.test.tsx` — 1 new.** Asserted as the promise
  rather than as the sentence: the frame must say the undo is weighed and must
  not say it is instant.
- **`_lib/pipeline.test.ts` — 1 new.** The measurement, through the real write
  path: ask for the panel's primary change, allow it, undo it, and assert the
  Gate holds *that* too and the head has not moved. It is what the line is
  written against — retune the policy and the sentence stops being necessary,
  and somebody should be told here rather than by a stranger pressing the button.

Two of the new assertions name strings that did not exist before this branch, so
they could not have passed against `main`. The behavioural ones were checked
rather than assumed: with `undoStillOffered` reverted to the old rule
(`lastUndo === null`) and nothing else changed, **3 of the 7 fail and 4 pass** —
the held undo, the declined undo and the unreadable form — so none of them is
asserting something that was already true.

`src/` was not opened. No primitive was wanted: the specimen page is untouched.

## Findings

**Closed:** the 25 August *“Put it back” does not put it back* finding, by this
pull request — option 3 as it recommended, and option 2 alongside it.

**Filed:**

- `Loom demo` → `Loom daily build`: **a record does not say which change an undo
  is undoing.** The only place the target revision appears is the runtime's
  prose utterance. It is what stopped this run pointing the card at the question
  it produced, and the portal's history screen wants the same pair for the same
  reason.
- `Loom demo` → itself: **a card says a change is live on the page after the page
  has been put back.** Measured, and left alone deliberately — it is a claim
  about what a state *means*, in the same run that changed what the card says
  about a control, and the good fix waits on the field above.
- `Loom demo` → itself: **“Undo revision 1.”** — the loudest jargon on this
  surface is a sentence the runtime wrote, quoted in the slot the card reserves
  for the visitor's own words, using a term the frame's own test forbids.
- `Loom marketing`, `@jonathanbravecredit`: the **decisions count**, sixth
  occurrence, and the first time it was already red on `main` before the run that
  found it started.
- `@jonathanbravecredit`: **`21st.dev` is still `EGRESS_BLOCKED`**, tenth
  consecutive run, sixth lane. Dated rather than opened again.

## The one thing I did not fix, said plainly

**The chip collision is still there, and this is the fourth run in a row.** It is
in the 23 August finding and it is visible in this run's `question` screenshot —
*Something new would go here* landing on *the coast path with my*, the same quote
and the same line as a week ago.

I took the undo over it, and the reason is the one the last two runs gave for
their own choices: a chip overlapping a line of a quote is a blemish on a state
the visitor reached, and the last press of the demo doing nothing is the argument
failing at the end. But four deferrals is no longer a judgement call, it is a
backlog, so I have marked it in `FINDINGS.md` as **the next unit unless a
maintainer comment outranks it** and left nothing else to work out first: the
25 August entry already measured it (the collision is always on a `near` mark;
the free space is the gap the missing node left, directly above the neighbour;
the clipping correction does not bite there). What is left is a browser and an
hour.

## Open questions

Nothing blocking. Two carried, unchanged by this run:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **“Ask about just this”** — the scope control, reasoned out in this lane's
  22 August finding.

## The visuals

| | |
| --- | --- |
| [before](2026-08-29-demo-the-undo-is-a-change-too-before.png) | `main`, after pressing **Put it back**. The card says *“Put it back” undoes it* and there is no such button on it |
| [after](2026-08-29-demo-the-undo-is-a-change-too-after.png) | the same card, same press, this branch. The offer stands, and the sentence still names something real |
| [card](2026-08-29-demo-the-undo-is-a-change-too-card.png) | the payoff card before the press: the line under the button, in the same shape `AskPanel` uses for its primary ask |
| [question](2026-08-29-demo-the-undo-is-a-change-too-question.png) | the whole screen after the press — *“Undo revision 1.” · Waiting on you* above, the applied card still offering its undo below. The chip collision is in this one too |
| [steps](2026-08-29-demo-the-undo-is-a-change-too-steps.png) | step three, without *really* |
| [phone](2026-08-29-demo-the-undo-is-a-change-too-phone.png) | 390×844, the payoff card. The line wraps to two and holds |

Every screenshot is this branch's `next build` output driven in Chromium at
1440×900 and 390×844 — not the preview, which this environment cannot open
(`vercel.app` is not on the sandbox's egress allowlist; the standing 19 August
finding). The **before** shot is `main`'s own build, taken the same way on the
same page, so the two are comparable.

**To see it yourself:** open `/demo`, press the green button, press **Apply this
change**, then press **Put it back** and *do not scroll*. On `main` the button
you pressed is gone and the card still names it. Here it is still there, with one
line under it that says why the page has not moved — and the question that press
produced is the card above.
