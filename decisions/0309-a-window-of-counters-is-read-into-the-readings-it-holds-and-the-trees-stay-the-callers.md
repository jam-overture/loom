# 0309 — A window of counters is read into the readings it holds, and the trees stay the caller's

**Status:** Accepted

**Date:** 24 October 2026

**Section:** §4c (reader signals)

## Context

Thirty-eight readings answer questions about readers, and every one of them is a
pure function of a `PageReading` — or of a list of them, or of two held against
each other. `pageReadingOf` is the join they all sit on: a tree, a window's
counters, and what the registry declared.

**Nothing turned a store into one.** Searched before it was built: the only
callers of `store.tallies()` anywhere in this repository are the store contract
tests. The portal has both store handles wired up
(`apps/loom/app/(portal)/_lib/reader-signals.ts`) and reads neither. So the
aggregates were askable in principle and unaskable in practice, and the gap was
not a screen — it was the rung under the screen.

What a caller had to know to ask one question about one page:

- that the counters come from `tallies`, the denominator every rate needs from
  `pageViews`, the funnel answers from `funnels`, and the map from a second
  store that may not be configured;
- that a tree and a registry have to be found for each revision the rows name,
  and that a revision may be named by a door row with no counters against it at
  all — which is the difference between *nobody read this* and *nothing has
  counted this yet*;
- that the rows must be **sliced before** the join, because `pageReadingOf`
  counts a whole window's worth of other pages as `foreign` rather than
  refusing it (the field exists precisely because "a caller who passed a whole
  store's rows and a caller who passed the wrong revision's look identical from
  the inside");
- that a window holding two audiences at one revision is ambiguous to that join
  and is read as **neither** ([0300](0300-what-audience-a-reading-is-of-is-a-three-way-answer-and-a-window-of-two-forms-is-read-as-neither.md)),
  so a deployment serving two forms of a page gets an empty screen unless the
  caller splits the window first —
  [0290](0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md)
  clause 2 says in as many words that splitting is the caller's, and published
  `byAudience` for it. Nothing was that caller.

Five things to know, each of them already written down, none of them written
down together. The first consumer would have got some of it right.

## Decision

**A window of counters is read in one operation and joined into the readings it
holds, in [`src/signals/window.ts`](../src/signals/window.ts). It composes
published rules and publishes no figure of its own.**

1. **`readReaderWindow` is one read with one scope.** The four row sets —
   counters, funnel answers, door rows, and the region map where a region store
   was offered — are read together with the stores' own `TallyReadRequest`
   passed to each unchanged. **The first failure is the answer.** A window half
   of whose rows arrived is not a narrower window; it is a reading whose rate
   has a denominator from one read and a numerator from another, and the figures
   would look plausible.

2. **An absent region store and an empty region map stay apart.**
   `ReaderWindow.regions` is `undefined` for *no store was offered* and `[]` for
   *the store holds none*, which is the distinction this subsystem draws
   wherever it has two such states (0240). A surface reading them alike reports
   *we do not know where your readers are* as *you have no readers abroad*.

3. **The revisions come off all four row sets, not off the counters.** A
   revision whose door opened and whose window no rollup has folded has page
   view rows and no tallies, and it is a page a deployment most wants to see:
   the reach reading publishes that state as `uncounted` and can only publish it
   about a revision it was handed.

4. **The trees stay the caller's to resolve.** `revisionsIn` says which
   revisions the rows name and `RevisionTrees` is how the answers come back — the
   bargain `PartDeclarations` already struck with the registry (0114, 0122): a
   shape a real store satisfies and a two-line double satisfies as well.
   `treesIn` makes a source out of trees a caller already holds. This lane holds
   counters, not pages; reaching into the tree store from the reading path would
   make it depend on the write path for a lookup the caller does better, knowing
   whether it holds the revisions already and what to do when one is gone.

5. **A revision that cannot be joined is published, with the rows it left
   unread.** `no-tree` is ordinary — counters outlive the revisions they were
   filed against — and dropping it silently would under-report a deployment by
   however many revisions it could not find. `mismatched` is a source answering
   with another page or another revision, and is refused rather than read:
   counters read against the wrong revision's tree answer every question on the
   page with confident nonsense, because the node ids line up often enough to
   look right. It is the mistake `foreign` was put on a reading to catch, caught
   one rung earlier, where it can still be refused instead of counted.

6. **A window holding two forms of a revision is split into two readings rather
   than read as neither.** The refusal underneath is right for a caller that was
   handed a window and asked nothing. Here the question is *what does this
   window hold*, and the answer is both forms: the ambiguity was never in the
   rows — each says which form it belongs to — it was in asking one question of
   two populations. This is 0290 clause 2 carried out rather than reversed, and
   `pages` therefore holds **one reading per page, per revision, per form**,
   with no two sharing a `readingKeyOf`.

7. **Each reading is handed its revision's rows and told which form to read.**
   Not the window, which would make every other page `foreign`; and not one
   form's rows either, because then a reading could not say the page has a
   second form at all. So `foreign` is nought on every reading this produces,
   `audiences` is what the revision really holds, and `otherAudience` is the
   other form's rows, counted apart and not read.

8. **It adds no figure.** Nothing here counts, sums, divides or withholds. The
   census is `audiencesIn`, what makes two readings one page is `readingKeyOf`,
   the three-way answer about a population is `audienceScopeOf` inside the join,
   and the join is `pageReadingOf` unchanged. A rung that also added up what it
   joined would be a thirty-ninth reading nobody asked for, and the
   double-count every reading above it guards would have a second place to go
   wrong.

## Consequences

- **A screen is composition.** The order over a deployment's pages is four
  lines: read the window, join it, map `readingProgressOf`, call
  `deploymentReadingOf` with the door rows. One test does exactly that over the
  memory store, end to end, and it is the one test that says whether this unit
  did what it exists for.
- **Every reading in the subsystem is reachable from a store** without any of
  them changing. Nothing was touched outside the new module and the entry point.
- **The grouping is linear in the rows**, one pass per row set rather than a
  walk of the window per revision. A window is the nodes of every revision a
  deployment keeps counters for, so the quadratic shape would have been the
  largest input in the subsystem times the number of pages — the shape rule 4
  holds the ledger to, which was quadratic once and took 314 ms on a 6,000-node
  page.
- **Nothing reaches a reader.** No payload field, no browser code, no column, no
  store method, no new kind, no member of any closed set reachable from a batch.
  `broadcast.ts` is untouched.
- **Per-reader identity is neither cheaper nor dearer to add later.** The window
  is rows the store already keeps and the split is by the column it already
  carries; an identified window, if it ever came, would be read by the same
  function and split by the same key.
- **A second grouping of a window is now a mistake with a name.** Anything that
  needs the readings of a window takes them from here rather than filtering rows
  itself, which is the discipline `counters.ts`, `funnelPairKey` and
  `readingKeyOf` each exist to enforce one level down.

## Alternatives considered

- **A closed catalogue of questions, each executable by name.** Rejected for
  now: it invents a vocabulary on top of thirty-eight readings that each already
  name what they answer, and the naming would be guessed rather than taken from
  a surface that exists. The rung underneath it is needed either way, and this
  is that rung.
- **Resolve the trees here, from the tree store.** Rejected for point 4. It
  would put a dependency from the reading path onto another lane's store for a
  lookup the caller can do better, and it would make every test of this module
  need a tree store.
- **Call the source `TreeSource`**, which is what it was first written as.
  Rejected because the package already publishes that name from the react door
  (`src/render/request.ts`, an interface that loads a tree for a render), and
  the generated API reference has a test saying the one name in it that means
  two things is "rare rather than decorative". A second collision in a
  published surface costs a reader more than a longer name does, so it is
  `RevisionTrees`, which also says what it is keyed by.
- **Take the trees as a list rather than a source.** Rejected: a caller holding
  forty revisions in a cache or a store would have to materialise all of them to
  answer about one. `treesIn` is published for the callers that do hold a list,
  which keeps the common case one line.
- **Return the readings and the rows as one value.** Rejected: the rows are
  already in the window the caller holds, and a second name for one array
  invites two functions to be handed two copies of it.
- **Read the stores in sequence and serve what arrived.** Rejected for point 1.
- **Sum the two forms of a revision into one reading.** Rejected, and it is the
  same refusal 0300 clause 5 makes: arrivals at the door add across forms and a
  distinct count filed against a node does not, so a sum would be one number
  about two populations.
- **Pick the first form by row order where a window holds two.** Rejected: that
  is the fault `AudienceScope` was made a type to keep unwritable.
- **Fold a repeated node row into one before the join.** Rejected: the join
  reports a repeat in `duplicated`, and a rung that quietly merged them would
  take away the one signal that a store or a rollup is writing a node twice
  (0158 — a count that has been added cannot be unadded).
- **Let a `mismatched` tree be read anyway and reported on the reading.**
  Rejected for point 5: there is no honest reading to publish, and `foreign`
  would then be reporting a fault the caller could already have refused.
