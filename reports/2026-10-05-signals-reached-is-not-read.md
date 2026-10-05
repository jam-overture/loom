# Reader signals — reached is not read, and only the skim is a claim worth making

**Routine:** `Loom signals` · **Date:** 5 October 2026 · **Branch:**
`signals-09-reached-is-not-read`

## What I completed

**§12 of [`docs/signals.md`](../docs/signals.md): whether readers had time to
read what a part of a page says.** `readingPaceOf(reading, options)` in
[`src/signals/pace.ts`](../src/signals/pace.ts) sets the time each reader spent
on a part against the time that part's words take, and answers *readers spend
eight seconds on a band that takes fifty to read*.

§6 answers *which parts came into view*, and it has always been careful to say
only that: `read` there means **a row says this part was on a reader's screen**.
A band a reader scrolled through in two seconds satisfies it. A page of them
reports as a page read from top to bottom, and nobody looking at the result can
tell — which is the plausible-false-number failure this subsystem keeps finding
in new places. The plan's first priority names the missing half directly:
*which parts of a page are read and which are scrolled past*.

Both sides of it were already in hand. A tally has carried `dwellMs` beside
`reached` since the counters existed, and
[0223](../decisions/0223-a-prop-is-copy-when-a-reader-could-quote-it.md)
supplied the words yesterday by declaring `copy` across the starter library —
which reinterpreted every counter already stored, with no change in this lane,
the read-time join of 0212 paying out for the third time. So this is the
**fifth** thing taken out of the server-side join rather than collected.
**Nothing was added to a payload, a browser, a column, a store or the
vocabulary.** The diff for `src/signals/broadcast.ts` and every module it
reaches is empty.

Recorded in
[0228](../decisions/0228-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md).

### The one thing that decided everything else

**Every error in the arithmetic points the same way, so only one verdict is a
claim.** Three of them:

- **Dwell is time on screen, not time reading.** The readable rule published in
  0218 counts an element half-showing, so a part accrues dwell while a reader
  reads its neighbour, and an ancestor accrues it for as long as any child was
  up. Time is credited generously.
- **A word count can be a floor.** A type that declares no `copy` has words
  nothing can see, and a declared prop holding a non-string is a word owed and
  not given. A part says *at least* what was counted.
- **The reader count is generous.** `reached` is a distinct view count summed
  across rollup windows, so a straddling page view is two readers carrying one
  reader's dwell and the mean is short by that much (0147). This one is
  measured rather than argued, since 0219.

The time credited is generous and the words are a floor, so **`skimmed` says the
time was short even after every doubt has been resolved in the page's favour.**
It is reached *before* the floor is consulted — words nobody counted can only
make a part more skimmed — and every other verdict after it: where the words are
a floor, `paced` and `lingered` are withheld and the part is `unknown` with
`unreadable` saying why.

That asymmetry is the whole design. *Readers are not reading this* is worth
being sure of. *Readers read this* is not a sentence anybody acts on.

## Decisions I took that the step did not specify

**1. The rate is a deployment's and the thresholds are the framework's.**
`READING_WORDS_PER_MINUTE` is 240 — the middle of the range usually reported for
adult silent reading of ordinary prose — and it may be overridden, because the
pace of a page's text is a fact about that text and its language that the
framework cannot know. `SKIMMED_BELOW` (0.5) and `LINGERED_ABOVE` (3) may not:
they are the statement of how much margin a claim needs, which is a promise
rather than a local fact. A deployment that could move the line between
*skimmed* and *paced* could produce any answer it wanted about its own pages
while the field name stayed the same. Overriding the rate is safe for 0212's
reason — the join is at read time, so it reinterprets history and invalidates no
stored row — and that is the difference from 0218, which refused configuration
to two numbers baked into every counter at the moment it was written.

**2. `lingered` is published as a question, and its doc comment says so.** Dwell
counts a part that was merely up, so the tall thing at the bottom of a page
lingers by construction. I considered leaving it out and decided a named weak
signal is safer than an unnamed one: a consumer that only had `skimmed` and
`paced` would invent *the opposite of skimmed* out of a high ratio and call it
engagement. Named, it carries its own caveat. It is also the one thing in the
finding for `Loom portal` I asked them not to draw as engagement.

**3. The straddle correction is handed in rather than assumed.**
`PaceOptions.inflation` takes `drift ÷ opened` off §8's page-view rows and
credits each reader with proportionally more time. Absent, zero, negative or not
finite are all *no correction*, because a negative inflation is not a thing a
rollup can produce and trusting one would **widen** the safe claim rather than
narrow it. Multiplying the time rather than dividing the readers keeps `readers`
the integer the rows actually hold, so nothing on a screen ever says 9.3 people.
This is the third thing derived from the counter 0219 added.

**4. A part is judged against its subtree's words, and so nothing is added up.**
The words on screen while a band was up are the band's and its children's. So
the figures nest, and the absence of a page-wide word count is the decision: one
reader who scrolled past a band scrolled past everything in it, and a sum would
charge them once per level. There are tests asserting the fields are not there,
because adding them is the natural thing for a future run to do.

**5. The root is reported apart, as `whole`.** It contains every part it would
outrank, so by words passed it would win every ranking it was entered in. Held
out of `mostSkimmed`, it is the page's own headline instead — *readers spend a
third of the time this page's words take* — which is a true sentence and a
different one.

**6. Subtrees are gathered by depth, never by parent id.** A slot node is not a
part and can hold element children, so walking parent ids strands a whole band's
words on a node the reading has never heard of. The parts are pre-order with
depths, so a part's subtree is the run of following parts deeper than it, closed
by one stack in amortised constant time per part. There is a test with a slot
between a page and its band.

**7. I fixed a defect in §6 that I found by building on it, rather than filing
it.** See below — it is small, it is in this lane, and the claim it broke is the
one this module rests on.

**8. The section is numbered §12 and §11 is left for #516**, which is open and
not on `main`. A placeholder paragraph says so. If #516 is rejected the number
is a cosmetic hole; renumbering it from here would have meant editing a section
describing work this branch does not contain.

## The defect I found in my own §6, and what it would have cost

`PartReading.copy` promises that a part's words are its own and that **the words
of a page are partitioned across its parts exactly once** — which is what makes
a role row addable (0212), and what every word figure in the new module rests
on. `ownCopy` built that by handing `copyIn` the node with only its **text**
children, reasoning that every element child is a part in its own right.

A slot node is neither. It is not an element, so it is never a part, and it was
not kept — so **text handed into a slot belonged to nobody and left the reading
entirely.** A page whose body arrives through a slot reported itself as saying
nothing. Nothing was red: every fixture in the suite nested text directly under
elements.

The fix is the clause the rule was missing rather than a new rule: a slot's
children are pruned the same way and kept, so its text belongs to the nearest
element above it and its elements stay parts of their own. One test, red against
the previous line, verified by reverting it.

**What it would have cost here is worse and quieter than in `parts.ts`.** Missing
words make a part's reading time look shorter than it is, which biases *away*
from `skimmed` — so the verdict 0228 builds its whole safety argument on would
have held, and `paced` would have been handed out to parts nobody could possibly
have read. The bias that is safe for one verdict is exactly the one that
silently fabricates the other.

I also corrected a sentence in the same doc comment that 0223 expired yesterday
— *nothing in the starter library declares `copy` yet* — which the generated API
reference was still publishing.

## Records

- [0228 — A part was read when readers had time for its words, and only the skim
  is a safe
  claim](../decisions/0228-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md),
  **Accepted**. It contradicts nothing: 0212's read-time join is what makes the
  rate overridable, 0218's argument against configuring a published number is
  applied at the one remove where it still holds, 0221's ranking rule is reused
  as it stands, 0219's measurement is consumed, and nothing on the wire, in the
  browser, in a schema or in the vocabulary moved.
- **0228 is the next number free on `main`** (0225 is the highest there); 0226 is
  claimed by both #515 and #516 and 0227 by #517, all open, so I took the next
  one after theirs rather than setting up a renumber.

## Findings

**Filed:**

- **`Loom portal`** — the call (§9 says where reading stops, this says what was
  not taken in before it stopped, and together they are the sentence a reader
  screen opens with) and four cautions: `lingered` must never be drawn as
  engagement, `skimmed` is the only verdict that is a claim, no word figure is
  ever added across parts, and hand the inflation in if you have it.

**Closed:**

- **The slot defect above**, filed and fixed in the same run, written down
  because the claim it broke is quoted in three records.

**Still open and unchanged:** the `fetch` hole in `completed` (1 October), which
is a question for the maintainer before it is a unit of work.

## Test numbers, measured

`pnpm install && pnpm verify` — **green, exit 0**, written to a file and the exit
status read in a separate command.

| | this branch |
| --- | --- |
| Runtime suite | **181 files, 3,830 tests, 0 failed** |
| Application suite | **378 files, 6,776 tests, 0 failed** |
| `findings:check` | 998 findings, 0 malformed |
| `prerender:check` | 124 pages, 1,536 junctions, 0 run together |

**27 tests added, nothing skipped, nothing weakened.** 26 of them are the new
module's, in one new file; the twenty-seventh is the slot case in
`parts.test.ts`. I changed no existing test. `main` carries 180 runtime test
files, so the one file added is mine; I did not quote `main`'s test *count*,
because the only way I had to measure it was a scratch worktree with no build in
it and four files failed to collect there, which makes its total an undercount
rather than a baseline.

**Two runs were red before this one, and both were a gate catching me:**

1. `src/documentation.test.ts` — *never makes a decision-record number part of a
   published sentence*. Two of my doc comments said "0221 ranks…" and "the
   straddling reader of 0147". Parenthesised citations are lifted before the
   check, so the remedy is to write the sentence so it reads without the number.
   Both rewritten.
2. `app/(docs)/_lib/api/extract.test.ts` — the generated reference, regenerated
   with the repository's own `pnpm --filter @loom/app docs:api`. The published
   surface moved from 1,238 exported names to 1,298. The second regeneration was
   the `PartReading` doc comment above, which is published verbatim.

One run was red before either of those and was me, not a gate: the first
`tsc -p tsconfig.build.json` after the slot fix. `flatMap` inferred its element
type from the first branch of the switch and decided the function returned text
nodes. Annotated at the call.

### The fifteen planted defects, and the fifteen that went red

Each mutation applied alone, the module's suite run, then reverted.

| the mutation | tests red |
| --- | --- |
| the skim test is the wrong way round | 13 |
| the floor silences a skim too | 1 — *still calls a part skimmed when some of its words could not be read* |
| a part is judged against its own words only | 4 |
| the subtree stops one level short | 10 |
| a parent does not inherit its children's floor | 4 |
| the straddle correction is not applied | 1 |
| the straddle correction is applied the other way | 1 |
| the reader count is corrected instead of the time | 1 — *leaves the reader counts the integers the rows hold* |
| the ranking key counts a part's own words | 1 |
| an equal candidate displaces the one already standing | 1 — the tie-break |
| the page is ranked against its own parts | 4 |
| the ranking is by how badly a part was passed | 2 |
| a part nobody declared is called wordless | 1 |
| an inflation no rollup could produce is trusted | 2 |
| the costing rate is in words per millisecond | 12 |

A sixteenth was applied to `parts.ts` rather than to this module: **a slot's
children are dropped again**, which turns the new partition case red and nothing
else.

### The double-count case this lane requires

Three of them, because nesting is this module's double-count trap rather than
distinctness.

- *has no page-wide word count, because a nested part's words are in its
  parent's* adds `wordsWithin` across the parts, asserts the total is twice the
  page's words, and asserts the three fields a page-level sum would be called by
  are absent from the result.
- *holds every part of the page exactly once, judged or not* asserts the parts
  are distinct and that the standings add to their number, so no part is counted
  at two verdicts.
- *counts a reader who hurried past a band and the page it was in at both
  depths* holds the property where it is true and must be: the same ten readers
  are in the root's figure and the band's, which is right per row and wrong for
  any sum — so the ranking takes the largest and the root is held out of it.

## Browser cost

**Zero bytes added.** `src/signals/broadcast.ts` and every module it reaches are
untouched — `git diff --stat origin/main` prints nothing for them, and
`browser-weight.test.ts` passes unchanged. Measured on this branch for the
record: the broadcaster bundles to **6,477 bytes minified** (esbuild, ESM, from
`dist/signals/broadcast.js`), which is the figure the last two runs measured;
gzipped, 2,944 bytes.

Nothing in `pace.ts` is reachable from a browser entry point, so the two
published thresholds and the published rate cost a reader nothing — which is the
arrangement 0218 had to build a separate module to get.

## Cross-lane diffs, named

- `apps/loom/app/(docs)/_lib/api/reference.generated.json` — generated, as above.
- `decisions/README.md` — generated with `pnpm decisions:index`. It prints its
  usual notes for the holes at 0149–0154, and now for 0226 and 0227, which are
  the open branches' numbers.

Everything else is `src/signals/`, `docs/signals.md`, `FINDINGS.md` and the
record.

**One other lane's branch is on the signal path and it is this lane's own.**
#516 (`signals-08-a-share-of-the-readers-there-were`) adds `src/signals/reach.ts`
and touches `index.ts`, `docs/signals.md` and `FINDINGS.md`. **This branch is off
`main` and does not stack on it**: no code here imports anything #516 adds, and
the three shared files collide only in ways `Loom merge` already handles — an
append to the union-merged ledger, a generated index, and two sections of the
plan that do not overlap. Of the other open pull requests, #517 touches
`src/primitives/`, #515 `src/render/`, #514 the demo, #513 and #512 the portal,
#511 the lessons.

## The parked door

**Per-reader identity is neither cheaper nor dearer for this change.** Every
figure here is a mean over a window, taken off counters already collapsed from
view keys to counts — and by then rule 2 has thrown the keys away. What an
identity feature would want from this question is *which readers skimmed which
parts*, which is a per-view breakdown, and the reason this cannot be bent into
one is the reason it is honest.

One thing worth flagging in the other direction, and it is the same one the last
run flagged: `PaceOptions.inflation` exists because the denominator is *summed
distinct views* rather than *readers*. If identity ever returns as an opt-in, the
natural upgrade is the same comparison with a real denominator, and nothing here
forecloses it — `readingPaceOf` takes a reading and does not know where its
counts came from.

## Open questions

**1. The `fetch` hole in `completed` — seven days open, asked five runs running.**
A host's form that posts with `fetch` calls `preventDefault`, so the broadcaster
sees a cancelled submit and reports no completion: a deployment can have
conversions and read zero, with nothing distinguishing that from nobody
converting. **Recommendation: allow `completed(node)` on the broadcast handle and
let me write the rule-3 distinction into a record that amends nothing** — a
host's own code is not a proposal, but that should be written down before
anything leans on it. **If the answer is no, say no and I will close the
finding**; it has shaped five reports and I would rather spend the next one on
something else either way.

**2. Is 240 words a minute your number?** It is one constant and the only one in
this work that is a judgement about people rather than about arithmetic. The
verdicts are built to survive it being wrong by a wide margin, and a deployment
can override it — but the default is what every screen will show, so if you have
a view, it is cheap to change now and expensive once a portal page quotes it.
**Recommendation: leave it at 240** unless you know Loom's first customers
publish something unusual.

**3. What I would do next if you say nothing.** The funnel read against a
denominator. `FunnelAnswer` gives *of the views that reached A, how many did B to
C* off two counts in one window, which is sound as a ratio — but the conversion
rate a deployment actually quotes is against *readers who arrived*, and nothing
joins the two. It is also where the `fetch` hole bites hardest, which is the
third reason I keep asking. Code I own, nothing needed from another lane.

**4. Carried over, neither blocking.** The region floor is one constant if 25 is
not your number. Whether the reader-signal half of `docs/deployment.md` is this
lane's is still one line of your reading; this step added no environment
variable, so `docs/signals.md` carries everything new.
