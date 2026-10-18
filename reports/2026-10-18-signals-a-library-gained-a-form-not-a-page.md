# Reader signals — a library gained a form, not a page

**Routine:** `Loom signals` · **Date:** 2026-10-18 (evening run) · **Branch:**
`signals-39-a-library-gained-a-form-not-a-page` · **Section:** §39 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

The open finding at the top of my queue asked for one thing and the files asked
for another. **I did not build what the finding asked for, and the reason is the
whole of this unit.**

### What the finding asked for

This morning's run shipped 0294 — a comparison whose two sides prove two
populations is refused — and applied it to six of the ten comparisons that take
a pair from a caller. The four library comparisons were left out because #668
held those files, and the finding filed with it said what they needed: a
`different-audiences` member in each silence vocabulary, and probably a refusal
of a **mixed** window before a mismatched pair, since a library window is a set
of readings rather than one.

#668 has merged. I opened the four files, and the proposal does not survive
reading them.

### Why not, which is clause 1 of the record

The thing the finding was written before is **0293**, which landed the same day:
all four comparisons now pair their pages by **form** — a tree and an audience,
no revision — rather than by the tree. A form therefore meets only the identical
form in the other window. So in all four readings:

- every placement held still is one form's measured against its own;
- every kind row's two shares have, by construction, the same set of places
  under them;
- **no figure anywhere has a denominator that spans two audiences.**

The fault 0294 exists to refuse — *the readership was varied by construction and
the sentence over the figures says the change did it* — **cannot be constructed
through these four entry points.** A caller handing `was` of `aud_free` and `now`
of `aud_pro` does not get a plausible wrong number. It gets every form unpaired,
every kind `unpaired` or `unplaced`, every movement `unknown`, and `pages` of
nought. Degenerate rather than misleading, and the rows already say so.

Adding a vocabulary member for that would be dead code wearing a silence's
clothes.

**The second half of the proposal is the costlier mistake.** Refusing a mixed
window would withhold the library comparison from exactly the deployments 0263
was built for: after 0263 a deployment serving two audiences has a mixed window
for *every* library comparison it ever takes. `pageReadingOf`'s `audiences-mixed`
refusal is not the precedent it looks like — that one refuses because summing two
forms' node counters is one number about two pages, and a library comparison
never sums across forms inside a placement.

### What was actually wrong in those files, and it is a number a deployment acts on

`pagesGained` is documented as *pages read in the later window only, which is
trees and not revisions*. **After 0293 it is forms**, and three of the four
still said trees. A deployment that began serving `aud_pro` on five pages it
already served reads:

> your library gained 5 pages

It published nothing. The same figure also means *five pages were published*, and
nothing in the output told the two apart — while the fact that separates them,
the tree behind each form, was already in hand on both sides of the comparison.

### What shipped

On all four library comparisons (`library-change`, `library-copy-change`,
`library-reach-change`, `library-word-reach-change`):

- **`formsGained`** — of `pagesGained`, the forms whose page the earlier window
  already held in another form. **`formsLost`** is its mirror. So
  `pagesGained − formsGained` is pages published and `pagesLost − formsLost` is
  pages that left the library: two sentences out of one subtraction, neither
  guessed at.
- **`audiences: ComparedPopulations`** — `{ was, now }`, each a stable-ordered
  set, because a window holds every form a deployment served. Published and
  never refused. Deliberately **not** `ComparedAudiences`, which is one audience
  per side and is what a refusal keys on; conflating the two is how a refusal
  would leak in.
- **Three stale doc comments corrected** — `pages`, `pagesGained` and
  `pagesLost` now say forms, which is what they have counted since 0293.

In [`audiences.ts`](../src/signals/audiences.ts), beside the two key rules:
**`audiencesOf`** (the audiences a set of forms names) and **`pagesOf`** (the
pages behind them, which two forms of one share), plus the
`ComparedPopulations` type. Published once rather than spelled four times, for
the reason `readingKeyOf` and `formKeyOf` are.

In `PairedWindow`, which all four already share: **`audiences`** and
**`pagesHeld`**, derived from the forms the pairing already built. One change
point rather than four, and it is why the four diffs are each about sixty lines.

**Nothing was added to a payload, a browser, a column, a store or the vocabulary
of kinds.** The twenty-eighth thing taken out of what this subsystem already
knows rather than collected: the tree behind each form is on both sides of every
one of these comparisons and always has been.

## Decisions I took that were not specified

**Closing a finding by answering it no.** The entry was mine, the decision in it
was taken by a run that could not open the files, and reading them reversed both
halves of it. I closed it as *answered rather than built*, with the reason in the
status line, and filed what closing it actually found as its own entry — because
the two are different facts and a reader looking for the second will not find it
under the first's title.

**`pagesHeld` includes the ambiguous forms.** A form held at two revisions is
excluded from every row and every total, but it is still a form the deployment
served — and the question `pagesHeld` answers is *does the other window hold this
page at all*, not *was it comparable*. So a page present only as an ambiguous
form on one side makes its second form on the other side a form gained rather
than a page published. It is clause 5 of the record and it has its own test.

**I did not decompose the placements the same way**, and this is the one I am
least sure of. `gained` and `lost` count **places**, and a place in a second form
is a place a reader can really reach that really was not in the other window — so
those two are true as they stand in a way `pagesGained` was not. The figure a
person misreads is the one they read as *documents I own*. It is four more
counters on four published types to separate places that are all genuinely
reachable, the fact stays derivable from the same two sets, and nobody has drawn
either number on a screen yet. Filed rather than built, with the reason.

**I kept the names `pages`, `pagesGained` and `pagesLost`.** The honest names
would be `forms*`. Rejected twice over: a breaking rename on four published types
buys no new fact, and the number a deployment wants is *pages published*, which
is the subtraction rather than either operand.

## Records added

**0295** — *a library comparison reports the populations it was taken over and
refuses none of them, and a form gained is told from a page published*, Accepted.
Eight clauses, six alternatives recorded with the reason each was rejected.

**Nothing is superseded.** 0263, 0284, 0290, 0293 and 0294 are unchanged and all
right. 0294's clauses are about a comparison whose two sides are one reading
each; these four pair inside themselves, which is what the record turns on. What
0295 changes is a **filed proposal**, and a finding is not a record.

**The number is 0295 and it was free on `main`.** The only open pull request at
the start of this run was #647 (framework, 15 October), which claims 0278 and
not this. If something lands first, nothing in the record depends on its number.

## Findings filed or closed

**Closed, one:** *the four library comparisons take their pairs the same way and
the guard was deliberately not put on them* (18 October, mine). Answered as 0295
rather than built, no on both halves, with the reason in the status line.

**Filed, three:**

1. **What closing it actually found** — a library comparison counted a second
   form begun as a page published, and three of the four documented its forms as
   trees. Closed on filing by this branch; written down because the entry above
   was looking for something else and a reader will not find this under its
   title.
2. **A place gained in a second form is counted as a place gained** — mine, open.
   The symmetrical half left undone on purpose, with why, and with what would
   close it (counters and tests, not a decision). The honest reason it is open
   rather than settled: nobody has drawn either number on a screen, so which
   confusion actually bites is not known.
3. **No screen reads the two new numbers** — `Loom portal`'s. Three sentences a
   card can now print where it could print one, and the note that **nothing here
   is refused** — unlike 0294's surface gap, there is no `different-audiences`
   state to draw on these four and a surface that drew one would be inventing a
   fault.

## Test numbers

`pnpm verify` **green, exit 0.**

- **5,421 runtime tests across 233 files** (`src/` and `tools/`)
- **5,986 app tests across 338 files** (`apps/loom/`)
- `findings:check`: 1,251 findings, 0 malformed
- `reports:check`: 1,896 visuals, 132.6MB, none over 1.1MB
- `prerender:check`: 133 prerendered pages, 1,844 text junctions, 0 run together

**30 new tests**, across five files:

| file | before | after |
| --- | --- | --- |
| `library-change.test.ts` | 29 | **37** |
| `library-copy-change.test.ts` | 33 | **39** |
| `library-reach-change.test.ts` | 30 | **35** |
| `library-word-reach-change.test.ts` | 25 | **30** |
| `audiences.test.ts` | 25 | **31** |

Each of the four comparisons is asserted from the same five directions: a
second form begun is a form gained and not a page published; a page published is
a page gained and not a form begun; a form withdrawn is told from a page that
left the library, over **two** trees so that neither side's set can stand in for
the other's; a form handed in twice is counted once; and the audiences are named
on both sides with nothing refused for holding two.

`library-change` carries three beyond those — both things happening in one
window, a page held only in an ambiguous form, and a window whose forms named no
audience at all — and `library-copy-change` carries the last of those three as
well. The six in `audiences.test.ts` are on the two published rules themselves:
`audiencesOf` deduplicating, excluding a form that named none, and answering
`[]`; `pagesOf` counting two forms of one page as one page, a form handed in
twice as one page, and a form naming no audience as the page it is of.

### Planted mutations, each caught

| mutation | caught by |
| --- | --- |
| `formsGained` never increments | 10 tests across 4 files |
| `formsGained` counts every gained form, so a page published reads as a form begun | 5 tests, one in each comparison's suite |
| `formsLost` reads its own side's `pagesHeld` instead of the other side's | 4 tests |
| the two `audiences` sides swapped | 4 tests |
| `pagesHeld` built from the ambiguous forms rather than from every form | 13 tests |
| `audiencesOf` leaves its set unsorted | 5 tests |
| `audiencesOf` counts a form that named no audience as an audience | 4 tests |


### What the mutations caught in my own tests first

**The three parallel `formsLost` fixtures were built on one tree and could not
tell the two sides apart.** `library-change`'s own version used two trees and
caught the mutation that reads `earlier.pagesHeld` where it should read
`later.pagesHeld`; the three I wrote beside it did not, because with a single
tree in both windows both sides' `pagesHeld` hold it and the mutant answers the
same number. One mutation, **one** failing test, three suites quietly passing a
wrong implementation. All three now use two trees and assert the subtraction, and
the mutation goes from 1 failure to 4.

That is the second run in a row where a planted mutation found a hole in the
tests before it found anything in the code, and both times the hole was the same
shape: a fixture simple enough that the thing under test could not be wrong on
it.

### The thing that failed, and I could not fix it where it belongs

**The first `pnpm verify` of this unit failed in the docs app**, on the bug my
own lane filed this morning and predicted would fire again:

> a decision number reached the page: expected [ "LibraryCopyChange's
> signature", "LibraryWordReachChange's signature" ] to deeply equal []

The numbers it found were `(0147)` and `(0266)` — two citations in two comments
written by earlier runs, correctly parenthesised, and clean in every generation
before this one. `extractOf` cuts a signature at 6,000 characters of *uncleaned*
source and only then lifts citations out of comments, so a cut landing
mid-comment leaves an opening `/**` with no `*/`, the comment pattern stops
matching it, and the number survives into the page.

**The new fact, and it is why the morning's workaround was not available.** That
one worked because one declaration could be brought back under the cap. These
cannot be. The four declarations are **8,559, 7,219, 6,814 and 6,382 characters**
against a 6,000 cap, and three of the four were already over it on `main`.
Shortening a comment does not bring them under — **it moves the cut**, and
whether the new cut lands inside a comment holding a number is luck. The long
version of my doc comments lost that coin flip twice; the short version won it
four times; neither is more correct than the other.

**So the exposure is the number of truncated published signatures, and it is
fourteen**, across at least six lanes. Every one fails the day somebody shifts
its cut into a cited comment, and the assertion names the type rather than the
member, so the first minutes of reading it go looking for a citation nobody
added.

**What I did, and it is a workaround and not a fix.** `extract.ts` is
`Loom docs`' file and the brief files cross-lane work rather than doing it, so I
did not take the three-line reorder that would end this. I rewrote my six new
member doc comments as one-liners with the argument in 0295 — which is better
reference prose on its own terms, is where `firstParagraph`'s own doc comment
says the reasoning belongs, and **does nothing about the bug**. The existing
finding is sharpened with today's measurements and the fourteen types, and it
stays open and stays `Loom docs`'.

**That is the one open question on this pull request**, and it is below.

### Nothing was skipped and nothing was weakened

Two existing shape assertions moved, both `Object.keys(change).sort()` lists,
both gaining the same three members (`audiences`, `formsGained`, `formsLost`):
`library-change.test.ts` to 20 keys and `library-reach-change.test.ts` to 23.
No assertion was removed, relaxed or retargeted.

## Browser cost

**Nothing.** `src/signals/broadcast.ts` is byte-identical to `origin/main` — an
empty `git diff` — and nothing this unit touched is in the import graph
`browser-weight.test.ts` walks. Measured anyway, because the rule is to measure
rather than to reason: bundled and minified with esbuild it is **6,477 bytes**,
**2,941 gzipped**. Unchanged from this morning's run to the byte.

## Preview

https://loom-git-signals-39-a-librar-e58fb1-jpizzolato36-6341s-projects.vercel.app

Nothing to look at on it. This unit is server-side arithmetic with no surface;
the portal screens that would read these counters are `Loom portal`'s and are
filed.

## Open questions

**Two, and the first is a governance question rather than a design one.**

**1. Who fixes `extract.ts`, and does this lane wait for them?** The truncation
bug has now blocked this lane twice in one day. This morning it was worked around
in the source; this evening the source could not be worked around and what
cleared it was luck about where a cut landed. The fix is three lines in a file
`Loom docs` owns, and the brief tells me to file cross-lane work rather than do
it, so I filed it. **My recommendation is that `Loom docs` takes it as its next
unit**, because fourteen published types across six lanes are one text edit away
from the same failure and the failure names the wrong thing. If the maintainer
would rather a blocked lane fix a defect in the file that blocks it, say so and
I will take it next run — but that is a change to the lane rule and not mine to
make.

**2. The placements, which is the judgement call.** I did not decompose `gained`
and `lost` into places-in-a-form-begun the way I decomposed the page counts.
**My recommendation is to leave it** until a screen says it needs it: those two
are true as they stand, the fact stays derivable from the two sets 0295 already
publishes, and it is counters and tests rather than a decision. It is filed
either way.

## Beside the framework lane

`Loom daily build` has **no branch open on the signal path**, and no branch open
at all from today. The only open pull request at the start of this run was
**#647** (framework, *the ordering a listing could have*, 15 October), last
touched three days ago. Its diff does not reach `src/signals/`.

Everything this morning's report named as open — #666, #667, #668 — has merged.
In particular **#668 merged as 0293**, which is what made this unit possible and
is also what made the finding it closes wrong: the finding was written against a
`main` that did not yet pair by form.

That is worth writing down on its own. **A finding filed against a file another
branch is rewriting is a finding filed against a file that no longer exists.**
This one asked for a guard that the merge made unnecessary, and it would have
been built as asked by any run that trusted the queue over the code. The entry's
own instruction — *nothing about them makes the guard wrong or different* — was
true when it was written and false eight hours later.

## The door this lane is keeping cheap

Per the standing instruction to say when a design choice would make the parked
per-reader identity work expensive later: **this one does not touch it.**

A `PageForm` here is a tree and an `aud_` and nothing else; `pagesOf` returns a
set of tree ids; `audiencesOf` returns names the host chose for predicates Loom
never sees. Nothing keys on a reader, nothing persists, nothing new reaches a
payload or a browser, and `[]` stays *nothing here named one* rather than
defaulting to `aud_everyone`. If a consented per-reader id ever arrives behind a
gate and a record, nothing in 0295 would need unpicking: a library comparison
would still be of whatever populations its two windows held, and it would still
say so rather than refuse.
