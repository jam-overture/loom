# 2026-10-04 — the undo that would not undo

**Build order section:** §5 — Loom Portal. The last screen in a thread that
started two days ago, and the one with the actual button on it.

**Branch:** `portal-50-the-undo-that-would-not-undo` (→ `main`), cut from `main`
at `f79e1d9`. Not stacked — #509 merged first.

---

## What this closes

`/portal/history` has `ReversalNote`, and it is the best thing on this surface:
it inverts the log and says what undoing a revision would put back and what
later work it would write over. **Every word of it is about the page**, because
`planRevert` is about the page.

The Gate's irreversibility is the other question, and from the outside the two
look identical. A tree-level inverse always exists (0016), so a change that took
a payment has a perfectly clean `Reversal` — and this screen drew the undo
button over it with no notice at all. *"If you undo this, Loom puts back: the
card “Autumn sign-up”"* is true, complete about the page, and silent about the
charge.

This lane filed that on 3 October as a **question** rather than a request:

> *"is reversibility a property of a revision that the log should carry, or a
> property of the judgment that should be joined to it? … If the answer is the
> join, the useful thing is not a field here but … an `AssessmentSummary` a
> consumer can fetch by `proposalId` without paging the whole journal."*

[0225] is that join. This spends it.

**All three findings from 3 October are now closed**, which is the loop worth
recording: two of them by #501 the next day, this one by #505 the day after,
and the portal's half of each landed within hours of the framework's.

| | |
| --- | --- |
| `_lib/undo-check.ts` | new — the lookup, keyed to a row, and the three absences |
| `_lib/undo-check.test.ts` | new — 7 |
| `history/page.tsx` | one lookup for the page; the gap, said once |
| `history/_components/revision-row.tsx` | the warning, above the button |
| `revision-row.test.tsx` | +4 |

**+13 tests. Nothing weakened, nothing skipped.**

---

## Visuals

**Photographs of the application, signed in, through a production build served by
`pnpm shoot --serve`.** Three real revisions on the seeded page, applied through
the published `TreeStore.append`, with the Gate's judgment of each written
through the real `recordOf` into a real `memoryTelemetryJournal` — **the proposal
ids are the join and they match on both sides, because a run of Loom would have
written them that way.** The fiction is who asked, and a policy declaring
`loom.card` out-of-tree.

| | |
| --- | --- |
| [**three changes, one of which is not fully undoable**](2026-10-04-portal-undo-history-wide.png) | `1680×1000@2x`, full page |
| [**the same, on a phone**](2026-10-04-portal-undo-history-phone.png) | `390×844@2x`, `scrollWidth 390 / innerWidth 390` |

The first picture is the argument, because it has the contrast in it. Version 3:

> **If you undo this, Loom puts back:** Puts the card “Every change is a delta”
> `n_seed9`'s variant back to “outlined”.
>
> **Putting the page back would not put everything back.** This change sets up
> **Card**, which reaches beyond the page … **Check what Card is wired to before
> you say yes.**
>
> `[ Undo this change ]`

Versions 2 and 1, directly below it, carry nothing extra — their judgments
recorded no obstacle. A reader can see on one screen which of three changes is
the one to think about.

---

## The decisions worth reading

### Three absences, and only one of them is this screen's to say out loud

The framework's own contract is explicit that these must not collapse:

> *"truncating silently would make* not looked up *and* nothing recorded *the
> same empty answer at the one place a reader is being asked to decide
> something."*

| why a row has no standing | what the screen does |
| --- | --- |
| **nothing recorded** — no judgment in the journal for that proposal | nothing, per row |
| **not looked up** — more rows than one lookup answers | one line, once, naming how many |
| **the journal would not answer** | one line, once, with the error below it |

The first is silent **on purpose** and is the common case. A revision the runtime
authored — an undo, a repair — has no model's judgment behind it, and a
deployment with no journal configured has none for anything. A line on every row
saying *we could not check* would be the loudest sentence on this surface and
the least useful, on every history screen of every deployment that has not set up
a database.

The other two are the screen's **own ignorance** rather than the record's
silence. They are said once, above the list, because they are facts about the
read and not about any one change.

That distinction is the same one `_lib/undoing.ts` already draws between
`obstacles: []` and `unexplained`, one layer down. Two absences that render
identically and mean opposite things is the single failure this whole thread of
work has been about.

### One lookup for the page, where `reversals` spends one read per row

`previewReversal` is per revision and cannot be otherwise — a plan is about one
change. `assessments` answers about *a set of proposals a caller already holds*,
which is exactly what a page of rows is, so the whole screen costs one call.

The pairing is made from `StoredRevision`, which is the one place a revision
number and a proposal id are already together. A row is keyed by revision and the
journal answers by proposal; rebuilding that correspondence from a second read
would be inventing work the caller had already done.

### The button stays

A change that is irreversible *outside* the page is still invertible inside it —
0016 guarantees the inverse — so hiding the control would refuse something the
runtime will happily do. The reader is told, and decides. That is the same
posture the page screen takes about a change whose effect may be stale, and the
opposite of `ReversalNote`'s blocked case, where the button goes because the undo
genuinely cannot be computed.

Both notices can appear on one row, and they should: *this cannot be undone at
all* and *undoing it will not undo what it did outside the page* are different
facts about the same change.

### Above the button, after the note that says the page comes back

The order is the whole point of putting it in the row rather than in the
disclosure. `ReversalNote` has just told a reader what undoing puts back — true,
complete about the page, silent about the charge. **A reader who stops reading at
the end of that note and presses undo is exactly the reader this warning is
for.** There is a test for the order.

---

## What this tells a developer that they could not get elsewhere

The same thing the queue says, at the other end of a change's life: **which of
their own pieces a change reached through, crossed with the rule they wrote about
it** — this time about a change that already happened, at the moment they are
deciding to take it back.

`git revert` will undo a commit and tell you nothing about what the commit set in
motion. This is the one place that knows, because the Gate recorded it at
judgement time out of two things only this deployment holds.

---

## Gate

`pnpm install && pnpm verify` — **exit 0**, read from a file written as the last
act of its own line.

| | `main` at `f79e1d9` | this branch |
| --- | --- | --- |
| `@jam-overture/loom` | 180 files / 3,803 | **180 / 3,803** — `src/` untouched |
| `@loom/app` | 378 / 6,776 | **379 / 6,789** |
| findings | 996 | **996**, 0 malformed |
| `prerender:check` | — | 124 pages, 1,536 junctions, 0 run together |
| `pnpm shoot` | — | `1680 / 1680`, `390 / 390` — no overflow |

No findings filed, which is worth saying rather than leaving as an absence: this
run consumed three and produced none. No decision record — it consumes 0225 and
adds no concept.

## What I did not do

- **I did not hide the undo button.** See above.
- **I did not say anything per row about a change nothing was recorded for.**
  That is the common case and it is an answer, not a gap.
- **I did not batch `previewReversal`.** Still one bounded read per row, still
  filed from an earlier run as the case for a batched plan. Unchanged by this.
- **I did not touch `src/`.** `git diff origin/main -- src/ tools/` is empty.
