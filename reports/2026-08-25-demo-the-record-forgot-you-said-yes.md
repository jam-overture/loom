# The record forgot the one thing only you did

**Routine:** `Loom demo` · **Branch:** `demo-05-the-record-says-you-said-yes` · **25 August 2026**

The fifth run of this routine. The first four fixed where the demo lives, how its
controls are ranked, whose page is on the stage, and which change the primary
button asks for. That last one gave the demo its sequence: **Loom proposes, the
Gate stops it, you are asked, you say yes, it lands.**

This run is about what the record says once you have lived that sequence, and the
answer was: nothing. **The moment a visitor completes the demo's whole argument,
the card forgets they were in it.**

---

## What a stranger could not understand before this run

I used it as somebody who had never heard of Loom, at 1440×800, 1440×900 and
390×844. The arrival is good, the first press is good, the hold is good, the two
answer buttons are on screen where the last run put them. Then I pressed **Apply
this change**, read the card it left me, and could not tell what I had done.

Here are the two cards this surface can produce that both end **Applied**, as they
stood on `main` this morning, in the same rail, forty pixels apart:

> **Applied** · *“Take the numbers band off the page.”*
> This change is live on the page beside you. “Put it back” undoes it.
> asked by a demo visitor
> **Riskier than a request from here is allowed to be without asking.**

> **Applied** · *“Switch this page to the other palette.”*
> This change is live on the page beside you. “Put it back” undoes it.
> asked by a demo visitor
> **Nothing this project watches for was involved, so it went ahead on its own.**

The second one Loom made by itself. The first one Loom **refused to make** until
the person reading the card pressed a button — and nothing on it says so. Read it
cold and it is a change the Gate judged too risky to make without asking, sitting
under a badge saying it was made. The rule sentence explains why it was stopped
and then simply stops; the reader is the missing term.

So the sixty seconds ran like this:

> Land. Press the green button. **Waiting on you** — *Loom will not make this
> change until you say yes.* Press **Apply this change**. The numbers go, the gap
> rings green, the counter moves to revision 1. Read the card. It says the change
> is live and that it was riskier than an ask from here may be. Leave.

That visitor met the Gate — which is what the last run bought — and then watched
the record drop the only part of the story they performed. What they leave with is
*an AI stopped, and then did it anyway*. The claim on offer was **an AI would not
change this page until I said it could, and it wrote down that I did.**

### The fact was never missing. Only this surface dropped it.

This is not a gap in the runtime and it is not a gap in the record. `hold-confirmed`
carries the actor; `recordFromEvents` folds it onto `answeredBy`; `_lib/record.ts`
has carried the field since the surface was built, with a comment saying exactly
what it is for:

> Who allowed a held change. Never the same field as `actor`: a hold exists
> because the Gate wanted a second person, and provenance records only the first
> (0029).

And `_lib/pipeline.test.ts` has asserted, since the same day, that it arrives:

```ts
expect(record?.answeredBy).toBe("a demo visitor")
```

The framework is blunter still. `src/write/commit.ts` sets it in one place so that
*“the two records cannot disagree about who allowed this”*, and the docs surface
names the consequence outright when it picks a name for its own reader:

> `answeredBy` exists to stop a confirmed change looking like a person waving
> through their own request (0029) — and a blank there would teach the opposite of
> what the page is about.

**Every other surface prints it.** The portal's history says *allowed by*; its
activity screen says *`{who}` said yes.*; the portal's trust screen says *answered
by*; the docs' proposal box says *allowed by*. `grep answeredBy` returns four
surfaces rendering it and one holding it and rendering nothing — the demo, the one
whose entire job is to show a person being asked.

That is the shape this lane keeps finding and it is worth naming: **the demo's
failures are not missing machinery, they are the machinery not reaching the
screen.** Last week it was a policy ceiling two files from the button it silenced.
This week it is a field four surfaces print and this one carries unread.

## What a stranger can understand now

Same sixty seconds, on this branch, from the press of **Apply this change**:

> **Applied.** *This change is live on the page beside you. “Put it back” undoes
> it.* · *Riskier than a request from here is allowed to be without asking.*
> — and under it, ruled off in the same green as the ring on the page:
>
> **You said yes.** *Loom held this change until you answered. Without that,
> nothing on the page would have moved.*

The rule sentence now has a resolution instead of a full stop. The two **Applied**
cards no longer read alike: one says it went ahead on its own, the other says a
person let it through, and the difference between them is the product.

And the technical half went where the plain-language rule says it goes. Open *Show
the full record* and **the verdict** now ends:

```
decision      requires-confirmation
rule          stakes-above-ceiling
policy        demo
fingerprint   71ff452d:c5edb7b…
answered      confirmed by a demo visitor
```

`confirmed by …` is the same string the portal's activity screen composes
(`describeAnswer`), for the same event. Nothing was removed to make room; one
sentence entered the light and its evidence entered the disclosure, which is the
rule this rail has been built to.

## The changes, in order of how much they move that

### `_lib/answer.ts` — new, and it is mostly a decision about *when to say nothing*

Forty lines of it are the reasoning; the function is nine. `answerNote(record)`
returns the visitor's half of the exchange when there is one, and `undefined` the
rest of the time — which is four outcomes out of five.

The interesting call is the asymmetry: **the yes is printed and the no is not.**
They look like a matched pair and they are not. A visitor who declines gets a card
whose badge reads *You said no* and whose sentence reads *You turned this change
down. The page was left as it was.* — the answer **is** the outcome, and the shared
table already says it twice. A visitor who accepts gets a card saying *Applied*,
which is exactly what a change nobody was asked about says. Printing "you said no"
a third time is the clutter this rail has spent four runs being cut back from;
printing "you said yes" once is the entire difference between the two cards above.

The words come off `(portal)/_lib/vocabulary`'s `ANSWERS`, and the one thing
overridden is **the pronoun**. That table says *Somebody looked at this and let it
through* — right in a review queue, where the answerer may be a colleague, and
wrong here, where a session has exactly one person in it and they are the person
reading the card. It is the same override, for the same reason, that `report.ts`
already makes to `applied`'s meaning: the two surfaces must agree on what a state
is *called* and cannot agree on who was in the room. `answer.test.ts` holds the
verb against the shared table so a portal rewording cannot leave the demo saying
something else about one button-press.

### `_components/record-card.tsx` — one line in the light, one row in the dark

The sentence sits **directly under the rule it completes**, not beside the undo
button, because it is the end of an account rather than a control. It carries a
left rule in the applied tone: everything else on the card is Loom talking about
the change, and this is the one line about the person reading it.

In the disclosure, `answered` joins `decision`, `rule`, `policy` and `fingerprint`
in **the verdict** — the section it belongs to, since it is what became of that
verdict.

Neither is conditional on anything the component decides. `answer.ts` owns whether
there is anything to say; the card owns how it looks.

## Decisions taken that were not specified

- **No decision record this run.** Nothing here touches the tree schema, the delta
  model or an `Accepted` record — it renders a field the record already carried,
  in words a shared table already had. Nothing was escalated and nothing was left
  out for review.
- **The lead-in was not added to the other cards.** I drafted a version that put
  the Gate's verdict above every rule sentence — `GATE_VERDICTS` has *“Loom stopped
  and asked first”* and *“Loom made this change on its own”* sitting unused. On
  four of the five states it says what the card already says: the waiting card's
  own meaning is *“Loom will not make this change until you say yes”*, and the
  auto-applied card's rule sentence ends *“so it went ahead on its own”*. Adding it
  everywhere would have been two lines of echo to make one line of fix look
  systematic. Exactly one state was broken and exactly one line was added.
- **The promise under *Put it back* was left alone**, though a note on it is filed
  below. Rewording a control in the same unit that changes what the card says about
  the last control would have made this two changes to argue about at once.
- **`asked by a demo visitor` stays**, unchanged, three lines above *You said yes*.
  It reads slightly oddly when both are the reader — but the two are genuinely
  different facts (0029 is precisely that they must never be one field), and this
  is the surface where a stranger is meant to learn that.

## Real test numbers

`pnpm install && pnpm verify` — **green**, exit 0.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 106 | 1665 |
| `@loom/app` | 124 | 1790 |

Nothing failed, nothing was skipped, no test was weakened. **Ten tests are new**,
all in this lane, in one new file and two existing ones:

- **`_lib/answer.test.ts` — 6 new, a new file.** That the yes is said and the no is
  left to the state that already names it; that the verb comes off the shared table
  rather than being written here; that the actor named is the one who *answered*
  and not the one who asked; and — the one that matters — that a change nobody was
  asked about grows no sentence claiming somebody was.
- **`_components/record-card.test.tsx` — 3 new.** The first is the run, executable:
  render both applied cards and assert **they do not read the same**. It is written
  as a difference rather than as a sentence on purpose — any wording that leaves the
  unasked card silent and the answered one saying a person let it through passes,
  and anything that renders the two alike fails however well it reads. The other two
  hold the plain/technical split and check that an answered card stops offering the
  two buttons.
- **`_lib/pipeline.test.ts` — 1 new.** The same property through the real write
  path, because the thing that rots is not the function, it is the *supply*: stop
  passing an actor to `confirmHeld`, or change how a confirmation is narrated, and
  `answer.test.ts` still passes on its fixture while the demo quietly goes back to
  reporting a change the visitor allowed as one Loom made alone.

Both new card tests were confirmed to fail against the unmodified component before
being kept — 2 failed, 8 passed — so neither is asserting something that was
already true.

`src/` was not opened. No framework gap was found and no primitive was wanted: the
specimen page is untouched.

## Findings

**Closed:** none. The one open finding owned by this lane is the chip collision,
and it is untouched — see below.

**Filed:**

- `Loom demo` → itself: **the diagnosis**, because the general shape has now
  recurred and is worth having in the channel rather than only in a report. *This
  surface's failures are not missing machinery; they are machinery that does not
  reach the screen.* A record that carried the field, a runtime that documents why
  the field exists, a test asserting it arrives, four other surfaces printing it —
  and a card that read it never.
- `Loom demo` → itself: **“Put it back” does not put it back on the first press**,
  and the frame beside it says it does. The undo is itself weighed by the Gate, so
  it comes back *Waiting on you* — which is honest, and is the same class of defect
  the 24 August run fixed for the primary ask. `WhatHappens` step three promises
  *“a button that really puts the page back”*, meaning *a real change rather than a
  rewind*; a stranger reads it as *immediately*. Recommended as the next unit, with
  the reasoning, rather than taken here.
- `@jonathanbravecredit`: **`21st.dev` is still `EGRESS_BLOCKED`**, verified a
  fifth time from this lane. Dated on the existing entry rather than opened again.
- `@jonathanbravecredit`: **`docs/rollout.md` still points at the demo's old
  address** and the `Loom demo` brief still opens with a task that landed on
  21 August. Both were filed on 24 August; both are still true this morning, so the
  entry is dated rather than repeated. Each costs a fresh session its opening
  minutes.

## The one thing I did not fix, said plainly

**The chip collision is still there**, and this is the third run in a row it has
been deferred, which is now itself worth reporting. It is in the 23 August finding,
and it is visible in this run's phone screenshots: *Something was removed here*
landing on *told for two years*, and on the wide layout on *the coast path with my*.

I took the answered-hold gap over it, and the reason is the same one the last run
gave for its own choice: a chip overlapping a line of a quote is a blemish on a
state the visitor reached; a record that drops the visitor's own act is the
argument failing. But two deferrals is a pattern, so rather than repeat *“it is a
unit of its own”* I measured it and can hand the next run something concrete:

- The collision is **always on a `near` mark** — a removal or an addition, where the
  chip lands on the *neighbour* of a node that is not there. `spotlight.ts`'s
  `labelFor` already knows this case; it is the `placed === "near"` branch.
- Which means the free space is known and is not a corner at all: **the gap the
  missing node left is directly above the neighbour**, and it is empty by
  definition. A `near` chip belongs there, outside the band's box; an `own` chip
  stays in the corner where it has never collided.
- The clipping correction that ruled straddling out (`loom.hero` clips its own
  overflow) does not bite here, because the hero is never a `near` neighbour: a
  removal cannot leave a gap above the first band.

That is measurable in a browser in one sitting and does not touch the ring, the
colours or the scroll. It is the next thing I would build, and now with a proposal
rather than a restatement.

## Open questions

Nothing blocking. Two carried, unchanged by this run:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **“Ask about just this”** — the scope control, reasoned out in this lane's
  22 August finding. Still about zero saving on an eight-band page and still the
  better claim.

## The visuals

| | |
| --- | --- |
| [before](2026-08-25-demo-the-record-forgot-you-said-yes-before.png) | `main` this morning. Two **Applied** cards in one rail. One was made by Loom alone and one only because a person pressed a button, and nothing distinguishes them |
| [after](2026-08-25-demo-the-record-forgot-you-said-yes-after.png) | the same two cards on this branch. *You said yes. Loom held this change until you answered.* — and the palette card below still says it went ahead on its own |
| [record](2026-08-25-demo-the-record-forgot-you-said-yes-record.png) | one card with the disclosure open: the plain sentence in the light, and **the verdict** ending `answered · confirmed by a demo visitor` |
| [phone](2026-08-25-demo-the-record-forgot-you-said-yes-phone.png) | 390×844, the same card after answering. The sentence wraps to two lines and the rule holds |

Every screenshot is this branch's `next build` output driven in Chromium — not the
preview, which this environment cannot open (`vercel.app` is not on the sandbox's
egress allowlist; the standing 19 August finding).

**Preview:** on the pull request.

**To see it yourself:** open `/demo`, press the green button, then press **Apply
this change**, and read the card without scrolling. The green line under the rule
is the whole run. Then press *Re-theme the whole page* and compare the two cards —
that difference is what this surface is for.
