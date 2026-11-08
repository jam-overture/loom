# 0368. What readers did inside a part is derived from the tree, and the sum is exact because occurrences add

**Status:** Accepted
**Date:** 2026-11-08
**Section:** §5 (reader signals), the counters

> **Renumbered from `0365` on 2026-11-08 by `Loom merge`.** `0365` was written
> here rather than `0364` because `0364` was claimed by two open branches at
> once (#806 and #808), so that one record fewer would need renumbering. `0365`
> was claimed by one more branch nothing here could see — #815, *a colour is
> measurable when its channels are arithmetic and opaque* — which landed on
> `main` first and therefore keeps the number, and `0368` is the next number
> free on `main` and on every open branch. Only the number changed: nothing this
> record decides is different (0097).

## Context

A reader presses a button. The question every surface in the portal eventually
asks is not *which node was that* but **what was it inside** — the pricing band,
the sign-up form, the footer. Loom has carried the answer to that question in
one shape since
[0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md): a
delegated signal names the addressed ancestors it happened inside, as `within`,
and the fold spends it on one counter — `engaged`, a **distinct count of page
views** credited to each ancestor.

That counter cannot answer the question over time.

- **`engaged` is distinct, so it does not add.** One reader who presses two
  buttons in one band is one `engaged` on the band, which is the right answer to
  *how many readers used this band* and the wrong one to *how many presses
  landed in it*.
- **The tally keeps no time** (rule 5 of [`docs/signals.md`](../docs/signals.md)).
  *Last Tuesday* is not a question a tally can be asked.
- **The hourly counter keeps time and no ancestry.**
  [0362](0362-what-readers-did-is-counted-under-the-hour-they-did-it-in-as-a-seventh-counter-the-fold-writes-for-the-three-delegated-kinds.md)
  writes a row per part per hour for the three delegated kinds, and it writes it
  for the node a signal **named** — never for an ancestor of it. `rollup.ts`
  credits the `within` regions with `engaged` and nothing else.

So *forty presses in the pricing band this week* was unanswerable from a store
that holds every press and every band.

Two ways to answer it. **Write the ancestors into the hourly counter**: a row per
ancestor per part per hour, which is the payload explosion 0167 refused — rows
multiplied by the depth of the page — moved off the wire and into a durable
table nothing sweeps. Or **derive it**: every row names a tree, a revision and a
node; the tree the counters name says what that node sits inside; a sum over a
subtree is the answer.

## Decision

**The containment is derived from the tree at read time, and the hourly counter
stays as it is.** `src/signals/inside.ts` is handed a tree, one read of the
counter and the registry's declarations, and returns the page's own shape with
two sets of counters on every part: what readers did **to** it, and what they did
**inside** it.

Five clauses.

1. **Nothing is added to any payload, any table or any browser.** The reading is
   pure and server-side. `broadcast.ts` and its import graph are untouched, and
   the bytes a reader downloads do not move. It is the same argument 0167 made
   and the same argument `parts.ts` made for the role and copy joins: the server
   holds the registry and the tree, so most *we should send more* is *we should
   interpret what we have*.

2. **The sum is exact, and that is why it may be published.** Every signal of
   these three kinds wrote one row on one node — the node it named — so a
   subtree's total counts each action exactly once, at whatever depth it
   happened. The invariant is that a part's total equals its own count plus the
   totals of the parts immediately inside it, and it is asserted over every part
   of a fixture page rather than at one node.

   **This is the one counter in the subsystem a nesting sum may be taken over.**
   A reading that added `engaged` up a tree would count one reader's one press
   once per ancestor and the row would look right. `ActedCounts` is therefore
   split out of `ActedHourCount` in `acted.ts` so the types say that these four
   numbers are occurrences with no key and no reader in them.

3. **The reading answers for batches that carried no `within` at all.** It never
   reads the field. A batch synthesised on a server or replayed from a fixture
   carries no ancestry (`rollup.ts` names that case and defaults it to empty),
   and `engaged` is silent about those; this is not.

4. **The containment is the nearest *addressed* ancestor, not the tree parent.**
   A slot is a node with children and is never a part — only an element carries
   the identity attributes a broadcaster reads — so slots are passed through.
   This is what `within` means, and a reading keyed on the tree parent would hang
   a band off a node that appears nowhere in its own list.

5. **One revision, and audiences add.** The reading pins the revision and drops
   rows from another one, counting them: a node's ancestry is a fact about one
   revision, and the band a button sat in last week may not be the band it sits
   in now, so summing two revisions would attribute the earlier presses to the
   later page. `readReaderActed` reads every revision by default, which is right
   for a goal (0350) and wrong here. Audiences, by contrast, are summed and
   published as a census
   ([0297](0297-a-region-map-publishes-the-populations-it-summed-and-two-forms-arrivals-are-one-readership.md)):
   two forms of a page are two sets of rows over one tree at one revision (0263,
   0284) and a press in each is two presses, because these are occurrences and
   not readers. `parts.ts` refuses a window of two audiences because its figures
   divide by distinct page views; nothing here divides by anything.

**What a caller can ask**, because a counter nobody can phrase a question against
is not finished: the parts readers acted on most in a range, by what they did to
the part itself (`actedMostIn`); the share of the page's acting that happened
inside one part (`insideShareIn`); and what happened inside a part but not to it
(`beneathOf`). The first orders by `own` and never by `inside`, because an
ancestor's total is never below its descendant's and ordering by it would rank
every page by its outermost part.

## Consequences

- *Forty presses in the pricing band last Tuesday, nine of them on Buy now* is a
  sentence, from counters that already existed, for any range the hourly counter
  covers.
- **The page's total is computed twice by two routes and held equal.** The sum
  of every part's own count and the root's own `inside` share no arithmetic, and
  a tree's root is always an element, so a test that holds them equal catches an
  accumulation that is consistently wrong — which is the failure mode a reading
  built out of one pass has.
- **A whole page is one reading.** `InsideReading.parts` holds every addressed
  node in reading order with its depth, its containing part, the parts in its
  subtree, its role (0114) and the words it says itself (0122) — so a surface can
  draw the page's shape and what happened in it from one call.
- **An orphaned row is now a worse fault than it was**, and is reported as one.
  A row naming a node this revision does not have is an action that is in no
  part's `inside`, so the totals under-report by exactly what `orphaned` names.
  In `parts.ts` the same condition made a part read `skipped`; here it silently
  shrinks every ancestor, which is why it is counted and named.
- **A duplicate read is unspellable rather than undetectable.** `parts.ts` can
  refuse a tally handed in twice because a tally is one row per part; an hour's
  counter legitimately has many rows per part, so a duplicate here would inflate
  every ancestor of it invisibly. The reading therefore takes a single
  `StoredActed` rather than a list of them, which is the guard (0158).
- **Two private rules in `parts.ts` are now exported** — the role inversion and
  the own-words read — because two spellings of *the words of a page are
  partitioned across its parts exactly once* would be two chances to lose it.
- **It is bounded by `outlineTree`, not by itself.** The reading is linear in the
  parts and in the rows: one bucketing pass, one walk down carrying the stack of
  open elements, one pass back up accumulating subtotals. No part's ancestors are
  walked per part. `outlineTree` is separately quadratic in *depth* and throws
  above about 2,000 — measured and filed for the lane that owns it — which bounds
  `parts.ts` identically and is not something this reading can fix.
- **Nothing here makes per-reader identity cheaper or dearer to add later.** A
  part's two sets of counters are occurrences over a tree. No key, no region,
  nothing per reader, and no join that would need one.

## Alternatives considered

**Write a row per ancestor in the fold.** Rejected. It is 0167's refused payload
with the cost moved from the wire to the database: a press three bands deep
writes four rows instead of one, per hour, in a durable table that is never
swept, and the multiplier is the depth of the page. It also bakes one revision's
ancestry into rows that outlive it, so a reading of an older revision would be
answered with today's shape.

**Put the ancestry on `viewed` and `dwelled` so the same question could be asked
of attention.** Rejected, and it is 0167's own refusal: those are the
high-volume kinds, the payload would be multiplied by the depth of the page on
every part that comes into view, and rule 4 does not trade a reader's bytes for a
measurement. *How much of a band gets read* is already answered a different way,
over words (0235, 0287).

**Sum `engaged` up the tree instead.** Rejected, and it is the mistake this
record exists to make unavailable. One reader's one press would be counted once
per ancestor, the figures would look plausible, and there is no window in which
they would be right.

**Order `actedMostIn` by what happened inside a part.** Rejected. An ancestor's
total is never below its descendant's, so the answer to *what did readers press*
would be the root of the page, every time, on every page.

**Refuse a window holding two audiences, as `parts.ts` does.** Rejected. That
refusal exists because `parts.ts` divides by distinct page views and two
populations cannot share a denominator. Nothing here divides, occurrences add,
and 0297 already settled that a revision served in two forms is summed and the
populations published.

**Bake the join into the stored rows at rollup time.** Rejected for `parts.ts`'
reason — a declaration is a fact about the library and not about a window of
reading, so a rollup-time join makes today's silence permanent for windows that
have since expired — and for clause 1's.
