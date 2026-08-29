# The card took the undo away, on the press that produced a question

**Routine:** `Loom demo` · **Branch:** `demo-09-the-offer-that-withdrew-itself` · **29 August 2026**

Read the last section first if you read nothing else. **This run built a unit
that already exists in an open pull request**, found out halfway through, and
threw most of it away. What shipped is the part that was genuinely new. What it
cost, and why it happened, is the most useful thing this lane has to report
today.

---

## What actually shipped

One defect, on the card a stranger reaches at the end of the demo's best sixty
seconds, and it is unfixed on `main` and in all three of this lane's open pull
requests.

Press the panel's primary ask, allow it, then press **Put it back** — the only
control the payoff card offers. On `main` this is the card you are left holding:

<img alt="the payoff card on main after pressing Put it back: it says Put it back undoes it, and there is no such button on it" src="reports/2026-08-29-demo-the-offer-that-withdrew-itself-before.png">

It says *“Put it back” undoes it* and **there is no such button on it**. The
change is still live on the page. The button removed itself.

What happened is elsewhere on the screen: an undo is a change of its own rather
than a rewind ([0032](../decisions/0032-an-undo-is-a-proposal-not-a-rewind.md)),
so it is interpreted, assessed and gated like any other — and putting the band
back restructures the page at the same depth as taking it off did, so the Gate
**held** it and a second card appeared to ask about it. All correct, and none of
it a reason to take the offer away, because nothing was undone.

The cause is one condition:

```tsx
{record.revision && !undoReport && ( … Put it back … )}
```

`undoReport` is set the moment `undoRevision` returns *anything*. Right for the
undo that **landed**; wrong for every other outcome. Two consequences:

- **On the primary path the offer disappears while the change is still live**,
  and the card's own sentence goes on naming it. Three of the five changes this
  surface offers come back held when a visitor asks for them back, so this is
  the ordinary path rather than a corner of it.
- **Turning the undo down loses it for good.** Answer that second card with *No
  thanks* and the visitor has declined their own undo, and the button never
  returns.

On this branch, the same press:

<img alt="the same card on this branch after pressing Put it back: the button is still there" src="reports/2026-08-29-demo-the-offer-that-withdrew-itself-after.png">

And after answering the question with *No thanks*, which is the second half:

<img alt="the payoff card after declining the undo: the offer is still there" src="reports/2026-08-29-demo-the-offer-that-withdrew-itself-declined.png">

The whole rail, so the two cards can be seen together — the question the press
produced above, the change still offering to be put back below:

<img alt="the demo after pressing Put it back: a Waiting on you card above, the applied card with its undo below" src="reports/2026-08-29-demo-the-offer-that-withdrew-itself-rail.png">

### The fix asks a different question of the same answer

`WriteReport` gains **`moved`**: *whether the page a visitor is looking at moved
because of this.* It is the distinction `recorded` cannot make. A held undo is a
complete success by every measure the runtime keeps — proposal written, custody
taken, question asked, card rendered — and the page is exactly where it was. A
control deciding whether it still has anything to offer is asking about the
page, not about the write.

It is derived from the state in every constructor, never asserted at a call
site, through a **total record** over `ChangeState` rather than
`state === "applied"`. The failure mode is the reason: a state added to the
shared table would otherwise default silently to "the page moved", which is the
answer that makes a control withdraw itself, and is wrong for every state on the
list but one.

`_lib/undo.ts` holds the predicate and the reasoning. The button is withdrawn on
exactly the outcome that empties it and stays on offer through every outcome
that leaves the change standing.

## What I built and then deleted, and why it matters more than what shipped

I read `main`. I read `FINDINGS.md` **on `main`**, where the 25 August entry
*“Put it back” does not put it back on the first press* is marked **open — a
unit of its own, and the recommended next one**. So I built it: a caution line
under the button, `WhatHappens` step three without the word *really*, a new
`_lib/undo.ts`, a new `_lib/undo.test.ts`, a pipeline test measuring that the
leading preset's undo is held. Fifteen tests. Screenshots. A finished report.

**#170 shipped exactly that on 26 August** — same two fixes, same new file
names, a near-identical measurement test, plus a third fix mine did not have.
I found out at step 1 of the procedure, which I had done last instead of first:
listing the open pull requests.

`main` is at `3a57feb` (#167, 26 August). **Twenty-six pull requests are open
and nothing has merged in three days.** A routine's only memory is `main` and
the open pull requests; when `main` stops moving, `FINDINGS.md` on `main` is a
three-day-old to-do list that says a finished job is the recommended next one,
and a fresh session with no memory will believe it. That is not a mistake this
lane can design around — it is what the repository is telling it.

The full accounting, with the recommendation, is in `FINDINGS.md`. The short
version: **merge #174 first** (it greens the red base every lane is tripping
over), then this lane's three in number order — #170, #178, #186 — and this one
last.

Two corrections I absorbed from #170 rather than repeating:

- **The claim is 0032, not 0028.** *An undo is a proposal, not a rewind* is
  0032; 0028 is *a tree is auditable only if its host can reproduce the seed*.
  The 25 August finding cites it wrong and my first draft copied the error
  through four comments. This branch's citations are 0032.
- **The `FACTS.decisions` failure is diagnosed and fixed elsewhere.** #170's
  27 August comment has the analysis and #174 has the fix, so this run dated
  nothing and re-argued nothing.

## Decisions taken that were not specified

- **The duplicate branch was deleted rather than opened as a pull request.** It
  was pushed before I listed the open pull requests. `git push --delete` fails
  in this environment (`the remote end hung up unexpectedly`, twice), so
  `demo-06-the-undo-is-a-change-too` is still on the remote with **no pull
  request against it** and can be deleted from the GitHub UI. Nothing points at
  it.
- **Only the new defect shipped.** The caution line, the step-three rewording
  and the measurement test are #170's and are not duplicated here, so the two
  pull requests do not argue about the same words.
- **`_lib/undo.ts` is the right home even though #170 adds a file of that name.**
  The conflict is add/add and the resolution is concatenation: #170's
  `UNDO_LABEL`, `UNDO_CAUTION` and `askedLine`, plus this `undoStillOffered`.
  No shared symbol. `record-card.tsx` conflicts on the same three lines both
  edit; the merged form is `{undoStillOffered(record, undoReport) &&
  record.revision && (<form … className="flex flex-col gap-1.5">` with #170's
  `UNDO_LABEL` and `UNDO_CAUTION` inside it.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated.

## Real test numbers

`pnpm install && pnpm verify` — **one failure, and it is `main`'s.**

| suite | files | tests | result |
| --- | --- | --- | --- |
| `@loom/runtime` | 111 | 1741 | green |
| `@loom/app` | 135 | 1970 | 1969 passed, **1 failed** |

The failure is `app/(marketing)/_lib/facts.test.ts` — `FACTS.decisions` says
`"94"` and `decisions/` holds 95. **It fails on a clean checkout of `main`**,
verified in this session by stashing the whole diff and running that file alone.
It is `Loom marketing`'s file, #174 fixes it, and this branch does not touch it.
`pnpm typecheck` and `pnpm build` are green on the runtime and on the app.
Nothing was skipped and no test was weakened.

**Seven tests are new**, in one new file and one existing one:

- **`_lib/undo.test.ts` — 5 new, a new file.** That the offer stands through a
  held undo, through a declined one and through a form that never reached the
  runtime, and is withdrawn on the one outcome that empties it — plus that a
  change which never applied is offered nothing.
- **`_lib/report.test.ts` — 2 new.** That `moved` is true of exactly one of the
  nine states, asserted by filtering the whole table rather than by naming
  `applied`, so a state added without a decision fails here.

Checked rather than assumed: with `undoStillOffered` reverted to the old rule
(`lastUndo === null`) and nothing else changed, **3 of the 5 fail** — the held
undo, the declined undo and the unreadable form. None of them is asserting
something that was already true.

`src/` was not opened. No primitive was wanted; the specimen page is untouched.

## Findings

**Filed:**

- `@jonathanbravecredit`: **nothing has merged since #167, and two demo runs
  have now built the same unit.** Twenty-six open pull requests, `main` red for
  three days, four lanes each paying a run to diagnose the same base failure,
  and this lane's three open branches conflicting with each other because each
  is an independent branch off the same stationary `main`. With the merge order
  I would take.
- `Loom demo` → itself: **the payoff card withdrew its own undo**, closed by
  this pull request.

**Not re-filed**, because they are already in open pull requests and appending
to `FINDINGS.md` from four branches at once is itself a merge cost: the
`FACTS.decisions` count (#170's comment, #174's fix), the *“Undo revision 1.”*
substitution (#170), the chip collision (**fixed in #178** — this run's
`rail` screenshot still shows it because it is `main`'s build), and the
`21st.dev` block, which I verified again today and which is folded into the
queue entry.

## Open questions

Nothing blocking. One thing I would like a steer on, in the pull request
comment: whether this lane should keep opening a branch per run while three of
its pull requests are unmerged, or hold.

## The visuals

| | |
| --- | --- |
| [before](2026-08-29-demo-the-offer-that-withdrew-itself-before.png) | `main`, after pressing **Put it back**. The card says *“Put it back” undoes it* and there is no such button on it |
| [after](2026-08-29-demo-the-offer-that-withdrew-itself-after.png) | the same card, the same press, this branch |
| [declined](2026-08-29-demo-the-offer-that-withdrew-itself-declined.png) | after answering the undo with *No thanks*. On `main` the offer is gone for good |
| [rail](2026-08-29-demo-the-offer-that-withdrew-itself-rail.png) | the whole screen: the question the press produced, above the change still offering to be put back |
| [phone](2026-08-29-demo-the-offer-that-withdrew-itself-phone.png) | 390×844, the same state |

Every screenshot is a `next build` output driven in Chromium at 1440×900 and
390×844 — the **before** shot from `main`'s own build, the rest from this
branch's, taken by the same script against the same page, so the only difference
in the frame is the change. Not the preview, which this environment cannot open
(`vercel.app` is not on the sandbox's egress allowlist; the standing 19 August
finding).

**To see it yourself:** open `/demo`, press the green button, press **Apply this
change**, then press **Put it back** and do not scroll. On `main` the button you
just pressed is gone and the card still names it. Here it is still there, and
the question that press produced is the card above it.
