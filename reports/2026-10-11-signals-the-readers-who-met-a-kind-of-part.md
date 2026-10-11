# Reader signals — the share of readers who met a kind of part

**Routine:** `Loom signals` · **Date:** 2026-10-11 · **Branch:**
`signals-18-which-parts-of-the-library-get-read` (pushed onto the existing pull
request, #576) · **Section:** §24 of [`docs/signals.md`](../docs/signals.md)

## What I completed

`libraryReachOf(readings, rows)` in
[`src/signals/library-reach.ts`](../src/signals/library-reach.ts): *of the
readers who met your testimonial band, six in ten read it.*

This was the open finding owned by this lane — filed yesterday, on this same
branch, by the unit that refused to ship it inside 0254's type. It was the only
open finding in the queue that was a thing to build rather than a limit written
down, and the pull request comment offered it as next run's unit. It is now
built and that finding is closed.

It is the **fifteenth** thing taken out of what this subsystem already knows
rather than collected. **Nothing was added to a payload, a browser, a column, a
store or the vocabulary of kinds**, and the broadcaster was not touched.

### Why the obvious arithmetic is the wrong one

§23's census answers *the testimonial band stands in nine places and readers
reached two of them* — a ratio of two counts of parts of trees, with no reader
and no rollup window in either term. Sound, and about **places**. A kind read in
the one busy place and skipped in nine quiet ones reports a read share of one in
ten, while *most of the readers who met it read it* is simultaneously true.

The weighted figure anybody writes first is a mean of `reached ÷ views` per
placement. Each of those terms is a distinct view count inflated by **its own
page's** straddle rate (0147) — so the pages readers linger on dominate the mean,
and **a deployment that shortened its rollup window would watch the figure move
with no reader moving.** That is §21's fact one level across, and §21's own
correction is what fixes it.

So every term is put on the scale the door counts in, off that page's own row by
the published matching rule:

- the weight is `appearances ÷ (1 + inflation)`, which comes to
  `min(appearances, opened)` — the page views a rollup folded, at the door's
  scale;
- the numerator is `reached × weight ÷ appearances`.

What comes out is **a weighted mean of each page's own sound share with that
page's exact arrivals as the weight.** 0229's cancellation has already happened
inside each term before the pages meet, and the weights carry no straddle at
all, so the one error a deployment controls cannot move the result. The test
that pins this runs the same fixture at a fourfold straddle and asserts 0.65
both times, and publishes the refused design's answer — 0.5 — beside it, so the
distortion is a number in the suite rather than a paragraph in a record.

## Decisions I took that the plan did not specify

All of them are in
**[0256](../decisions/0256-a-kinds-share-of-the-readers-who-met-it-is-a-weighted-mean-of-sound-shares-at-the-doors-scale.md)**
(Accepted; nothing superseded, nothing edited).

**The unit is one page view of one place, and a reader is never the unit.** Two
page views of two pages are two page views and nothing says whether one person
made both — rule 1 and 0146, not a gap. So the unit is the pair *(a page view, a
place this kind stands on that page)*, which is what makes the figure addable.
It also means two of the counts on a row are not headcounts and say so:
`openings` counts a page's readers once per place the kind stands there, and
`met` is a reach at the door's scale that is deliberately not rounded into
people.

**The weight is the folded page views at the door's scale, and not the openings
— which is the one place I changed the shape I had filed.** The finding said
weight by `opened`. Written that way, a page with openings no rollup has reached
projects its folded rate onto readers nobody measured, which is exactly what
0229 withholds a headcount for. Defining the weight as `min(appearances,
opened)` keeps only page views that were both counted at the door and folded
into the counters the numerator comes from — so there is no projection, and
**nothing here is withheld for a collection that is behind.** A lagging page
weighs less than a caught-up one; that shifts the evidence and not the share,
and `pending` is the published figure that says by how much. The identity
`openings = counted + pending` is asserted over every row of every reading in
the suite rather than described.

**The weight is taken as the smaller of two whole numbers**, not as the division
it is equal to. Three floats agree with it to fifteen places and not sixteen,
and 0229 was bitten by precisely that arithmetic when a share multiplied back up
broke its own ceiling.

**A kind standing on a page the door cannot scale has no share at all.** Not a
share over the pages that could be priced: a weighted mean over a subset is a
figure whose denominator nobody named, and *over eight of the nine places* is a
caveat a surface reads past — it will print the number. The whole kind is
withheld, and `LibraryReach.unscaled` names the pages that caused it, which is
the actionable half.

**The page that could not be scaled is named in the page's own vocabulary and
not in this reading's.** §13 reuses `ReachSilence` outright because a funnel is
asked of a page and so is a reach reading. This reading's subject is a **kind**,
and the silence table publishes the subject per vocabulary — so reusing
`ReachSilence` for the row would have had a surface print *this version of the
page* over a row about a primitive type. The three door states are therefore
published twice at two subjects: as a `KindReachSilence` on the kind, and as a
`ReachSilence` on the page. That is not a duplication to remove; it is exactly
the pair §17 exists to relate, and a test asserts the two relate as `one-reason`
and never `one-state`.

**No reading-wide share.** A share over every kind at once is a share over every
(page view, placement) pair in the deployment, where a page built from forty
parts weighs forty times one built from a band — a denominator that measures how
finely the pages were written as much as how they are read. The published keys
of the reading are pinned by a test, so adding one later has to argue with it.

## Records added

- **0256** — *A kind's share of the readers who met it is a weighted mean of
  sound shares, and the weight is the door's.* Accepted. Nothing superseded.

I took **0256** rather than 0255: 0254 is this branch's, and 0255 is claimed by
#577, which was open when I read the index. The rule is the next number free on
`main`, and avoiding a clash I could see is strictly better than taking one.

## A test that would have been weakened rather than fixed

§17's mapping test declares, per silence set added after the fifth, which
conditions that set brought that **no earlier set** reported — which is how
0240's evidence stays checkable. What the test actually did was compare each set
against every **other** set, which is the same assertion right up until a later
set reuses an earlier one's condition.

The tenth set reuses the ninth's `nothing-of-the-kind`, because a kind's share of
readers is withheld for the same *there is none of it* the census is. Under the
all-others form the ninth's declaration becomes `[]` and the test goes red — and
the obvious way to get it green again is to delete the ninth's declaration,
which deletes the one fact the test exists to keep. It now accumulates in arrival
order from the five original sets, so each set is held against what came before
it. The four earlier declarations are unchanged and the test is strictly
stronger. Filed as a closed finding so the next run can see why it moved.

## The silence table: a tenth vocabulary and nothing else

`library-reach`, five members, **no new condition and no new subject** — the
first set since the seventh to bring neither. Three of its five reasons are the
states of the door, and the door's states were all named the first time a share
of readers was taken of anything (0229); the other two are the census's own
values reused, because those were already a kind's. That is the shape of a set
that adds nothing: it asks an old question of a new subject. Ten vocabularies,
eleven conditions, four subjects, thirty-seven members. 0240 is not superseded
and not edited; the module carries the corrected counts and the paragraph about
what this set narrows, which is the **limit on reuse** rather than the
conditions.

## Findings filed and closed

**Closed (2)**

- *the share of readers who met a kind of part and read it is a real question,
  and the honest version of it needs the door* (10 Oct, this lane) — built, with
  the one change to the filed shape named in the entry.
- *a test meant to say which silence set brought which condition was comparing
  each set against every other one* (11 Oct, this lane) — fixed in the same unit
  that would have tripped it.

**Filed (2)**

- **`Loom portal`** — *a kind of part now has two shares, they can differ by an
  order of magnitude, and only one of them is about readers.* The two readings
  pair on `kindKeyOf`; the row is *reached in 2 of 9 places · read by 93% of the
  readers who met it*, and the words **places** and **readers** are
  load-bearing. With the one state to refuse to draw and the two figures that
  are not headcounts.
- **`Loom primitives`** — *the missing role declaration now costs a weighted
  share as well as a census, a comparison, a standing and a funnel answer.* The
  fifth consumer. What is new is that the figure is a share of readers rather
  than a count of parts, so the only row that can answer *of the readers who met
  a heading, what share read it* is the row for everything whose type said
  nothing.

## Test numbers, which are real

`pnpm install && pnpm verify` — **green**, exit 0.

| | |
| --- | --- |
| Runtime | **203 files, 4,601 tests, all passing** (up 34 from the §23 commit on this branch, 64 from `main`) |
| App | **421 files, 7,812 tests, all passing** |
| `src/signals/` alone | 32 files, **855 tests** |
| Prerender | 132 pages, 1,756 junctions, 0 run together; 3 metadata conventions, 0 unserved |
| Findings | **1,118 findings, 0 malformed** |

**Two things failed on the way and both were mine.**

1. Three fixtures in the new suite asserted the wrong thing rather than the
   module being wrong: a `heading` role row with a placement in it because the
   page I built had a `loom.section` and the declaration under test made sections
   headings; and two `mostMissed` cases where the fixture did not actually
   separate *worst rate* from *worst problem* — the aside missing 999 readers
   really is the most missed, so the test was asserting a ranking rule it had not
   set up. Rebuilt as two pages, one with a thousand readers and one with three,
   which is the case the rule is for.
2. `pnpm verify` went red on `src/documentation.test.ts`: one field comment read
   *"for 0229's reason"*, and the possessive form is not a parenthetical citation
   the check can lift out, so a record number was part of a published sentence.
   Rewritten as prose with the citation in parentheses. This is the maintainer's
   own rule about the API reference and the check was right.

Nothing was skipped and no test was weakened. The §17 mapping test was changed
and the change is strictly stronger; the reasoning is above and in a finding.

## Browser byte cost

**Nothing was added that runs in a browser**, measured rather than assumed.
`src/signals/broadcast.ts` bundled with esbuild (minified, ESM, browser) from a
clean `git archive` of `origin/main` and from this tree:

| | `origin/main` | this branch |
| --- | --- | --- |
| minified | **6,477 bytes** | **6,477 bytes** |
| gzipped | **2,935 bytes** | **2,935 bytes** |

`cmp` reports the two bundles byte-identical. Gzipped with `gzip -9 -n -c`, per
the note about the file name landing in the header.

## The double count, five shapes, all covered

0158's rule is that counting a window and forgetting it are one operation, so
every count here is tested against the case where it would double.

1. **One reading handed in twice** — dropped, counted in `duplicated`, and the
   kind's whole row asserted equal to the single-reading row.
2. **One door row handed in twice** — ignored, counted in `duplicatedRows`,
   `arrivals` not doubled and the share not halved.
3. **Two revisions of one tree** — two pages with two doors, kept apart from the
   duplicate case.
4. **One page bearing three places of one kind** — its readers counted three
   times in that kind's denominator, which is what the unit means, and **once**
   in the reading's `arrivals`. Both asserted in one test, because the two
   numbers look like each other.
5. **A kind standing inside itself** — counted at both depths, which is what a
   placement is, tested as the thing it is rather than guarded against.

Plus the two that are not double counts and read like them: a share above 1 is
asserted to occur **exactly** where a placement reports more reach than its page
had appearances, over every row of three comparisons; and a door row for a page
that was not handed in is ignored without being counted as a duplicate.

## Open questions

Nothing blocking. One thing for the maintainer, with a recommendation, in the
pull request comment.

## Not built, and deliberately

- **A deployment-wide share across kinds.** Refused with its reason in 0256: its
  denominator counts a page once per element node.
- **Signal-to-intent derivation** — the framework lane's, and still out of scope
  for everyone.
- **Per-reader identity** — parked since 30 September; nothing was built and no
  record argues for it. Nothing in this unit makes it more expensive to add
  later: the reading takes `PageReading`s and door rows, both of which are
  per-deployment aggregates, and the unit it publishes is *(page view, place)*
  with no identity in it. If an opt-in identified batch ever lands, a share of
  distinct readers rather than of page views would be a new figure beside these
  and not a correction to them.

## Working beside the framework lane

I read the open pull requests before starting. **Nothing open touches the signal
path**: #575 is `src/runtime/`, #577 and #548 are `src/primitives/`, #573 is the
portal, #574 the demo, #572 lessons, and #566 is the framework lane's and is
parked on three strings of portal copy — nothing in this branch touches that file
or `src/runtime/`. `#576` is this lane's own and is what I pushed onto, per
procedure step 3.

The generated API reference moved — eight new exports — and was regenerated with
`pnpm --filter @loom/app docs:api` rather than hand-resolved. `decisions/README.md`
was regenerated with `pnpm decisions:index`. `FINDINGS.md` was appended to and
nothing in it was reflowed.
