# The payoff card took its own undo away, and the press that took it changed nothing

**Routine:** `Loom demo` · **Branch:** `demo-12-what-allowing-it-would-do` · **2 September 2026**

The second unit on this branch, and a redo of **#194**, closed unmerged in the
28 August backlog. It is on the branch that already carries the redo of #186
rather than on a `demo-13` cut from `main`, and that is the maintainer's own
instruction rather than a preference:

> Before starting a unit, check whether you already have an open pull request. If
> you do, **continue it rather than branching again from `main`** — push onto that
> branch. Two open pull requests from one routine touching one file is a conflict
> you are creating for yourself.

Both units touch `record-card.tsx`. That file is named in the backlog entry as
one of the two that made sixteen pull requests unmergeable — *"all four demo
runs edited `record-card.tsx`"* — so a second branch would have rebuilt the exact
collision the entry was written about.

---

## What a stranger could not understand before this run

I drove the built page in Chromium at 1440×900 and 390×844 and pressed what the
rail puts first, then kept going past the point earlier runs stopped at.

Press **Take the numbers off**. Loom stops and asks. Press **Apply this change**.
The three figures go, the page is ringed in green, and the card underneath says:

> **Applied** · *This change is live on the page beside you. “Put it back” undoes it.*

with one control under it: **Put it back**. That is the end of the sequence this
lane has spent seven runs building, and it is the moment the demo has earned.

Press it. Here is what happened:

> **The page does not move.** A second card appears above, amber, waiting on an
> answer. And on the card you just pressed, **the button is gone** — under a
> sentence that still names it.

Everything the runtime did there is right, and that is what makes it worth
fixing. An undo is a change of its own ([0032](../decisions/0032-an-undo-is-a-change-of-its-own.md)),
so it is interpreted, assessed and gated like any other, and putting the numbers
band back restructures the page as much as taking it off did. The Gate stops it
and asks. Nothing should be exempted from the Gate to make the demo tidier.

The defect is that the card **spent the offer on the press rather than on the
outcome**. It was gated on `record.revision && !undoReport`: withdraw as soon as
the server answers anything at all. The first answer on this path is a hold.

### The half a visitor could reach and never come back from

Answer that held undo with **No thanks** — a button the demo puts in front of
them, on a question they did not ask for — and:

> The undo is discarded. The change is still live on the page. The card still
> says *“Put it back” undoes it*. There is no such button, and there will not be
> one again for the rest of the visit.

The visitor declined their own undo and lost it. That is the frame this unit is
about, and no test caught it because every test rendered the card in isolation,
where `undoReport` is null and the button is always there.

### Why the card could not have got this right on its own

This is the part worth keeping, because it is why the obvious fix is the wrong
one. The obvious fix is to look at *what kind* of report came back and withdraw
only on the one that spends the undo. It is better than what was there and it is
still not enough:

`undoReport` is `useActionState` **on the applied card**, and every event that
resolves an undo happens somewhere else. The held undo is answered on *its own*
card, whose action state is its own. So a card watching its own press can only
ever learn that an undo was **asked for** — the one fact that settles nothing.
Whether it was then allowed, refused, or turned down is invisible from there,
permanently.

The records can see all of it, because the undo is a record like any other.

## What a stranger can understand now

The same three presses, on this branch:

> Press **Put it back**. The page does not move, a question appears above — and
> the card says, where the button was: **“You’ve asked to put this back. It’s
> waiting on your yes, on the card above.”**
>
> Press **No thanks** on that question. The card that said it says it no longer:
> **Put it back** is under it again, with its caution, exactly as before you
> pressed anything.
>
> Press **Put it back**, then **Apply this change**. The numbers come back, and
> the first card stops claiming otherwise: **“You put this back, so the page is
> as it was before this ask.”**

Nothing was removed and nothing was exempted from the Gate. The whole record is
still one click down on every card.

## The changes

### `_lib/undo.ts` — `undoOffer`, a function over the record list

Three states, because three is what a visitor can be truthfully told:

- **`offer`** — nothing is pending and the change is still live, so the sentence
  is true and the button belongs under it. **A declined undo lands here**, which
  is the point: turning down your own undo puts the offer back rather than
  spending it.
- **`waiting`** — the Gate is holding an undo of this revision, on a card of its
  own above this one. The button is *replaced* rather than repeated: a second
  press would propose a second undo of the same revision, and the honest thing is
  to point at the question already asked.
- **`spent`** — an undo of this revision applied. The change is not live any
  more, so the button and the sentence promising it both go.

A **refused** or **misunderstood** undo falls back to `offer` deliberately.
Nothing moved, the change really is still live, and the record card for that
refusal is sitting above saying which rule stopped it. Telling a visitor the
change can never be put back would be a claim no record here makes.

### `_lib/record.ts` — `ChangeRecord.undoes`, and the fold that must not drop it

The link is by revision, so an undo has to say which revision it is of. The log
does not carry that in a form this surface may read, and the reason is the
interesting part: `revertRevision` puts the number in `utterance` (`Undo revision
1.`) and in the rationale (*"Undoes revision 1, applied … from proposal …"*), both
of which are sentences the runtime composed for people. Reading either would be
this surface pattern-matching a string it does not own — the exact thing the
provenance stamp exists to let it stop doing, three functions up in the same file.

So it is stamped by `undoRevision`, from the argument it passed. That is the
surface's own knowledge about its own request. Filed as a finding for
`Loom daily build` anyway, because it does not generalise: a surface reading a
log it did not write has no argument to stamp from.

**The fold is the load-bearing bit.** Answering a held undo folds a second
assessment and verdict onto the record that was waiting (`recordAwaiting`), so a
`draftFrom` that dropped `undoes` would sever the link at exactly the moment the
undo *lands* — and the applied card would go on offering an undo of a change
already put back. Carried through `Draft`, with a test for each of the two
answers.

### `record-card.tsx` — the gate, and one sentence it does not own

`!undoReport` becomes `offer === "offer"`; the `waiting` line is new; and the
applied state's sentence is substituted when the undo is spent. The badge still
reads **Applied**, correctly — that is what became of *this ask* — and the line
under it is where the page stands now.

## Decisions taken that were not specified

- **The waiting state replaces the button rather than keeping it.** #194's
  branch kept it (withdraw "on the outcome that empties it, and on nothing
  else"), which never lies but lets a visitor stack two undos of one revision.
  With the offer derived from the records, pointing at the question already
  asked costs nothing and the offer still comes back if they decline it.
- **`spent` rewrites the sentence but not the badge.** The alternative — a badge
  reading "Put back" — is a sixth state name, and the five come from
  `(portal)/_lib/vocabulary` precisely so the demo and the review queue cannot
  drift. Not worth a private state for one card.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing was escalated and nothing was left out.
- **No file outside `apps/loom/app/(demo)/` is touched.**

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, first attempt.

| suite | files | tests |
| --- | --- | --- |
| `@loom/runtime` | 119 | 1860 |
| `@loom/app` | 160 | 2537 |

Nothing failed, nothing was skipped, no test was weakened. **Eighteen tests are
new**, all in this lane, and they are 2519 → 2537 on the app suite exactly.

- **`_lib/undo.test.ts` — nine.** Seven for `undoOffer`, two for `undoOf`. The
  two that are the defect: *does not withdraw the offer because the Gate is
  holding the undo*, and *puts the offer back when the visitor declines their own
  undo*. Also that a landed undo outranks a second one still waiting, that a
  refused undo leaves the offer standing, and that the link is by revision — a
  visitor with two applied changes must not have one card read its neighbour's
  undo as its own.
- **`_lib/record.test.ts` — three.** That `undoes` survives the fold, in both
  directions: when the held undo is confirmed, and when it is declined. Plus that
  an ordinary ask never acquires one.
- **`record-card.test.tsx` — six.** The three rendered states, that the badge
  still reads "Applied" after the change is put back while the sentence under it
  does not, and that a change still waiting on the visitor offers no undo in any
  state.

**Measured against the old rule rather than asserted.** Restoring the old gate
(`!undoReport`) and the old unconditional sentence in `record-card.tsx`, with the
new library left in place, turns the card suite **red on two of the six new
tests** — *points at the waiting question instead of the button* and *stops
promising the button once the undo has landed* — and leaves the other twenty
green. The remaining twelve new tests cover `undoOffer`, `undoOf` and the fold,
which are functions the old code did not have, so "they fail without the change"
would be a module error rather than a claim about behaviour. Said plainly because
the honest number here is two, not eighteen.

`src/` was not opened. One framework gap was found and filed rather than fixed.

## Findings

**Filed:**

- `Loom demo` → itself: **the shape, three for three.** This lane's standing
  diagnosis is *machinery that does not reach the screen*; this is its inverse
  and the same thing — machinery that reaches the screen and then takes itself
  away. With the reason a card cannot see its own undo resolved, which is what a
  fresh session would otherwise rediscover.
- `Loom daily build`: **a revert does not say which revision it reverts**, except
  inside two sentences it synthesised. Worked around in this lane; the workaround
  does not generalise.
- `@jonathanbravecredit`: `21st.dev` still `EGRESS_BLOCKED`, eighth time from
  this lane, fifteenth overall. `docs/routines.md` still lists it as allowed.
- `@jonathanbravecredit`: the brief still opens with the move off `/portal/demo`,
  landed twelve days ago. Sixth consecutive run.
- `Loom portal`: the four links to `/portal/demo`, still unrepointed. Twelve days.

**Closed:** this run's own entry, by #220.

## Open questions

Nothing blocking. Two carried, unchanged by this run:

- **A refusal can say a repair was declined and this surface still does not say
  it** (framework finding, 21 August).
- **"Ask about just this"** — the scope control, this lane's 22 August finding.

And one from yesterday still worth a second opinion: **should a primitive type
ever get a friendly name on this surface?** I said no and built around it again
here.

## The visuals

Every pair is the same script driven against two `next build` outputs — this
branch's and the branch as it stood at `99067d5` — so the only difference in a
frame is the change. The frames are the **applied card itself** rather than the
rail, because the held undo appears *above* it (records are newest first) and a
rail screenshot cuts the subject off the bottom.

| | |
| --- | --- |
| [before, held](2026-09-02-demo-the-offer-that-withdrew-itself-before-held.png) | two seconds after **Put it back**: no button, under a sentence still saying *“Put it back” undoes it* |
| [after, held](2026-09-02-demo-the-offer-that-withdrew-itself-after-held.png) | the same press: **“You’ve asked to put this back. It’s waiting on your yes, on the card above.”** |
| [before, declined](2026-09-02-demo-the-offer-that-withdrew-itself-before-declined.png) | after **No thanks** on the undo. Identical to the frame above: the offer is gone for the rest of the visit |
| [after, declined](2026-09-02-demo-the-offer-that-withdrew-itself-after-declined.png) | the same press: **Put it back** is under the card again, with its caution |
| [after, spent](2026-09-02-demo-the-offer-that-withdrew-itself-after-spent.png) | and once the undo is allowed: **“You put this back, so the page is as it was before this ask.”** |
| [phone](2026-09-02-demo-the-offer-that-withdrew-itself-phone.png) | 390×844, the held undo |

**The driver reported the defect on its own.** On the `before` build the script's
fourth step — ask again, and this time allow it — logged `!! "Put it back" is not
on the page`, at both viewports. On this branch it completes and produces the
*spent* frame. That line is the finding, printed by a browser rather than argued.

**Preview:**
`https://loom-git-demo-12-what-allowi-fa1349-jpizzolato36-6341s-projects.vercel.app/demo`
— deployment completed at `0b226ae`, Vercel status green. This sandbox cannot
open `vercel.app` to check it (standing 19 August finding), so everything above
is a local `next start` of two real builds.

One push, one preview. The commit identity was `Claude <noreply@anthropic.com>`
throughout — checked on `git config` **before** committing rather than caught on
a glance at `git log` afterwards, which is the sixth-time finding from 27 August
acted on rather than re-filed.

**To see it yourself:** open `/demo`, press the green button, press **Apply this
change**, then press **Put it back** and read the line where the button was.
Press **No thanks** on the question that appears above, and watch the button come
back.

Nothing is scheduled and nothing is watching this pull request.
