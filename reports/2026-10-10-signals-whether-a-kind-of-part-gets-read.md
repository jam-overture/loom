# Reader signals — whether a kind of part gets read anywhere

**Run:** `Loom signals`, evening of 10 October 2026
**Branch:** `signals-18-which-parts-of-the-library-get-read`
**Record added:** [0257](../decisions/0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md)

## What I completed

One unit: **§23 of `docs/signals.md`, a census of a deployment's library by kind
of part.** `libraryReadingOf(readings)` in
[`src/signals/library.ts`](../src/signals/library.ts), published from
`@jam-overture/loom/signals`.

Every one of the twenty-two steps before it answers about one page, except §21,
and §21 is an order *over* pages — the unit it ranks is a page and the sentence
it gives is *fix this one next*. Nothing could be asked about a **kind of part**.
A deployment builds forty pages out of the same two dozen primitives, and *do
readers read the testimonial band anywhere* is a question about the library
rather than about any one page. It is the first thing my brief's queue names —
*which roles readers engage with and which they skip* — and a type's placements
were scattered across forty readings with nothing joining them.

It is the **fourteenth** thing taken out of what this subsystem already knows
rather than collected. Nothing was added to a payload, a browser, a column, a
store or the vocabulary, and the broadcaster was not touched.

What a row says, by primitive type and by role:

- **`readShare`** — the share of the places a kind stands that readers reached,
  with the three standings behind it;
- **`words`, `wordsReached`, `wordShare`, `floored`** — how much a kind says
  across the library and how much of it got reached;
- **`activations`, `opens`, `closes`, `completions`, `dwellMs`** — the
  occurrences filed against it;
- **`placements`, `trees`, `revisions`** — the breadth behind the row;
- **`silence`** — `unread` or `unplaced`, which carry opposite instructions.

And on the reading: `mostSkipped`, `mostUsed`, the library-wide standings,
`duplicated`, and `roleDisagreed`.

## Decisions I took that the step did not specify

**The unit is the placement, and a reader is never the unit.** This is the whole
of 0257 and it was the only real decision in the unit. `views`, `reached` and
`engaged` count distinct page views and are absent from every row — a
`RoleReading` already refuses them one level down (0212), and across pages the
case is stronger rather than weaker, because each page's distinct counts are
inflated by *its own* straddle rate. That is exactly the fact that forced every
page's loss onto the door's scale before §21 could rank it. So the headline is
`read ÷ (read + skipped)`: a ratio of two counts of **parts of trees**, with no
reader and no rollup window in either term, which a deployment that shortens its
window cannot move.

**What that costs is stated on the reading rather than hidden.** A placement on a
page nine thousand people read counts the same as one on a page three people
read, so the share is about *places* and a surface printing it as *readers skip
this* is printing something the reading did not say. I considered building the
weighted version instead and did not: it is `reached ÷ views` per placement and a
mean over them, which needs the door's correction to be honest, and it is a
second artefact with a second error model. It is filed as its own unit with the
shape it should take, rather than shipped inside this one with a caveat on it.

**Words add, dwell adds within a kind, and neither is totalled across kinds.** A
part's words are its own and a page's words partition across its parts exactly
once (0212), so two placements' words are two sentences. `dwellMs` is not like
that: a part is on screen while its children are, so a nested placement's seconds
are its ancestors' too. I publish it per kind as a volume of attention, say so on
the field, and publish **no reading-wide dwell**, because across kinds it is not a
duration anybody spent.

**A role nothing plays gets a row.** *Nothing in this library is a heading* is a
fact about the library, and a surface that had to tell a missing row from an
empty one would be reading the vocabulary itself. The cost is the eleventh
silence condition and the condition is true.

**A type whose readings disagree about its role is named, not averaged.** A type
plays one part (0114), so a disagreement is two libraries read as one — readings
joined against two different registries and concatenated. The first reading's
answer stands and `roleDisagreed` says which types were affected, which is the
alarm `PageReading.orphaned` is for the same class of caller error.

## The silence table gained a subject, which is a first

§17's table now has nine vocabularies, eleven conditions and thirty-two members.
`library` brought **the fourth subject** — `kind` — and the eleventh condition,
`nothing-of-the-kind`.

The reason they arrived together is worth keeping, and it is the narrowing the
9 October entry on 0240 was looking for from the other direction. A page, a part
and a pair all exist because something was read; a **kind comes from the
vocabulary**. So this is the first reading whose rows are keyed by a published set
rather than by what a deployment holds, and therefore the first that can be
silent because *there is none of the thing it is about* — and a subject that comes
from a vocabulary is exactly a subject that can be empty. 0240's claim that the
subject is uniform across a set and a property of the reading is exactly true of
this set too, so **0240 is not superseded and not edited**; the module carries
the corrected counts and the paragraph says which claim was extended and why.

The test that declares, per set added after the fifth, which conditions it
brought now has a `library` row declaring `nothing-of-the-kind`, and still fails
in both directions.

## Records added

[0257](../decisions/0257-a-kind-of-part-is-read-across-the-places-it-stands-and-the-unit-is-the-placement.md),
**Accepted**: *A kind of part is read across the places it stands, and the unit
is the placement and never the reader.* Nothing is superseded. `pnpm
decisions:index` run; `pnpm verify` passes the drift check.

0252 is left free: #566's merge comment reserves it for that branch's renumber.
0245 stays claimed by #548.

## Findings filed and closed

**Three filed.**

1. For `Loom portal` — the library screen: what it can ask, `mostSkipped` as the
   sentence to lead with, the five things a row can say without a reader being
   counted, and the one figure that must never be drawn as a share of readers.
2. For this lane — the weighted share (*of the readers who met this kind, what
   share read it*), with the shape it should take, the input it needs and why it
   is a second unit rather than a field on this one.
3. For `Loom primitives` — the missing `role` declaration, fourth consumer, and
   the first where the silence is the **whole** of a figure rather than one value
   in it: with nothing declared, the role census is one row.

**One closed, and it was already satisfied.** The 5 October entry *every consumer
of `readingPaceOf` will write the same four lines to find its correction* was
still open while the entry recording its remedy says it was closed by
`signals-10`. `inflationFor(where, rows)` is on `main` at
`src/signals/page-views.ts:308`. Nothing had come back to flip the entry; I
verified the remedy rather than re-arguing it and flipped it. This is the same
shape as the lessons lane's open #572.

## Real test numbers

`pnpm install && pnpm verify` — **green, nothing skipped and nothing weakened.**

| | |
| --- | --- |
| Runtime (`pnpm test`) | **202 files, 4,567 tests, all passing** — up 30 from `main`'s 4,537 |
| App (`pnpm --filter @loom/app verify`) | **421 files, 7,812 tests, all passing** |
| Prerender check | 132 pages, 1,756 text junctions, 0 run together; 3 metadata conventions, 0 unserved |
| Findings | 1,115 findings, 0 malformed |

Of the 30 new tests, 27 are `src/signals/library.test.ts` and 3 are added to
`src/signals/silences.test.ts`.

**Two failures on the way, both mine and both fixed before anything was pushed.**

1. `src/documentation.test.ts` — *never makes a decision-record number part of a
   published sentence*. Two doc comments offended: one cited 0212 as a markdown
   link inside a member comment, which is published whole rather than
   first-paragraph-only, and the parenthetical rule only lifts a bare `(0212)`;
   the other wrote *"the thinness 0212 named"*, which is grammar and not a
   footnote. Both rewritten. I also had 0147's filename wrong in a link, caught
   by `tools/decisions/decisions.test.ts`.
2. `app/(docs)/_lib/api/*` — the generated API reference had moved, as it must
   when a module is published. Regenerated with
   `pnpm --filter @loom/app docs:api`: 17 entry points, 1,498 exports.

**The double count, four shapes, all covered**, per this lane's standing rule
that anything which counts is tested against a case where it would double-count.
One reading handed in twice → `duplicated` is 1, `pages` is 1, and the whole
reading is `toEqual` the single-reading one with `duplicated` zeroed. Two windows
of the same revision → the second window's occurrences are dropped rather than
added, checked on the figures that would have doubled. Two *revisions* of one
tree → kept as two placements apiece and one tree, because both are live versions
of one page (§21). And the type rows and the role rows are each asserted to add
to `placements` and to every standing exactly, over a library of eight
placements, so a placement counted in two rows of one grouping cannot pass. The
nesting case — a kind inside itself — is tested as the thing it is rather than
guarded against: three placements, dwell at both depths, and no reading-wide
dwell key to add them into.

## Browser byte cost

**Nothing was added that runs in a browser**, measured rather than assumed.
`src/signals/broadcast.ts` bundled with esbuild (minified, ESM, browser) from a
clean `git archive` of `origin/main` and of this tree:

| | `origin/main` | this branch |
| --- | --- | --- |
| minified | **6,477 bytes** | **6,477 bytes** |
| gzipped | **2,935 bytes** | **2,935 bytes** |

`cmp` reports the two bundles byte-identical. Gzip measured with
`gzip -9 -n -c < file`, per the note the 10 October morning report left about the
file name landing in the header.

## Open questions

Nothing blocking. Two things for the maintainer, both with a recommendation, in
the pull request comment.

## Not built, and deliberately

- **The weighted share of readers per kind.** Refused with its reason in 0257 and
  filed as its own unit. It needs the door's scale and it is a second error model.
- **Per-reader identity** — parked since 30 September, not built, and no record
  argues for it. **Nothing in this unit makes it more expensive to add later:**
  the census reads stored counters and the trees they were filed against, holds
  no reader state of any kind, and an identified batch would change what a rollup
  writes rather than anything here.
- **Signal-to-intent derivation** — still out of scope for everyone, and planned
  in `adaptation.md`.
- **A deployment-wide dwell total or a single headline number over the kinds.**
  Refused for the nesting reason, and because the artefact is a census: the one
  error available to a census is counting the same page twice, and a total would
  add a second.

## The other lanes' branches

Five pull requests were open when I started and **none of them touches
`src/signals/`**, so this is a fresh branch off `main` rather than a push onto an
existing one. #566 (framework) is the only one near this subsystem and it is
parked on a maintainer decision about three strings of portal copy; it edits
`src/runtime/` and the lesson files, not this lane. #573 (portal) builds on §21,
which is on `main`.
