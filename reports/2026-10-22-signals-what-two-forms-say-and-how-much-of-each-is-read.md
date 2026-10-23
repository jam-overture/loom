# 22 October 2026 (evening) — what two forms of a page *say*, and the third different answer about the page as a whole

**Routine:** `Loom signals` · **Branch:** `signals-48-what-two-forms-say-and-how-much-of-each-is-read`
(#697) · **Section:** §48

## Before anything was built

**One pull request open**, #694 — the maintainer's own, sign-up, sign-in and
password reset. It touches nothing under `src/signals/` or
`apps/loom/app/_lib/reader-signals/`, so there was nothing to race and nothing
to say about the framework lane: it has no branch open at all. Last night's #693
has merged, and `main` is at `2cfd93d` with 0304 on it.

**No maintainer comment anywhere**, on #694 or anywhere else, and no review
comment of any kind. So nothing outranked the queue and the queue picked the
work: the one open finding this lane owns that something was waiting on — *the
words half stays open*, filed on 21 October and left open through two runs by
the order those findings set.

Branched fresh off `origin/main`. Nothing was merged in and there was no
conflict anywhere in the run.

## The plain version

A deployment serving two audiences serves two forms of one page: one tree, one
revision, two sets of deltas (0263). Since 0302 it has been able to ask *do
these two readerships reach the same parts*, and since 0303 *do they do the same
things inside them*. The question left was the one the deltas answer most
directly: **what does each form actually say, and of the words both forms say,
which readership reads more of them.**

*The pro form says four hundred words in this band and the free form says
ninety, and the words both of them say are read twice as far by the riders.*
That sentence is now one function call.

## The unit, and why the filing entry was wrong about it being nothing

The finding said this reading cost its figure over `PartReading.copy` and its
own silences and that **nothing about it was a decision**. Two things were, and
both would have been settled wrongly inside a pull request.

**Its two siblings compare every shared part. This one cannot.** A part is the
same part in both forms whatever the deltas did to it, which is why reach and
action compare all of them. Words are not: two forms' text differs by
construction, so a band the deltas reworded is two pieces of text with two word
counts, and a word-weighted figure over it would be comparing two populations
and two passages at once.

So the comparable unit is the passage both forms say **the same way** — the
*carried* text of `copyChangeOf` with the tree held still and the readership
varied instead of the other way round. Everything else is reported rather than
compared, and that half of the answer needs no counter at all:

- **`reworded`** — every shared node the two forms word differently, with both
  word counts, both sides' standings and reaches, and `wordier`: the form that
  says more. No gap, because a word-weighted figure needs one word count and
  there are two.
- **`onlyIn`** — every passage exactly one form has, with that form named and
  its own window's reading of it.
- **`says`** — the census: `shared`, `only` per form, `onlyByStanding` per form,
  `reworded` per form. Each form's three add to the words that form says, which
  the suite asserts rather than the prose.

There is deliberately no `added` and no `removed`. Neither form is earlier, and
one audience's extra band is not a band anybody wrote last.

## The direction of the figure is not read off the figure

`gap` is `words × |one.reach − other.reach|`, unsigned, with the form in
`favours` — the shape both siblings use. The departure is which field the
direction comes from, and it is about floors rather than about readers.

A type that declares no `copy` leaves a passage short of words nothing can see
(0122). The same understatement is on **both** sides of a shared passage, so it
scales the gap toward nought and can report nought where the hidden words
differ. The two reaches are exact whatever a library has declared. So:

| field | survives a floor |
| --- | --- |
| `favours` — which form's readers get more of it | **yes**, it is read off two exact reaches |
| `gap` — how much more, in words | no, it is a floor on the true gap |
| `typical` — the page's two means | no, and it is withheld |

A passage hiding all of its words therefore has a gap of nought and a direction
that is still a measurement, and the census row follows the direction rather
than the magnitude: it is filed under the form it favours and not under `alike`.
Reading `favours` off the gap, as both siblings do, would have published *these
two forms read this band alike* about a band whose words nobody has declared.

## The page figure, which is the third different argument in three readings

The finding that filed this reading predicted this and it turned out exactly
so. Three readings of one pair of forms, three answers about the page:

| reading | the page as a whole |
| --- | --- |
| reach (0302) | **refused** — a mean over parts counts one reader once per part they got through, and two forms have two sets of parts |
| what readers did (0303) | **one row** — every action is strictly inside the root, so the root's own row is one division per side |
| what the forms say (0305) | **a sum over words** — a passage's words are its own, so they partition the page exactly once and no reader is counted twice |

`typical` is each side's `Σ(readers × words) ÷ views` over the shared passages
both windows can speak for. One set of passages, so the two means are of the
same words.

**And the trap it carries, which is the part of this unit a screen is most
likely to get wrong: the page's gap is not the sum of the rows' gaps.** Every
row's gap is unsigned, so two passages favouring opposite forms add in the sum
and cancel in the difference of the means. The fixture has one of each and the
two figures are **twelve and four**. A card that summed the rows and called it
the page would be reporting *how far apart the two forms are read, passage by
passage* and labelling it *how much of the shared page each form's reader gets
to*. There is a test whose only job is that pair of numbers.

## Decisions I took that were not specified

- **A record, where the finding said none was needed.** The two above are
  decisions about what is comparable and what a direction is read off, and both
  are expensive to reverse once a screen draws them. 0305.
- **`favours` off the reaches rather than off the gap.** The alternative is
  simpler and is wrong on exactly the pages a half-declared library produces,
  which is every library on the way to 0223.
- **The gap is published on a floored passage rather than withheld.** The same
  words are on both sides, so a floor cannot move the gap to the wrong form:
  *at least this far apart* is a safe claim. It is the page means a floor can
  turn around, and those are withheld.
- **`wordier` is published rather than left to a surface to subtract.** It is
  the sentence the reading was asked for, and a figure a screen derives is a
  figure two screens derive differently (0287's reason for publishing `spoken`).
- **`passageSideOf` is published from `copy-change.ts`** rather than copied into
  the new module, which is 0303's `formPairOf` move one level down: two
  comparisons now project a window's reading of a passage.
- **No new closed set.** The four ways a shared passage can fall are the keys of
  `counted` and `wordsCounted`, and nothing has needed to name one. A
  `PassageFall` set would have been a published vocabulary with no caller.
- **I numbered the record 0305.** `main` carries up to 0304 and no open branch
  claims a number, so it was next free.
- **Two stale counts in `silences.ts` corrected while I was in it.** Its module
  paragraph said there were *seventeen* sets of silences and its condition
  vocabulary said *fifteen conditions against eighty-four members across the
  seventeen sets*. With this set the true figures are **twenty sets, 114 members
  and 18 conditions**, and the first of those sentences is published to the API
  reference. The same two numbers were stale in `docs/signals.md`'s table and
  are corrected there too.

## Real test numbers

`pnpm install && pnpm verify` — **green**, exit 0 through every stage: build,
typecheck, the root suite, `findings:check`, `reports:check`, the app's own
verify and `prerender:check`. Nothing skipped, nothing weakened.

| suite | files | tests |
| --- | --- | --- |
| root (`vitest run`) | 236 | **5,634** |
| the app's own | 349 | **6,209** |
| `src/signals/` alone | 45 | **1,503** |
| `form-copy.test.ts` alone | 1 | **41** |

`silences.test.ts` went 55 → 55 with one row added to each of its three tables
and one entry added to its subject list; `copy-change.test.ts` passed
**untouched**, which is the assertion that publishing `passageSideOf` changed no
answer.

**Two reds on the way and both were mine.** The subject table
(`SILENCE_VOCABULARIES.map(...)`) is a positional literal, so the twentieth
vocabulary needed its `"comparison"` added by hand — caught by the test written
for exactly that. And `tools/decisions/decisions.test.ts` caught two decision
links in the new module's own documentation whose **slugs I had guessed**:
0122 and 0242 are cited by a title close to the real one and not by it. Worth
writing down as this lane's rule for the next run, because guessing a slug is
quicker than looking one up and reads identically in a diff: **a record link is
copied from `ls decisions/`, never typed from the record's subject.**

### The planted mutations

Six, each reverted after measuring, over `form-copy.test.ts` (41 tests).

| what I broke in `form-copy.ts` | tests that failed |
| --- | --- |
| compared a reworded passage as though both forms said the same words | **13** |
| dropped the `spokenFor` half of the gap guard | **4** |
| read `favours` off the gap instead of the two reaches | **2** |
| published the page figures under a floor | **2** |
| made the page's gap the sum of the rows' gaps | **2** |
| counted a passage nothing can speak for as a passage nobody read | **2** |

No survivors. The first two rows measured 1 each before I split two tests that
were each asserting two published fields in one `it` — the floored passage's
direction and its census row, and the two ways a passage can fail to belong in
the unseen list. Both splits are the lane's own standard of 21 October (a
disjunction in a guard needs a case each) applied to an assertion rather than to
a guard.

Row one is the double-counting-shaped case the standards ask for by name: a
rewording let into the shared set is the same words counted twice with two
different counts, and thirteen tests say so.

The silence ordering claims are three, each reachable by a single pair and each
with its own fixture: `wordless` before an empty window, `unshared` before
`unspoken` (which it implies), and `unspoken` before `floored`. No ordering is
claimed that one input cannot reach.

## Nothing reaches a reader

No payload field, no browser code, no column, no store, no new kind and no new
member of any closed set the browser can see. `broadcast.ts` is
**byte-identical to `origin/main`** and measures **6,513 bytes** minified
(esbuild, bundled, browser platform, ESM) — the same figure as last night, since
nothing in its import graph moved. Rule 4's budget is untouched and
`browser-weight.test.ts` passes.

This is the thirty-sixth thing taken out of what this subsystem already knows
rather than collected.

**Nothing here makes per-reader identity dearer to add later**, and one thing
about it is worth stating: every figure in this reading is a distinct-view count
filed against a node and a word count read off a tree. An opt-in identified
window would be read by this same function with no change, because the reading
never asks who a reader is — only how many views reported a passage and how many
words it says.

## Findings

Two closed, two filed.

- **closed:** *the words half of the form comparison is still a mirror* — the
  open half of 21 October's entry, closed with the two things in it that were
  decisions after all written down, because the filing entry said there were
  none and that is the useful correction.
- **closed on filing, this lane:** *a decision link whose slug is guessed from
  the record's subject reads identically in a diff to one that resolves.* Two of
  the new module's eleven citations, caught by `decisions.test.ts` and nowhere
  else. Filed rather than fixed quietly because the rule it leaves behind is
  worth having: the number may be typed, the slug is copied.
- **filed, `Loom portal`:** *three form comparisons are built and no screen
  draws any of them.* It names what a screen already has — two ordered sides, a
  four-way census over one set, a `sharpest` row, a sentence per silence and a
  condition-and-subject mapping — and the one drawing decision that is this
  reading's own: under a floor the page figures are absent while every row still
  carries a gap and a direction, so a card cannot draw an empty headline over
  full rows without saying why.

- **filed, `@jonathanbravecredit`:** *an eleventh counted reading of the
  mangling.* The first body of #697 carried three `blob/` links and **all three
  came back mangled**, at 151, 178 and 214 characters. Two sentences of the open
  hypothesis do not survive it: a 151 mangled where 152 is on record as clean,
  so the bracket is not a threshold, and the quote-run count went four at 178
  and three at 214, which is the wrong way round. One run also engulfed the
  link's text and the comma after it, so whatever does this wraps a span rather
  than a URL. Body corrected in the same turn with plain paths; this lane's rule
  is now no `blob/` link in a pull request body at all.

## Open questions

Three, each with a recommendation, none blocking. They are in the pull request
comment. The one that has now been open three runs is the one with the most
built behind it: **nothing draws any of this**, and the routine that would is
paused.

## What the merge has to deal with

One branch, one unit. `origin/main` at `2cfd93d` was the branch's base, so
nothing was merged in and there was no conflict anywhere in the run.
`decisions/README.md` and the generated API reference were regenerated rather
than hand-resolved. `FINDINGS.md` was appended to and never reflowed.

Preview:
<https://loom-git-signals-48-what-two-fa2361-jpizzolato36-6341s-projects.vercel.app>
— the branch alias, which stays the same across pushes; Vercel's own comment on
#697 carries the per-deployment link. Nothing in this unit draws a screen, so it
is the branch deployed rather than something to look at. The egress policy for
this session refuses that host, so the URL is quoted from Vercel's comment on
#697 rather than checked from here.
