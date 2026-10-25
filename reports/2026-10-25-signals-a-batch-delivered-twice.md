# Reader signals — a batch delivered twice is folded once

**25 October 2026** · `Loom signals` · branch
`signals-53-a-batch-delivered-twice-is-folded-once` · §53 of
[`docs/signals.md`](../docs/signals.md)

## What I set out to do, and why it is not a reading

The queue said the next step was a new reading, and there are now thirty-eight of
them. Three of this lane's own pull requests are open and unmerged — #700
(0307, 0309), #706 (0308, the proposal), #707 (§52, the collection notice) — and
this lane may not stack branches, so everything those built is out of reach from
`main` for one more merge cycle. A thirty-ninth reading would have been the
fourth thing in the queue nobody can land.

So I went looking in the thing every reading is built on instead, and found
something I would rather have found a year from now than two: **nothing in this
subsystem had ever asked whether two batches in one window are the same batch.**

## What I completed

**§53 / [0314](../decisions/0314-a-batch-delivered-twice-is-folded-once-and-the-window-is-how-wide-that-promise-is.md)
— a batch delivered twice is folded once, and the repeats are reported.**

Three things in the design invite a repeat and none of them is a mistake:

- `MAX_BATCHES_PER_DELIVERY` is 50, and its own comment says why — *"anything
  above a handful is a retry queue draining after an outage, and that is worth
  allowing"*. A retry queue re-sends what it already sent, and nothing can tell
  it what landed: `deliver.ts` reads no response, on purpose.
- The buffer's key is a surrogate `seq`, and `journal.ts` states it as a
  property that *"receiving a batch cannot collide with another batch"*. Two
  deliveries of one batch are two rows.
- An edge network replaying a `POST` is nobody's code.

**Why nothing had noticed, which is the part that made this worth a run.** The
damage is asymmetric. Of the nine counters on a tally, `views`, `reached` and
`engaged` are sets of view keys — and so are `appearances` and both ends of every
funnel — so a repeat adds a key the set already holds and **moves nothing**. The
other five, `dwellMs`, `activations`, `opens`, `closes` and `completions`, are
occurrences and **double**. Every rate this subsystem publishes divides the
second kind by the first. So a repeat does not look like noise or a total out of
range: it looks like a reader who was twice as interested as they were, on the
figure a deployment decides with, permanently, with the buffer that could prove
otherwise dropped by the same operation that counted it (0158).

The fix is interpretation and not collection, which is what the brief asks for
before anything reaches a payload. The identity is derived at the fold from what
a batch already carries — tree, revision, view key, `sentAt`, audience, whether
it is the opening delivery, and every field of every signal in it. **Nothing was
added to the wire, the browser, a column, a store or the vocabulary of kinds.**

## Decisions I took that were not specified

**The contents are in the key, not just the envelope.** Keying on
`(tree, revision, view, sentAt)` alone would have been a tenth of the memory and
would drop a real batch wherever a page flushed twice in one millisecond with
different contents. Including every field of every signal means the fold can only
call two batches the same one when they are, field for field, the same batch. The
mistake worth avoiding is not the one being prevented — it is dropping a reader's
real data to avoid it.

**A key and not a digest.** A 32-bit hash of the same tuple collides somewhere in
a few million windows and loses a real batch when it does. A window of 5,000
batches holds a few hundred kilobytes of keys, against the per-node view sets a
6,000-node page already puts beside them, and the lookup is one per batch, so the
fold stays linear (rule 4).

**Only where the batch carries a view key.** Without one a batch holds nothing
unique to its sender, so two readers reaching one band in the same millisecond are
byte-identical. `uncorrelated` goes on saying how many could not be judged.

**The promise is exactly as wide as the window and says so.** Two deliveries
either side of a collection boundary are two windows' input and are counted
twice, bounded by *(retry delay ÷ window length)* — the same shape of bound 0147
states for the page views that straddle one, shrinking with the same setting.
0158 is untouched: applying one window's rollup twice still doubles it, because
that is two runs and not two batches.

**The number is reported rather than swallowed.** `Rollup.redelivered` and
`CollectionSummary.redelivered`, and one clause on `describeCollection`'s line
when it is non-zero. A window with repeats in it every run is a retry loop
somebody should go and find, and until today there was no instrument that could
say so.

**Four literal `NUL` bytes came out of `rollup.ts`.** They were template-literal
separators — the right value, written into the file as the byte rather than as
`"\u0000"` — and they made the busiest module in this directory **binary to every
content search there is**. `grep` and `ripgrep` print no lines and say `binary
file matches`, so every search of this repository silently skipped it. I found
them because one of my own greps came back empty when it should not have. They
are one `SEP` constant now, and `src/signals/source-text.test.ts` fails on a
control byte anywhere under `src/signals/`.

## Where the test suite corrected me

One existing test failed on the first run, and it was right to:
*"sums two submissions in one page view without counting the view twice"* built
two batches that were **byte-identical** — `batchOf` defaults `sentAt` to 1,000
and `completed` defaults `at` to 1,300 — so my rule called a deliberate
double-submission a repeat. The fixture's convenience had become load-bearing. A
real second flush carries a later stamp, so the fixture now gives the second
batch one, and the test's intent is intact.

That is also the reason for the broadcaster test rather than an argument: I did
not want the guarantee to rest on my reading of what a page can emit.
`broadcast.test.ts` now drives the real broadcaster at the hardest case there is —
the same press on the same node, flushed three times — and reads the batches the
way the fold reads them. With a clock that moves, three distinguishable batches.
With a clock frozen, the opening delivery is still distinguishable because it
carries `first`, and the second and third are not. **That is the one stated loss
and it is pinned rather than argued away:** a page whose opening is spent, with a
frozen clock, recording the same event twice with a flush between them, loses one
occurrence. It needs two flushes and a repeated identical event inside one
millisecond, which no reader produces and a script dispatching synthetic events
can. Weighed against doubling every occurrence counter permanently on any retry,
and written into the record so it is a decision and not a surprise.

## Records added

- **0314** — *A batch delivered twice is folded once, and the window is how wide
  that promise is.* Accepted. Five alternatives recorded with what each costs,
  including the two I expect to be asked about: a sequence number on the wire,
  and refusing the repeat at the door.

Nothing is `Proposed`, so there is nothing on this branch for `Loom merge` to
skip. 0314 was the next number free on `main`, which holds up to 0312; 0307,
0308, 0309 and 0313 are claimed by the three open pull requests and 0314 is
claimed by none of them.

## Findings filed

1. **The door counts a repeated opening batch twice across two deliveries, and
   the region floor is what that reaches.** Owned by the maintainer, because the
   remedy contradicts a sentence of 0146 and because half of it is about a
   privacy floor. `openingsOf` dedupes by view key *within* a delivery, so one
   request is safe and two are not. Two counters move: arrivals, which is the
   denominator three library readings scale by — and **region buckets**, where a
   bucket is kept only once 25 views are in it *because country plus a handful of
   views is a person*, so arrivals that are not readers let a bucket reach that
   floor on fewer real people than it was chosen to require. Three shapes costed;
   recommendation is the one that needs his word, and nothing until he gives it.
2. **A sequence number per page view would make this exact, and costs 7 bytes of
   wire per batch for ever.** Filed with the number rather than built, per the
   lane's rule that a browser-facing field is measured before it is proposed.
3. **One literal `NUL` byte is left in `src/runtime/repointing.ts`**, which is
   `Loom daily build`'s. Filed with the one-character remedy and the one-line
   change to widen `source-text.test.ts` once it is closed.

Nothing closed: the three open findings that are mine sit on #700 and #707.

## Test numbers, and what was planted at them

`pnpm install && pnpm verify` **green, exit 0.**

| | |
| --- | --- |
| Root suite | 238 files, **5,675 tests**, all passing |
| App suite | 363 files, **6,447 tests**, all passing |
| `src/signals/` | 47 files, **1,544 tests** |
| `rollup.test.ts` | 36 → **49** |
| `collect.test.ts` | 29 → **31** |
| `broadcast.test.ts` | 50 → **52** |
| `source-text.test.ts` | new, **2** |
| Findings ledger | 1,306 entries, 0 malformed |

**Nothing failed and nothing was skipped.** One existing test changed, for the
reason given above, and its assertion is unweakened — it gained
`expect(rollup.redelivered).toBe(0)`.

**Eight planted mutations, no survivors — but one survived the first sweep and it
mattered.** Dropping `within` from the signal key killed nothing, which made the
clause unfalsifiable (0231) and therefore its own fault. The resolution was not
to delete it: the ancestry is read off the live DOM when the event happens, and a
page changes under a reader — a client component mounting or a boundary resolving
moves a control into a band it was not in — so two presses on one node can differ
in nothing but the band they were inside, and each band is owed its credit. There
is a test for that now, and the mutation dies. The other seven: refusing the
repeat without skipping it; dropping `sentAt`, `first`, the signals, or
`dwelled`'s `ms` from the key; de-duplicating uncorrelated batches too; and never
reporting the count.

**One assertion is there specifically to make this safe to add under figures that
are already published:** the same window is folded with and without the repeat,
and `views`, `appearances`, the funnel answers and `reached` come back equal.
Refusing a repeat cannot move a figure a set of view keys was already protecting.

**Browser cost: nothing.** `broadcast.ts` is byte-identical — `git diff` on it is
empty — and the bundle is **6,513 bytes** minified, the same number as yesterday.
`browser-weight.test.ts` still reports no package in the broadcaster's import
graph. `rollup.ts` is server-only and reaches no browser.

## Open questions

1. **The door's half of the repeat needs your reading, because the remedy steps
   over an accepted record.** Recommendation in the finding: let the door ask the
   buffer it just wrote whether it has seen this view key — the buffer already
   holds the column for exactly the retention window, so nothing new is kept and
   no lifetime changes — but the sentence it contradicts is 0146's, so it is
   yours. Until then: nothing, and `redelivered` is the instrument that will tell
   us whether any deployment actually has this.
2. **The sequence number: 7 bytes per batch, for ever, to close a loss case that
   needs a page dispatching synthetic events into its own measurement.**
   Recommendation: don't. Filed so the choice stays open rather than forgotten.
3. **Nothing draws any of this — seven runs now.** `Loom portal` is still paused.
   0309's rung from a store to a reading is still on #700 and still unmerged.

## On keeping the parked door cheap to open

Nothing here makes per-reader identity more expensive to add later, and one thing
makes the shape of it slightly clearer: the derived identity is *per delivery*
and expires with the window, which is the opposite property from the one a reader
id would need. The sequence-number finding notes the one thing to watch if it is
ever taken — a field whose job is to be an identifier invites being made stable,
and it would need the same sentence `view` carries.
