# Reader signals — a word nothing can be said about

**Routine:** `Loom signals` · **Date:** 2026-10-15 (morning run) · **Branch:**
`signals-32-a-word-nothing-can-be-said-about-is-in-no-mass` · **Section:** §32 of
[`docs/signals.md`](../docs/signals.md)

## What I completed

The open finding this lane filed yesterday evening, taken as its own unit over
both of the page-scale figures it names:
[0281](../decisions/0281-a-word-nothing-can-be-said-about-is-in-no-mass-and-a-page-that-reports-no-reach-has-no-mean.md).

A part of a page has three standings and the third is *nothing can be said* —
either the window held no views, or **the part reported something other than
coming into view**: a press delegated to a band that no `viewed` ever named, so a
reader plainly had it in front of them and the counter that would say so is
missing (0212). Both readings of a page's words keep those passages out of the
lists a person acts on, and both records say why. **Neither rule reached the
figures.** Both means are `Σ(readers × words) ÷ views` reduced over every
passage, so an `unknown` passage was counted at **nought reader-words**.

It is the **twenty-second** thing taken out of what this subsystem already knows
rather than collected, and the first of them that is a published figure
corrected rather than a new one added. **Nothing was added to a payload, a
browser, a column, a store or the vocabulary of kinds**, and the broadcaster was
not touched.

### The number, which is why this was not just a wording fix

The finding judged both figures ceilings and the error a looser ceiling — the
safe direction for a number published as *at most* — and said nothing was lost
by waiting. **That holds at one page and is false at two windows.** Four
readers; three bands of ten, thirty and twenty words, unchanged. Two readers
reached the pricing band in the earlier window and two reach it in the later
one. In the later window the intro's row is still there and reports no reach at
all, which is what a primitive that stopped spreading its identity attributes
looks like from the counters. Nothing about the reading of that page changed:

| | published before | published now |
| --- | --- | --- |
| `typical.was` | 25 | 15 |
| `typical.now` | 15 | 15 |
| `typical.change` | **−10** | **0** |
| `mostLost` | the intro | none |

A card drawing that said *your change took ten words away from the average
reader, and the intro is where you lost them* — about the one part of the page
nothing can be said about. `typical.change` is a **difference** of two ceilings,
so a term present on one side and absent on the other is not a loose ceiling; it
is a movement nobody made, with a name attached to it.

### What changed

- **One set of carried passages, so it is the same set on both sides.** A
  passage `unknown` on **either** side is out of both masses. Dropped from the
  later mass and kept in the earlier one it would carry the error with its sign
  intact.
- **`ComparedPassage.gain` is `null` where either side is `unknown`.** It was
  already `null` where a side held no views, and the two are one refusal: a gain
  is a subtraction of two reaches, and a reach of nought that is a missing
  counter is not a reader who did not arrive. This is also what keeps 0239's
  published identity — the gains add to `typical.change` — and it is what keeps
  the passage out of `mostGained` and `mostLost`.
- **`CopyReading.typical` is unchanged in value and newly correct in
  description.** A passage is `unknown` only where its row reports no reach, so
  its term was already nought and the sum over every passage is the same number
  as the sum over the spoken-for ones. What moved is the ceiling: the figure is
  at most `read + skipped` words, not at most the page's words, and the gap is
  `wordsByStanding.unknown` — published beside it all along.
- **Two silences for one state.** `CopySilence.unspoken` and
  `CopyChangeSilence.unspoken`. Both are reachable only with views in the
  window, which is what makes them faults rather than quiet traffic, and both
  leave every census figure standing.
- **The thirteenth silence condition**, `no-reach-reported` — *its counters are
  there and not one of them reports being reached.*

## Decisions I took that were not specified

**Four, and the first is the one to disagree with if you are going to.**

**1. `Accepted` rather than `Proposed`, and nothing superseded.** This changes
the value of a published figure, which is the kind of thing that could be read
as contradicting 0239. I judged it not to be, for the reason last night's 0270
floor fix was not: 0235 §5 and 0239 both state the rule that an `unknown`
passage must not be acted on, and both state it about the lists rather than the
figures because nobody had noticed the figures were acting on it. The rule those
records state is the rule; what moved is which passages their signed figures are
read over. If you read 0239 as having *decided* to include them, this is the
record to mark `Proposed` — the code change is one `filter` and one `||` either
way.

**2. A thirteenth silence condition rather than reusing `no-view-reported`.**
The smaller change, and what 0280 does at its own scale. Refused here because
`copy`'s set already maps `unmeasured` to `no-view-reported`, so two members of
one vocabulary would report one condition and a surface could not tell *nobody
came* from *nobody is reporting* through that table — the exact failure the
table exists to prevent, in the direction that hides a fault. It also makes a
pair with `no-action-credited`: three noughts, three senders half-working in
three different ways, and a deployment handed the wrong one looks in the wrong
place.

**3. No `unspoken` field, which the finding's shape asked for.**
`wordsByStanding.unknown` and `wordsByMovement.unknown` are already exactly that
number. 0280 needed the field because its rows carry no breakdown by movement;
these two do, and a second spelling of a published figure is the thing two
screens later disagree about.

**4. The missing report outranks the missing declaration.** Where a page is both
`unspoken` and `floored`, `unspoken` is reported — because a floor is a
declaration a library has not made, and a page where nothing reports reach would
still have no mean once every `copy` prop was declared. A deployment told *some
part declares no copy* would go and fix that and get the same silence back.
`dissolved` still outranks `unspoken`, because *the change left no word as it
was* is a fact about the change.

## Records added

One: **0281**. `pnpm decisions:index` regenerated; `0277`, `0278` and `0280`
still print as holes, which is #633 and #640 holding them on open branches and
is what 0097 allows.

## Findings

**Closed:** yesterday evening's entry *a page's own word comparison counts a
passage nobody can speak for as nought reader-words, and the library figure does
not*. **It is on #640's branch and not on `main`**, so it could not be marked
closed in place — `FINDINGS.md` is union-merged and editing an entry that does
not exist here would have been a conflict rather than an append. The closure is a
new entry naming the original by date and title, which is the only
union-merge-safe shape. It also records that the original's own reading of the
cost was too kind, and why.

**Filed:** one, owned by this lane. `CopyReading.share` is `read ÷ words`, so the
same page that now withholds its mean publishes a **share of nought beside an
empty `unseen` list** — nobody read any of it, and not one word it can name.
Nought is exactly what a standing of `read` asserts and the standings are
published in the same object, so it is not a false number; the pair is incoherent
read quickly. It is one decision over `CopyReading.share`, the same share on
every `RoleCopy` row under it, and the `share` each side of a comparison carries
— three published figures and a name, which is a unit and not a line.

## Test numbers

`pnpm verify` green at exit 0. Nothing failed, nothing was skipped, and no test
was weakened to get there.

- **5,067 runtime tests across 224 files**, and **5,797 app tests across 327
  files**. `prerender:check` reads 133 pages and 1,839 text junctions, none run
  together.
- `src/signals` alone: **1,049 tests across 38 files**, all passing.
- The three files this touched went from **103 tests to 118**: `copy.test.ts`
  26 → 31, `copy-change.test.ts` 31 → 38, `silences.test.ts` 46 → 49. Measured
  both sides, by running the same three files against a stash of this branch.

**Three planted mutations, each caught**, which is what I checked before
believing the suite:

| mutation | tests that failed |
| --- | --- |
| `gainOf` ignores the `unknown` side | 3 |
| the two means go back over every carried passage | 2 |
| neither `unspoken` silence fires | 4 |

**The double-count guard this lane owes every counting unit** is the identity
0239 published: the gains add to exactly the change the reading publishes. It is
asserted on the case above, where one passage is in neither — a passage dropped
from the total while its gain stayed published would be a word counted on one
side and not the other, which is the shape of the error with the fix half
applied.

## Browser cost

**Nothing new runs in a browser.** Measured both sides from a clean `git archive`
of `origin/main` and of this branch: the broadcaster bundles to **6,477 bytes
minified, 2,935 gzipped** on both, and `cmp` reports the two minified bundles
byte-identical. `browser-weight.test.ts` still finds no package at all in the
broadcaster's import graph. The three files this touched are server-side
arithmetic over counters that already exist; `silences.ts` imports types only,
so nothing in it survives into a bundle.

## One thing fixed outside the unit

`docs/signals.md`'s summary table said the silence mapping published *the
condition and the subject behind all twenty-two names*. It has been fourteen
sets and **fifty-eight** names since before this run, and sixty since it — the
row has been quietly false for weeks, and it is in the one file this lane is
told to keep true. Counted rather than guessed: fourteen exported closed sets,
sixty members between them, which is now what the row says. The number in
`silences.ts` was right and is updated to sixty in the same commit.

## Beside the framework lane

#639 (`framework-73`) and #633 (`framework-72`) were open through this run.
Neither touches `src/signals/`, so nothing was raced. #640 is this lane's own
and still open, and it **does** touch three of the files here —
`src/signals/silences.ts`, `docs/signals.md` and `decisions/README.md` — in the
places two additions always collide. None of it is a disagreement; the merge
arithmetic is in the pull request comment so whoever lands them second does not
have to work it out.

**One thing failed on the way and is worth writing down**, because it will catch
the next run that cites a record from an open branch. The first `pnpm verify`
went red on `tools/decisions`: 0281 linked 0280 by filename, and 0280 is claimed
on #640's branch, so the link resolved to nothing and the citation check calls
that blocking. It is cited by number and not linked now, and the record says so
in the sentence where it happens.

## Open questions

Nothing blocking. Four things with a recommendation each are in the pull request
comment: whether 0281 should have been `Proposed`, the share finding above, the
thirteenth condition, and the three-way count collision with #640.

## The door this lane is keeping cheap

Nothing here touches it. Per-reader identity stays deferred and nothing in 0281
makes it more expensive to add later: the restriction is on which passages a mean
is taken over, and an identified batch would arrive with the same standings and
the same three noughts to tell apart.
