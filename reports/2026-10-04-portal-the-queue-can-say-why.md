# 2026-10-04 — the queue can say why

**Build order section:** §5 — Loom Portal. The half this lane left out on
3 October, finished the day the framework unblocked it.

**Branch:** `portal-49-why-the-queue-cannot-undo` (→ `main`), cut from `main` at
`f62b523`. Not stacked — #502 merged first, deliberately.

---

## What this closes

On 3 October this lane shipped *why a change cannot be undone* on
`/portal/activity` and **deliberately did not ship it on the review queue** —
the screen with **Apply this change** and **No thanks** on it, which is the one
place the answer changes a decision. The reason was stated at the time:

> *"A hold carries a `Disposition`, and the Gate has already joined the two
> codes into the prose of `reason.detail` by the time it is written. … Mining
> the tokens back out of that sentence works today and breaks silently the first
> time anybody rewords a detail line, leaving me confidently wrong on a decision
> screen rather than absent from it."*

`Loom daily build` closed it the next day, in [0222], and its own doc comment
makes the same argument in its own words. The ask was one optional field. What
arrived was that field **and** the piece types — so the second finding, the one
about a record that could explain the mechanism and never name the part, closed
in the same commit.

**This run spends both.** The queue says why, and both screens now name the
piece.

| | |
| --- | --- |
| `_lib/undoing.ts` | `undoStandingFor(disposition)` — the queue's path; `piecesIn`; the budget clause |
| `_lib/vocabulary.ts` | `withOutOfTreeParts` — the sentence that names the pieces |
| `_lib/waiting.ts` | `WaitingChange.undoing` |
| `_components/waiting-card.tsx` | the obstacle, under *If you say yes* |
| `pages/[treeId]/_components/held-proposal.tsx` | the same, on the page screen |
| `activity/_components/proposal-line.tsx` | unchanged — it reads the same module and got the naming for free |

**+13 tests. Nothing weakened, nothing skipped.**

---

## What a reviewer now reads, at the moment they decide

Before, at the end of *If you say yes*:

> Loom checks its rules once more, then makes the change and writes it into the
> page's history. **This one can't be undone afterwards.**

and nothing else. A warning delivered at the exact moment a person is deciding,
with nothing in it about what to be careful of.

After, directly under that sentence — one of these two, never a generic one:

> **Putting the page back would not put everything back.** This change sets up
> **Card**, which reaches beyond the page — the kind of thing that takes a
> payment or sends a message. Loom can always put the page back exactly as it
> was, but it cannot un-take a payment or un-send a message. **Check what Card is
> wired to before you say yes.**

> **Too much would have to be kept to put it back.** Undoing this means putting
> back what it takes off the page, and that is more than this project has agreed
> to hold on to. What is beyond that is gone for good — the request for it stays
> in the record, the words and pictures do not. **This one takes 9 parts off the
> page, and your rules keep at most 4.**

One sends you to an outbox. The other asks whether nine things are worth keeping.
Both were `this one can't be undone` yesterday.

---

## Visuals

**Photographs of the application, signed in, through a production build served by
`pnpm shoot --serve`.** Two changes were staged into a real `memoryHoldStore()`
through the published `HoldStore.hold`, with dispositions carrying the reasons
exactly as `gate`'s `decide` stamps them. **The fiction is who asked, and a
policy that declares `loom.card` out-of-tree** — a real deployment would declare
a checkout or a mailer, and this one registers four pieces.

| | |
| --- | --- |
| [**the review queue**](2026-10-04-portal-queue-why-wide.png) | `1680×1000@2x`, full page — both obstacles, on two cards |
| [**the same, on a phone**](2026-10-04-portal-queue-why-phone.png) | `390×844@2x`, `scrollWidth 390 / innerWidth 390` |

---

## The decisions worth reading

### Two records, two fidelities, one reading

The reasons now arrive from two places: a `Disposition`, which a hold carries and
which holds them whole; and an `AssessmentSummary`, the journalled record, which
keeps the codes as `readonly string[]` so a record outlives the version that
wrote it.

Both narrow to `UndoStanding` **in one module**, not at two points of use. A
screen must not be able to tell which it was handed — the sentence a reader meets
on `/portal` and the sentence they meet on `/portal/activity` an hour later are
the same sentence, and two readings of one fact is the drift `vocabulary.ts`
exists to prevent. There is a test that renders both from one judgment and
asserts the obstacles are equal.

The one place they legitimately differ is the budget, which only a judgment
carries. It is an optional argument rather than a second sentence, so the clause
appears when the number is there and the sentence is correct without it. Filed
as a finding rather than left as a mystery.

### Naming the piece is the difference between a sentence you can act on and one you cannot

*"Check whatever that part is wired to"* sends somebody looking and does not say
where. *"Check what Card is wired to"* names the thing. The deployment declared
which of its registered pieces reach outside a page; the model proposed a change;
**this screen is the only place those two facts meet.**

`plainPieceName` is the catalogue screen's own reading, so `/portal/pieces` and
this card name the same piece the same way. The registered identifier —
`loom.card` — stays in the technical record where every other code is, and there
is a test that it never reaches the sentence.

The generic wording is **kept, not replaced**: a judgment recorded before 0222
knows no types, and inventing a name for it is the one thing this table must not
do.

### `switch` on the discriminant, not a lookup with a fallback

The queue's path narrows `IrreversibilityReason`, which is a real union, so a
third member added to it stops this route group compiling. The journal's path
cannot have that — its codes are strings by design — which is why
`unnamedObstacle` exists there and is not needed here. Two paths, two correct
failure modes.

### `unexplained` became reachable

This module shipped with a state for *the record says it cannot be undone and
does not say why*, and nothing could produce it. 0222 omits the field rather than
emptying it, with `reversible` disambiguating — so a judgment recorded before the
field existed is now exactly that state, from a real stored hold. The sentence
was written for a case that had not happened yet and turned out to be the case
the field's own absence creates.

---

## What this tells a developer that they could not get elsewhere

**Which of their own pieces a proposed change reaches through, crossed with the
rule they wrote about it, at the moment they are deciding.** Not in any diff —
the change has not been applied and may never be. Not in `git log`, not in a
build log. It is produced by the Gate at judgement time out of two things only
this deployment holds: its own `outOfTreeEffectTypes` declaration and what a
model just proposed.

And the queue is where it matters. Reading it back on `/portal/activity`
afterwards is interesting; reading it with a finger over **Apply this change** is
the whole point of the surface.

---

## Gate

`pnpm install && pnpm verify` — **exit 0**, read from a file written as the last
act of its own line.

| | `main` at `f62b523` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 178 files / 3,743 | **178 / 3,743** — `src/` untouched |
| `@loom/app` | 375 / 6,713 | **375 / 6,726** |
| findings | 985 | **986**, 0 malformed |
| `prerender:check` | — | 124 pages, 1,472 junctions, 0 run together |
| `pnpm shoot` | — | `1680 / 1680`, `390 / 390` — no overflow |

**The gate caught one thing a typecheck of the app's source did not**, and it is
worth recording because the remedy is "run the gate, not a subset": a test
fixture typed its reasons as the optional field's own type, which includes
`undefined`, and `exactOptionalPropertyTypes` refuses that. It failed in
`pnpm verify` and nowhere earlier.

No decision record. This consumes 0222 and adds no concept.

## What I did not do

- **I did not touch `answerOutcomes`.** *"This one can't be undone afterwards."*
  is still the sentence; what changed is that something follows it. Rewording it
  to carry the reason would have put the explanation in a string shared by two
  screens and left no room for the one that names a piece.
- **I did not add the budget to the journal.** Filed. One field, and the two
  screens' sentences become identical.
- **I did not touch `src/`.** `git diff origin/main -- src/ tools/` is empty.
