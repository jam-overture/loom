# Reader signals — the room a change made to read

**Routine:** `Loom signals` · **Run:** 8 October 2026, evening
**Branch:** `signals-15-the-room-a-change-made-to-read`
**Record:** [0244](../decisions/0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md)

## What I completed

`paceChangeOf(was, now, options)` in [`src/signals/pace-change.ts`](../src/signals/pace-change.ts) —
two windows' pace readings held against each other, so that *the band readers
used to skim is read now* has an answer.

This is §19 of [`docs/signals.md`](../docs/signals.md), and it is the gap the
other three comparisons left. §10 asks what a change did to where reading stops,
§16 what it did to how many of the page's words get reached, §13 what it did to
the funnel. **None of them asks whether readers had time** — which is the
question a rewrite is actually aimed at, because the commonest thing anybody does
to a band nobody reads is cut it.

It is the eleventh thing taken out of the server-side join rather than collected.
Nothing was added to a payload, a browser, a column, a store or the vocabulary of
kinds.

### The one thing that made it more than a port

A pace is `spentMs ÷ needMs`, so **a change can move either side of the
division**, and the two are opposite findings:

- readers stayed longer, which is a fact about the readers;
- the page asks for less, which is a fact about the change.

A single before-and-after pace reports them identically — and the one that reads
best is the one that means least, because a band halved in length comes back
`paced` with nobody having given it a second more attention. That is the
plausible-false-number failure this subsystem keeps meeting in new places, and it
would have been a new instance of it rather than a defence against one.

So both factors are published (`timeRatio`, `needRatio`, whose quotient is
`paceRatio`), and the attribution is a **counterfactual** rather than a
comparison of magnitudes:

- `ifWordsHeld` — the later window's time against the **earlier** revision's
  words. The pace this part would have had if the change had left its text alone,
  which isolates the readers.
- `ifTimeHeld` — the earlier window's time against the later revision's words,
  which isolates the change.

Each runs through the published verdict rule, and `cause` answers by sufficiency:
`words`, `time`, `either`, `together`, `unknown`. *The pricing band readers used
to skim is paced now, and it is the trim that did it rather than the readers* is
one row.

## Decisions I took that the step did not specify

**The attribution is sufficiency and not magnitude.** *Which moved more* needs a
threshold on what counts as a move, and 0230 already refused a dial for the
figures either side of this one. A counterfactual needs no number: both are in
the rows.

**A floor is taken from both sides inside a counterfactual.** Its two terms come
from two revisions, so undeclared words on either one are words missing from the
ratio — and the conservative reading leaves it `unknown` rather than claiming the
weaker verdicts. `skimmed` survives a floor on a side (0230); an attribution does
not.

**Five movements and not nine.** `eased`, `rushed`, `still-skimmed`, `held`,
`unknown`. 0230 makes `skimmed` the claim that survives every bias and
`paced`/`lingered` the weak ones, so a part moving between the two weak verdicts
would be this module's loudest row about its least reliable figure.
`still-skimmed` is kept apart from `held` because both are *the verdict did not
move* and they are opposite findings about a page.

**One costing rate and two straddle inflations**, which is also why the function
takes two `PageReading`s rather than two finished `PagePace`s. A rate is a fact
about the page's language; a straddle is a fact about one window. A caller
holding two paces costed at different rates could not be stopped, and every ratio
here would silently have been a comparison of the rates.

**No page-wide total of anything.** The figures nest, so the page's own figure is
the root compared against itself (`whole`) and `need` is the subtraction of its
two costings. The root is kept out of every ranking.

**`paceStandingOf` is now published from `pace.ts`.** The verdict rule had one
caller and now has two, and two spellings of one rule is the fault this subsystem
has been bitten by twice — the counter keys, and the word count that did not know
about slots. It is a server-side reading and is not in the broadcaster's import
graph.

## Records added

[0244](../decisions/0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md),
Accepted. Nothing is superseded: 0230 is extended at its comparison, 0239's
restriction to unchanged text is explained rather than copied (it can afford it
because it has an exact second half to report; a pace has none, so the confound
is published as the second factor instead), and 0240's mapping is extended with a
sixth set.

`pnpm decisions:index` run; `decisions/README.md` regenerated. 0244 was the next
number free on `main` at `19e0f16` — 0241 is still claimed on #548's branch, and
nothing here touches it.

## A correction, which is not an edit to a record

0240's consequences say *nine conditions over **fifteen** members*. The five sets
held **eighteen** on the day it landed (2 + 4 + 6 + 3 + 3), and with this one they
hold twenty-two. Counted with code rather than by eye.

**0240 is not edited** — its decision is unaffected and the number is prose in its
consequences. `silences.ts` and `docs/signals.md` now carry the right figure, the
plan doc marks the correction rather than making it silently, and a test holds the
half that was worth having instead: **every condition the sixth set reports was
already reported by one of the five.** That is the first evidence that the nine are
states of the world rather than a list of the names five modules happened to use —
`dissolved` here is *no part is in both revisions*, which is the same state §16
reports of words, because a page that carries no part carries no word either.

## Findings

**Filed, for `Loom portal`:** what the reading makes drawable, and the four shape
choices that would otherwise have to be reversed — `eased` is not an improvement,
there is no page-wide total and asking for one is the double count, `stillSkimmed`
is the list a person can act on, and `nothing-measured` still answers the word
half on a page nobody has opened since the change. With the one ranking judgement
left open (`mostEased` ranks by words passed, not by how far the pace moved).

**Closed:** nothing. The lane's own 7 October entry about the silence
vocabularies was closed by 0240 last run, and this run is the first consumer of
what that bought.

## Test numbers, and the browser

- **`src/signals/pace-change.test.ts`: 24 tests, all passing.** One is the
  double-count case this lane requires of anything that counts: a band and the
  paragraph inside it both ease, which is five hundred words across three rows if
  anything were ever summed, and the page's figure is asserted to be the root's
  two hundred. Two more hold the filing rule (a part is in the comparison or in
  the census and never both; the movements sum to the compared length exactly).
- **One test added to `src/signals/silences.test.ts`**, for the sixth set
  introducing no condition the first five did not already report.
- **`src/signals/` as a whole: 714 tests in 27 files, all passing** (157s,
  Postgres contract suites included).
- **`pnpm install && pnpm verify`: green, exit 0.** Root suite 4,359 tests in 196
  files; `pnpm findings:check` 1,075 findings and 0 malformed; the app's own
  7,385 tests in 412 files; `pnpm prerender:check` clean.
- **Nothing was weakened or skipped.** Two things in the run went red before they
  went green, and both were real: `src/documentation.test.ts` caught three doc
  comments where a record number would have reached a published sentence (the
  maintainer's rule on the API reference), and `offered.test.ts` caught the nine
  new exports not yet in `reference.generated.json` — regenerated with
  `pnpm --filter @loom/app docs:api`.

**The browser pays nothing, measured rather than asserted.** `broadcast.ts`
bundled and minified with esbuild on this branch and on `origin/main`, from a
clean worktree of each: **6,477 bytes minified, 2,934 gzipped — byte-identical on
both.** `pace-change.ts` is not in the broadcaster's import graph, and
`browser-weight.test.ts` is unchanged.

## Open questions

**Nothing blocking.** Two worth the maintainer's eye, both recorded rather than
decided quietly:

1. **`mostEased` ranks by words passed now, not by how far the pace moved.** That
   is 0221's rule — a caption two readers now have time for is a better ratio and
   a smaller gain than a band four hundred of them do. A reader screen that wants
   *the biggest improvement* will disagree, and if so it is a sort on `compared`
   rather than a change in the framework.
2. **`lingered` is still a question rather than an answer**, so a part moving
   between `paced` and `lingered` reports `held`. If *readers are getting stuck
   here, and more than they were* turns out to be a sentence worth having, it
   needs its own argument — dwell counts a part that was merely on screen while
   its neighbour was being read, and that is the bias the figure would be made
   of.

**On per-reader identity:** nothing here makes it dearer to add later. Every
figure is a ratio of two counts off rows already stored, and an identified reader
would change none of them.

## Lane hygiene

`git fetch` before branching; `main` at `19e0f16`. Three pull requests were open
and **none touches `src/signals/`** — #553 (`Loom portal`) *reads* this lane's
§18 and adds no file here, #554 is the demo lane, #548 is `Loom primitives`'
proposed 0241. `origin/signals-14-looked-at-not-touched` is a stale duplicate of
work that landed as #549 and is behind `main`; nothing on it is unmerged.

`FINDINGS.md` appended at the top and nothing reflowed. `decisions/README.md` and
`reference.generated.json` regenerated rather than hand-edited.
