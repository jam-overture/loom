# Four more, and the way back

**Routine:** `Loom demo` · **Branch:** `demo-42-four-more-and-the-way-back`
· **8 October 2026**

The forty-third run of this lane, with no open pull request of its own. A fresh
branch off `main` at `19e0f16`, fetched before branching and before
photographing, which is the step the 12 September entry gained an appendix for
yesterday.

Every picture below is a production `next build` of a real commit, served by
`pnpm shoot --serve` and photographed at 1280 × 900, 390 × 844 and 348 × 465
with reduced motion. **Every number is `pnpm shoot`'s own `measure`**, with the
selectors committed in `2026-10-08-demo-four-more-and-the-way-back.shots.json`
beside this report. The `before` figures and the two `before` pictures are the
same harness run against a production build of `main` at `19e0f16`, built
separately.

**No maintainer comment was outstanding.** Nothing has been said on this lane's
work since #458; #545 merged this morning and every comment on it is this
lane's own. The two open pull requests in the repository are `Loom portal`'s
#553 and `Loom primitives`' #548.

---

## What a stranger could not understand before this run

**That the change they had just made was one of the five they were being
offered.**

Press *Re-theme the whole page*, watch the page move, and read the sentence
over the list. On `main` this morning, measured cold at 1280 × 900:

> You can ask for 5 changes here. Loom will make 2 on its own and ask you first
> about 3.

That is the arrival screen's sentence, character for character, to somebody who
has just made one of the five. Nothing in it is false. `howManyWaitForYou`
counts verdicts, there really are five asks on the panel, and the Gate really
does divide them 2 and 3. What a stranger does with it is the problem: they
pressed something, the page moved, and the instrument beside it told them in the
same words as before that there were five changes to ask for. **Read as
*nothing I did counted*.**

And the reason there are still five is the one thing the sentence could not say.
Both unattended presets are toggles, so the one they just spent came straight
back onto the list — in the other direction. The row under the sentence already
says so, since yesterday: *Puts the page back to how it looked before your last
change.* The sentence above it did not.

## What specifically failed, diagnosed before anything was built

Measured cold against a production build of `main` at `19e0f16`, 1280 × 900,
after one press of *Re-theme the whole page*:

| on the panel | where it is | what it said |
| --- | --- | --- |
| the sentence over the list | `y 202`, 391 × 37 | **You can ask for 5 changes here.** Loom will make 2 on its own and ask you first about 3. |
| row 1's label | `y 442` | Re-theme the whole page |
| row 1's chip | `y 442` | `GOES AHEAD` |
| row 1's promise | `y 442` | *Puts the page back to how it looked before your last change.* |
| the ending's count, under the record | — | **4 more changes to ask for** |

**The surface disagreed with itself in three places about one number.** The row
said the first ask was the way back. The caption under the record counted four.
The sentence over both of them counted five, and it is the one a stranger reads
first.

This is the half of 7 October's defect that run left, filed with three shapes
and a recommendation. It recommended **(2)**, *say both*, and that is what was
built.

## The change

**The sentence divides the same asks by direction, and the clause that counts
verdicts does not move.**

> You can ask for 4 more changes here, and put the last one back. Loom will make
> 2 on its own and ask you first about 3.

### `_lib/how-many-wait-for-you.ts` — one clause, and a count it already had

```ts
const offeredClause = (total: number, putsBack: number): string => {
  if (putsBack === 0) return `You can ask for ${total} changes here.`

  const forward = total - putsBack
  if (forward === 0) return "You can put your last change back here."

  const more = forward === 1 ? "1 more change" : `${forward} more changes`
  return `You can ask for ${more} here, and put the last one back.`
}
```

**Nothing new is computed and no argument was added.** `putsBack` is already a
field on every `WillSay` this module is handed: the Gate's own assessed delta,
compared against what the visitor's last change moved, reached one step earlier
for the row and the lead button on 7 October (`put-back.ts`). It is counted in
the same pass as the standings, over the same list, so the two clauses cannot
describe different screens.

### The second clause does not move, and that is the restraint

*Loom will make 2 on its own and ask you first about 3* still counts all five,
the way back among them. **That is what keeps it checkable.** The five chips
under the sentence are the evidence for it — `ask-panel.tsx`'s stated reason for
putting two words at the end of a line that already fits is *the rows under it
visibly do not all read the same* — and the way back wears one like every other
row, because the Gate weighed it like every other ask.

Shape (3) in the filed entry was *count forward only*, which is what the ending
under the record does. It was refused here for the reason that entry gives: it
would have put **make 1 on its own** over two rows reading `GOES AHEAD`, hiding
a press that is on the screen, which is the one thing this surface does not do.

So the sentence now carries two partitions of one list of five — by direction,
then by verdict — and that is exactly the pair every row already carries: the
chip is the Gate's answer, the promise is what the press does to the page.

### Singular about the change, however many asks would do it

*Put the last one* names the visitor's last change, of which there is exactly
one however many presses would reverse it, and `reversesTheLastChange` compares
against that change and nothing earlier. So only the count of forward asks comes
down; the clause does not become plural. Held by a test, because the shipped
preset table cannot reach it today and a table somebody adds to can.

The third shape — nothing left but the way back — is written for the same
reason the three-clause join above it has always been written: *you can ask for
0 more changes here* is the kind of defect nothing fails on.

## Measured, on the two production builds

### 1280 × 900, after one press of *Re-theme the whole page*

| | before (`main` at `19e0f16`) | after |
| --- | --- | --- |
| **the sentence** | *You can ask for **5 changes** here…* `y 202`, 391 × 37 | *You can ask for **4 more changes** here, **and put the last one back**…* `y 202`, 391 × 37 |
| `#ask` | `y 202`, 391 × 541 | `y 202`, 391 × 541 — **unmoved** |
| the four rows | `442 / 509 / 576 / 643` | `442 / 509 / 576 / 643` — **unmoved** |

**Nothing moved.** The clause is 23 characters longer and the sentence was
already two lines, so it is still two lines and the box is still 37px.

### 390 × 844, the same press

| | before | after |
| --- | --- | --- |
| the sentence | 350 × **37** | 350 × **56** — **one line taller** |
| `#ask` | `y 119`, 350 × 589 | `y 119`, 350 × **608** |
| the four rows | `391 / 458 / 525 / 608` | `409 / 476 / 543 / 627` — **19px down** |

**That 19px is this run's whole cost and it is on one screen.** The phone's
sentence goes from two lines to three, and the four asks under it move down by
a line. It is the screen *after* a press rather than the arrival screen, so the
five runs that fought for the phone fold are untouched — the arrival screen is
byte-identical below.

### The five frames that must not move, and did not

| | `md5` | |
| --- | --- | --- |
| the arrival screen, 1280 × 900 | `e8fd0ea8…` | byte-identical to the before run, **and to 7 and 6 October's** |
| the arrival screen, 390 × 844 | `8498ace7…` | byte-identical to the before run, **and to 7 and 6 October's** |
| the embed at 348 × 465 | `8c0540a0…` | byte-identical to the before run, **and to 7 and 6 October's** |
| the question, one press of the green button | `cccd3199…` | byte-identical to the before run, **and to 7 October's** |
| the removal path, question answered | — | byte-identical to the before run |

The last row is the one worth reading. Press **Take the numbers off**, then
**Apply this change** — the sequence the demo invites — and nothing on this
branch reaches it. A removal spends its preset, so no ask left on the panel
would put anything back, `putsBack` is zero, and the clause is the one it has
always been. **The defect was only ever on the toggle path and the fix reaches
only that path.**

The two frames that moved:

| | | |
| --- | --- | --- |
| [**the panel, one press in**](2026-10-08-demo-four-more-panel-wide.png) · [before](2026-10-08-demo-four-more-panel-wide-before.png) | `7ee4f45b…` → `dfce4674…` | **the picture worth opening** |
| [the panel on a phone](2026-10-08-demo-four-more-panel-phone.png) · [before](2026-10-08-demo-four-more-panel-phone-before.png) | `bc69ed61…` → `8ff550d1…` | the same sentence, one line taller |

## Real test numbers

`pnpm install && pnpm verify` — **green, exit 0**, on a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | `main` at `19e0f16` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` (`src/`, `tools/`) | 195 files / 4,334 | **195 / 4,334** — `src/` untouched |
| `@loom/app` (`apps/loom/`) | 412 / **7,385** | 412 / **7,395** |
| the demo lane | 53 files / **813** | 53 / **823** |
| findings | 1,074 | **1,075**, 0 malformed |
| `prerender:check` | — | 128 pages, 1,586 junctions, 0 run together |

**Both totals were measured on both trees rather than derived**: the left column
is `vitest run` against this working tree with the branch's changes stashed, on
the same installed dependencies.

**+10 lane tests, all written, none weakened, skipped or deleted.** No new test
file — every one went into the file that already tested the module it is about:
`how-many-wait-for-you.test.ts` +6, `ask-panel.test.tsx` +3, `pipeline.test.ts`
+1.

**One existing test file changed behaviour-neutrally**: `how-many-wait-for-you.test.ts`'s
fixture gained a defaulted second parameter, so every assertion written before
today passes the same values it always did.

**The test that earns its place over the others** is `pipeline.test.ts`'s *stops
offering the way back as a change still to ask for*. It presses `palette`
through the real write path, re-reads the head, re-plans what is still
applicable, runs the real `whatEachWillSay` over it and reads the sentence off
the result — the three readings the clause sits on top of, each of which can be
right while the sentence over them is wrong. Every other test holds one link.

### The defect matrix

Each defect restored in turn **against the commit**, the demo lane run against
it, and the lane restored between rows. Baseline **823 passed**.

| defect restored | caught |
| --- | --- |
| the clause always divides, even with nothing to put back | **9** |
| nothing is ever read as the way back | **7** |
| the way back is taken out of the verdict counts too | **7** |
| the clause never divides (the behaviour this run replaces) | **6** |
| the forward count forgets to subtract | **6** |
| the clause stops being singular about one change | **5** |
| one forward ask is pluralised | **2** |
| nothing-left-but-the-way-back is not special-cased | **1** |

**Eight of eight by test.** The two rows worth reading are the third and the
fourth: the fourth is exactly the state of `main` this morning, and the third is
the fix overreaching into the clause it was supposed to leave alone — which is
shape (3), the one the filed entry refused, and it fails loudly rather than
quietly.

## Decisions taken that were not specified

- **The verdict clause stays whole.** It was the first thing tried and thrown
  away on the argument above: the chips are what make it checkable, and
  subtracting the way back from *make 2 on its own* leaves a sentence a stranger
  can see is wrong by counting the rows.
- **The count is read off `WillSay.putsBack` rather than off `rail.ts`.**
  `asksThatPutItBack` already derives a set for the ending, and handing it down
  would have given the panel a seventh prop from the one file no test can mount.
  The field is on the answers this module is already given, so the sentence and
  the row under it read the same byte.
- **No decision record.** Nothing here touches the tree schema, the delta model
  or an `Accepted` record. Nothing escalated.
- **Nothing outside `apps/loom/app/(demo)/` was opened for writing**, apart from
  `FINDINGS.md` and `reports/`. `git diff origin/main --name-only` outside those
  three is empty.

## What was left out

**The other path through a change still does not say *more*.** Press *Take the
numbers off*, answer the question, and the sentence reads *You can ask for 4
changes here* rather than *4 more* — measured on this branch at `y 251`. The
count came down from five, which is most of what the word would have said, and
the fact the clause would need is whether a change of the visitor's own is on
the page, which lives in `page.tsx`. Filed below with three shapes and a
recommendation to leave it.

**The lead press still does not move the page** — this lane's open design
question, carried a sixth run and untouched. The recommendation is still *leave
it and measure*: nobody has watched a stranger use this surface.

**The other three bands still rely on `pointer-events: none`**, carried a third
run.

**The disclosure chevron is still drawn in three components**, carried a sixth
run.

**The folded reasoning on an answered card is still labelled in the present
tense**, carried an eighth run.

## Findings

**Filed one, closed one.**

- **Closed**: the 7 October entry this lane owns — *after a one-press change the
  demo's panel says the arrival screen's sentence word for word* — by the shape
  it recommended, with the measurement above recorded on the entry.
- **Filed**, for this lane: the panel says *more* on one path through a change
  and not on the other, and the difference is which preset the visitor spent.
  Three shapes, recommendation **(1)** — leave it — because the gap is a word
  and the fix is a seventh prop on the file this lane has twice filed for
  having too many.

**Re-verified, not re-filed:** `21st.dev` `ENOTFOUND` from `WebFetch`, a
**fortieth** consecutive run, one call. `*.vercel.app` denied from the sandbox
(`Loom portal`, 27 September) — the preview URL is on the pull request and the
pictures are from a local production build.

## Open questions

**None new.** The one this run raises is filed with a recommendation.
