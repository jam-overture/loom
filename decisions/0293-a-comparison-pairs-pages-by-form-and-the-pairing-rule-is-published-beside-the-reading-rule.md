# 0293. A comparison pairs pages by form, and the pairing rule is published beside the reading rule

**Status:** Accepted
**Date:** 2026-10-17
**Section:** §4c (reader signals)

> **Renumbered on 2026-10-18**, from 0292, when this branch (#668) was merged.
> `main` had meanwhile accepted a different 0292 — *a project holds at most one
> repository, and a repository belongs to at most one project* — and two records
> sharing a number is fatal (0097). This record was written on 17 October and
> nothing in it changed but its number; references on the branch were updated
> with it.

## Context

[0263](0263-a-page-is-a-base-tree-and-the-deltas-an-audience-earns.md) made a
page one base tree plus the deltas an audience earns, composed per request in
the customer's own process, so **two audiences read one tree at one revision and
see two forms of it**.
[0284](0284-a-signal-names-the-audience-it-was-collected-under-and-the-predicate-stays-in-the-control-plane.md)
put the audience on all five reader tables so the two forms' counters could be
told apart, and
[0290](0290-a-reading-is-of-one-audience-and-two-forms-of-a-page-are-two-readings-rather-than-one-handed-in-twice.md)
gave every reading of those counters the dimension, publishing `readingKeyOf` —
*a tree, a revision and an audience* — so that five readings would stop
spelling it themselves.

**The comparisons were not in that unit, and three of them pair pages by tree
alone.** A comparison of two windows of one library — the places a kind of part
holds (0266), the words it says (0270), the readers who met it (0279), the
words the typical reader reached (0280) — pairs each page in the earlier window
with its counterpart in the later one, and the rule that decides what one page
is lived in `pairedWindowOf`, keyed by `TreeId`. Two forms of a page share a
tree, so the pairing had the two defects 0290 found in the readings, in the two
cases a window can hold them:

- **at one revision**, the second form was `duplicated` — dropped as the first
  one handed in twice, which is the one condition
  [0158](0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)
  makes permanent, and which `health.ts` publishes with a remedy pointing at
  the **caller**;
- **at two revisions**, the tree went into `ambiguous` and **both** forms were
  excluded from every row, every total and every ranking — a page the
  deployment serves twice, missing from a census of its library because one of
  its forms was republished.

The second had a third consequence that no screen could have noticed. A kind's
`pages` is a set, so two forms of a page counted as one, understating the places
a kind stands by exactly the pages a deployment serves in two forms; and
`LibrarySide.scaled` keyed each paired page's door by its tree, so **one form's
door scaled the other form's readers** — `pageViewsFor` scopes a page-view row
to the reading's own audience (0290), so the map held whichever form was seen
first and the other was weighted against it.

**And `library-copy-change.ts` carried a second hand-written copy of the same
rule.** `pairedWindowOf` is exported with a doc comment saying why: *"a second
hand-written copy of it would be two spellings of one rule that agree today."*
There was one, 150 lines away, and it was wrong in the same two ways.

`deployment-change.ts` had the right rule two days early and kept it private.
0290 clause 7 found this exact defect in the order over a deployment's changed
pages and fixed it with `formKeyOf` — *a page in one of its forms, with no
revision in it* — as a `const` in that module. The finding filed that day said
the lesson plainly: **a published key stops two places disagreeing only once
both places import it.** One of them did not exist to import it.

## Decision

**1. `formKeyOf` is published from `audiences.ts`, beside `readingKeyOf`, and
the two rules stay two.** `readingKeyOf` answers *what is one reading*, where a
revision is part of the identity. `formKeyOf` answers *what is one page in one
form*, where the revision is absent because it is the thing being compared
across. A `PageForm` is a tree and an audience; `formOf` normalises an absent
audience to the `null` it means, which is 0290's third state — *nothing recorded
which audience this was of* — and never `aud_everyone`.

**2. `pairedWindowOf` keys by form.** `byForm` replaces `byTree`, `duplicated`
means *the same revision of the same form handed in again*, and `ambiguous` is
per form: a page served in two forms is **two paired pages**, and one of them
being held at two revisions leaves the other standing in every figure.

**3. The four library comparisons publish `ambiguous` as forms rather than tree
ids.** `readonly PageForm[]`, for the reason `MovedPage`, `RankedPage` and
`PageHealth` carry the audience after 0290: a surface naming the page it
excluded has to say which form, and the key itself is opaque.

**4. Everything a comparison keys per page is keyed per form.** A kind's
`pages` set, the door map on `LibrarySide`, and the `UnscaledPage` rows each
window publishes — the last of which already had the field, because 0290
widened `RevisionOf` to carry an audience and `UnscaledPage` is a `RevisionOf`.

**5. `library-copy-change.ts`'s own `windowOf` is deleted** and it imports the
published rule, as its three siblings do.

## Consequences

- **A deployment serving two forms of a page gets a library comparison of
  both**, where before it got one of them and a permanent `duplicated`, or
  neither and an `ambiguous`.
- **`pages` on a kind's row grows for a deployment serving two forms**, and the
  figure it was is the one that was wrong: two forms have two doors, two sets of
  readers and two masses, so a kind standing in both stands in two places.
- **`ambiguous` is a different published type** on four readings. Nothing
  outside `src/signals` read it, so nothing is migrated; the portal has not
  built these screens and the finding 0290 left it already says every one of
  them has this dimension on it.
- **A caller handing in one form twice is still a double count.** The narrowing
  that makes two forms two pages is exactly the narrowing that could stop
  catching a real repeat, so it is asserted from both sides in every file it
  touches.
- **The comparisons still do not check that their two sides are of one form.**
  `libraryChangeOf(wasFormA, nowFormB)` pairs `aud_pro`'s pages with
  `aud_free`'s, finds no counterparts, and reports every page gained and every
  page lost — loudly wrong rather than quietly, which is why it is not in this
  unit. The quietly wrong version of the same error is a page-level comparison
  whose two sides name different audiences, which is an open finding with its
  shape written and is a decision about a published vocabulary rather than a
  key.
- **Nothing was added to a payload, a browser, a column, a store or the
  vocabulary of kinds.** The audience column has been on the rows since 0284;
  this is the reading of it. The broadcaster is untouched and byte-identical.

## Alternatives considered

**Leave the pairing keyed by tree and have the caller split the window first.**
`byAudience` exists and a caller that splits gets two windows, each holding one
form of every page, each pairing correctly under the old rule. Rejected because
it is the answer 0290 refused for the readings and for the same reason: the
failure of not splitting is not an error, it is a plausible number. A caller
that forgets gets `duplicated` on a healthy deployment, which `health.ts`
reports as the caller's fault — and that report would now be right while being
useless, because the caller it names is doing what every caller did before
0263. The store keeps the forms apart; the rule that reads them should not
depend on being asked nicely.

**Keep `ambiguous` as `readonly TreeId[]`.** Smaller, and no published type
changes. Rejected because it is wrong in exactly the case the rest of this
record is about: a deployment with one form of a page ambiguous and the other
fine would publish the tree, and a surface reading it would exclude a page that
is in the comparison. A list of trees cannot say *one of these two forms*.

**Make `PairedWindow.ambiguous` a set of keys and let each caller rebuild the
form.** Rejected: the key is opaque on purpose, and four callers reconstructing
a `PageForm` from a string they are told not to parse is four places to get a
split wrong. A map from key to form costs one field and hands back exactly what
a surface needs.

**Count a kind's `pages` by tree and its places by form.** Considered because
*the pages this kind is on* has a reading under which two forms of one page are
one page — a person maintaining a site has one pricing page. Rejected because
the figure is a denominator for nothing and a magnitude beside a share: the
share is taken over comparable **places**, which are per form, so a `pages`
that counted trees would be the one number on the row not taken over the set
the row is about. The question *how many of my pages* is a question for a
census, which answers it per form too (0290 clause 7).

**Put a form guard on the four comparisons in this unit.** Rejected as a
separate decision, not a smaller one: refusing a cross-form pair is a member in
four published silence vocabularies, and the page-level comparisons have the
same question with a worse failure mode. One decision over all of them, with
the vocabularies settled together, is better than four now and eight later.
