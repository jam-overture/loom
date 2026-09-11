# The rail promised two questions, and the card answered neither

**Routine:** `Loom demo` · **Branch:** `demo-12-what-allowing-it-would-do` (#220)
· **3 September 2026**

The third unit on this pull request, redoing **#202** from the 28 August backlog.
It is on the branch that is already open rather than a `demo-13` cut from `main`,
which is what the backlog entry instructs — and the instruction is load-bearing
here for the third time running: this unit edits `record-card.tsx`, the file that
entry names as one of the two that made sixteen pull requests unmergeable.

---

## What a stranger could not understand before this run

The rail's third panel, *what happens when you ask*, tells a visitor before they
have pressed anything:

> **Loom decides.** Every ask is weighed on two questions: how much damage could
> this do, and can it be taken back? A named rule decides whether it lands on its
> own or waits for you to say yes.

It is the best sentence on this surface about the Gate — the whole mechanism in
one line with no vocabulary in it. Then they press **Take the numbers off**, and
the card that comes back answers neither question:

> **Waiting on you** · *"Take the numbers band off the page."* · Loom will not
> make this change until you say yes. · Riskier than a request from here is
> allowed to be without asking. · **This comes off the page, and everything under
> it goes too.** *"3,400" "24" "92%"* · **[Apply this change] [No thanks]**

Both answers were on the record and had been since the surface was built. They
were one click down, in the runtime's shorthand: `stakes: medium`, `reversible:
yes`, `undo carries: 4 nodes`. So a stranger was told what would be weighed,
watched a verdict arrive, and never saw the weighing. What they leave with is
*some rule stopped it*, which is an assertion.

### And the half the closed branch did not name, which is the bigger one

The 30 August branch argued this as a broken promise, and it was right. What it
could not know is what the lane shipped two days ago: *"This comes off the page,
and everything under it goes too"*, directly above the green button.

That sentence is a good one and it made the omission worse. **The card now
describes a loss immediately above the button that commits to it, and said
nothing anywhere near that button about the page being recoverable.** The
reassurance existed — it is the most persuasive number on the whole record — and
a visitor could reach it in exactly two ways: open the disclosure and read `undo
carries: 4 nodes`, or press **Apply this change** and find the undo on the card
that appears afterwards. One press too late.

The demo's entire argument is that a change comes with its inverse. It was
arriving after the decision it was supposed to inform.

## What a stranger can understand now

The same press, on this branch:

> **WHAT LOOM WEIGHED**
> *How much damage could this do?*
> **Some risk.** Worth a look before you say yes, but nothing drastic.
> *Can it be taken back?*
> **Yes.** The 4 pieces it takes off the page are kept, so the exact opposite of
> this change already exists.

— above the rule that read them, which is the order the rail promised, and on the
same card as the button it makes pressable. Nothing was removed to make room:
the level, the factor codes, `reversible` and `undo carries` keep the rows they
had, one click down, as the evidence for the sentences above them.

The whole card still fits above the fold at 1440×900 with both buttons in view,
and at 390×844, which was worth checking rather than assuming — `AnswerInView`
scrolls the waiting card into view and this unit made that card ninety pixels
taller.

## The changes

### `_lib/weighed.ts` — the two answers, in the words they were asked in

A pure function over the record, with no React in it, because which sentence a
level or a retained count earns is the part worth testing.

**No new vocabulary.** The stakes sentences are the portal's `STAKES` table and
the reversibility clause its `reversibilityWord`, both already exported and
neither previously read by this surface. A visitor told *"Some risk"* here and a
reviewer told the same thing three files away are looking at one product; a
second table in this lane would be a second product's worth of drift waiting to
happen.

What the module adds is the **pairing**, and the fact that `WEIGHED_QUESTIONS` is
read by the rail that promises the questions *and* the card that answers them. A
reworded question on one side with an unchanged heading on the other is exactly
the drift that opened the gap, and it now turns a test red.

Two sentences are this surface's own because nothing else could say them:

- `retainedNodeCount` said plainly. *"The 4 pieces it takes off the page are
  kept"* is why the undo is real rather than a promise — the page has not been
  asked to remember what it looked like, the record is holding the removed
  content. A change that removes nothing gets the shorter sentence, because *0
  pieces are kept* is a lie about a theme swap.
- It says the opposite **exists**, never that pressing the button puts the page
  back at once. An undo is a change of its own and is gated like any other
  ([0032](../decisions/0032-an-undo-is-a-proposal-not-a-rewind.md)); a promise here
  would be the same defect one control further along, which `UNDO_CAUTION` was
  written last week to stop.

### `_components/weighed.tsx` — a panel, headed, with no id

Two changes against the closed branch, both found by looking at the frames:

- **The heading.** The block was unheaded there. That is survivable on a held
  card and not on an answered one: the portal's sentence for `medium` is *"Worth
  a look before you say yes"*, and under an **Applied** badge three lines above
  *"You said yes"* it reads as stale advice. Headed *what Loom weighed* it is the
  reasoning that was in hand when the Gate decided, which is what it is. It also
  answers a question the unheaded version left open for a visitor who has not
  read the rail — *whose* questions are these, and are they being put to me?
  The alternative was a stakes table of this lane's own, phrased for two tenses,
  which is the drift the module exists to refuse.
- **No `id`.** The closed branch used `aria-labelledby`, which is right for a
  singleton and wrong here: this renders once per card, so a page with a dozen
  records would have carried a dozen elements sharing one id.

It is a bordered panel rather than a third left rule. The card already spends
that device twice — green for what the visitor did, amber for what a change would
do — and both are Loom addressing the reader. This is the one block that is Loom
showing its working.

### `_lib/record.ts` — `StakesView.level` narrowed from `string` to `StakeLevel`

It always held one. It was widened when the view was written because the only
consumer printed it; a `string` read against a four-entry table is either a cast
or an unreachable branch, both of which are a surface pretending it might be
handed a level the Gate cannot produce.

## Decisions taken that were not specified

- **The block stays on an answered card**, not only on a held one. The weighing
  is what the Gate did with this ask — a fact about the record, not a control —
  and a card that dropped it once the reasoning stopped being urgent would be a
  record that forgets its own argument. The heading is what makes that honest.
- **The rule sentence stays between the weighing and the buttons.** The order is
  now *weighed → the rule that read it → what it would do → decide*, which keeps
  both constraints already argued on this branch: the rail's promise that the
  rule reads the two answers, and the 1 September placement of the plain effect
  directly above the two buttons.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record; it prints two fields the record has always carried.
  Nothing was escalated and nothing was left out for review.
- **No file outside `apps/loom/app/(demo)/` is touched.**

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0, first attempt.**

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 |
| `@loom/app` | 162 | 2560 |

Nothing failed, nothing was skipped, no test was weakened. **23 new**, all in
this lane: 12 in `_lib/weighed.test.ts`, 5 in `_components/weighed.test.tsx`, 5
on the card and 1 on the rail.

**Measured rather than asserted.** Reverting `record-card.tsx` and
`what-happens.tsx` to their state on this branch's last commit, with the new
library left in place, turns **5 of the 6** new tests on those two files red. The
sixth — that the level and the retained count are still in the disclosure — was
already true, which is the point of it: it is there to fail if a later run makes
room by taking something away. The other 17 cover functions the old code did not
have, so "they fail without the change" would be a module error rather than a
claim about behaviour; the honest number is five.

**No model was called and none could be.** `ANTHROPIC_API_KEY` is absent from
this run's environment, which is the supported state the brief names: everything
above is the preset path, assessed, gated, logged and inverted exactly like a
model's ([0057](../decisions/0057-a-preset-is-a-deterministic-interpreter.md)).

`src/` was not opened. No framework gap was found and no primitive was wanted.

## Findings

**Closed:**

- **#202, redone** — with the two departures from the closed branch recorded.
- **"the four portal links to `/portal/demo` are still unrepointed"** — and this
  one is a correction rather than a completion. This lane has re-filed it by date
  on three runs, most recently yesterday. **On `d7375ef` three of the four were
  already repointed**, the rail entry by this lane's own #153 on 24 August, and
  the fourth is not a link to the demo — it is the public-path exemption that
  keeps the 308 working for a signed-out visitor following an old bookmark, and
  `paths.ts` documents itself accurately. A finding re-dated without being
  re-verified spends the owning routine's attention on work already done.

**Filed:**

- `Loom portal`: **a `PlainState.meaning` that is advice reads oddly on a
  decision already made.** `STAKES.medium.meaning` is future-tense about a choice
  — right for a queue, slightly wrong on any record of a settled one. Worked
  around here with the heading; filed because the portal's history and audit
  screens print settled decisions too.
- `@jonathanbravecredit`: **`21st.dev` still `EGRESS_BLOCKED`**, ninth time from
  this lane. No cost this run — what decided the block's position, its heading
  and whether the card still cleared the fold was driving the built page.
- `@jonathanbravecredit`: **the brief still opens with the move off
  `/portal/demo`**, landed thirteen days ago, seventh run running.
  `docs/rollout.md:19` still points at the old path.

## Open questions

Nothing blocking.

- **#209 is the last of the four to redo.** Recommendation unchanged from the
  last two runs: one per run, in order, pushed onto whatever pull request of mine
  is open.
- Carried, unchanged: **a refusal can say a repair was declined and this surface
  still does not say it** (framework finding, 21 August), and **"Ask about just
  this"**, the scope control reasoned out in this lane's 22 August finding.
- The 1 September question — **should a primitive type ever get a friendly name
  on this surface?** — did not arise in this unit and my recommendation is
  unchanged: keep the refusal.

## The visuals

Every pair is the same script driven against two real `next build` outputs of
this branch — the commit before this unit and the commit with it — at the same
viewport and the same scroll, so the only difference in the frame is the change.
Not the preview, which this environment cannot open (`vercel.app` is not on the
sandbox's egress allowlist; the standing 19 August finding).

| | |
| --- | --- |
| [before, held](2026-09-03-demo-the-two-questions-it-promised-before-held.png) | the card at the moment of decision: a rule's conclusion, a described loss, and a green button |
| [after, held](2026-09-03-demo-the-two-questions-it-promised-after-held.png) | the same press, with both of the rail's questions answered above the rule that read them |
| [before, applied](2026-09-03-demo-the-two-questions-it-promised-before-applied.png) | the payoff card, which never said what was weighed |
| [after, applied](2026-09-03-demo-the-two-questions-it-promised-after-applied.png) | the same card, with the weighing kept as part of the record |
| [wide](2026-09-03-demo-the-two-questions-it-promised-wide.png) | 1440×900, the whole screen: the ringed band on the stage, the card beside it, both buttons above the fold |
| [phone](2026-09-03-demo-the-two-questions-it-promised-phone.png) | 390×844, the same, stacked |

**To see it yourself:** open `/demo`, press the green button, and read the panel
between *"asked by a demo visitor"* and the rule sentence — then press **Apply
this change** and see that it is still there. Open **Show the full record** for
the numbers those two sentences were computed from.

Nothing is scheduled and nothing is watching this pull request.
