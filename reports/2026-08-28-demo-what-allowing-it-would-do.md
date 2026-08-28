# The one question the demo answered in the review tool's words

**Routine:** `Loom demo` · **Branch:** `demo-08-what-allowing-it-would-do` · **28 August 2026**

The eighth run of this routine. The seven before it fixed where the demo lives,
how its controls are ranked, whose page is on the stage, which change the primary
button asks for, what the record says once you have answered, what the undo
promises, and where the mark on the page is drawn. The sequence is whole and the
page says where it happened.

This run is about **the one sentence a stranger has to act on**, and it was the
only thing on the surface still written for somebody who already knows what Loom
is.

---

## What a stranger could not understand before this run

I drove the built page in Chromium at 1440×800, 1440×900 and 390×844, pressing
what the rail puts first.

Press **Take the numbers off**. Loom stops and asks. The card that appears is
good — a badge saying *Waiting on you*, your ask in your own words, *Loom will
not make this change until you say yes*, the Gate's rule in the rule's own
words — and then, in the light, unasked, directly above the two buttons that
decide it:

> **what this would change**
> `delete` `loom.stat-grid`
> `loom.page`
> *and 3 nodes under it*

That is the last thing a visitor reads before they press **Apply this change**,
and it is the review tool's answer to the review tool's question. It is
`(portal)/_components/proposal-effect`, borrowed whole. **In the portal it is
exactly right**: a reviewer knows what a stat grid is, has the tree outline open
beside them, and is being asked about a delta. Here it is the one place on the
whole surface where the technical record stands in the light — in a route group
whose every other file has been built to the maintainer's rule that *plain
language is the default and the technical record is one click away*.

### On a wide screen a stranger has a second answer. On a phone they have none.

This is what makes it more than a wording complaint. At 1440px the band is ringed
in amber on the page beside them with *This would be removed* on it, so a visitor
who cannot read `loom.stat-grid` can still look left and see three numbers in a
box. **At 390px they cannot.** The two panes stack; `SpotlightScroll` deliberately
declines to carry a held change's scroller to the mark, because that would carry
the visitor away from these very buttons; `AnswerInView` brings the card up
instead. Both are right, and both were argued out in earlier runs of this lane.
Together they produce the demo's worst frame:

> A stranger on a phone is asked to allow `delete loom.stat-grid` — *and 3 nodes
> under it* — with the page nowhere on the screen.

So the sixty seconds ran like this:

> Land. Press the green button. **Waiting on you** — *Loom will not make this
> change until you say yes.* Read the one line that says what "this change"
> actually is. It says `delete loom.stat-grid`. Press the green button anyway,
> or leave.

The Gate's whole claim is that a person decides. A person who cannot read the
proposal has not decided; they have consented.

### The shape, five for five

This lane's standing diagnosis has been *the machinery is already there and
correct; what is missing is the last hop onto the screen*. Yesterday's run
sharpened it on #170 to the better question — **whose sentence is this, and is
this the place that sentence is spoken.** This is that, again, and the largest
instance of it:

- **24 Aug** — a policy ceiling two files from the button it silenced.
- **25 Aug** — a field four surfaces print and this one carried unread.
- **26 Aug** — a string the runtime is right to compose and this surface was
  wrong to quote.
- **27 Aug** — a distinction this surface's own code drew in words and not in
  pixels.
- **Today** — a whole component another surface is right to render, rendered
  here, at the one moment a stranger has to act.

Nothing was broken in any of the five.

## What a stranger can understand now

The same press, on this branch, at the same viewport:

> **Waiting on you** · *"Take the numbers band off the page."*
> Loom will not make this change until you say yes.
> asked by a demo visitor
> Riskier than a request from here is allowed to be without asking.
>
> — and, ruled off in the same amber as the ring around the band on the stage:
>
> **This comes off the page, and everything under it goes too.**
> *"3,400" · "24" · "92%"*
>
> [ Apply this change ] [ No thanks ]

The three figures in that line are the three figures inside the amber ring six
inches to the left. Nothing tells the visitor to make that connection; the colour
and the words do it, which is how the rest of this rail teaches.

**And it works on an ask nobody in this repository wrote.** I typed *"Take the
insurer logos off the page."* into the free-text box, sent it to the model, and
the card came back:

> **This comes off the page, and everything under it goes too.**
> *"Recognised by" · "Meridian Health" · "Colworth Assurance"* — and 2 more

That is the demo's actual claim, made visible for the first time: you asked for
something in your own words, a model worked out what you meant against this page,
and **before anything happens you are shown the words it would take.** The
screenshot is in the table below and it is the one to look at.

`delete loom.stat-grid` has not been removed. It is one click down, in **the
proposal**'s neighbour section inside *Show the full record*, between the
rationale and what the Gate weighed — which is where the fingerprint, the
stakes and the inverse have always been.

## The changes

### `_lib/plain-change.ts` — new, and it names nothing by its type

The obvious plain rendering is a table of friendly names — `loom.stat-grid` →
"the numbers band" — and it is a trap twice over. The starter registry holds
**sixty-eight** primitives and `Loom primitives` ships more most weeks, so the
table is stale by construction, and the test that would stop it drifting would
turn *another lane's* pull requests red. A visitor does not know what a stat grid
is called anyway.

**What they recognise is the words they were just reading.** So a change is named
by the strings it would take, bring or move, and no registry can outgrow that.

Three decisions inside it are worth naming:

- **One string per node, never all of them.** A `loom.stat` carries three
  (`value`, `label`, `caption`), so taking every string in document order fills
  the whole allowance from the first figure and reports the numbers band as
  *"3,400" · "appointments last year" · "four clinicians, six days a week"* — one
  figure, described three ways. One per node reports it as *"3,400" · "24" ·
  "92%"*, which is what a person would say the band is.
- **Which props are words is the registry's answer, not a list here.** `tone`,
  `align`, `backdrop`, `variant` are closed vocabularies their authors declared,
  and `RegisteredPrimitive.choices` already names every one. A primitive that
  gains a choice is excluded on the next render with nothing to maintain — which
  is the property that makes this safe in a repository where another lane adds
  primitives weekly. A primitive that declares *no* choice contributes every
  string it carries, and `loom.stat` is why that is right: all three are printed
  on the page.
- **Addresses are not words.** `mailto:reception@harbourline.example` is a string
  a primitive carries and nobody reads off a page. Quoting one back as "what
  would go" would be a claim about what the visitor can see.

What is left, once types are gone, is the delta model's own distinction, and it
turns out to be the plainest thing on the surface: an **insert** or a **remove**
changes what the page says, a **move** changes where it says it, a **configure**
changes how it looks. Four operations (0001), three sentences, and every one of
them checkable against the page beside you.

### `_components/what-would-happen.tsx` — new, and it is mostly a position

Under the rule, above the answer, in the tone of a change that has not happened
yet. The left rule is `answerNote`'s device in the other colour, and the two can
never collide: a held change has no answer, and an answered one is no longer
held. Amber because that is the colour of the ring around the band on the stage.

### `_components/record-card.tsx` and `demo/page.tsx`

The card takes a second reading of the same held proposal and places the two: the
plain one in the light, the portal's inside the disclosure. The page computes
both, because the tree and the held delta are only in hand together there.

## Decisions taken that were not specified

- **`ProposalEffectView` stays the portal's component and stays on the card.**
  Forking it would give the two surfaces two answers to *what would this
  replace*, and the portal's is the one with the before-and-after of every prop
  on it. What was wrong was never the view; it was that a stranger met it before
  they had asked for anything technical.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record: it reads a delta and a tree that are both already in
  hand and says what they mean in English. Nothing was escalated and nothing was
  left out for review.
- **No plain-name table for primitive types**, for the reason above. This is the
  decision I would most want a second opinion on and it is in *Needs your input*
  on the pull request.
- **One line in another lane's file**, and it is the standing `FACTS.decisions`
  defect: `(marketing)/_lib/copy.ts` said 94 decision records and `decisions/`
  holds 95, so `pnpm verify` was red on `main` before this branch existed. Bumped
  to 95, exactly as #177 and #178 already carry it, so whichever lands last is a
  no-op or a one-character conflict. #174 fixes it properly by deriving the
  count; once that merges the line does not exist to edit.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, twice: once on `main` plus the
one-character count fix, to have an honest baseline, and once on the finished
branch.

| suite | files | tests | before | after |
| --- | --- | --- | --- | --- |
| `@loom/runtime` | 111 | 1741 | 1741 | 1741 |
| `@loom/app` | 136 | 1985 | 1963 | 1985 |

Nothing failed, nothing was skipped, no test was weakened. **Twenty-two tests are
new**, all in this lane, in two new files and one existing one:

- **`_lib/plain-change.test.ts` — 14 new, a new file.** Read against the real
  page and the real presets rather than a fixture, because the property that
  matters is not that the function returns strings — it is that *the strings it
  returns are on the page a visitor is looking at*. A fixture would pass while
  the demo quoted three enum values at a stranger. Among them: that a removal is
  named by the figures (`"3,400" · "24" · "92%"`) and not by the first figure
  three times; that every prop the registry calls a closed choice is excluded and
  a primitive with no choices keeps all of its strings; that addresses are left
  out; that the words not shown are counted; and — the one that guards the whole
  unit — **that no sentence contains `loom.`, `delta`, `node`, `revision` or
  `proposal`**, asserted as a property so any rewording that reaches for the
  runtime's vocabulary fails however well it reads.
- **`_components/what-would-happen.test.tsx` — 5 new, a new file.** That the
  words arrive quoted and in order, that the remainder is counted, that a change
  of settings draws no empty row where words would be, and that an applied card
  renders nothing at all rather than an empty frame.
- **`_components/record-card.test.tsx` — 3 new.** The placement, which is the
  whole change: the plain sentence is **not** inside the `<details>` and
  `loom.stat-grid` **is**; the sentence comes before the buttons in document
  order, because a description that arrives after the press has arrived too late;
  and an applied card stops describing a change it has already made.

The placement test was run against the unmodified card first — **1 failed, 12
passed** — so it is not asserting something that was already true.

`src/` was not opened. No framework gap was found and no primitive was wanted.

## Findings

**Closed:** none owned by this lane were closable in this unit — the two open
ones are the ring around a `near` neighbour (filed yesterday, and a unit of its
own) and the standing scope question.

**Filed:**

- `Loom portal`: **`OperationEffect.text` finds no words on a primitive that
  carries its content in props.** It walks text nodes only, so on
  `loom.stat-grid` — three figures, three labels, three captions, every one of
  them printed — *its words* is empty and a reviewer answering that hold is shown
  a subject, a count and nothing they could recognise. Not fixed here: it is the
  portal's file and the portal's reviewers, and this run's harvest lives in the
  demo lane because its rules (one string per node, choices excluded) are tuned
  for a stranger rather than for a reviewer. The mechanism transfers if they want
  it.
- `Loom demo` → itself: **the run's own diagnosis**, now five for five, and the
  refinement that came with it — the question is not *is this string true* but
  *whose sentence is it, and is this the place that sentence is spoken*. Filed
  because the fifth instance is the first where a whole component, rather than a
  string or a field, was the thing in the wrong voice.
- `Loom marketing`, `@jonathanbravecredit`: **`FACTS.decisions` red on `main`
  again**, third lane to hit it in two days.
- `@jonathanbravecredit`: **`21st.dev` is still `EGRESS_BLOCKED`**, verified an
  eighth time from this lane.
- `@jonathanbravecredit`: **the brief still opens with a task that landed on
  21 August**, fifth consecutive run, and `docs/rollout.md:19` still points at
  `apps/loom/app/(portal)/portal/demo`.

## The one thing I did not fix, said plainly

**A configure still says nothing about what it would set.** *"How the whole page
looks changes. Not a word on it changes."* is true and is the right sentence for
a re-theme, and it is the same sentence for a change to one prop on one band.
A visitor who wants the difference has to open the record, where the
before-and-after of every key is waiting. I left it because the honest plain
version needs a name for the thing being configured — which is the primitive-type
naming problem this unit deliberately refused — and because the two presets that
configure are the two the Gate lets through on their own, so a visitor almost
never reads this sentence on a card they have to answer.

## Open questions

Nothing blocking. Two carried, unchanged by this run:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **"Ask about just this"** — the scope control, reasoned out in this lane's
  22 August finding.

## The visuals

| | |
| --- | --- |
| [before](2026-08-28-demo-what-allowing-it-would-do-before.png) | `main`, the held card: `delete loom.stat-grid · loom.page · and 3 nodes under it`, in the light, above the two buttons |
| [after](2026-08-28-demo-what-allowing-it-would-do-after.png) | the same press on this branch: *This comes off the page, and everything under it goes too. "3,400" · "24" · "92%"* — the same three figures as the ringed band on the left |
| [typed](2026-08-28-demo-what-allowing-it-would-do-typed.png) | **the one to look at.** A sentence typed into the box, interpreted by the model, and the card quoting *"Recognised by" · "Meridian Health" · "Colworth Assurance" — and 2 more* before the visitor says yes |
| [record](2026-08-28-demo-what-allowing-it-would-do-record.png) | *Show the full record*, open. **what this would change** is still there, whole, between the proposal and what the Gate weighed |
| [phone before](2026-08-28-demo-what-allowing-it-would-do-phone-before.png) | 390×844 on `main`. The page is not on the screen and the card says `delete loom.stat-grid` |
| [phone](2026-08-28-demo-what-allowing-it-would-do-phone.png) | the same viewport on this branch. The card answers its own question, and the two buttons sit ninety pixels higher for it |

Every pair is the same script driven against two `next build` outputs — this
branch's and `main`'s — so the only difference in the frame is the change. Not
the preview, which this environment cannot open (`vercel.app` is not on the
sandbox's egress allowlist; the standing 19 August finding).

**To see it yourself:** open `/demo`, press the green button, and read the amber
line directly above *Apply this change* — then look left at the ringed band and
find the same three figures. Then open *or type your own*, ask for something the
buttons do not offer, and watch the same line name words the model chose.

Nothing is scheduled and nothing is watching this pull request.
