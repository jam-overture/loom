# Reader signals — a comparison pairs pages by form

**Routine:** `Loom signals` · **Date:** 2026-10-17 (evening run) · **Branch:**
`signals-37-a-comparison-pairs-pages-by-form` · **Section:** §37 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

The morning run of this routine shipped 0290 — every **reading** of these
counters got the audience dimension, with `readingKeyOf` published once so that
five readings would stop deciding for themselves what makes two readings one
page. Clause 7 of it, added when another lane's branch merged mid-run, found the
identical defect in a **comparison** and fixed it with a second rule,
`formKeyOf`, as a `const` in `deployment-change.ts`.

**Four other comparisons had the same defect and no key to import.** This run is
that: `formKeyOf`, `formOf`, `PageForm` and `inFormOrder` published from
[`src/signals/audiences.ts`](../src/signals/audiences.ts) beside `readingKeyOf`,
`pairedWindowOf` keyed by the form, and the four library comparisons — places
(0266), words (0270), readers (0279), reader-words (0280) — pairing their pages
by it. **Nothing was added to a payload, a browser, a column, a store or the
vocabulary of kinds.** The audience column has been on the rows since 0284; this
is the reading of it, and it is the twenty-seventh thing taken out of what this
subsystem already knows rather than collected.

### What was actually wrong, which is four things and not one

Two forms of a page (0263) share a tree, and `pairedWindowOf` keyed a paired
page by `TreeId`. So, in the two cases a window can hold both forms:

- **at one revision** — the second form was `duplicated`, dropped as the first
  one handed in twice. That is the one condition
  [0158](../decisions/0158-counting-a-window-of-reader-signals-and-forgetting-it-are-one-operation.md)
  makes permanent, and `health.ts` publishes it with **`caller`** as the remedy
  — so a deployment doing exactly what 0263 built would have been told its own
  surface was at fault;
- **at two revisions** — the tree went into `ambiguous` and **both** forms left
  every row, every total and every ranking. A page a deployment serves twice,
  absent from a census of its library because one of its forms was republished.

Two more came out of reading it, and the second is the one I would not have
predicted:

- **a kind's `pages` is a set**, so two forms counted as one page. A kind's
  places are per form and its pages were per tree, which made `pages` the one
  magnitude on the row not taken over the set the row is about — understated by
  exactly the pages a deployment serves twice;
- **`LibrarySide.scaled` keyed each paired page's door by its tree.**
  `pageViewsFor` scopes a door row to the reading's own audience (0290), so the
  two forms have two real doors — and the map held whichever it saw first, so
  **one form's arrivals scaled the other form's readers**. Every share, every
  mass and every counterfactual on that page was weighted by the wrong
  population's traffic.

And `library-copy-change.ts` carried a **second hand-written copy** of
`pairedWindowOf`, a hundred and fifty lines from an export whose own doc comment
says *"a second hand-written copy of it would be two spellings of one rule that
agree today."* There was one, and it was wrong in the same two ways. It is
deleted.

### The three things that decided the shape

**The two keys stay two, and the difference is now written where they are
published.** `readingKeyOf` answers *what is one reading*, where a revision is
part of the identity; `formKeyOf` answers *what is one page in one form*, where
the revision is absent **because it is the thing being compared across**. A
single key could not serve both: a comparison keyed by the reading would pair
nothing, and a reading keyed by the form would call two revisions one.

**`ambiguous` is published as forms rather than tree ids**, on all four
comparisons — `readonly PageForm[]`, for the reason `MovedPage`, `RankedPage`
and `PageHealth` carry the audience after 0290. A list of trees cannot say *one
of these two forms*, so a surface naming the page it excluded would have
excluded a page that is in the comparison. `PairedWindow.ambiguous` is therefore
a map from key to form rather than a set of keys: the key is opaque on purpose,
and four callers parsing a string they are told not to parse is four places to
get a split wrong.

**`null` stays the third state 0290 made it.** A form whose rows never named an
audience keys as itself, never as `aud_everyone`, so every window written before
0284 and every window a test builds by hand pairs exactly as it did.

## Decisions I took that were not specified

**I took this instead of the open finding my queue pointed at**, and the reason
is severity rather than preference. The open entry — a page's own change
comparison whose two sides name different audiences — says of itself that
*nothing is broken today and nothing is urgent*. What I found on the way to it
is a figure that was already wrong in shipped code, silently, in the one
condition 0158 makes permanent. I did the permanent one and left the other
filed, with its shape now settled by having read all nine comparisons for it.

**I did not add the form guard to the four comparisons I was already in.** It
was tempting, because the files were open. Refusing a cross-form pair is a
member in four published silence vocabularies, a condition in `silences.ts`
(0240), and the same question in five more functions with a worse failure mode
in `change.ts`. Doing four now and eight later is how a vocabulary ends up with
two spellings of one condition, which is the shape this whole run is about. It
is one decision over all nine, and the finding says so with the three open
questions answered.

**I moved `formKeyOf` out of `deployment-change.ts` rather than copying it.**
That module now imports it and keeps a two-line local that supplies the later
window's audience, with its own reason for that choice intact. Nothing it
decided was wrong and 0291 is not superseded — the key was in the right shape
and in the wrong place.

**I put the audience on the `unscaled` rows** the two reach comparisons publish.
It cost nothing — 0290 had already widened `RevisionOf`, and `UnscaledPage` is a
`RevisionOf` — and without it a page whose door is missing for one form and
present for the other publishes two rows nothing can tell apart, which sends
somebody looking at a page that is fine.

## Records added

[0292](../decisions/0292-a-comparison-pairs-pages-by-form-and-the-pairing-rule-is-published-beside-the-reading-rule.md),
Accepted. **Nothing is superseded**: 0263, 0284, 0290 and 0291 are all unchanged
and all right. Its *Alternatives considered* records four rejections, of which
two are worth reading — that **having the caller split the window first** is the
answer 0290 refused for the readings and for the same reason (the failure of not
splitting is a plausible number, not an error), and that **counting a kind's
`pages` by tree** has a real reading behind it (*a person maintaining a site has
one pricing page*) which is still wrong here, because the share beside it is
taken over places and places are per form.

**The number may move.** `main` carries 0291 and #647 holds 0278, so this took
the next number free on `main` as the governance says.

## Findings filed or closed

- **Filed and closed in the same run:** *four comparisons paired a page by its
  tree, in two spellings of one rule, and the key that would have fixed it was
  private in a fifth.* Written down rather than quietly fixed because it is the
  morning finding's own lesson arriving a second time, through a narrower gap
  than that one described. That entry said *a published key stops two places
  disagreeing only once both places import it*, and had in mind a branch open
  across another's merge. This case needed no merge: the key was published **to
  one module**. A `const` at the top of the file that needs it is the cheapest
  thing to write and the most expensive to find, because nothing about it is
  wrong. The rule this lane should hold itself to is in the entry: a key that
  decides what counts as one of something goes where the concept's record lives
  the **first** time it is written, not the second time it is needed.
- **Filed, open, owned by me:** *the comparison layer still does not check that
  its two sides are of one form.* It extends the morning's `change.ts` entry
  rather than replacing it, and settles three things that entry left open: it is
  **nine** functions and not eight and they take their pairs identically, so it
  is one guard beside the existing `different-trees` guard in nine places; the
  loud half (a library comparison reads every page gained and every page lost)
  and the quiet half (`readingChangeOf` produces every figure with no silence
  anywhere on it) want one decision rather than one fix; and the `null` side is
  unprovable either way, so the shape is **refuse only where the two sides prove
  two populations** and carry `audiences: { was, now }` for the rest.

## Open questions

Nothing blocking. The one thing I would like a ruling on eventually is in the
finding above and is not urgent: whether a comparison whose two sides name
different audiences should **refuse** or should publish with the mismatch named.
My recommendation is refuse-when-provable plus a field, which is 0290's
treatment of its own third state, and I have not built it.

## Test numbers

`pnpm verify` **green, exit 0**: 5,351 runtime tests across 233 files and 5,951
app tests across 336 files, plus 133 prerendered pages with 0 text junctions run
together. `src/signals` alone is 1,230 tests across 42 files. **Nineteen new
tests**: 6 in `audiences`, 3 in `library-change`, 3 in `library-copy-change`, 4
in `library-reach-change`, 3 in `library-word-reach-change`; and one existing
published-shape assertion updated in each of four files, plus the `unscaled`
shape in two.

**Five planted mutations, each caught, with the counts measured rather than
estimated:**

| mutation | caught by |
| --- | --- |
| `pairedWindowOf` keyed by the tree, as it was | **10** tests across all four comparisons |
| the door map keyed by the tree, as it was | 2 tests in `library-reach-change` and **22 of 25** in `library-word-reach-change` |
| a kind's `pages` set counting trees | 4 tests across the two reach comparisons |
| the `unscaled` row dropping the audience | 2 tests in `library-reach-change` |
| published `ambiguous` dropping the audience | 4 tests, one per comparison |

The second row is worth reading as evidence rather than as a count. Keying the
door map by the tree breaks **22 of the 25 tests** in
`library-word-reach-change`, because every reader-weighted figure in that module
runs through a door — which is the measure of how much was riding on a map that
held one form's door for both forms of a page.

**The double-count guard, asserted from both sides in all four files.**
Narrowing `duplicated` from *the same revision of the same tree* to *the same
revision of the same form* is exactly the narrowing that can quietly stop
catching a real repeat, so each comparison asserts both: two forms of a page are
two paired pages with `duplicated` at nought, **and** one form handed in twice
is still `duplicated` with the other form standing. The same pair of assertions
covers `ambiguous`: one form held at two revisions is excluded alone, named by
its form, with the other form still in every row.

**The fifth mutation is the one worth noting.** It survived the first time I
planted it. Three of the four comparisons' `ambiguous` assertions used windows
with no audience anywhere in them, where `audienceId: null` is correct either
way, so dropping the audience from the published list changed nothing they
tested. I added an ambiguous-form case to each of the three; all four now fail
under it.

**Three things went red on the way, and all three are mine.** I asserted
`carried` on a kind's row in `library-copy-change` where the field is
`words.carried` and the flat one is `placements`. While reverting a planted
mutation I used `git checkout` on a file, which threw away that file's real
changes along with the mutation — caught immediately, because the next run went
from 24 passing tests to a file with no `byForm` in it; the lesson is cheap and
worth keeping, which is to revert a planted mutation from a copy and never from
the index. And the first full `pnpm verify` failed on
`src/documentation.test.ts`, on **the rule the morning run's report predicted
this lane would meet again**: a record number in a published doc comment has to
sit inside a parenthetical that lifts out, and I had written *0158-permanent* as
part of a sentence. It is the second run in a row to trip it, which is worth
saying plainly rather than quietly fixing — the phrase is natural to write and
the rule is right.

**The app suite then failed on two tests, and that one is a real step rather
than a slip.** `apps/loom/app/(docs)/_lib/api/reference.generated.json` is the
published API reference, generated from these doc comments, and a changed
comment on an exported type is a changed reference. Regenerated with `pnpm
docs:api` from the app, never hand-edited, and both tests pass. The generated
file confirms the citation rule works as intended: the `(0263)` in the new
`pages` comment is lifted out of the published sentence, which is why it had to
be a parenthetical.

## Browser cost

**Nothing new runs in a browser.** Measured from a clean `git archive` of
`origin/main` and from this working tree, bundled with `esbuild --bundle
--minify --format=esm --platform=browser` from `src/signals/broadcast.ts`:

| | minified | gzipped |
| --- | --- | --- |
| `origin/main` | 6,477 bytes | 2,943 bytes |
| this branch | 6,477 bytes | 2,943 bytes |

`cmp` reports the two bundles **byte-identical**. (Both sides were gzipped by
the same binary here; the morning report's 2,935 was a different gzip, and the
comparison that matters is the one taken either side of this diff.) The
import-graph guard in `src/signals/browser-weight.test.ts` passes: `audiences.ts`
is reached only from `parts.ts` and the four comparisons, none of which the
broadcaster imports.
