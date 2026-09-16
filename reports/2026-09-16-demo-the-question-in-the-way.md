# The question the next button answered for you, with no

**Routine:** `Loom demo` · **Branch:** `demo-19-the-question-in-the-way` · **16 September 2026**

**Deployed preview:**
https://loom-git-demo-19-the-questio-906a22-jpizzolato36-6341s-projects.vercel.app/demo
— public, no sign-in. Press **Take the numbers off**.

The nineteenth run of this lane. It takes the finding the eighteenth filed as
*"the largest thing I found this run and not what I fixed"*.

---

## What a stranger could not understand before this run

**That the button they were about to press would throw away the question they
were being asked.**

The demo's best sixty seconds are the ones between the first press and the
second. Press the big green *Take the numbers off*, and the Gate holds it: the
stat band on the page is ringed amber and labelled **This would be removed**, and
the rail says `Waiting on you` — *“Loom will not make this change until you say
yes.”* That is the sentence this whole surface exists to produce, about a small
clinic's proof that it can see you.

Then the visitor presses one of the four buttons sitting directly above that
card, because exploring is what the panel is for. Driven against a real
`next build` at 1280×900:

| | the rail |
| --- | --- |
| press **Take the numbers off** | `Waiting on you` · *“Take the numbers band off the page.”* |
| then press **Re-theme the whole page** | `Applied` · *“Switch this page to the other palette.”*<br>`Nothing changed` · *“Take the numbers band off the page.”* |

**Every step of that is correct.** The re-theme is low risk, so the demo's policy
lets it land unattended; landing it moves the tree's revision; a hold names the
revision it was judged against, and `HeldProposal.baseRevision` going stale is
the runtime saying *I will not apply a decision to a page I have not seen*; and
`moved.ts` reports it accurately once it has happened. Nobody is wrong and the
visitor loses the question anyway.

It is worse than one lost card. Driven with all five presets in order, three of
the five end `Nothing changed`, and those are the tallest cards in the rail — so a
visitor who presses every button ends with a record three-fifths composed of asks
that went nowhere.

**And nothing on the screen connected the two.** At the moment of the press the
rail carried two green buttons — *Take the numbers off* in the panel and **Apply
this change** in the card — competing for the same visitor, one of them costing
them the other.

## What a stranger can understand now

The same first press, same viewport, same script, against two real builds:

|  | `main` | this branch |
| --- | --- | --- |
| green buttons on the rail | **2** — *Take the numbers off*, **Apply this change** | **1** — **Apply this change** |
| said before the press that another ask sets the question aside | **nothing** | a caution, **pinned** to the top of the rail |
| a way from the panel to the question | **none** | **Answer it first ↓**, to the card's own id |
| the list's heading | *or ask for one of these* | *ask for something else* |
| asks still offered | 5 | **5** |
| horizontal overflow, 1280 / 390 | 1280 / 390 | **1280 / 390** |

The caution is the rail's own amber — the colour it already gives an open
question in three other places, the `Waiting on you` badge, the rule on the
card's *what would happen*, and the ring on the stage:

> **2 questions are still waiting on you.** Anything else you ask for moves the
> page on — and Loom won’t carry an answer onto a page it hasn’t seen, so they
> would be set aside.
> **Answer them first ↓**

**Nothing was removed and nothing was disabled.** All five asks are still there,
still pressable, and the free-text box is untouched. A visitor who wants to watch
the page move twice is still allowed to; they are told first what it costs.

**The first screen is byte-for-byte what it was.** `before-arrival.png` and
`after-arrival.png` have the same md5 — `41955176…` — because a visitor who has
asked for nothing has no question open, so none of this renders. The sixty
seconds that start the demo were not touched.

## The three changes

### `_lib/set-aside.ts` — new, and the whole of the decision

`setAside(records, answerable)` → `SetAside | undefined`, carrying the count, the
newest open question's `recordId`, the sentence and the words on the way out.

**Keyed on the store, not on the record**, which is the one decision in the file.
A record keeps the `heldProposalId` it was written with; whether that question is
still *live* is a fact about the store and the tree's revision together. `page.tsx`
already computes exactly that list — `answerable`, the holds the page has not
moved past — for the three readings it resolves against the tree, and it hands
the same list here. A record whose hold is spent, declined or dead simply is not
in it.

That direction is the safe one, and it is asserted: a stale `heldProposalId`
cannot manufacture a warning about a question that is not there, and the worst a
mismatch can do is leave the caution off, which is the surface as it stood
yesterday.

The sentence and `movedOn`'s are **one claim said at two moments** — before the
press and after it — so a test asserts both name *a page it hasn’t seen*, on the
clause rather than on either wording.

### `_components/ask-panel.tsx` — a second state, and it is pinned

Three things change while `waiting` is defined, and nothing changes when it is
not.

**The green button steps aside.** The green on this rail belongs to the demo's
next step, and once a question exists that step is not a new ask. The preset is
not withdrawn — it drops into the list at the position the table gives it, so the
four asks already there do not move under the visitor's cursor.

**The caution is pinned, and that is the part this run got wrong first.** The
first version sat statically above the list, which is where the rule says a
consequence goes: under the control it is about. Measured, it was never read.
Pressing the lead sends `AnswerInView` to bring the 503px card into the rail's
scroller, and `block: "nearest"` — the minimum movement, which is the right rule
— leaves the rail at a **scrollTop of about 400**. That carries the claim, the
frame sentence, the list's heading, the first ask and the caution off the top.
What was left on screen was four live buttons and the question they would kill,
with nothing between them: the warning had been written and placed exactly where
the visitor was not looking.

So it sticks to the top of the scroller for as long as any ask control is in
view, and releases when the panel does. `lg:-top-5` rather than `top-0`, because
a sticky `top-0` inside a scroller with `p-5` pins twenty pixels down and a
button's bottom edge slides through the gap — measured, and the bottom border is
what makes the card passing underneath read as passing underneath. On a phone the
document is the scroller and there is no padding to compensate for, so the
negative offset is wide-only: it would otherwise take the first line of the
sentence off the top of the viewport.

**The way out is a link, not a button**, because it goes somewhere rather than
doing something. It is a fragment to `record.recordId`, which `record-card.tsx`
has put on the card's own element since `AnswerInView` needed it — so the answer
is given on the card that says what it is answering, and never from up here where
the question is not in sight.

### `_components/record-card.tsx` — `scroll-mt-28`, the other half of the pin

Without it the fragment lands the card's top *underneath* the band that sent the
visitor to it, `Waiting on you` and the utterance behind it. Measured: the strip
is 103px against a rail top of 44, and the card now arrives at 156. Both
scrollers honour it — a fragment navigation and `scrollIntoView` read the same
property — so `AnswerInView` benefits from it too.

## Decisions taken that were not specified

- **Shape (1) of the three the finding listed, and not (2) or (3).** Disabling
  the other asks would be honest and would make the demo feel narrower than it is
  at exactly the moment a visitor is exploring. Re-asking automatically is the
  best experience and the most arguable, it needs a record of its own, and that
  argument is the interesting part — **filed, not folded in.**
- **Taken further than the finding's "one line".** The finding's own estimate was
  that this cost one line and could not be wrong. The line was written, measured,
  and found to be off the top of the scroller; the pin, the green button and the
  scroll margin are what make it true rather than merely present.
- **The panel is told, not deciding.** Whether a hold can still be answered needs
  the store and the revision, and the panel has neither — the same seam every
  other reading on this surface uses.
- **The plural stays.** Two *different* questions open at once is a real state
  and the demo should keep it. That one of them can be the same ask asked twice
  is a separate defect, found this run and filed.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out.
- **No file outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and this report. `src/` was not opened at all.

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, read off the run:

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 153 | 2,697 |
| `@loom/app` | 264 | 4,673 |

657 findings, 0 malformed. 106 prerendered pages, 834 text junctions, 0 run
together.

The demo lane's own suite goes from **31 files / 408 tests** to **32 files / 429
tests** — **twenty-one added, none weakened** — counted per file against a real
run of `main`:

| file | `main` | branch |
| --- | --- | --- |
| `_lib/set-aside.test.ts` | — | 10 |
| `_components/ask-panel.test.tsx` | 9 | 17 |
| `_components/record-card.test.tsx` | 61 | 63 |

**It was red once and the failure was mine, on the lesson the last two reports
end with.** `pnpm verify` exited 2 on a single `TS6133` — a `container` I had
destructured and then rewritten the assertion to use `screen` instead. That is
the third consecutive run of this lane to typecheck before the last test edit
rather than after it, and the test runner is blind to it: a type error in a test
file is invisible to the runner that executes it. Fixed, and `pnpm verify` re-run
**from the top**; the numbers above are from that green run.

**Every defect was put back one at a time and the whole lane suite re-run.** All
nine were caught:

| defect restored | what fails |
| --- | --- |
| the caution never renders | 3 tests |
| the panel keeps its green button while a question is open | 2 tests |
| the caution is not pinned | 1 test |
| the list's heading never changes | 1 test |
| the way out points somewhere other than the card | 1 test |
| a hold the page has moved past still warns | 2 tests, across two files |
| it points at the oldest open question rather than the newest | 1 test |
| the way out stops agreeing with the count | 1 test |
| the card stops leaving room for the pinned strip | 1 test |

No test was weakened and nothing was skipped.

**One thing worth writing down about how that matrix was run.** The first attempt
restored each defect with `perl -pi` and undid it with `git checkout --`, on a
working tree that had not been committed — so `git checkout` restored the *index*,
which was `main`, and two hours of edits to `ask-panel.tsx` and `record-card.tsx`
went with it. They were rewritten and the matrix re-run against a commit. The
untracked new module was not restorable that way at all, which is why the first
run's numbers were nonsense: the defects accumulated. **Commit before you run a
defect matrix**, or it is not a matrix.

## Findings

**Closed:** the 15 September entry this unit is the answer to, naming the branch,
and saying plainly that shape (1) is taken and shape (3) is not.

**Filed two:**

- `Loom demo`: **the demo will hold the same question twice.** Two presses of one
  button leave two identical `Waiting on you` cards about the same four nodes,
  each with its own **Apply this change**, and answering either kills the other.
  `availablePresets` asks each preset whether it has anything to do, and a hold
  changes no tree — so while the removal is only held the stat grid is still
  there and `trim` can still plan. Nothing in the chain is wrong. Found because
  the new caution counts, and said *“2 questions are still waiting on you”* about
  one removal asked twice. Recommendation: filter out the presets that already
  have a question open, which `ChangeRecord.presetId` already makes possible.
- `Loom demo`: **the automatic re-ask**, carried out of the closed finding with
  the argument it needs — that a surface asking on a visitor's behalf is
  survivable only if the re-ask writes a record saying it was automatic, and
  `ChangeRecord` has no field for that today.

**Re-verified, not re-filed:** `21st.dev` `EGRESS_BLOCKED`, an **eighteenth**
consecutive run.

**Carried, not closed.** Both of the 14 September findings — a `configure` never
saying which way it went, and `actions.ts` being the one file in this lane a test
cannot reach — are untouched by this unit and still open.

## Open questions

Nothing blocking.

- **The automatic re-ask** is the largest thing now open on this surface, and it
  is a design question before it is a build. Filed with the argument.
- **“Ask about just this”** — the scope control reasoned out in this lane's
  22 August finding, still the largest unbuilt idea here.
- **The rail and the stage scroll independently** (7 September). Recommendation
  unchanged: make the chip a link to its card, or leave it. This run built the
  first link of that kind, from the panel to a card, and it cost one anchor and
  one scroll margin — so the chip version is now cheap if it is wanted.

## The visuals

All five are the same script driven against two real `next build` outputs,
`main`'s and this branch's, so the only difference in a pair is the change.

| | |
| --- | --- |
| [before](2026-09-16-demo-the-question-in-the-way-before.png) | `main`, one press in: four live asks above the question, two green buttons on the rail, nothing saying they are related |
| [after](2026-09-16-demo-the-question-in-the-way-after.png) | the same press: the caution pinned to the top of the rail in the question's own amber, and one green button on the rail — the one under the question |
| [two questions](2026-09-16-demo-the-question-in-the-way-two-questions.png) | the plural, and the whole panel: *ask for something else* with all five asks under it and no primary, the claim and the frame above |
| [answer it first](2026-09-16-demo-the-question-in-the-way-answer-it-first.png) | the link followed — the card lands clear of the strip rather than behind it |
| [phone](2026-09-16-demo-the-question-in-the-way-phone.png) | 390×844. `scrollWidth` 390 against `innerWidth` 390 — no horizontal overflow |
| [arrival](2026-09-16-demo-the-question-in-the-way-arrival.png) | the first screen, unchanged: md5-identical to `main`'s |

Not the preview deployment, which this environment cannot open (`vercel.app` is
not on the sandbox's egress allowlist; the standing 19 August finding).

**To see it yourself:** open `/demo` and press **Take the numbers off**. On `main`
the rail has two green buttons and the four asks above the question say nothing
about it; press one and the question comes back `Nothing changed`. Here the panel
has no green button, an amber band is pinned to the top of the rail saying what
the press would cost, and **Answer it first ↓** takes you to the card that can
still say yes.
