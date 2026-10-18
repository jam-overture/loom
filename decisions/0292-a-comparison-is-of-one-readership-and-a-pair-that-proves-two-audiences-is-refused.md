# 0292 — A comparison is of one readership, and a pair that proves two audiences is refused

**Status:** Accepted

**Date:** 18 October 2026

**Section:** §4c (reader signals)

> **The number may move.** Two other branches were open with a record numbered
> 0292 when this was written — #667 and #668, both claiming the next number free
> on `main` as this does. Two records sharing a number is fatal
> ([0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)) and
> the numbering is claimed at merge, so whichever of the three lands second and
> third is renumbered there. Nothing in this record depends on its own number.

## Context

[0290](0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md)
gave every **reading** of the reader counters the audience dimension: a reading
is of one audience, and two forms of one page
([0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md)) are two
readings rather than one handed in twice. Its own *Alternatives considered*
named what it left standing — the comparison of two audiences is now
expressible, and it must not borrow the arithmetic of a before-and-after:

> A before-and-after holds the readership still and varies the tree, which is
> why §20 exists to check that assumption; an audience comparison varies the
> readership **by construction**.

**Ten comparisons in this subsystem take their pair from a caller.** Nine of
them refuse a pair of **two trees** — `different-trees`, the first member of each
silence vocabulary — because two pages are two pages and nothing in either is
comparable. The tenth, the readership comparison, states the same requirement in
prose and cannot check it, because a region map names no tree. **None of the ten
could refuse a pair of two audiences**, and the two faults are a caller making
the same kind of mistake with opposite visibility:

- two trees make every figure absurd. The parts census reports that the change
  removed every part of a page it was never about, and a reviewer sees it at a
  glance;
- **two forms of one page compare cleanly.** They share a tree id, so the join
  matches, the shares divide, the movements have the right sign and the ranking
  is in the right order. What is wrong is the sentence printed over them — *this
  is what your change did* — when the readership was varied rather than held
  still and the tree may not have changed at all.

The second was filed as an open finding on 17 October against
`readingChangeOf`, and the finding asked the question this record answers: *is a
mismatch a silence or a refusal, and is it one decision over eight functions or
eight decisions?*

Two of the ten could not have answered it at all. `FunnelReach` and
`RegionReading` scope their rows to one audience and then **discard which one it
was**, so `funnelChangeOf` and `readershipChangeOf` were handed two readings
that had forgotten the fact the guard needs.

## Decision

**A comparison is of one readership, and a pair that proves two audiences is
refused rather than silenced in part.**

1. **One published rule, `crossesAudiences(was, now)` in `audiences.ts`**, beside
   `readingKeyOf` and for the same argument: what makes two readings
   incomparable is one fact, and ten spellings of it that agree today are ten
   places to drift. It takes a `SideOfAudience` — an audience and nothing else —
   so a page reading, a funnel reading and a region map can all be handed to it
   without being made to look alike.

2. **It refuses only what it can prove: both sides name an audience and the two
   differ.** A window whose rows never carried the column
   ([0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md))
   names none, and a pair of such a window and an `aud_pro` one is either an
   honest before-and-after across the migration or a cross-population
   comparison — nothing in the counters tells them apart. Refusing both would
   withhold every comparison spanning the day a deployment upgraded, which is
   the comparison it most wants.

3. **The unprovable case is published rather than left silent.** Every
   comparison carries `audiences: { was, now }`, built by one published
   `comparedAudiencesOf`, under a silence and under none. A `null` on either
   side is the whole of why a mismatched pair can go unrefused, so a surface
   that wants to say *compared across a window that named no audience* has the
   field to say it with.

4. **A refusal, not a partial silence, and the census goes with it.** Six of the
   ten comparisons leave their tree half standing under `nothing-measured`,
   because what a change did to the tree is a fact about the tree. That reasoning
   does not reach here: a page is one base tree plus the deltas an audience
   earns, so the two sides are two trees wearing one tree id, and *three bands
   moved and one was reworded* read across two forms is **the other form's
   deltas reported as the change**. The census is the half that would look most
   like an answer, so it is withheld exactly as it is for two trees.

5. **Checked after `different-trees` and before everything else.** Two unrelated
   pages are not made comparable by one audience, and a caller holding two pages
   wants to be told that first. Everything after it — an empty window, a
   dissolved page, a floor — is a statement about a pair this one has already
   established is not a pair.

6. **One condition for the whole subsystem: `two-audiences` in `silences.ts`**,
   reported by all five comparisons that publish a silence vocabulary, and held
   apart from `two-pages` because they send a reader to fix two different
   things.

7. **A reading that scopes itself to an audience says so.** `FunnelReach` and
   `RegionReading` gain `audienceId`, derived from the reading or the `where`
   they already filtered on. Nothing is added to a payload, a browser, a store
   or a column; what is added is the ability of a comparison to refuse, which it
   cannot do from a reading that has forgotten.

   `regionReadingOf` leaves it `null` deliberately: it groups whatever it is
   handed, and a deployment's whole window is *a readership* rather than one
   form's. That keeps a comparison of two such maps answerable rather than
   refused, which is the common case.

8. **`readershipChangeOf` refuses ahead of its floor.** A pair of two
   populations is not a floor fault and no floor fixes it, so
   `different-audiences` is reported rather than `incomparable`. It is the
   seventh member of `ReadershipComparability`, and the one case where the
   question this reading exists to answer — *is the comparison beside this one
   of like with like?* — is answerable in advance and the answer is no.

## Consequences

- **Nothing is superseded.** 0263, 0284, 0290 and 0291 are unchanged and all
  right. This is the guard 0290's alternatives said would be needed, built where
  it said it would be needed.
- **Nothing reaches a reader.** No payload, no browser code, no column, no store
  and no kind. `broadcast.ts` is byte-identical to `main` at **6,477 bytes
  minified and 2,941 gzipped**. An `aud_` is a name the host chose for a
  predicate Loom never sees, so refusing on it is comparing two column values a
  host wrote.
- **A deployment serving one form of every page sees no change at all.** Its two
  sides name one audience, or name none, and every comparison answers as it did.
- **A deployment serving two forms gets a refusal where it had a plausible
  number.** That is the point, and the remedy is a line of the caller's own
  code: split the window with `byAudience` and compare each form with itself.
- **Four comparisons are left out and are named.** The four library comparisons
  (`library-change`, `library-copy-change`, `library-reach-change`,
  `library-word-reach-change`) were on an open pull request's branch when this
  was built, so taking them here would have been a branch stacked on a branch.
  They are filed, and the rule they need is published and waiting.
- **`deploymentChangeOf` needs no guard.** It builds its own comparisons out of
  one window and keys them by form (0291), so no caller can hand it a mismatched
  pair.
- **A screen can now be wrong in one fewer way and must say so.** `audiences` is
  on every comparison and the unprovable pair is a real state, so a surface that
  draws nothing for it is a surface that hides what it compared across.
- **The parked identity work is no harder.** A `PageForm` here is a tree and an
  `aud_`, nothing keys on a reader, and `null` stays *nothing recorded* rather
  than defaulting to anything. Nothing in this record would need unpicking if a
  consented per-reader id ever arrives behind a gate.

## Alternatives considered

- **A silence on the reader half, with the census left standing.** The shape the
  finding of 17 October thought most likely, on the grounds that `changeOf` has
  no concept of refusing and each side's figures are honest about their own
  side. Rejected on clause 4: the census is not honest across two forms, because
  the deltas an audience earns are part of what the census measures. Leaving it
  standing would publish *this change moved three bands* about a change that
  moved none.
- **Refuse every pair that is not proven alike**, including one where a side
  names no audience. The safer-looking rule, and it withholds every comparison
  spanning the migration that added the column — including the before-and-after
  of the upgrade itself. Rejected: the state is real, is bounded, and is better
  published than guessed at. Clause 3 is what makes refusing only the provable
  case honest rather than lax.
- **Default a side naming no audience to `aud_everyone`.** It would make every
  pair provable and every answer confident. Rejected for the reason 0290
  rejected it for a window: `aud_everyone` is an assertion, true of every row
  written before the migration and false of a deployment serving only `aud_pro`,
  where defaulting to it would turn a correct comparison into a refused one and
  a cross-population comparison into an approved one.
- **A per-comparison guard in each of the ten functions.** What the four
  library comparisons had for the pairing rule before
  [0291](0291-a-deployments-change-is-two-orders-at-the-doors-scale-because-a-page-has-no-net-movement.md)
  and 0290 published one, and the reason a sixth reading landed on `main` without
  it. Rejected: ten agreeing spellings of one rule is the shape this subsystem
  has been bitten by twice.
- **Refuse inside `pageReadingOf` instead**, by making a reading carry its own
  comparability. Rejected: a reading is of one audience and is correct on its own
  (0290); what is wrong is the pair, and a fact about a pair does not belong on
  either side of it.
- **Compare two audiences properly**, with the movement attributed to the
  population rather than to the change. Still the right thing to build and still
  not this: it is a reading of its own, with its own name and its own record, and
  0290 said why it must not borrow `changeOf`'s arithmetic. Refusing the pair is
  what keeps that record honest when it comes.
