# Reader signals — how much of a page gets read, and the words nobody saw

**Routine:** `Loom signals` · **Date:** 6 October 2026 · **Branch:**
`signals-11-what-the-page-says-and-how-much-gets-read`

## What I completed

**§14 of [`docs/signals.md`](../docs/signals.md): how much of what a page says is
being read.** `copyReadingOf(reading)` in
[`src/signals/copy.ts`](../src/signals/copy.ts) answers *this page says twelve
hundred words, every one of them reached somebody, the average reader got to two
hundred and sixty, and the three hundred nobody saw are these.*

The plan's first priority names three questions. Two were measured in the last
fortnight. The third — *which copy a reader actually reached* — already had an
answer, and the answer was not a measurement: `wordsReadIn` filters the §6
reading and hands back the **text** of every part a row says was seen. That is
the right reply to the question as asked. It also cannot go on a screen as a
figure, cannot be compared between two windows, cannot be ranked, and cannot say
what is on the other side of it — **the words nobody got to**, which are the ones
a page is changed because of.

Both sides were already in hand. A part has carried its own words since the join
was built, and [0223](../decisions/0223-a-prop-is-copy-when-a-reader-could-quote-it.md)
made them real by declaring `copy` across the starter library. So this is the
**seventh** thing taken out of the server-side join rather than collected.
**Nothing was added to a payload, a browser, a column, a store or the
vocabulary.** The broadcaster was not touched and bundles to the same byte count.

Recorded in
[0235](../decisions/0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md).

### The one thing that had to be settled before any of it could be built

**Yesterday's record says flatly that there is no page-wide word figure at all,
and a share of a page's words needs one.** 0230 means it and it is still true of
the quantity it was about. The resolution is that there are two word counts here
and only one of them nests:

- A **pace** reading judges a part against its **subtree's** words, because the
  text on screen while a band was up is the band's and its children's. Those
  figures nest, a sum charges one reader once per level, and 0230 refused a page
  total of them.
- This reading uses a part's **own** words. A text node and a slot node are never
  parts and every element descendant is a part in its own right, so a part's copy
  is a partition of the page's words across its parts **exactly once**. That is
  the property 0212 published so a role row could be added up, and a page total is
  the same addition one level further.

So nothing is superseded and nothing is in tension: the two modules add two
different quantities, one of which partitions. It is also why the root needs no
special case here, where §12 had to hold it out of every ranking it would
otherwise win.

### The two shares, which are the point

**`share` and `typical` are different sentences, and only one of them is what a
person hears.** `share` is the share of the page's words that *at least one*
reader reached — which is exactly what a standing of `read` asserts, and on a page
with three hundred readers it is usually near 1. `typical` is the words the
average reader got to. Publishing only the first would put a number on a screen
that reads as the second, which is the plausible-false-number failure this
subsystem keeps finding in new places.

`typical` is a **ceiling**: `reached` is generous by the page views that straddled
a rollup window and the view floor it is divided by is short of the page views
there were, so it leans up in both terms. The straddle itself very nearly divides
out — the same inflation is in every `reached` and in the floor they are divided
by — which is §9's cancellation one level up and the only reason the figure is
worth publishing at all.

## Decisions I took that the step did not specify

**1. `typical` is withheld rather than qualified, in four states.** `wordless`,
`unmeasured`, `floored` and `inconsistent`, each with a line in
`describeCopySilence`. `floored` is the one that matters: where a type declared no
`copy`, the numerator is short by words nobody declared while the denominator is
short the other way, so the two errors stop leaning together and a mean can no
longer be published as *at most*. A share survives a floor and says so; a mean
does not. This is §12's asymmetry applied to a different figure, and it is the
same conclusion: the claim that is safe in one direction is not safe in the other.

**2. The floor is counted per standing, not returned as one boolean.** Undeclared
words on a part readers reached are missing from the numerator and the denominator
together. On a part nobody reached they are missing from the denominator only, and
the share then **reads high**. A consumer handed `true` would have to guess the
sign, so `floored` is a count per standing and the direction is visible.

**3. `inconsistent` is a named alarm rather than a clamp.** `typical` cannot
exceed the page's words for rows a rollup wrote, because `reached` never exceeds a
row's own `views` and the page's figure is the largest `views` there was. So the
only way to break the ceiling is rows no rollup produced. Clamping would have
hidden that; it is reported instead, exactly as `orphaned` reports the other
assembled-by-hand state one module down.

**4. `unseen` is `skipped` only.** A part at the `unknown` standing reported
something other than coming into view, or sat in a window with no views at all.
Putting its words in a list labelled *nobody read this* would turn *nothing can be
said* into a claim. They stay visible under `unknown`, where they can be seen and
not acted on. There is a test that a window with no views produces an empty
`unseen` and a whole page of `unknown` words.

**5. A part whose words cannot be seen is kept; a part that says nothing is
counted and dropped.** *This may say something and nothing here can see it* is not
*this says nothing*, and the first is the answer 0122 exists to keep tellable. The
parts that genuinely say nothing — a spacer, a rule, a stack holding other parts —
are reported as a number, because *a page of two hundred parts, ten of which say
anything* is a fact about the page and is otherwise invisible.

**6. The word-counting rule moved into `src/signals/words.ts` and both readings
import it.** Two modules now cost the same page. Two spellings of one rule that
agree today is what the counter keys were before they were published once, and
that was found by a contract suite rather than by reading. It is not exported from
the package: nothing outside this subsystem needs it, and a published name is a
promise.

**7. Where `wordless` and `unmeasured` both hold, `wordless` is reported.** Both
are true. *The page says nothing* is the one that will still be true tomorrow when
readers arrive, and the one a deployment can act on. This is the one ordering in
the module a planted defect could not falsify until a test was written for it —
see below.

**8. The section is numbered §14 and §13 is left for #527**, this lane's own open
branch, with a placeholder paragraph saying so. Renumbering from here would have
meant editing a section describing work this branch does not contain.

## The mutation that went green, and what I did about it

The sweep below is sixteen planted defects. **One of them did not turn a single
test red**: swapping the order of the `wordless` and `unmeasured` checks. The two
can only differ when a page says nothing *and* was never opened, and both answers
are true, so there was nothing to catch — which is the same shape as the
safeguard #527 deleted yesterday for being unfalsifiable.

The difference is that this one **is** falsifiable: the both-zero case is
reachable and the order decides which of two true sentences is published. So
rather than delete the ordering or shrug at it, I wrote the test that pins it and
the reason it is that way round. Re-run against the mutation, it is the one test
that fails. Seventeen planted, seventeen red.

## Records

- [0235 — How much of a page gets read is a share of words that partition it, and
  the typical reader's figure is a
  ceiling](../decisions/0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md),
  **Accepted**. It contradicts nothing and supersedes nothing. 0230's refusal of a
  page-wide word total stands for the nesting figure it was about; 0212's
  partition is what licenses this one; 0122's bargain about undeclared props is
  reported rather than rounded; 0147's over-count is the reason `typical` is a
  ceiling; 0221's cancellation is reused one level up; and nothing on the wire, in
  the browser, in a schema or in the vocabulary moved.
- **Written as 0233; renumbered to 0235 on merge.** 0230 is highest on `main`. **0231 is claimed by two open
  branches at once** — #527 (this lane) and #528 (the framework lane) — so one of
  them will be renumbered to 0232 when `Loom merge` lands them, and taking 0233
  leaves both numbers alone rather than setting up a third renumber. This is the
  fifth filed occurrence of the collision and the open entry on it already has the
  recommendation; I have not added a sixth. *(`Loom merge`, 6 October: both 0231 claims landed the same morning — #527 kept 0231 and #528 took 0234 — and #529 had meanwhile taken 0233 on `main`, so this record is 0235. A dated note under its header says so.)*

## Findings

**Filed:**

- **`Loom portal`** — the call, the five figures, and four cautions. The first is
  the one that would make a screen lie: `share` must never be drawn as how much of
  the page gets read. Also: `typical` may be absent and `silence` says why,
  `unseen` is safe to label *nobody reached this* and `unknown` words are not, and
  no word figure is compared across revisions as a count.
- **`Loom signals`** (this lane) — why the stale-funnel-pair entry of 5 October
  could not be taken this run. It wants `funnelReachOf`, which is on #527 and not
  on `main`, and a routine does not stack one branch on another. Written down so
  the next run reads *blocked, and by this* rather than discovering it.

**Closed:** none.

**Still open and unchanged:** the `fetch` hole in `completed` (1 October), which
is a question for the maintainer rather than a unit of work, and the stale funnel
pair above.

## Test numbers, measured

`pnpm install && pnpm verify` — **green, exit 0**, written to a file and the exit
status read in a separate command.

| | this branch |
| --- | --- |
| Runtime suite | **184 files, 3,932 tests, 0 failed** |
| Application suite | **384 files, 6,917 tests, 0 failed** |
| `findings:check` | 1,015 findings, 0 malformed |
| `prerender:check` | 126 pages, 1,539 junctions, 0 run together |

**26 tests added, in one new file, nothing skipped and nothing weakened.** I
changed no existing test; `git diff --stat origin/main` shows no test file but
`src/signals/copy.test.ts`, which is new. I have not quoted `main`'s totals,
because measuring them means a second full run of a suite that takes minutes and
the diff already proves which file the new tests are in.

**Two runs were red before the green one, and both were my tests rather than a
gate.**

1. Two cases were built on premises that were not true of their fixtures: a page
   whose root has no props is not *floored* by declaring nothing, and `region` is
   not a member of the role vocabulary — it has exactly one member, `heading`. Both
   rewritten; the first is now a sharper case than it was, because the tree it
   needed is one where the share reads a perfect 1 while thirty words nobody saw
   sit in a part whose type declared nothing.
2. The API reference needed the runtime built before it could be regenerated,
   which is a sequencing note rather than a failure: `pnpm build` then
   `pnpm --filter @loom/app docs:api`. The published surface moved from 1,298
   exported names to **1,321**.

### The seventeen planted defects

Each applied alone to `src/signals/copy.ts`, the module's suite run, then
reverted. Sixteen were planted before the test for ordering existed; the
seventeenth is that one, re-run after it was written.

| the mutation | tests red |
| --- | --- |
| the page total adds the read words twice | 6 |
| the typical figure is divided by the passages instead of the views | 4 |
| a passage's readers are the views that said anything about it | 4 |
| a part's readers count as inconsistent when they are all of them | 4 |
| a part whose words cannot be seen is treated as saying nothing | 3 |
| `unseen` also lists the parts nothing can speak for | 2 |
| a floored passage is counted at the read standing whatever it holds | 2 |
| a role row counts a passage's words at every standing | 2 |
| the words nobody saw are ranked fewest first | 1 |
| the words nobody saw are not ranked at all | 1 |
| the silent parts are counted as the parts that say something | 1 |
| the typical figure survives a floor | 1 |
| the typical figure survives rows no rollup produced | 1 |
| the share leaves out the words nothing can speak for | 1 |
| a role's share is taken of the whole page's words | 1 |
| a page that says nothing is not noticed first | **0, then 1** |

### The double-count cases this lane requires

Three, because the partition is the whole argument of the record and a sum that
charged a word twice would break it silently.

- *counts a nested part's words once, in its own passage and not its parent's* —
  a page, a band inside it and a heading inside that, each saying words. The
  band's figure excludes the heading's, and the page total equals the sum of every
  passage.
- *adds a word to exactly one standing, so the three partition the page* — read,
  skipped and unknown add to the total, with words at each.
- *counts a role's nested part once* — a section inside a section, both of the
  same role, where a subtree figure would charge the inner words twice. The role
  row is the two parts' own words and the role rows add to the page's total.

## Browser cost

**Zero bytes added.** No module here is reachable from a browser entry point:
`copy.ts` imports the reading and the word rule, and `words.ts` imports nothing.
`src/signals/broadcast.ts` is untouched — `git diff --stat origin/main` prints
nothing for it, and `browser-weight.test.ts` passes unchanged.

Measured on this branch for the record: the broadcaster bundles to **6,477 bytes
minified** (esbuild, ESM, from `dist/signals/broadcast.js`), which is the figure
the last three runs measured, byte for byte. Gzipped, **2,945 bytes**.

## Cross-lane diffs, named

- `apps/loom/app/(docs)/_lib/api/reference.generated.json` — generated with the
  repository's own `pnpm --filter @loom/app docs:api`.
- `decisions/README.md` — generated with `pnpm decisions:index`. It prints its
  usual notes for the holes at 0141–0154, and now for 0231 and 0232, which are the
  two open branches' claim on one number.

Everything else is `src/signals/`, `docs/signals.md`, `FINDINGS.md`, the record
and this report.

**Two open branches touch the signal path and one of them is this lane's own.**
#527 (`signals-10-the-funnel-against-the-readers-who-arrived`) adds
`src/signals/funnel.ts` and touches `index.ts`, `page-views.ts` and `reach.ts`.
**This branch is off `main` and does not stack on it**: nothing here imports
anything #527 adds, and the files that collide do so in ways `Loom merge` already
handles — an append to the union-merged ledger, two generated files, one adjacent
line in `index.ts`, and two sections of the plan that do not overlap. #528 is the
framework lane in `src/render/` and `src/sdk/`, and touches no file this branch
does. Of the rest, #526 is the demo and #523 the portal.

## The parked door

**Per-reader identity is neither cheaper nor dearer for this change.** Every
figure here is a mean over a window, taken off counters already collapsed from
view keys to counts — and by then rule 2 has thrown the keys away. What an
identity feature would want from this question is *which readers read which
passages*, which is a per-view breakdown, and the reason this cannot be bent into
one is the reason it is honest.

Nothing in the shape forecloses it either: `copyReadingOf` takes a reading and
does not know where its counts came from, so a denominator that was a real
headcount rather than a view floor would make `typical` an estimate rather than a
ceiling without changing a signature.

## Open questions

**1. The `fetch` hole in `completed` — eight days open, asked six runs running.**
A host's form that posts with `fetch` calls `preventDefault`, so the broadcaster
sees a cancelled submit and reports no completion: a deployment can have
conversions and read zero, with nothing distinguishing that from nobody
converting. **Recommendation: allow `completed(node)` on the broadcast handle and
let me write the rule-3 distinction into a record that amends nothing** — a host's
own code is not a proposal, but that should be written down before anything leans
on it. **A plain no is just as useful**; I will close the finding and stop asking.
This is the last run I will raise it unprompted.

**2. Nothing else is blocking.** What I would do next if you say nothing is the
stale funnel pair of 5 October — *a pair can name a node its revision no longer
has, and the answer looks exactly like a cold band* — **if #527 has landed by
then.** If it has not, the next unit is the comparison of two windows' copy
readings, which needs nothing but `main`: *the words nobody read last week that
somebody reads now* is the same question §10 asks of stops, asked of text.

**3. Carried over, neither blocking.** The region floor is one constant if 25 is
not your number, and 240 words a minute is the other, raised yesterday with a
recommendation to leave it alone. Whether the reader-signal half of
`docs/deployment.md` is this lane's is still one line of your reading; this step
added no environment variable, so `docs/signals.md` carries everything new.
