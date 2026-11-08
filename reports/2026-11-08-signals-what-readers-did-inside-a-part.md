# What readers did inside a part

**`Loom signals`, 8 November 2026, morning run.**
Branch `signals-79-what-readers-did-inside-a-part`. Record
[0365](../decisions/0365-what-readers-did-inside-a-part-is-derived-from-the-tree-and-the-sum-is-exact-because-occurrences-add.md),
`Accepted`. `pnpm verify` **EXIT=0**.

## What this run completed

**A reader presses a button. What was it inside?**

Loom has carried the answer to that in one shape since 0167: a delegated signal
names the addressed ancestors it happened inside, as `within`, and the fold
spends it on exactly one counter — `engaged`, a *distinct count of page views*
credited to each ancestor. That counter cannot answer the question over time,
for three separate reasons, and until this run nothing else could answer it at
all:

- **`engaged` is distinct, so it does not add.** One reader pressing two buttons
  in one band is one `engaged` on the band — the right answer to *how many
  readers used this band*, the wrong one to *how many presses landed in it*.
- **The tally keeps no time** (rule 5). *Last Tuesday* is not a question it can
  be asked.
- **The hourly counter keeps time and no ancestry.** §77 writes a row per part
  per hour for the three delegated kinds, and writes it for the node a signal
  **named** — never for an ancestor of it. `rollup.ts` credits the `within`
  regions with `engaged` and nothing else.

So *forty presses in the pricing band this week* was unanswerable from a store
holding every press and every band.

`src/signals/inside.ts` answers it **by deriving the containment from the tree**,
which is the queue's first item and the whole argument of this lane. Every row
names a tree, a revision and a node; the tree the counters name says what that
node sits inside; a sum over a subtree is the answer. `insideReadingOf` returns
every addressed node of one revision in reading order, each with:

| | |
| --- | --- |
| `own` | what readers did **to** the part, in the range |
| `inside` | what they did to it and to every part inside it |
| `withinId` | the nearest **addressed** ancestor — what `within` means |
| `depth`, `parts` | where it sits, and how many parts its subtree holds |
| `role` | what part its primitive plays (0114) |
| `copy` | the words it says itself (0122) |

and three questions a caller can phrase against it: `actedMostIn` (the parts
readers acted on most in the range), `insideShareIn` (the share of the page's
acting that happened inside one part), `beneathOf` (what happened inside a part
but not to it).

**Nothing was added to any payload, any table or any browser.** `broadcast.ts`
and its import graph are untouched. The alternative — writing a row per ancestor
in the fold — is 0167's refused payload with the cost moved from the wire into a
durable table that is never swept, multiplied by the depth of the page.

**It also answers for batches that carried no `within` at all**, because it
never reads the field: a batch synthesised on a server or replayed from a fixture
carries no ancestry, and `engaged` is silent about those.

### The second thing in the branch, which is somebody else's finding

`Loom framework` filed, on #808 yesterday evening, that `GET
/api/reader-signals` reported two of a deployment's three reader windows and
left out **`kept`** — the one a reader is actually promised, and the one whose
unreadable value stops the expiry sweep while refusing nothing. So *the notice
says thirty days and nothing at all is being deleted* presented, from every
other vantage point in the application, exactly as a deployment keeping its
promise did.

`IntakeStatus.kept` is a field now. `describeKeptWindow` already existed and was
already exported; nothing had to be written but the wiring and the tests that
hold the three windows apart.

## Decisions I took that were not specified

**Ordering `actedMostIn` by a part's own count and never by its inside total.**
An ancestor's total is never below its descendant's, so ordering by `inside`
answers *what did readers press* with the root of the page, on every page. The
question a screen asks is answered by a button.

**Leaving parts nobody acted on out of that list rather than listing them as
noughts.** The honest list of *things a reader could have pressed and did not*
needs to know which parts are pressable, and the registry cannot say: `role`'s
vocabulary has one member, `heading`. A list padded with every heading on the
page would read as a claim this reading cannot make. The whole page is in
`InsideReading.parts` for a caller that wants it.

**Summing audiences and publishing a census, rather than refusing a window of
two as `parts.ts` does.** That refusal exists because `parts.ts` divides by
distinct page views and two populations cannot share a denominator. Nothing here
divides by anything, occurrences add, and 0297 already settled that a revision
served in two forms is one readership summed with the populations published.

**Pinning one revision, which `readReaderActed` does not.** Ancestry is a fact
about one revision: the band a button sat in last week may not be the band it
sits in now, so summing two revisions would attribute the earlier presses to the
later page. Rows from another revision are dropped and **counted**, so a caller
who passed the wrong pair can tell. This is a real cost and it is filed for the
portal: a page whose live version changed inside the range is two readings.

**Taking a single `StoredActed` rather than a list of reads.** `parts.ts` can
refuse a tally handed in twice, because a tally is one row per part. An hour's
counter legitimately has many rows per part, so a duplicate here is invisible
and would inflate every ancestor of it. The signature is the guard (0158).

**Moving two private rules out of `parts.ts` into `src/signals/join.ts`, which
is deliberately not in the barrel.** Both joins have to give the same answer to
*what part does this primitive play* and *what words does this part say itself*,
and the second carries the sentence a caller relies on — *the words of a page are
partitioned across its parts exactly once*. Exporting them from `parts.ts`
worked and put `rolesByType` and `ownCopy` on the published door of
`@jam-overture/loom/signals`, which the `(docs)` gate reported and which is a
door another lane has already said is the widest one. `join.ts` keeps them
internal, as `counters.ts` and `words.ts` are.

**Adding the four missing fields to the deployment guide's §8 sample, not only
`kept`.** See *the branch beside this one*, below. It is one code block in
another lane's file and it is the honest resolution either way round.

## Records added

**0365**, `Accepted` — *what readers did inside a part is derived from the tree,
and the sum is exact because occurrences add*. It contradicts no accepted record
and touches neither the tree schema nor the delta model, so it is not
architectural. Five clauses: nothing added to payload, table or browser; the sum
is exact and is the one counter here a nesting sum may be taken over; it answers
for batches with no `within`; the containment is the nearest addressed ancestor
and not the tree parent; one revision, and audiences add.

**Numbered 0365 rather than 0364.** 0363 is the highest on `main`, and 0364 is
claimed by **two** open branches (#806 and #808), so taking the next number free
on `main` would mean `Loom merge` renumbering three records rather than two.
This is the precedent #802 set last night for the same situation.

## Real test numbers

`pnpm install && pnpm verify` — **EXIT=0**, read out of a file rather than from
a notice, after the API reference was regenerated.

| | files | tests |
| --- | --- | --- |
| framework and tools | 273 | **6,636** |
| application | 440 | **7,140** |

**13,776 pass. Nothing failed, nothing was skipped, no test was weakened.**

- **+30 tests**, all in the new `src/signals/inside.test.ts`. Framework was 272
  files and 6,606 tests on `main`.
- **+2 tests** in `apps/loom/app/_lib/reader-signals/receive.test.ts`, for the
  `kept` window and for the three windows being kept apart. The application was
  7,138 on `main`.
- **No existing assertion changed its claim**, in this lane or any other.

**One real red on the way, and it was the gate doing its job.** `(docs)`'
*every published door hands back exactly what its page says it does* failed with
six names, two of which were `rolesByType` and `ownCopy` — the private helpers I
had exported from `parts.ts`. That is what sent them to `join.ts`; the remaining
four are the reading's own and the reference is regenerated with them.

### Mutations

**18 run, 17 killed, 1 discarded as unable to fail.** Each was applied to
`src/signals/inside.ts` alone and judged against `inside.test.ts`.

| | mutation | tests failed |
| --- | --- | --- |
| 1 | an ancestor is not credited with what happened inside it | 11 |
| 2 | the accumulation runs down the list instead of back up it | 10 |
| 3 | the range's end hour is included | 2 |
| 4 | the range's first hour is excluded | 1 |
| 5 | the revision check is dropped | 1 |
| 6 | the element stack pops only on a strictly deeper node | 5 |
| 7 | `actedMostIn` orders least-first | 2 |
| 8 | `actedMostIn` orders by `inside` | 2 |
| 9 | `insideShareIn` reads `own` instead of `inside` | 3 |
| 10 | the share is nought rather than `null` where the page had none | 1 |
| 11 | `beneathOf` subtracts the wrong way round | 1 |
| 12 | `withinId` is the tree parent rather than the nearest addressed ancestor | 9 |
| 13 | a part's subtree count adds one per child instead of the child's subtree | 2 |
| 14 | `orphaned` is never reported | 1 |
| 15 | a row outside the range is counted as foreign | 2 |
| 16 | a part's hours replace rather than add | 3 |
| 17 | `total` is read off the root's `inside` instead of summed | **0 — discarded** |
| 18 | the audience census is dropped | 1 |

**17 is discarded rather than counted as a survivor, and the reason is worth
writing down.** A tree's root is always an element and is the ancestor of every
part, so the sum of every part's `own` and the root's `inside` are provably the
same number: the mutation cannot be made to fail by any input. What it does
destroy is a guard — those two routes to one figure share no arithmetic, so the
test that holds them equal catches an accumulation that is *consistently* wrong,
which is the failure mode a reading built from one pass has. The implementation
and the comment both now say that is why it is computed the long way.

## What a browser pays

**Nothing.** `src/signals/inside.ts` is pure, server-side and imported by
nothing a browser loads. `broadcast.ts` and its import graph are untouched, and
`browser-weight.test.ts` is unchanged and green: the entry point measures the
same **6,513 bytes minified, 2,981 gzipped** it measures on `main` (`esbuild --bundle --minify --format=esm`, then `gzip -9`).

That is the point of the unit rather than a footnote on it. The same answer by
collection would have been `within` on the high-volume kinds — payload
multiplied by the depth of the page, paid by every reader on every page, for
ever, for data the server could already derive.

## Findings

**Filed four.** Two for other lanes, two for this one.

1. **`outlineTree` is quadratic in depth and throws above about two thousand**
   (`Loom daily build`, `src/tree/outline.ts`). Measured: 37.4 µs per node at
   depth 1,000, 68.0 µs at 2,000 — per-node cost doubling with depth is the
   signature — and `RangeError` at 4,000. The recursive generator passes each
   yield back up through every delegating frame. **Nothing is broken**: a real
   page is wide and shallow. What it bounds is the linearity claim two readings
   in this lane now make, since both begin by calling it, and neither can fix it
   from inside this lane.
2. **The *three parts pressed most* can read a range now** (`Loom portal`,
   `by-page.ts`). Those two figures are the only ones on a screen with a range
   picker that are not of the range — a button pressed hard in September still
   leads the list in November. `insideReadingOf` then `actedMostIn` is the swap,
   with the role and the words already joined, and it adds *what readers did
   inside a band* which no counter could answer before. The cost is the pinned
   revision.
3. **Seven new names on `@jam-overture/loom/signals` and no prose** (`Loom
   docs`). The generator said so; the sentence worth writing is in the finding.
   Not written here, because that page is another lane's.
4. **`PartReading.parentId` can name a node that is in no part's list** (this
   lane, `parts.ts`). A slot is a node with children and is never a part, so an
   element handed into a slot has a slot's id as its `parentId` — an id that
   appears nowhere in `PageReading.parts`. Latent: nothing reads the field today.
   `insideReadingOf` does not have the defect, and the fixture that proves it has
   a slot between a band and the row inside it. Not fixed here because changing a
   published field's meaning needs to be the unit rather than a corner of one.

**Closed one, and I cannot mark it closed.** `Loom framework`'s finding of
yesterday evening about the missing `kept` window is addressed in this branch,
but the finding itself is on #808 and not on `main`, so there is no entry here to
annotate. It will arrive union-merged when #808 lands, already answered.

## The branch beside this one

**#802, `signals-78-a-broadcast-follows-the-page`, is this lane's own and still
open.** It touches `broadcast.ts`, `broadcast.test.ts`, `browser-weight.test.ts`
and §78 of the plan. This branch is cut from `main`, not stacked on it, and
touches none of those files: the only files in common are `docs/signals.md` —
adjacent appended sections, and my step is numbered **79** for exactly this
reason — and union-merged `FINDINGS.md`. Either can land first.

**#808 is the one to watch, and it is a code block.** It rewrites the §8 sample
response in `docs/deployment.md` to print all ten `IntakeStatus` fields, and adds
a gate asserting that sample prints **every** field of that type. Adding `kept`
makes it eleven. So:

- if this lands first, #808's rewrite of that block must keep the `kept` line, or
  its own new test goes red on `main`;
- if #808 lands first, this branch's edit to that block conflicts and the
  resolution is to add the one `kept` line to their eleven-row version.

I wrote all four previously-missing fields into the sample rather than only
`kept`, so that whichever order they land in, the merged block is the correct one
and the conflict is a code block with an obvious answer. It is one markdown block
in another lane's file and I would rather say so loudly than leave a knowingly
red gate behind me.

## Open questions

Three, all recommended, none blocking. They are in the pull request comment.

1. Whether the *By page* drawer should swap to the ranged list (finding 2).
   **Recommend yes, in the portal's own time** — it owns the screen and the
   figure is not wrong, only not of the range.
2. Whether `PartReading.parentId` should be corrected or joined by a second
   field (finding 4). **Recommend a second field, `withinId`, matching
   `inside.ts`** — correcting the existing one changes a published field three
   readings carry.
3. Whether `outlineTree` is worth making iterative (finding 1). **Recommend not
   yet** — no real page is near it, and a fix that changes no output is a cheap
   thing to do the day something is.

## On the parked door

Nothing here makes per-reader identity more expensive to add later, and nothing
here is a step toward it. The reading is a tree, two sets of occurrence counters
per part, and a sum: no key, no region, nothing per reader, and no join that
would need one. The `view` key is not read, not stored by anything this unit
touches, and does not appear in the module.

Worth noting in the other direction: the one thing in this unit that *does* carry
a reader's shape — the share of a page's acting that happened inside a part — is
a ratio of two occurrence counts over a whole window, and is not about a person
at any floor.
