# Reader signals — the words a change left standing

**Routine:** `Loom signals` · **Date:** 2026-10-12 (second evening run) ·
**Branch:** `signals-20-the-words-a-change-left-standing` · **Section:** §27 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

`libraryCopyChangeOf(was, now)` in
[`src/signals/library-copy-change.ts`](../src/signals/library-copy-change.ts):
*you rewrote the testimonial band and readers now reach two thirds of the words
it kept.*

It is the **eighteenth** thing taken out of what this subsystem already knows
rather than collected. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary of kinds**, and the broadcaster was not touched —
measured both sides and byte-identical.

It is the unit the previous run filed rather than shipped. §26 landed this
morning and was explicit about the one thing it refused — **words** — because a
placement paired by node may be the same node saying two different sentences.
This is §16's answer for one page (*a change is read against the words both
revisions say*) taken per placement and added across the placements of one kind.

Four readings of a library now stand on one list of `PageReading`s:

| | |
| --- | --- |
| the **places** a kind stands, and how many were reached | §23, 0257 |
| the **readers** who met those places, and how many read it | §24, 0256 |
| **those readers**, and how many acted inside it | §25, 0265 |
| what a change did to those **places** | §26, 0266 |
| what a change did to the **words** those places kept | §27, 0270 — new |

### Why the words are the sounder denominator and not the harder one

Every comparison in this subsystem has to say what its denominator moved with. A
count of readers moves with the straddle and with the window's traffic. §26's
count of **places** is held still by pairing them, which is what let it publish a
verdict as the sign of a subtraction of two whole numbers.

**Carried words are held still by something stronger than pairing**: they are
*the same sentences on both sides*, so the denominator is not merely the same
size in both terms — it is the same text, and the subtraction is over it. A
placement whose words the change rewrote is in `rewritten` and in no share; a
placement only one window bears is in `gained` or `lost` and in no share.

## Decisions I took that the plan did not specify

All of them are in
**[0270](../decisions/0270-a-change-to-the-words-a-kind-of-part-says-is-read-over-the-words-both-windows-say-and-a-floor-costs-the-signed-figure.md)**
(Accepted; nothing superseded, nothing edited).

**The whole library gets a total, and it is the first one any reading of a
library has had.** §23, §24, §25 and §26 all refuse a figure added across kinds,
because a figure over every kind at once counts a page once per element node and
so measures how finely the pages were written as much as how they are read.
**Words do not do that** — a part's own words partition its page exactly once
(0212, 0235) — so the rows add, and `LibraryCopyChange.words` *is* the type rows
added up rather than a second computation that could drift from them. A test
asserts that identity, and a second asserts the role rows add to the same total
wherever nothing was recast.

**That total follows the types, because the two keys cannot both be it.** A
recast node is a place one kind left and another took (§26), so its words are in
`wordsGained` and `wordsLost` both — the page did not gain or lose them and the
two kinds did — while the role rows hold it still wherever the two types play the
same part. A test pins the disagreement: nought carried words by type, twelve by
role, and the published total follows the types because a type is the thing an
author replaces.

**No verdict and no silence at that scale.** Every reason this reading has to
withhold something is a reason about one kind of part, so a silence at the
library's own scale would have needed a subject the table does not have — and
0240's claim is that the subject is a property of the reading. The entry filed on
9 October is the near miss that made me careful here: an order over a
deployment's pages publishes `page` as its subject because its reasons are about
its members. A sum of rows has no members to be silent about. So the
whole-library row is numbers; the verdicts are on the kinds.

**A floor costs the signed figure and nothing else, which is the one new shape of
row in this subsystem.** §16 drew the line where it has to be drawn: a single
passage's movement survives a floor and a signed sum over passages does not —
a hundred true words counted as ten, against fifty counted as fifty, is an
improvement published as a regression. So `words.change` is withheld with
`floored` as the reason and the row's `movement` is `unknown`, while **both
shares, both masses and every count stay**. That makes `floored` the only member
of any silence set here whose reading withholds one figure and publishes the rest
of its row.

**And a floor never reaches the places answer**, which is what a silenced row
points at. A test asserts both halves of that on one input: the words row is
`floored` with no verdict, and §26's row for the same two windows is `held` with
no silence at all.

**The rewriting is published beside the share, because the share is about what is
left.** A band nine tenths rewritten has a carried share about the tenth it kept.
`rewritten` and `rewrittenWords` are on every row for that reason, and the
portal finding leads with it: a card that printed the carried share alone would
report a sentence about a tenth of a component as a sentence about the component.

**The lead is the mass of words and not the worse share**, which is the ranking
rule a page's falls and a library's kinds already use. A label that lost its one
word is a perfect rate and a smaller problem than a band of four hundred that
lost half of them; a test puts both on one page with identical nought shares and
asserts the band leads.

**No root exclusion is needed, and the contrast is worth keeping.** §25 had to
keep a page's root out of its lead, because `engaged` at a root is the page-wide
*did anybody do anything at all*. A part's words are its own and never its
subtree's, so a root's row here is a row about the words the root itself says —
and a kind standing inside itself is counted at both depths, which a test covers
as the thing it is rather than guarding against.

## Records added

- **0270** — *A change to the words a kind of part says is read over the words
  both windows say, and a floor costs the signed figure.* Accepted. Nothing
  superseded.

**0270 was the next number free on `main`** (0269 the highest; 0153, 0154 and
0252 are the standing gaps the index already notes) and no open branch claims it:
#609 is the portal rail and adds no record, #566 renumbers its own to 0252 on
merge. If it clashes before this merges, only the number moves.

## A thirteenth silence vocabulary that brings nothing, and the first built out of three

`library-copy-change`, five members, subject `kind`, **no new condition**:
§23's `unplaced`, §26's `unpaired`, and §16's `wordless` and `floored` said of a
kind rather than of a page.

The instructive half is the last pair. `words-a-floor` arrived with a reading of
**one page's** words; it is reported here at a different subject, which makes the
pair `one-reason` and never `one-state` — the same relation the door's three
states already have at two subjects. Where §25 took another set's whole type
because its subject matched, this one takes members from three sets because three
different readings are in a position to report the same states of the world about
a kind.

0240 is not superseded and not edited. The module carries the corrected counts —
twelve conditions, fifty-two members, thirteen sets, four subjects — and the
paragraph about what this set shows.

## Findings filed and closed

**Closed (1).**

- **The 12 October entry asking for a change to a kind's words through 0239's
  intersection per placement** — built as this unit. The shape it described is
  what shipped, with one thing settled that it left open: the per-placement
  intersection is reused from `copyChangeOf` rather than reimplemented, so the
  text-identity rule and the words-per-part rule each have one spelling in the
  repository.

**Filed (3).**

- **`Loom portal`** — *a kind of part now has a words answer as well as a places
  answer, and the one to draw depends on a floor.* With the carried share that
  cannot be drawn without the rewriting beside it, the floored row that has
  shares and no verdict, and the first deployment-wide word figure any library
  reading has published.
- **`Loom signals`** — *the word-weighted reader figure is a third unit, and its
  weights move without a floor.* It is the same argument the reader-weighted
  places figure filed yesterday needs, which suggests the two are one unit rather
  than two.
- **`Loom primitives`** — *the missing role declaration now costs a kind's word
  comparison, which is the eighth consumer.* New here: the role rows are the only
  place a recast component's words are compared at all, and today that lands
  entirely in the row for everything whose type said nothing.

## Test numbers, which are real

`pnpm install && pnpm verify` — **green, exit 0.**

| | |
| --- | --- |
| Runtime | **218 files, 4,887 tests, all passing** (+1 file, +31 tests) |
| App | **436 files, 8,322 tests, all passing** |
| `src/signals/` alone | 35 files, **951 tests** |
| New tests | **29** in `library-copy-change.test.ts`, **2** in `silences.test.ts` |
| Prerender | 133 pages, 1,815 junctions, 0 run together; 3 metadata conventions, 0 unserved |
| Findings | **1,172 findings, 0 malformed** |

Nothing was skipped and no test was weakened.

**Three of my own expectations failed first and two were the test's fault, not
the module's.** Both were the same mistake in two places: I wrote a recast
fixture where the node moved from a type that declares `copy` to one that does
not, so the words moved out of the reading at the same time as the type changed
and the placement landed in `rewritten` rather than in the carried words. One of
the two *passed* while asserting the wrong thing, which is the worse half — it
checked `wordsGained: 0` and the nought was the declaration's and not the
recast's. Both now use one declaration for both types, so the recast is the only
thing that changes, and they assert the twelve words lost by one type and gained
by the other. The third was the floored fixture in `silences.test.ts`: a type
declaring nothing at all has no visible words either, so the row reported
`wordless` where I expected `floored`. A floor with words in it needs a declared
prop holding something that is not a string, which is what the fixture does now.

**`pnpm verify` also went red once and it was mine:** three record citations in
0270 linked to filenames I had written from the record's title rather than copied
from `decisions/` — 0240, 0122 and 0242 all have shorter filenames than their
titles. `tools/decisions/decisions.test.ts` names each one, which made it a
thirty-second fix; it is the second consecutive run in this lane to be caught by
the records' own checks rather than by review.

## Browser byte cost

**Nothing was added that runs in a browser**, measured rather than assumed.
`src/signals/broadcast.ts` bundled with esbuild (minified, ESM, browser) from a
clean `git archive` of `origin/main` and from this working tree:

| | `origin/main` | this branch |
| --- | --- | --- |
| minified | **6,477 bytes** | **6,477 bytes** |
| gzipped | **2,935 bytes** | **2,935 bytes** |

`cmp` reports the two bundles byte-identical. Gzipped with `gzip -9 -n -c`.
`library-copy-change.ts` imports types and three pure functions and is not in the
broadcaster's import graph; `browser-weight.test.ts` passes.

## The double count, five shapes, all covered

0158's rule is that counting a window and forgetting it are one operation, so
every count here is tested against the case where it would double.

1. **One reading handed in twice** — dropped, counted in `duplicated`, and the
   kind's whole row and the library's whole word row asserted equal to the
   single-reading ones.
2. **Two revisions of one tree in one window** — excluded, named in `ambiguous`,
   and asserted apart from the duplicate case: nought pages, nought carried
   words, nought duplicated.
3. **One page bearing three placements of one kind** — eighteen words in the
   kind over three placements, and the **same eighteen** in the library's total,
   because the three placements partition the page rather than repeating it.
   Both asserted in one test, because the two numbers look like each other.
4. **A kind standing inside itself** — the outer part's eight own words and the
   inner part's three, counted at both depths and neither one twice, which is
   what a part's words being its own means.
5. **A rewritten placement** — counted once in `rewritten` and in no word total,
   so the words it says on each side cannot reach a share through either door.

Plus the identity that is the whole method: the type rows added up are the
library's carried words, and the role rows add to the same number wherever
nothing was recast.

## Open questions

Nothing blocking. Two judgements worth a line each are on the pull request
comment, with a recommendation for each.

## Not built, and deliberately

- **The word-weighted reader figure.** Filed with its reason: adding per-page
  means weights each page by its own traffic, so it moves when readers move *or*
  when which pages they were on moves.
- **Signal-to-intent derivation** — the framework lane's, and still out of scope
  for everyone.
- **Per-reader identity** — parked since 30 September; nothing was built and no
  record argues for it. **Nothing in this unit makes it more expensive to add
  later**: every input is a per-deployment aggregate and the published unit is
  *(a placement, a word count)* with no identity in it. If an opt-in identified
  batch ever lands, a share of distinct readers who reached a kind's words would
  be a new figure beside this one rather than a correction to it.

## Working beside the framework lane

I read the open pull requests before starting and `git fetch`ed before branching.
**Nothing open touches the signal path:** #609 is the portal rail and #566 is the
framework lane's vocabularies record (34 files, none under `src/signals/`). No
branch of this lane was open, so this is a new branch off `main` per procedure
step 3, and nothing is stacked.

The generated API reference moved — the new module's exports — and was
regenerated with `pnpm --filter @loom/app docs:api` after `pnpm build`, rather
than hand-resolved; `decisions/README.md` was regenerated with
`pnpm decisions:index`. `FINDINGS.md` was appended to and nothing in it was
reflowed. No formatter was run on this repository.
