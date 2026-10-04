# Reader signals — before and after the change, which is the measurement the product is for

**Routine:** `Loom signals` · **Date:** 4 October 2026 · **Branch:**
`signals-07-before-and-after`

## What I completed

**§10 of [`docs/signals.md`](../docs/signals.md): the comparison of two
readings.** `readingChangeOf(was, now)` in
[`src/signals/change.ts`](../src/signals/change.ts) takes two `PageReading`s and
answers *six in ten readers left at the pricing band and now four in ten do*.

Everything this lane had built reads **one window of one revision**. §6 joins a
window's counters to a tree, §8 counts that revision's page views exactly, §9
says where in that revision reading stops — and the comparison of two of them,
which is the only question that justifies a model proposing a change at all, was
left to whoever was looking at two screens. §1 made it honest at the collection
end nineteen days ago, where a broadcaster used to go blind at exactly the bands
the Gate had just changed. Nothing read it until today.

It is the **fourth** thing taken out of the server-side join rather than
collected. **Nothing was added to a payload, a browser, a column, a store or the
vocabulary**, and the broadcaster was not touched: the diff for
`src/signals/broadcast.ts` and every module it reaches is empty.

Recorded in
[0224](../decisions/0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md).

### The three things that decided the shape

**1. A `reached` count is not comparable across two revisions, and a share is.**
Two revisions are two trees read by two sets of readers in two windows, so the
counts differ for three reasons at once — the page changed, traffic changed, and
the rollup windows straddled differently (0147) — and nothing divides out. A
stop's share is `lost ÷ reached` off two rows of *one* revision, so 0221's
cancellation has already happened on each side before the two sides meet. So the
unit of comparison is the **stop**, and no count of one side is ever divided by a
count of the other. *Three hundred readers reached the pricing band and now four
hundred do* is three sentences about traffic wearing one about reading.

**2. A pair the change dissolved is an answer, not a gap.** A stop is a pair of
adjacent siblings, and a change can remove an end, move one away, swap them, or
insert a band between them. The obvious handling — join on the pairs, drop the
misses — would be silent about *the commonest change anybody will make*, which is
putting something into the gap where readers were leaving. Five fates are
reported with the measuring side's own figure: `absent`, `unanchorable`, `moved`,
`reordered` and `separated`. The last of those is the one worth looking at
hardest, and it is the reason the list exists.

**3. The measurement that looks most like success can mean the page stopped being
read.** A pair whose share was 0.6, beside a pair nobody now reaches, subtracts
to a perfect fix. That is `unreached` — filed on whichever side somebody did
reach — and it is never reported as a fall that was fixed. It is the same shape
§9 found in a part that reported something other than a view: the lie in the
direction nobody checks.

## Decisions I took that the step did not specify

**1. The threshold for a real move is one reader, and it is evaluated in
integers.** I considered a floor on views, as §7 uses for a region bucket, and
rejected it: a floor needs a number nobody can defend, and the honest statement
is already available from the counts themselves. `resolution` is `1 ÷ min(was.reached,
now.reached)` — what one reader is worth on the coarser side — and
`beyondOneReader` says whether the two shares are at least that far apart. It
compares them by cross-multiplying both denominators and the smaller count, so
**no division decides whether a reader exists**; a float that landed a hair under
the threshold would silently answer a question about people with a question about
rounding. Exact up to about a hundred thousand views of one part of one revision
in one window, and the bound is stated where the function is.

**2. I did not add a statistical test, and this is the one I most expect you to
push back on.** A confidence interval would be defensible arithmetic and an
indefensible promise: the inflation 0147 names is a *systematic* error, not a
sampling one, so an interval computed as though the counts were independent draws
would be narrower than the truth and would carry more authority than any other
figure on the screen. One reader's worth is a weaker claim that is actually true.
It is in the record's alternatives as the thing to revisit if a deployment asks
for significance.

**3. There is no page-level total of readers kept, and the absence is the
decision.** One reader who got past the second band and then the third is in both
stops' figures, so a sum counts them twice — 0147's distinctness trap for views
and 0167's for presses, in the one place where the sum would look most like the
headline. There is a test asserting the field is not there, because the natural
thing for a future run to do is add it.

**4. The ranking key is readers kept at the volume the page has now**, not share,
for §9's reason: a stop two readers out of three abandoned is a worse rate and a
smaller problem than one four hundred out of a thousand did. `readersKept` is
`improvement × now.reached` and is deliberately not rounded — it is a ranking key
and a magnitude, not a census.

**5. It compares two readings, not two revisions, and I did not restrict it to
one revision pair.** Hand it two windows of the *same* revision and no part is
added, removed, moved or reworded, every pair matches, and what comes back is
*this week against last week*. That is not a special case to allow for; it is the
same question with the tree held still, and it means week-over-week reading needs
no second function. It follows that nothing here checks which reading is older:
the labels are the caller's, and a caller who holds them backwards gets every
sign reversed rather than a refusal.

**6. The tree half of the answer stands when the reader half cannot.** A window
with no views silences every share, and still reports what the change did to the
page. *Three bands moved and one was reworded, and nothing has been measured
since* is a true and useful sentence, and the alternative — one refusal covering
both halves — would have made a new deployment's first comparison a blank screen.
Two different trees answer nothing at all, parts included.

**7. `improvement` and `readersKept` carry the same sign on purpose.** Positive
is fewer readers stopping. A screen with one figure pointing each way is the
defect a reviewer cannot see, so there is no raw `now − was` delta published
beside them.

**8. A rewording is reported as a floor.** `parts.reworded` names the shared
parts whose own words changed, and a part whose type declares no `copy` has no
words to compare — so `parts.unreadable` counts the shared parts nothing could
see either way, rather than letting them read as *unchanged*. That is 0122's
bargain and 0212's, and it is the §6 thinness showing up in a second place.

**9. Fates are diagnosed off the readings' parts, not off their runs.** This was
a real defect I shipped and caught in the first test run: a part moved under a
parent it is now the only child of is a step of no run at all, so diagnosing from
the runs reported *something came between them* and hid the move that explains
it. The placement map is built from `PageReading.parts`, which has every part
including the only children and the root.

## Records

- [0224 — A before-and-after reading compares two shares, and a pair the change
  dissolved is an
  answer](../decisions/0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md),
  **Accepted**. It contradicts nothing: 0221's ratio argument is extended one
  level up and used as it stands, 0147's bound and 0219's measurement are
  untouched, 0212's read-time join is what makes `reworded` grow on its own, and
  nothing on the wire, in the browser, in a schema or in the vocabulary moved.
  **0224 is the next number free on `main`** (0221 is the highest there); 0222 is
  claimed by #501 and 0223 by #503, both open, so I took the next one after
  theirs rather than setting up a renumber.

## Findings

**Filed:**

- **`Loom portal`** — the call, `mostKept` as the one sentence a reader screen
  can lead with, and five things to be careful of: never divide one side's count
  by the other's, `improvement` is positive where fewer readers stop,
  `incomparable` is where the interesting change is rather than a list of errors,
  `beyondOneReader` is the gate for anything you lead with, and never add
  `readersKept` across stops.

**Closed:** none. The one open finding this lane owns is the `fetch` hole in
`completed` (1 October), which is a question for you before it is a unit of work
and is unchanged by this.

## Test numbers, measured

`pnpm install && pnpm verify` — **green, exit 0**, written to a file and the exit
status read in a separate command.

| | this branch | `main` |
| --- | --- | --- |
| Runtime suite | **179 files, 3,757 tests, 0 failed** | 178 files, 3,728 |
| Application suite | **374 files, 6,674 tests, 0 failed** | unchanged |
| `findings:check` | 983 findings, 0 malformed | 982 |
| `prerender:check` | 124 pages, 1,472 junctions, 0 run together | unchanged |

**29 tests added, nothing skipped, nothing weakened.** All 29 are the new
module's, which is the whole of the difference in the runtime figures — I added
exactly one test file and changed no existing test. The application suite is
unchanged by me except for a generated file; the two application tests that read
it are the gate described below.

**Two runs were red before this one, and both were the gate catching me:**

1. `src/documentation.test.ts` — *never makes a decision-record number part of a
   published sentence*. Two of my doc comments said "0221 ranks…" and "0122
   struck…" where a casual reader of the API reference would meet a number with
   no referent. The rule lifts parenthesised citations and links before checking,
   so the remedy is to write the sentence so it reads without the number. Both
   rewritten.
2. `app/(docs)/_lib/api/extract.test.ts` and `offered.test.ts` — the generated
   reference, regenerated with the repository's own `pnpm --filter @loom/app
   docs:api`. The published surface moved: 1,226 exported names to 1,238, which
   is seven new types and five new value exports (`readingChangeOf`, `CHANGE_SILENCES`, `PAIR_FATES`,
   `describeChangeSilence`, `describePairFate`). `offered.test.ts`
   is the sharper of the two — it says a published name no page mentions is
   something a reader has no way to find.

### The thirteen planted defects, and the thirteen that went red

Each mutation applied alone, the module's suite run, then reverted.

| the mutation | what went red |
| --- | --- |
| the improvement is subtracted the other way round | 12 cases |
| readers kept are counted at the volume the page used to have | *puts the improvement in readers at the volume the page has now* |
| the comparison is between two counts instead of two shares | 9 cases, including *reports no change when twice as many readers behaved identically* |
| every move is beyond one reader | the twice-as-many case, and *holds a move smaller than one reader off the headline* |
| the resolution comes off whichever side counted more | the same two |
| a pair nobody reached is compared anyway | both `unreached` cases |
| a reorder is reported as something coming between them | *calls a pair reordered when a move swapped it* |
| a pair nobody stopped at is not a pair | 4 cases, including the week-over-week one |
| an equal improvement displaces the one already standing | *keeps the first in reading order when two pairs kept exactly the same readers* |
| a move smaller than one reader can be the headline | *holds a move smaller than one reader off the headline* |
| a part whose words nothing could read is called unchanged | *counts the parts whose words nothing could read* |
| a silent window says nothing about the page either | *still says what the change did to the page* |
| a part moved under a new parent reads as something coming between | *calls a pair moved when its parts are no longer children of one part* |

**The ninth needed the test rewritten, and that is worth saying rather than
hiding.** The tie-break case passed with the defect in place, because my first
version of it was not a tie — the two pairs' `readersKept` were 10 and 1.25, so
the right answer won for the wrong reason. The case is now two runs of two
children each, both losing half their readers and both keeping a quarter back, so
both pairs keep exactly 25 readers and only the ordering rule can decide. With
`>=` for `>` it goes red.

### The double-count case this lane requires

Two of them. *Has no page-level total of the readers a change kept* asserts the
field's absence on a page where one reader got past two bands, which is exactly
when a sum would be wrong. And *reports each pair of siblings exactly once,
compared or not* holds the property directly over a change that reorders and
inserts at the same time: a pair counted in `stops` and again in `incomparable`,
or twice in `incomparable`, fails it.

## Browser cost

**Zero bytes added.** `src/signals/broadcast.ts` and every module it reaches are
untouched — the diff for them is empty and `browser-weight.test.ts` passes
unchanged. Measured on this branch for the record: the broadcaster bundles to
**6,477 bytes minified** (esbuild, ESM, bundled from `dist/signals/broadcast.js`),
which is the same figure the last run measured on `main`. Gzipped it comes out at
2,935 bytes here against the 2,941 reported on 3 October; the input is
byte-identical, so that is the compressor and not the code.

## Cross-lane diffs, named

- `apps/loom/app/(docs)/_lib/api/reference.generated.json` — generated, as above.
- `decisions/README.md` — generated with `pnpm decisions:index`. It prints its
  usual notes for the holes at 0149–0154, and now for 0222 and 0223, which are
  the two open branches' numbers.

Everything else is `src/signals/`, `docs/signals.md`, `FINDINGS.md` and the
record. **No other lane has a branch open on the signal path**: of the three open
pull requests, #503 touches `src/primitives/` and its own record, #502 the
portal's reader screen, #501 the review queue's. #503 is the one to watch from
here, in a good way — it declares `copy` on 102 primitives, which is what makes
`parts.reworded` stop being a floor.

## The parked door

**Per-reader identity is neither cheaper nor dearer for this change.** Every
figure here is a ratio between two nodes of one revision inside one window, and
it writes nothing at all. What an identity feature would want from this question
is *which readers stopped where before and after*, which is a per-view
breakdown — and the reason this reading cannot be bent into one is the reason it
is honest: it is built on counters already collapsed from view keys to counts, and
by then rule 2 has thrown the keys away.

One thing worth flagging in the other direction. The comparison's unit is a
**window**, not a reader, and `beyondOneReader` is a resolution statement about
counts. If identity ever returns, the natural upgrade is the same comparison with
a real denominator — distinct consenting readers rather than summed distinct
views — and nothing here forecloses it, because `readingChangeOf` takes readings
and does not know where their counts came from.

## Open questions

**1. The `fetch` hole in `completed` — five days open, and still the only thing
in this lane actually blocked.** A host's form that posts with `fetch` calls
`preventDefault`, so the broadcaster sees a cancelled submit and reports no
completion: a deployment can have conversions and read zero, with nothing
distinguishing that from nobody converting. The only honest fix is a function the
host's own code calls — `completed(node)` on the broadcast handle — because only
the page knows its submission succeeded. Rule 3 refuses measurement as a *prop in
the tree* so a proposal cannot switch it on; a host's own code is not a proposal,
but that distinction should be written down before anything relies on it.
**Recommendation: allow it, and let me write the distinction into a record that
amends nothing.** One run's work once you say.

Today sharpened the argument again. What landed is *the change moved this fall
from six in ten to four in ten*; the figure a business reads that number
**against** is the conversion rate, and it is the one figure in the vocabulary
with a known hole in it. I have now put this to you three runs running and built
around it each time, so if the answer is no I would rather have the no and close
the finding.

**2. What I would do next if you say nothing.** The honest candidate is **the
rollup's own exact page-view count**, which §8's record named and left: `opened`
is counted at the door, and the same opening marker would give a rollup an exact
count of page views *begun* in a window — turning 0147's approximation from a
bounded error into a solved one rather than a measured one. It is a column and a
counter in code I own, it needs nothing from another lane, and every rate the
portal shows gets a true denominator per window rather than per revision.

The other candidate I am **not** taking: inventing a role from a primitive's type
so that a reading can say *what kind of part* readers stop at. #503 is the right
fix for that and is open as I write; guessing it from this lane would be exactly
the kind of inference §9 refused a spine heuristic for.

**3. Carried over, neither blocking.** The region floor is one constant if 25 is
not your number. Whether the reader-signal half of `docs/deployment.md` is this
lane's is still one line of your reading; `docs/signals.md` carries the
environment variables meanwhile, and this step added none.

---

## Postscript, the same day — `Loom merge` brought `main` in, and one of my own caveats expired

`Loom merge` merged `main` into this branch and regenerated the two generated
files, as [0139](../decisions/0139-a-shared-ledger-is-union-merged-and-a-generated-file-is-regenerated.md)
says it does. Re-verified on the merged head: `pnpm verify` **green, exit 0** —
**180 files, 3,784 runtime tests**; 375 files, 6,713 application tests; 990
findings, 0 malformed; 124 prerendered pages, 1,474 junctions. Vercel redeployed
and the combined status is success. Nothing in `src/signals/` needed a line.

**What came in with it changes one thing I wrote above.** #503 landed
[0223](../decisions/0223-a-prop-is-copy-when-a-reader-could-quote-it.md): `copy`
is now declared across the whole starter library, and `loom.heading` declares
`role: "heading"` — verified in the merged tree, and still the only role any
primitive declares.

So **`parts.reworded` is no longer a floor in practice** for a page built from
the starter library. *The band you reworded is the band readers now get past* is
answerable today rather than when somebody gets round to a declaration, and
`parts.unreadable` goes back to being what it is for: the honest counter for a
deployment whose own primitives declare nothing. 0224's consequence —
*`reworded` grows the day `src/primitives/` declares `copy`, with no change
here* — was satisfied about six hours after it was written, by a merge, which is
the read-time join of 0212 paying out for the second time. The record stands as
written; the finding for `Loom portal` carries the update.

And the §9 sentence *nothing in `src/primitives/` declares a role* is now *one
thing does*. A reading grouped by role can say something about headings and
nothing else. Whether a second role is worth having is 0114's bar and a framework
decision — `Loom primitives` put the same question on #503, and it is still not
this lane's to answer.
