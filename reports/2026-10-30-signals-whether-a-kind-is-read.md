# Reader signals — whether a kind of part is read, and not merely reached

**30 October 2026 (evening)** · `Loom signals` · branch
`signals-64-whether-a-kind-is-read` · §64 of
[`docs/signals.md`](../docs/signals.md) · record
[0325](../decisions/0325-a-kinds-pace-is-a-pooled-ratio-over-its-outermost-placements-and-an-unscaled-page-is-kept.md)

## Before anything was built

**One open pull request, and no maintainer comment anywhere.**

- **#706** — `0308` as `Proposed — architectural, needs review`, open since
  24 October and skipped by the merge routine for the reason it exists. **Six
  days old.** Its only non-bot comment is the merge routine's own summary, so
  nothing outranked the queue.
- #724 and #725, this lane's two from last night and this morning, both merged.
  `main` is at `482081a` and this branch is cut from it.

**`Loom daily build` has no branch open**, so nothing was racing the signal
path. The record is **0325**: `main` holds up to `0324` and `0308` is claimed on
#706's branch, which `0097` reports as a hole rather than failing on.

**Nineteen open findings owned by this lane were read first and none of them was
the work.** Most are limits written down with a recommendation to leave them,
and two — the §62 and §63 discoverability gaps — are revisited below rather than
taken, because this run made them a third of the same thing. So the queue fell
through to the plan, and the plan's first item chose this: *the interpretation
layer — which roles readers engage with and which they skip*.

## What I completed

**`libraryPaceOf`** — `src/signals/library-pace.ts`, 30 tests in
`library-pace.test.ts`, exported from `src/signals/index.ts`, with
`KindPaceSilence` registered as the twenty-first silence vocabulary and
`atDoorScale` published from `door.ts`.

### What was missing, which was not a bug

Five readings stand on one list of `PageReading`s and answer five questions
about one primitive type: the **places** it stands and how many were reached
(0257), the share of the **readers** who met those places that read it (0256),
the share of those that acted inside it (0265), and what a change did to two of
them.

**Every one of them is about reach.** A part counts as reached when half of it
stood half a viewport up the screen, which is a fact about scrolling and not
about a reader. A page's own reading has answered the next question per part
since 0230 — *did anybody have time to read what it says* — and asked of a kind
it was unaskable, for the reason every library question was before the join that
answered it: a type's placements are scattered across forty readings and nothing
added them up.

Nothing is collected to answer it. No payload, no browser change, no counter
that does not exist, no column and no byte on any wire.

### What it answers now

*Do the readers who meet your testimonial band have time for what it says,
anywhere it stands?* — and the same question of a role, and of every type at
once in the order of the reading time their readers are short of.

## Decisions I took that were not specified

**A pooled ratio and never a mean of ratios.** The figure is `Σ dwellMs ÷ Σ
(readers × wordsWithin × msPerWord)`, which comes to a mean of the
per-placement paces weighted by the words each placement put in front of
readers. A plain mean lets a caption two readers hurried past drown a band four
hundred of them did; weighting by words passed is 0221's ranking rule stated as
an average, and it is the quantity `pace.ts` already orders a page's parts by.

**The straddle correction is in the readers and nowhere else**, and it is read
off each page's own row rather than taken as an argument. A page view a rollup
counted twice carries one page view's seconds, so the numerator needs no
correction at all — the whole of it divides out of the denominator, which is the
same cancellation 0229 relies on one level down. That is also why this reading
takes the door rows where a page's reading takes an `inflation` number: one
scalar over forty pages would be a correction nobody measured (0250).

**A page the door cannot scale is kept, where a share of readers refuses it.**
This is the deliberate divergence from 0256 and the judgement I most expect to
be argued with. A share of readers must withhold, because a weighted mean over
the pages that could be priced has a denominator nobody named and no safe
direction. A pace has one: leaving the correction off makes the readers more
numerous, the denominator bigger and the pace lower — towards `skimmed`, which
is the verdict 0230 was built to be able to defend. So the page is kept, the row
says how many of its readers came from such a page, and the reading names the
pages in the vocabulary whose subject is a page.

**The outermost placement of a kind on a page stands for the ones inside it.** A
part is judged against its subtree's words, so a kind's figures nest wherever it
stands inside itself. A stack inside a stack would be counted twice — and the
role row for parts that declare none is nearly every part of nearly every page,
so without a rule it would count one page's words once per level of its tree.
The inner placement goes to `nested` and is in no term.

**No pace over the whole library**, because two *different* kinds nest in each
other wherever a band holds a paragraph. `dwellMs`, `needMs` and `shortMs` all
nest across rows and nothing adds them.

**The page root is kept in the rows and out of `mostSkimmed`**, which is 0230's
own rule at the other scale: its pace is the sentence a screen opens with, and
by words it would win every ranking it was entered in.

**`atDoorScale` is published from `door.ts`**, which is the one change outside
the new unit. See the finding below: the module that exists to hold that rule
once held half of it, and the other half was five hand-written copies across
three modules. A sixth was the alternative.

## Records added

- [**0325**](../decisions/0325-a-kinds-pace-is-a-pooled-ratio-over-its-outermost-placements-and-an-unscaled-page-is-kept.md)
  — *A kind's pace is a pooled ratio over its outermost placements, and an
  unscaled page is kept.* **Accepted.** It contradicts no record — the
  divergence from 0256 is a different reading reaching a different answer for a
  stated reason, not a reversal of that one — adds no field to the tree schema
  or the delta model, and needs no built code migrated. Six alternatives
  recorded, including the mean of ratios, withholding on an unscaled page,
  counting the nested placements, and shipping a places census first the way
  reach was split from the library census.

## Findings filed and closed

**Filed, closed on filing** — *three library readings spelled the door's
per-placement scaling out, and the module that exists to hold that rule held
only half of it.* `door.ts` published `PageDoor` and `doorOf` — the per-page
half — and `count × counted ÷ appearances` stayed written out five times across
three modules. Every copy agreed, including the detail that makes them agree:
the multiplication before the division, because the three floats agree to
fifteen places in the other order and not to sixteen. All five now call
`atDoorScale`, bit-identically. **The check worth keeping** is that a module
whose stated purpose is to hold a rule once can hold half of it for a month with
every test green, and grepping for a rule's *arithmetic* rather than its name
finds it in a minute.

**Filed, open** — *a third reading now hangs off the window assembly without
being in it, and the pattern is no longer one gap.* `regionPagesOf` (§62),
`silenceCensusOf` (§63) and now `libraryPaceOf`. Each was filed alone with a
recommendation to leave it; three makes it a shape. What they have in common is
not that the assembly forgot them — the assembly produces subjects and
deliberately produces no figures, and all three are figures. **What is missing
is a second rung**: something that takes an assembly and produces the readings
over it. That is a real unit and not a small one, because the honest version
decides which of the thirty-odd readings a deployment gets by default.
**Recommendation: still leave it — but a future run should take all three at
once rather than any of them individually.**

**Filed, open** — *the role rows of a library's pace are thinner than every
other role figure, and the reason is the nesting rule rather than the registry.*
With no role declared, every part of a page is one kind, so the `null` row holds
the page root and `nested` holds the rest. It is the only honest answer
available, and it means that row says something different from the `null` row of
the other five library readings. **Recommendation: leave it and do not
special-case the key.**

## Test numbers

