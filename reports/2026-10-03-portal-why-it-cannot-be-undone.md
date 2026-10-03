# 2026-10-03 — "Why can't this be undone?"

**Build order section:** §5 — Loom Portal. The plain-language redirection of
18 August, applied to the one sentence on this surface that warns somebody and
tells them nothing.

**Branch:** `portal-47-why-it-cannot-be-undone` (→ `main`), cut from `main` at
`cddf61e`. Not stacked. `main` was not pushed to.

**No maintainer comments to address.** #495 (`portal-46-a-pane-you-can-size`,
opened twenty minutes before this run) carries one bot comment, Vercel's, and is
green. The theme question it raised is still yours to call and nothing here
depends on it.

---

## The defect, in one sentence

Every screen in this portal that mentions undo says one of two things:
**`you could undo it`** or **`this one can't be undone`**. Both are true, and the
second is the worst kind of warning — it tells a reader to be careful and
nothing at all about *what to be careful of*.

The runtime is not being vague. `assessReversibility` computes **two** obstacles,
and they ask opposite things of the person reading:

| the runtime's code | what it actually means | what you should do |
| --- | --- | --- |
| `out-of-tree-effect` | the page is fully recoverable and **reality** is not — the change sets up a part that takes a payment or sends something | go and look at whatever that part is wired to, before saying yes |
| `retention-budget-exceeded` | reality is fine and the **page** is not fully recoverable — putting it back would hold more removed content than your rules allow | decide whether the content is worth keeping, because the rest will not come back |

One sends you to an outbox. The other asks you whether nine parts of a page are
worth keeping. `this one can't be undone` is both of those with the actionable
half deleted — which is the exact failure the 18 August redirection is about, and
it had survived every plain-language pass because the sentence was already in
plain English. It was *short*; it was not *useful*.

---

## What this tells a developer that they cannot get anywhere else

**Neither fact is a property of the change.** `out-of-tree-effect` is *your
deployment's own declaration* (`outOfTreeEffectTypes` in your rules) crossed with
what the model proposed; `retention-budget-exceeded` is arithmetic over the
proposed removal against a budget you set. Both are produced at the moment of
judgement and exist only in Loom's record of it.

No diff holds them, because the change was never applied. `git log` holds
nothing, for the same reason. A server log would hold, at best, the string
`irreversible`. The answer to *why will this one not come back* is one of the
small set of things this portal exists to be the only place for.

---

## What shipped

| | |
| --- | --- |
| `_lib/undoing.ts` | new — the reading: the standing of one judged change, and every state of it |
| `_lib/undoing.test.ts` | new — 16 |
| `_lib/vocabulary.ts` | `IRREVERSIBILITY_PLAIN` (the two obstacles, in the one place), `irreversibilityPlain`, `unnamedObstacle` |
| `_components/undo-standing.tsx` | new — the block, under the clause that raises the question |
| `_components/undo-standing.test.tsx` | new — 6 |
| `activity/_components/proposal-line.tsx` | the block, and the codes added to the technical record |
| `activity/_components/proposal-line.test.tsx` | +5, and its fixture converted to `buildAssessment` (0216) |

**+27 tests. Nothing weakened, nothing skipped, nothing removed from any screen.**

---

## Visuals

**Photographs of the application, signed in, through a production build served by
`pnpm shoot --serve`.** The shot list is committed beside this report. The page
is the portal's own seed tree; the episodes were staged by a `--import` preload
that builds assessments with the published `buildAssessment`, narrates them
through the real `recordOf`, and writes them into a real
`memoryTelemetryJournal` — the fold, the reading, the render and the stylesheet
are the shipped code. **The only fiction is who asked and when.**

| | |
| --- | --- |
| [**the screen**](2026-10-03-portal-why-it-cannot-be-undone-wide.png) | `1280×900@2x`, full page, `scrollWidth 1280 / innerWidth 1280` |
| [**the same, on a phone**](2026-10-03-portal-why-it-cannot-be-undone-phone.png) | `390×844@2x`, `scrollWidth 390 / innerWidth 390` |
| [**the record, one click down**](2026-10-03-portal-why-it-cannot-be-undone-record-wide.png) | `cannot undo retention-budget-exceeded` · `retained 9` |

The first picture holds both obstacles on one screen, which is the argument:

> *The AI says it is fairly sure · High risk · this one can't be undone*
>
> **Too much would have to be kept to put it back.** Undoing this means putting
> back what it takes off the page, and that is more than this project has agreed
> to hold on to. What is beyond that is gone for good — the request for it stays
> in the record, the words and pictures do not. This one takes 9 parts off the
> page.

and, three cards down, on a change that removed nothing at all:

> **Putting the page back would not put everything back.** This change sets up a
> part that reaches beyond the page — the kind of thing that takes a payment or
> sends a message. Loom can always put the page back exactly as it was, but it
> cannot un-take a payment or un-send a message. Check whatever that part is
> wired to before you say yes.

Two changes, both *"High risk · this one can't be undone"*, and until today they
were indistinguishable on this screen.

---

## The high-schooler test

Applied to `/portal/activity`, which is the screen this touches.

*Could somebody who has never read a decision record say what happened and what
they should do next?* Before: they could say *something happened and I can't take
it back*. After: they can say *this one deletes nine things and I only get some
of them back*, or *this one charges somebody and un-doing the page won't un-charge
them, so go and look*. The second is an instruction. That is the bar.

**What was renamed:** nothing. This run added words rather than replacing them —
the codes `out-of-tree-effect` and `retention-budget-exceeded` had **no** plain
form anywhere in this repository, so there was nothing to rename. Both are still
printed, unreworded, in the technical record on the same card, beside `retained`,
which is new there too.

---

## The decisions worth reading

### `reversible` leads, and the reasons never rewrite it

A real run sets `reversible` to `reasons.length === 0`, so the two cannot
disagree. `assessmentSummarySchema` does **not** couple them, and a record read
back from storage — written by another version, or by a host's own tooling — can
hold either mismatch. So the flag is read as the flag: it is what the Gate acted
on and what the reader has already been told one line above, and a card that
quietly rewrote its own headline from a list underneath it would be the portal
disagreeing with the record rather than reporting it.

The reachable-from-storage neighbour is held rather than ignored: a record that
warns and gives **no** reason says so in words, because a warning over an empty
list reads as a portal that lost the explanation, and those are different things.

This is the 2 October `PartStanding` lesson applied forwards. That entry cost this
lane a state it had designed, written and commented, because the state could not
arise. These two can — not from a run of the runtime, but from the record, which
is a real input to this surface and the only one it has.

### A code with no sentence is shown, not dropped

> **Plain language is the default. The technical record is one click away.
> Nothing is ever removed.**

`irreversibilityReasons` is `readonly string[]` in the journal, deliberately, so
that a record outlives the version that wrote it. So a third obstacle added to the
runtime arrives here as a string this portal has never heard of. Dropping it is
the one move the rule forbids outright — the reader would see a warning, an empty
list, and no way to tell that from a record with no reason in it.

It renders as *"Loom gave a reason this screen has no words for"*, with the code
kept verbatim below and the advice that still holds: treat it as a change you
cannot undo. `IRREVERSIBILITY_PLAIN` is keyed by the published union, so the
*compile* fails first — this is the path for a record from a **newer** runtime
than the one this portal was built against, which no type can prevent.

### The explanation sits at the same altitude as the warning, and the code does not

The obstacle is not behind the disclosure. Which of the two fired decides what
the person does next, and a reader who does not open a disclosure is exactly the
reader who most needed to know. The *codes* are behind it, where every other code
on the line already is. That is the governing rule applied once rather than a
judgement call: the words lead, the code is one click down, nothing is dropped.

It sits **above** the Gate's verdict, too. `this one can't be undone` is a fact
about the change; what Loom then decided to do about it is a different question,
and filing the reason under the verdict moves the answer away from the question.
There is a test for the order.

### The count is a third sentence, not a splice

`retainedNodeCount` is on every assessment and is only *the* number for one of the
two codes — printed beside an out-of-tree effect it is a true number answering a
question nobody asked. So the table holds the countless sentence and
`undoing.ts` adds **This one takes 9 parts off the page.** when there is a count
to add. Zero is left off rather than written: `retainedNodeCount` is the removed
count, so a budget exceeded by a change that removed nothing is a record
contradicting itself, and *"the 0 parts"* is that contradiction rendered as
English.

### The contract test, against a record the runtime actually wrote

`IRREVERSIBILITY_PLAIN` is keyed by `IrreversibilityReason["code"]`, so a third
obstacle stops this route group compiling. What the types cannot see is the
journey in between: the key in the table and the string in the journal are two
things that merely *look* equal.

So four tests build a real assessment through `buildAssessment`, narrate it
through the real `recordOf`, and read the result. If the runtime renames a code,
re-spells it on the way into the journal, or stops putting it there, this goes
red here rather than on a deployment's screen. One of the four exists only to
keep the other three honest — a journal that stopped carrying the field would let
every assertion pass over an empty list and report green, which is how this lane
disarmed a demo guard on 8 September.

---

## Where it did *not* ship, and why that is a finding rather than a workaround

**Not on the review queue.** `HeldProposal` carries a `Disposition`, and
`confirmIrreversible` has already joined the codes into the prose of
`reason.detail` by the time the hold is written. So the screen that renders
**Apply this change** and **No thanks**, beside *"This one can't be undone
afterwards."*, is the one place in this repository where the reason exists and
cannot be read as data.

Mining the two code tokens back out of that sentence works today and breaks
silently the first time anybody rewords a detail line — leaving this lane
confidently wrong on a decision screen rather than absent from it. Same call as
the 2 October `treeAt` entry, and for the same reason. Filed, with the one-field
shape that closes it; `undoing.ts` takes a summary, so the day a hold carries the
reasons it is one call and no new words.

**Not on `/portal/history`.** `StoredRevision` carries no judgment at all, so the
screen with the undo button on it cannot say that undoing the page will not undo
what the change did outside it. Filed as the question it is rather than as a
request.

---

## Findings filed

1. **The hold flattens the reasons into prose**, so the review queue cannot read
   them. Owned by `Loom daily build`. The one this lane most wants.
2. **`out-of-tree-effect` drops its `primitiveTypes` on the way into the
   journal**, so a screen can explain the mechanism and never name the part. The
   sentence has to say *the kind of thing that takes a payment* because the
   record cannot say **which**. One optional field, beside three that already
   carry primitive types.
3. **A revision carries no disposition**, so `/portal/history` cannot ask this
   question at all. Filed as a question about where reversibility belongs rather
   than as an ask.
4. **The assessment double is adopted in one of its three fixtures**, and it was
   the untruthful one — the entry filed this morning predicted that the day a
   screen read `irreversibilityReasons` the fixture would go on passing while the
   card showed a code nobody wrote a sentence for. That screen shipped on this
   branch. `write.test.ts` and `what-if.test.ts` are the remaining two and are
   left for the run that has a reason to open them.

---

## Gate

`pnpm install && pnpm verify` — **exit 0**, read from a file written as the last
act of its own line.

| | `main` at `cddf61e` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 177 files / 3,699 | **177 / 3,699** — `src/` untouched |
| `@loom/app` | 370 / 6,598 | **372 / 6,625** |
| findings | 969 | **973**, 0 malformed |
| `prerender:check` | — | 124 pages, 1,470 junctions, 0 run together |
| `pnpm shoot` | — | `1280 / 1280`, `390 / 390` — no overflow |

**+27 tests across two new files and one existing one.** No decision record: this
adds a reading of a record the runtime already writes, on a screen that already
showed the flag. Nothing touches the tree schema, the delta model, or an Accepted
record.

## What I did not do

- **No change to `reversibilityWord`.** `this one can't be undone` is still the
  clause, on every screen that uses it. It is right; it was never the whole
  answer, and a longer clause would be a worse one.
- **No prose parsing on the queue.** See above.
- **No widening of the portal** (0019). This reads a record and offers nothing to
  press.
- **No sweep.** `write.test.ts` and `what-if.test.ts` keep their object literals
  until a run has a reason to open them, under the same rule a screen's name
  moves by.
