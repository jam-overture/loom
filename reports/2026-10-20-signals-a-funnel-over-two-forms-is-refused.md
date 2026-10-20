# Reader signals — a funnel over two forms is refused, and `null` was two states

**Routine:** `Loom signals` · **Date:** 2026-10-20 (morning run) · **Branch:**
`signals-42-a-funnel-over-two-forms-is-refused` · **Section:** §42 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

The third and last of the three joins
[0290](../decisions/0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md)
clause 4 scoped *only where the asking names an audience*. §40 fixed the region
map's buckets and §41 — open as #680 — the door's arrivals. `funnelReachOf` was
the one left, and it is the only one of the three that **divides**.

It filtered its funnel rows by audience where one was named and otherwise took
the first row per question, counting the rest in `duplicatedPairs`. The door row
it divides by is picked out of a **different array** by the same rule, and the
two arrays are two store reads with no guaranteed order between them. So:

```
SKIERS    4 reached of   100 arrived   →   40%
RIDERS  400 reached of 1,000 arrived   →   40%

published:  entry share 0.004, one funnel row and one door row "duplicated"
```

**0.4% where both forms converted at 40%** — two orders of magnitude, decided by
the order two lists arrived in, with the evidence in the one field nobody reads
as an undercount. I reproduced this on `main` before changing anything.

Three instances of one shape is a cause rather than a coincidence, and the cause
is that **`null` was doing two jobs**: *no window ever carried the column*
(one population, read whole) and *two forms with none asked for* (no population,
read as neither). Spelled as one value, the two were indistinguishable in a diff
and the wrong handling compiled.

- **`AudienceScope`** in `audiences.ts`, beside `readingKeyOf` and `formKeyOf`
  as the third rule of the same kind. Three members — `one`, `unlabelled`,
  `mixed` — and the `mixed` member **carries no audience**, so a reading handed
  an ambiguous window cannot read one off it. `audienceScopeOf` decides it;
  `audienceScopeRead` reads it back off a reading that recorded it.
- **The funnel refuses the pairs** of an unsplit window: `pairs` empty, every row
  in `otherAudiencePairs`, `duplicatedPairs` nought, and a new
  `FunnelReach.audiences` naming both populations — the shape `pageReadingOf`
  already had for its parts.
- **The scope is taken over the page reading's census and the funnel rows'
  together.** A caller holding a reading of one form and funnel rows of two is
  as unable to say whose answer it is as the reverse, and only the reverse was
  reachable through the reading's own census. Both are now refused.
- **`funnelChangeOf` refuses a mixed side.** This is the part I would have missed
  by fixing only the reading: an empty side **pairs cleanly**, so every question
  of the other side comes back as added or removed and the comparison reads as
  *this change added every funnel question you ask* about a window nobody read.
- **`FunnelChangeSilence` gains `audiences-mixed`** and the silence table its
  fifteenth condition, `two-forms-unsplit` — the first condition in it about what
  the **caller** handed in rather than about the deployment, the window or the
  shape of the page.
- **`pageReadingOf` is unchanged in behaviour** and now imports the rule instead
  of spelling it. Its own tests are the proof: none of them moved.

Record
[0300](../decisions/0300-what-audience-a-reading-is-of-is-a-three-way-answer-and-a-window-of-two-forms-is-read-as-neither.md),
Accepted, nothing superseded.

## Decisions I took that the step did not specify

**Refusing the pairs rather than summing them**, which was the close call.
Arrivals at the door add across forms because they are counted once per page
view (0297, and #680 for the door), and two forms' page views are disjoint, so
their funnel counts add too — the arithmetic is fine. What breaks it is the
question: a pair's ends are node ids a deployment wrote down in advance, and the
deltas an audience earns can leave one of those ends out of one form. A summed
numerator is then over the readers who *could* answer while the summed
denominator is over everybody, understating conversion by an amount nothing in
the rows can state — and *this funnel is broken* is the claim somebody acts on.
The deployment-wide answer is `byAudience` and one reading per form, which 0290
clause 2 published for exactly this.

**Not withholding the door's figures on a refused reading.** `opened`,
`appearances`, `drift` and `pending` are the deployment's arrivals and they add,
so a refused reading still says *this many readers arrived across both forms;
which of them converted is a question per form*. That is a sentence, and it is
the honest one.

**Not adding a member to `ReachSilence`.** Its three members are states of the
*deployment*, and four other silence sets map it member for member, so a fourth
would need a meaning in contexts that cannot reach it. The refusal is a state of
what the caller handed in, and the census reports it the way `pageReadingOf`'s
does.

**Not touching `page-views.ts`.** It is the fourth reading of this shape and is
fixed on #680, which was written last night and is waiting to land; touching the
same function here would hand the merge a conflict in the one file both changes
rewrite. The two compose: once #680 is on `main`, the door figures on a refused
funnel reading are the sum over both forms rather than whichever row sorted
first. Adopting `AudienceScope` there is filed.

**Skipping a decision number.** `main` carries 0298 and #680 holds the next one,
so I took 0300 rather than clash — and nothing on this branch cites #680's record
by number, because it is not here and the citation check would not resolve it.

**Editing one file in another lane, which I would normally file instead.**
Lesson 28's exercise C demonstrates that *a number nobody has written is
catchable*, and its fixture was `(0300)` — so writing record 0300 made the
citation resolve and turned the lesson's own printed verdict from `1 problem(s)`
to `0`, failing `transcripts.test.ts` on a branch that had not touched
`lessons/`. The fixture is now `0998`, with a short paragraph saying why. The
alternatives were to choose a decision number in order to dodge a test, or to
leave this change unshipped on a red verify; both are worse than four lines in a
file whose own prose had already written the rule the edit follows — *a verdict
that survives the set growing, and is still false the day it stops being true,
is the better shape.* Filed for `Loom lessons` with the better fixture I did not
write: one derived from the highest record on disk, which is unclaimable by
construction.

## Records, findings and the plan

- **Added:** record 0300, Accepted. Nothing superseded. `pnpm decisions:index`
  regenerated; it reports a hole where #680's number is, which is a note rather
  than a fault.
- **Closed on filing:** the funnel's cross-population division, written up
  because it is a number a deployment would have acted on.
- **Filed, open, mine:** `pageViewsFor` as the fourth reading, to adopt
  `AudienceScope` once #680 lands — with the note that the door **sums** the
  `mixed` case while the other two **refuse** it, which is correct and worth
  being visibly deliberate.
- **`docs/signals.md`:** §42 written, §41 listed as in review so the plan does
  not read as though this step were the last of the three, and a row added to
  the table of what is built.

## Test numbers, and what they actually prove

`pnpm install && pnpm verify` green, exit 0.

| | |
| --- | --- |
| Root suite | **233 files, 5,474 tests**, all passing |
| App suite | **343 files, 6,053 tests**, all passing |
| `funnel.test.ts` | 66 tests, up from 55 |
| `audiences.test.ts` | 44 tests, up from 31 |
| `funnel-change.test.ts` | 44 tests, up from 39 |
| `silences.test.ts` | 53 tests, up from 52 |
| Findings ledger | 1,261 entries, 0 malformed |
| Prerender | 133 pages |

**Nothing failed and nothing was skipped.** Four tests failed on the way and all
four were mine to fix rather than weaken:

- `documentation.test.ts` caught three doc comments where a record number was
  part of a published sentence — `(0290 clause 4)` is not a liftable
  parenthetical;
- the citation check caught every reference to #680's record number, which does
  not resolve on this branch;
- `extract.test.ts` wanted the API reference regenerated, which is what it is
  for;
- `transcripts.test.ts` went red on lesson 28, because record 0300 is the number
  that lesson's exercise used as its example of a citation naming nobody. That
  one is written up above and filed.

**Also worth saying plainly: I lost the five source edits once**, to a `git
checkout --` in the mutation harness I wrote, before anything was committed. The
tests and the prose survived and I reapplied the source from the same scripts,
then committed before mutating anything. The suite is what proves the
reapplication is the same change, and the mutation table below was run against
the committed tree.

**Fourteen planted mutations, thirteen caught:**

| mutation | caught by |
| --- | --- |
| don't refuse — take the first row per question as before | 5 tests |
| scope from the page reading only, ignoring the funnel rows | 2 |
| scope from the funnel rows only, ignoring the page reading | 1 |
| publish the census of the rows read rather than of the window | 2 |
| read two forms as `unlabelled`, so the window is read whole | 15 |
| let a window of two override the audience asked for | 5 |
| call one named audience ambiguous too | 71 |
| leave the census in arrival order | 1 |
| read a reading's absent audience as the first it names | 4 |
| drop the comparison's refusal of a mixed side | 3 |
| refuse only the earlier side | 1 |
| lose `pageReadingOf`'s refusal, so a mixed window is read whole | 2 |
| map the new member onto the `two-audiences` condition | 3 |
| *insert a dead refusal before the real guard* | **survived** |

The survivor is a no-op: I meant to test that the comparison's refusal happens
**before** the pairing and instead inserted unreachable code. Writing the real
version of it showed the claim was wrong — `refusing()` discards `added` and
`removed` whatever order it is reached in, so where the guard sits is not
observable. The comment and the record clause said the ordering mattered; both
now say what is true, which is that the refusal is what matters and an empty side
pairing cleanly is why. The mutation that *does* test it — dropping the guard —
is caught.

**The method note, which is the transferable part.** Each of the three instances
had a test over the faulty path, and each used two *different* key values: two
countries, two revisions, two trees. So each documented the intent while the code
failed only where two rows **share** a key. A test over a two-form window has to
make the rows collide.

## Nothing reaches a reader

No payload field, no browser code, no column, no store, no new kind.
`broadcast.ts` is byte-identical to `main` and measures **6,477 bytes minified**
(esbuild, bundled, browser platform) — unchanged, because nothing in this change
is on that side of the wire. The thirtieth thing taken out of what this subsystem
already knows rather than collected.

Rule 4's budget is untouched and `browser-weight.test.ts` passes. Nothing here
makes per-reader identity cheaper or dearer to add later: `AudienceScope` is
about a column the host wrote, and an `aud_` is still an opaque name for a
predicate Loom never sees.

## Open questions

Three, each with a recommendation, none blocking. They are in the pull request
comment.

## After this report was written: #680 landed

**20 October, 15:22 UTC.** #680 merged as 0299 and `main` was merged into this
branch, with one conflict in `docs/signals.md` — my placeholder §41 against its
real one — resolved in its favour, which is right. The two records now sit beside
each other, so every citation on the branch that had to name #680 by pull request
names 0299 instead, and the statements that it was *waiting to land* are
corrected to say it has.

What that changes in substance, rather than in prose: **the door figures on a
refused funnel reading are now the sum over both forms** rather than whichever
row sorted first. That was predicted above as the way the two changes compose;
it is now the behaviour on this branch. `pnpm verify` was re-run on the merged
head and the numbers in the table above are from that run.

The `pageViewsFor` adoption filed for this lane is no longer blocked — it was
deferred only to keep two changes out of one function — and I have not widened
this pull request to take it. The four readings will then answer the `mixed`
case in writing: the door sums it, `pageReadingOf` and `funnelReachOf` refuse
it. That split is correct and worth being deliberate rather than incidental,
which is the whole reason the adoption is worth a unit at all.
