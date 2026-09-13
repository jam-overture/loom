# The sentence a stranger has to act on arrived after the press

**Routine:** `Loom demo` · **Branch:** `demo-12-what-allowing-it-would-do` · **1 September 2026**

The twelfth run of this routine, and the first after the backlog. Four of this
lane's pull requests — #186, #194, #202 and #209 — were **closed unmerged on
28 August** because four runs of one routine had all edited `record-card.tsx` at
once. The maintainer's entry says each lane should redo that work against current
`main`, and the sentence that matters most in it is the one about what to do
differently: *before starting a unit, check whether you already have an open pull
request.* This lane has none, so this is a clean redo of **one** of the four,
against `d7375ef`.

**#186 is the one to redo first** and the choice is not close. The other three
are a defect fix, a stakes reading and a policy ceiling — all good, all on cards
a visitor reaches *after* they have already decided. #186 is the line they decide
*from*.

---

## What a stranger could not understand before this run

I built `main` and this branch, served both, and drove them in Chromium at
1440×900 and 390×844 with the same script, pressing what the rail puts first —
so the only difference between the two frames below is the change.

Press **Take the numbers off**. Loom stops and asks. This is the card, on `main`:

> **Waiting on you** · *"Take the numbers band off the page."*
> Loom will not make this change until you say yes.
> asked by a demo visitor
> Riskier than a request from here is allowed to be without asking.
>
> **[ Apply this change ]  [ No thanks ]**
>
> What this would do to your page
> Deletes the `loom.stat-grid`, and the 3 pieces inside it.
> Inside `loom.page`
> › What the change record says
> › Show the full record

Three things are wrong in that frame and the first one is the one nobody had
named.

**The description is below the buttons.** A visitor reads down the card — badge,
their own words, *Loom will not make this change until you say yes*, the Gate's
rule — arrives at a green button that says **Apply this change**, and presses it.
What the change *is* is underneath. A description that arrives after the press
has arrived too late, and it is the demo's own card doing it: `ProposalEffectView`
was rendered after the answer form and before the disclosure.

**It names the thing by its type.** `loom.stat-grid` and `loom.page`, in
monospace, in the one sentence a stranger has to act on. The portal is right to
keep those names — a reviewer tells one row from another by them — and a person
who has never heard of Loom can read neither.

**"the 3 pieces inside it" is a count.** The three pieces are `"3,400"`, `"24"`
and `"92%"`, and on a wide screen they are six inches to the left, inside an
amber ring, on the page the visitor is looking at. A count cannot be checked
against a page. A quotation can.

### On a phone they have nothing to check it against at all

This is what makes it more than a wording complaint. At 1440px the band is ringed
in amber beside them, so a visitor who cannot read `loom.stat-grid` can still
look left and see three numbers in a box. **At 390px they cannot.** The two panes
stack; `SpotlightScroll` deliberately declines to carry a held change's scroller
to the mark, because that would carry the visitor away from these very buttons;
`AnswerInView` brings the card up instead. Both are right and both were argued
out in earlier runs of this lane. Together they produce the demo's worst frame:

> A stranger on a phone is asked to allow *"Deletes the `loom.stat-grid`, and the
> 3 pieces inside it"* — with the page nowhere on the screen, under a green
> button they have already read.

The Gate's whole claim is that a person decides. A person who cannot read the
proposal has not decided; they have consented.

## Half of #186's argument had been answered by somebody else

This is the part of the redo worth reading, and it is why the closed branch was
not simply pushed again.

On 28 August this section of the card read `what this would change · delete ·
loom.stat-grid · loom.page · and 3 nodes under it` — the delta's account of
itself, verbs in monospace chips. **`Loom portal` has since rewritten its own
component**, and rewritten it towards the same rule this unit is about: the
reader's sentence leads, the verb list is one click down under *What the change
record says*, and the heading asks the reader's own question — *What this would
do to your page*. `OperationEffect` gained `op`, `into`, `before` and `from` so a
sentence could be worded from the pieces rather than parsed back out of a
composed string.

So the "before" in this report is **materially better than the one #186 was
written against**, and the honest version of this unit's case is narrower than
the one on that branch: not *the review tool's vocabulary is in the light*, but
*the last two nouns in it are still ids, the count is still a count, and it is
under the button.* That is what I built, and the three-line diagnosis above is
written against what `d7375ef` actually renders rather than against what the
closed branch said it rendered.

Cherry-picking cost three conflicts. Two were noise — `FINDINGS.md`, and the
`FACTS.decisions` bump that #174 has since made unnecessary, so the marketing
lane's file is **untouched by this branch**. The third was the fixture: four new
required fields, and an assertion looking for a bare `delete` text node that no
longer exists. Both repaired against the real type rather than around it.

### The shape, six for six

This lane's standing diagnosis has been *the machinery is already there and
correct; what is missing is the last hop onto the screen* — sharpened on #170 to
the better question, **whose sentence is this, and is this the place that
sentence is spoken.** Today adds a third clause the backlog taught: *and has
somebody else answered half of it since.*

## What a stranger can understand now

The same press, same viewport, on this branch:

> **Waiting on you** · *"Take the numbers band off the page."*
> Loom will not make this change until you say yes.
> asked by a demo visitor
> Riskier than a request from here is allowed to be without asking.
>
> — ruled off in the same amber as the ring around the band on the stage:
>
> **This comes off the page, and everything under it goes too.**
> *"3,400" · "24" · "92%"*
>
> **[ Apply this change ]  [ No thanks ]**
> › Show the full record

The three figures in that line are the three figures inside the amber ring on the
left. Nothing tells the visitor to make that connection; the colour and the words
do it, which is how the rest of this rail teaches.

`Deletes the loom.stat-grid, and the 3 pieces inside it` has not been removed. It
is one click down, whole, in the section of technical account it always belonged
to — between the rationale and what the Gate weighed, with its own nested
disclosure intact. The card is **two disclosures shorter at the top level** for
it, which is the other thing the screenshots show: on `main` a visitor at the
moment of decision is looking at a ladder of two collapsed sections.

## The changes

### `_lib/plain-change.ts` — new, and it names nothing by its type

The obvious plain rendering is a table of friendly names — `loom.stat-grid` →
"the numbers band" — and it is a trap twice over. The starter registry holds
seventy primitives and `Loom primitives` ships more most weeks, so the table is
stale by construction, and the test that would stop it drifting would turn
*another lane's* pull requests red. A visitor does not know what a stat grid is
called anyway.

**What they recognise is the words they were just reading.** So a change is named
by the strings it would take, bring or move, and no registry can outgrow that.
Three decisions inside it:

- **One string per node, never all of them.** A `loom.stat` carries three
  (`value`, `label`, `caption`), so taking every string in document order fills
  the allowance from the first figure and reports the band as *"3,400" ·
  "appointments last year" · "four clinicians, six days a week"* — one figure,
  described three ways. One per node reports it as *"3,400" · "24" · "92%"*,
  which is what a person would say the band is.
- **Which props are words is the registry's answer, not a list here.** `tone`,
  `align`, `backdrop`, `variant` are closed vocabularies their authors declared,
  and `RegisteredPrimitive.choices` already names every one. A primitive that
  gains a choice is excluded on the next render with nothing to maintain — the
  property that makes this safe in a repository where another lane adds
  primitives weekly. A primitive that declares *no* choice contributes every
  string it carries, and `loom.stat` is why that is right: all three are printed.
- **Addresses are not words.** `mailto:reception@harbourline.example` is a string
  a primitive carries and nobody reads off a page.

What is left, once types are gone, is the delta model's own distinction, and it
is the plainest thing on the surface: an **insert** or a **remove** changes what
the page says, a **move** changes where it says it, a **configure** changes how
it looks. Four operations (0001), three sentences, every one checkable against
the page beside you.

### `_components/what-would-happen.tsx` — new, and it is mostly a position

Under the rule, **above the answer**, in the tone of a change that has not
happened yet. The left rule is `answerNote`'s device in the other colour, and the
two can never collide: a held change has no answer, and an answered one is no
longer held. Amber because that is the colour of the ring around the band on the
stage.

### `_components/record-card.tsx` and `demo/page.tsx`

The card takes a second reading of the same held proposal and places the two: the
plain one in the light before the buttons, the portal's inside the disclosure.
The page computes both, because the tree and the held delta are only in hand
together there. `settingsOf(demoRegistry)` is read once per render rather than
once per proposal — which props are a closed choice is a fact about the registry
and cannot differ between two cards on one page.

## Decisions taken that were not specified

- **`ProposalEffectView` stays the portal's component and stays on the card.**
  Forking it would give the two surfaces two answers to *what would this do to
  your page*, and the portal's now has a worded sentence, the before-and-after of
  every prop, and the obstacle. What was wrong was never the view; it was that a
  stranger met it after the button and in ids.
- **No plain-name table for primitive types**, for the reason above. This is the
  decision I would most want a second opinion on and it is in *Needs your input*.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record: it reads a delta and a tree that are both already in
  hand and says what they mean in English. Nothing was escalated and nothing was
  left out for review.
- **No file outside `apps/loom/app/(demo)/` was edited** — not even the
  `FACTS.decisions` line that four consecutive runs of this lane had to bump.
  #174 landed in the 1 September repair and derives the count now, so the
  cross-lane edit this lane kept apologising for has stopped existing.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on the finished branch.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 |
| `@loom/app` | 160 | 2519 |

Nothing failed, nothing was skipped, no test was weakened. **Twenty-two tests are
new**, all in this lane, in two new files and one existing one:

- **`_lib/plain-change.test.ts` — 14 new, a new file.** Read against the real
  page tree and the real presets rather than a fixture, because the property that
  matters is not that the function returns strings — it is that *the strings it
  returns are on the page a visitor is looking at*. A fixture would pass while
  the demo quoted three enum values at a stranger. Among them: that a removal is
  named by the figures and not by the first figure three times; that every prop
  the registry calls a closed choice is excluded and a primitive with no choices
  keeps all of its strings; that addresses are left out; that the words not shown
  are counted; and — the one that guards the whole unit — **that no sentence
  contains `loom.`, `delta`, `node`, `revision` or `proposal`**, asserted as a
  property, so any rewording that reaches for the runtime's vocabulary fails
  however well it reads.
- **`_components/what-would-happen.test.tsx` — 5 new, a new file.** That the
  words arrive quoted and in order, that the remainder is counted, that a change
  of settings draws no empty row where words would be, and that an applied card
  renders nothing at all rather than an empty frame.
- **`_components/record-card.test.tsx` — 3 new.** The placement, which is the
  whole change: the plain sentence is **not** inside the `<details>` and
  `loom.stat-grid` **is**; the sentence comes before the buttons in document
  order; and an applied card stops describing a change it has already made.

`src/` was not opened. No framework gap was found and no primitive was wanted.

**One test of `main`'s was corrected rather than weakened**, and it is worth
naming: `record-card.test.tsx` asserted that the disclosure contains the text
`delete`. The portal's rewrite composes that verb into
`delete loom.stat-grid — and 3 nodes under it`, so the bare text node is gone.
The assertion now looks for the composed string, which is a stricter claim about
the same thing. The fixture's `text: []` is left empty deliberately — the portal
genuinely finds no words on a `loom.stat-grid` (see the finding), and filling it
would make the test agree with a page that does not exist.

**`main` is green at `d7375ef`.** The 1 September lessons finding says it is red
on `lessons/09-the-gate.md`; fix **A** has since been taken and the test passes.
Filed as closed so the next run does not budget a repair.

## Findings

**Closed:** the 28 August backlog entry, **for #186 only** — #194, #202 and #209
are still to redo and the entry says so.

**Filed:**

- `Loom demo` → itself: **what a redo actually costs**, with the three conflicts
  and the half of #186's argument the portal answered in the meantime. A closed
  branch is a proposal, not a patch, and the other three redos should expect the
  same.
- `Loom portal`: **`OperationEffect.text` finds no words on a primitive that
  carries its content in props.** It walks text nodes only, so on any
  props-carrying primitive *its words* is empty — on your own review-queue card,
  not just here. The mechanism is on this branch if you want it. Re-filed: the
  original was on #186 and never reached `main`.
- `Loom portal`: **the four links to `/portal/demo` are still unrepointed**,
  eleven days on, so the 308 shim cannot be deleted. A date, not a new argument.
- `@jonathanbravecredit`: **the brief still opens with a task that landed on
  21 August**, fifth consecutive run — with the note that its *second* problem,
  *"it is clunky"*, is live and was acted on.
- `@jonathanbravecredit`: **`21st.dev` is still `EGRESS_BLOCKED`**, fourteenth
  time, and `docs/routines.md` still lists it as allowed.
- `Loom lessons`: **`main` is green**, including the test filed red today; the
  reader-facing half of that diagnosis survives.

## The one thing I did not fix, said plainly

**A configure still says nothing about what it would set.** *"How the whole page
looks changes. Not a word on it changes."* is true and is the right sentence for
a re-theme, and it is the same sentence for a change to one prop on one band. A
visitor who wants the difference has to open the record, where the
before-and-after of every key is waiting. I left it because the honest plain
version needs a name for the thing being configured — the primitive-type naming
problem this unit deliberately refused — and because the two presets that
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
| [before](2026-09-01-demo-what-allowing-it-would-do-before.png) | `main` at `d7375ef`, the held card: the buttons first, then *Deletes the `loom.stat-grid`, and the 3 pieces inside it*, then two collapsed disclosures |
| [after](2026-09-01-demo-what-allowing-it-would-do-after.png) | the same press on this branch: *This comes off the page, and everything under it goes too. "3,400" "24" "92%"* — above the buttons, in the amber of the ring around the band on the left, and one disclosure instead of two |
| [record](2026-09-01-demo-what-allowing-it-would-do-record.png) | *Show the full record*, open, with its nested *What the change record says* open too. Nothing was removed: the rationale, the interpreter, the delta, the portal's whole reading, both revision numbers, both stake factors, the inverse, the rule, the policy and the fingerprint |
| [phone before](2026-09-01-demo-what-allowing-it-would-do-phone-before.png) | 390×844 on `main`. The page is off-screen and the card names two ids under a button the visitor has already read |
| [phone](2026-09-01-demo-what-allowing-it-would-do-phone.png) | the same viewport on this branch. The card answers its own question before it asks it, and the two buttons sit where the second disclosure used to |

Every pair is one script driven against two `next build` outputs — this branch's
and `main`'s, both served locally — so the only difference in the frame is the
change. Not the preview, which this environment cannot open (`vercel.app` is not
on the sandbox's egress allowlist; the standing 19 August finding).

**No model was called and none could be:** `ANTHROPIC_API_KEY` is absent from
this run's environment. That is the supported state the brief names, and every
frame above is the preset path — deterministic, instant, and assessed, gated,
logged and inverted exactly like a model's ([0057](../decisions/0057-a-preset-is-a-deterministic-interpreter.md)).
It also means the one screenshot #186 called *the one to look at* — a sentence
typed into the box, interpreted by a model, and the card quoting the words it
chose before the visitor says yes — **could not be retaken this run**. The code
path is unchanged and covered by tests; the picture is not in this report.

**To see it yourself:** open `/demo`, press the green button, and read the amber
line directly above *Apply this change* — then look left at the ringed band and
find the same three figures. Then open *Show the full record* and find
`delete loom.stat-grid` still there, with everything else.

Nothing is scheduled and nothing is watching this pull request.
