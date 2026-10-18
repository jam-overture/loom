# 0295 — A library comparison reports the populations it was taken over and refuses none of them, and a form gained is told from a page published

**Status:** Accepted

**Date:** 18 October 2026

**Section:** §4c (reader signals)

## Context

[0294](0294-a-comparison-is-of-one-readership-and-a-pair-that-proves-two-audiences-is-refused.md)
refused a comparison whose two sides prove two populations, and published
`crossesAudiences` once so that nine comparisons would not each decide it. It
was applied to six, and its consequences named the four it left out:

> **Four comparisons are left out and are named.** The four library comparisons
> (`library-change`, `library-copy-change`, `library-reach-change`,
> `library-word-reach-change`) were on an open pull request's branch when this
> was built… They are filed, and the rule they need is published and waiting.

The finding filed with it went further and proposed the shape: each of the four
would gain a `different-audiences` member in its silence vocabulary, and —
because a library window is a *set* of readings rather than one — would probably
have to refuse a **mixed** window before it refused a mismatched pair.

**That branch has merged, the four files are free, and the proposal does not
survive reading them.** The thing it was written before is
[0293](0293-a-comparison-pairs-pages-by-form-and-the-pairing-rule-is-published-beside-the-reading-rule.md),
which landed the same day: all four comparisons now pair their pages by
**form** (`formKeyOf` — a tree and an audience, no revision) rather than by the
tree. That changes what a cross-population comparison can even be here.

### What pairing by form already guarantees

A form pairs only with the identical form in the other window. So in all four
readings:

- every placement held still is one form's measured against its own;
- every kind row's `readShareWas` and `readShareNow` have, by construction, the
  same set of places under them;
- no figure anywhere has a denominator that spans two audiences.

The fault 0294 exists to refuse — *the readership was varied by construction and
the sentence printed over the figures says the change did it* — **cannot be
constructed through these four entry points.** A caller handing `was` of
`aud_free` and `now` of `aud_pro` does not get a plausible wrong number; it gets
every form unpaired, every kind `unpaired` or `unplaced`, every movement
`unknown`, and `pages` of nought. That is degenerate rather than misleading.

### The fault that is real, and it is a different one

What these four *can* get wrong is a count of **pages**, and they get it wrong
in the loud direction. `pagesGained` is documented as *pages read in the later
window only*. After 0293 it is **forms**, and the docs on three of the four
still said trees. A deployment that began serving `aud_pro` on five pages it
already served reads:

> your library gained 5 pages

It published nothing. The same number also means *five pages were published*,
and nothing in the output tells the two apart — while the fact that separates
them, the tree behind each form, is already in hand on both sides. This is the
twenty-eighth thing derivable from what the subsystem holds rather than
collected: **no payload, no browser, no column, no store, no new kind.**

## Decision

1. **No `different-audiences` refusal on the four library comparisons.** Pairing
   by form (0293) means no share in these readings has a denominator spanning
   two populations, so there is no wrong number to withhold. 0294 is unchanged
   and is not superseded: its clauses are about a comparison whose two sides are
   **one reading each**, and these four pair inside themselves.
2. **A mixed window is not refused either**, and this is the half the filed
   finding had backwards. After
   [0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md) a
   deployment serving two audiences has a mixed window for *every* library
   comparison it ever takes; refusing mixed would withhold this reading from
   exactly the deployments 0263 was built for. `pageReadingOf`'s
   `audiences-mixed` refusal is not the precedent it looks like: that one refuses
   because summing two forms' node counters is one number about two pages, and a
   library comparison never sums across forms inside a placement.
3. **Each side reports the audiences it held**, as a set rather than as one:
   `audiences: ComparedPopulations` — `{ was, now }`, each a stable-ordered
   `readonly AudienceId[]` — on all four. `[]` is *no form here named one*, kept
   as the third state it is and never defaulted to `aud_everyone`.
   `ComparedPopulations` is deliberately not `ComparedAudiences`: a window's
   side is a set, a reading's side is one audience or none, and conflating them
   is how a refusal would leak in.
4. **A form gained is told from a page published.** `formsGained` is the subset
   of `pagesGained` whose tree the earlier window already held in another form;
   `formsLost` is its mirror. `pagesGained − formsGained` is pages published and
   `pagesLost − formsLost` is pages that left the library, so a surface gets both
   sentences from one subtraction and neither has to be guessed.
5. **The pages a window held include its ambiguous forms.** `pagesHeld` is built
   from every form in `byForm`, not from the comparable ones. The question is
   what the deployment served, not what could be compared, and a form excluded as
   ambiguous is named in `ambiguous` already.
6. **`pages`, `pagesGained` and `pagesLost` are documented as forms**, correcting
   three doc comments stale since 0293. The numbers do not change and no caller
   moves; what changes is that they stop claiming to be trees.
7. **Placements are not decomposed the same way.** `gained` and `lost` stay a
   count of places, whatever brought the place about. A place in a second form is
   a place a reader can really reach and really was not in the other window; the
   misleading sentence was about *pages*, which is the figure a person reads as a
   count of documents they own.
8. **Two form rules are published in `audiences.ts`**, beside the two key rules:
   `audiencesOf` (the audiences a set of forms names) and `pagesOf` (the pages
   behind them, which two forms of one share). Published rather than spelled
   four times, for the reason `readingKeyOf` and `formKeyOf` are — four agreeing
   spellings of one rule is the shape this subsystem has been bitten by twice.

## Consequences

- **Nothing is superseded.** 0263, 0284, 0290, 0293 and 0294 are unchanged and
  all right. What changes is a filed proposal, which is not a record.
- **Nothing reaches a reader.** No payload, no browser code, no column, no store
  and no kind. `broadcast.ts` is byte-identical to `main`.
- **A deployment serving one form of every page sees two new numbers that are
  always nought** and two sets that are always empty or always one member. Its
  library comparison is otherwise the one it had.
- **A deployment serving two forms stops being told its library grew when it did
  not.** That is the whole of the user-visible effect, and the remedy needs no
  call it did not already make.
- **0294's filed finding is closed as answered rather than as built.** The guard
  it asked for is not built, the reason is clause 1, and the question it left
  open — refuse a mixed window first? — is answered no by clause 2.
- **A screen has two more numbers it must not collapse.** `Loom portal` is filed:
  a card printing `pagesGained` alone now has a strictly better sentence
  available, and printing both without the subtraction would be worse than
  printing one.
- **The parked identity work is no harder.** A `PageForm` here is a tree and an
  `aud_`, `pagesOf` is a set of tree ids, nothing keys on a reader and nothing
  persists. If a consented per-reader id ever arrives behind a gate and a record,
  nothing in this record would need unpicking.

## Alternatives considered

- **Build the `different-audiences` refusal the finding asked for**, a member in
  each of the four silence vocabularies mapped to `two-audiences`. Rejected on
  clause 1: it would refuse pairs whose arithmetic is correct, and the one case
  it would catch — two windows of two disjoint audiences — already comes back as
  every form unpaired and every movement `unknown`. Adding a vocabulary member
  for a case the rows already say is dead code wearing a silence's clothes.
- **Refuse a mixed window**, as the finding thought likely. Rejected on
  clause 2, and it is the costlier of the two mistakes: it would withhold the
  library comparison from every deployment that took up 0263.
- **Rename `pagesGained` to `formsGained` and have no second counter.** The
  honest name, and rejected twice over: it is a breaking rename on four published
  types for no new fact, and the deployment that reads the number wants *pages
  published* — which is the subtraction, not either operand.
- **Decompose `gained` and `lost` the same way.** Rejected on clause 7 for now.
  It is four more counters on four types to separate places that are all really
  reachable; if a surface finds it needs them the fact is still derivable the
  same way, from the same two sets.
- **Put the audiences on each kind row rather than on the comparison.** Rejected:
  a kind's row is a sum over placements and the populations are a fact about the
  two windows, not about the row. It would also be the one place a reader could
  mistake it for a per-row refusal.
- **Default a window naming no audience to `aud_everyone`**, making every census
  confident. Rejected for the reason 0290 and 0294 rejected it: it is an
  assertion no row made, true of every window written before the column existed
  and false of a deployment serving only `aud_pro`.
