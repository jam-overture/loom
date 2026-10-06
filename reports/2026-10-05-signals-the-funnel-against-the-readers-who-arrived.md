# The funnel against the readers who arrived

**Routine:** `Loom signals` · **Date:** 2026-10-05 (second run of the day) ·
**Branch:** `signals-10-the-funnel-against-the-readers-who-arrived`

## What I completed

Two things, and the second is the reason the first is one unit rather than two.

**1. `funnelReachOf` — a funnel put as three shares of the readers who
arrived.** `src/signals/funnel.ts`, 380 lines, pure.

A `FunnelAnswer` has been two counts off one window since §3: the page views
that satisfied one end of a pair, and the ones that satisfied both. Divided into
each other they give a rate, and that rate is the one figure in this subsystem
that never needed a denominator handed to it — two counts off the same rows,
which is 0221's cancellation.

It is also not the number anybody quotes. A deployment asking *what is our
conversion rate* means *of the readers who arrived*, and a pair whose first end
sits at the bottom of a long page can post a rate of 100% while converting two
people. §8 counted the arrivals exactly and §11 joined that count to the node
counters; nothing joined it to the funnels, which left the funnel as the last
counter here with no honest share of its own.

So the unit of the answer is **three shares of the arrivals that partition
them** — never reached the first end, reached it and did not convert, did both —
and they sum to 1. Reporting all three rather than the rate is the whole value,
because the two losses have **opposite remedies** and `rate` cannot tell them
apart: the first loss is entirely inside its denominator. `worse` names the
stage that costs more readers, by headcount rather than share.

**2. The pairing rule, published once.** `pageViewsFor(where, rows)` and
`inflationFor(where, rows)` in `page-views.ts`, with `pageReachOf` moved onto
them.

## Decisions I took that were not specified

**The straddle leans *down* on this one counter, and 0147 says it does not.**
This is the thing I did not expect to find and it decided the shape.

0147's consequences record that *a conversion rate is honest and a view count is
slightly generous*, on the ground that a funnel answer is computed inside one
rollup run where distinctness is exact. That is true of one answer. It is not
true of the stored row, which `addFunnelAnswers` adds every window's answer
into. A page view whose reader met the first end in one window and converted in
the next contributes `reached 1, converted 0` to the first window and nothing at
all to the second — because `converted` counts views in the `from` set that are
also in the `to` set, and in the second window that view is in neither. **The
conversion is not double-counted. It is lost.**

So `rate` is the only figure in this subsystem biased downward, where every
other share taken off a distinct count leans generous. That is the safe
direction for *readers convert* and the unsafe one for *this funnel is broken*,
which is the claim somebody acts on — so I bounded it rather than caveated it.
`rateAtMost` applies both of the straddle's worst cases at once:
`min(1, (converted + drift) ÷ max(1, reached − drift))`. It closes onto `rate`
where nobody straddled and opens wide where the rollup window is short, which is
the second time §8's drift has turned an argument into a number.

**I did not supersede 0147.** Every word of its decision stands; what is wrong
is one sentence of its consequences, which was true of the answer it was
describing and not of the sum the store keeps. 0231 says so and cites it. If you
would rather it were a supersession, say so and I will write one — but editing
a record to change direction is the thing the procedure forbids, and a
supersession of a decision I agree with entirely seemed worse than a correction
in the record that found the limit.

**`rateAtMost` has no cap of its own on the recovery.** The honest-looking
shape is `converted + min(drift, reached − converted)` — you cannot recover a
conversion the row already counted. I wrote that, then proved it can never
change the result: the two spellings differ only where `converted + drift`
exceeds `reached`, and there both numerators are above the denominator, so both
are capped at 1. I deleted the clause. A planted-defect sweep is what made me
check: the mutation that removes it was not caught by any test, and the reason
was that there is nothing to catch.

**No ranking across pairs, and no page-level total of conversions.** §9 ranks
siblings of one page because siblings are comparable by construction. Two funnel
pairs are two questions about different nodes and different kinds, and the pair
that loses the most readers is reliably whichever first end is deepest in the
page — so a ranking would put a true number at the top of a screen as the answer
to a question nobody asked. A total is refused for 0167's reason: one page view
can satisfy several pairs.

**`ReachSilence` is reused rather than restated.** The three reasons there is no
denominator — no row for the revision, a row saying no page view ever began,
arrivals no rollup has folded — are states of the deployment and not of the
question, so a funnel card and a part card go silent for the same three and a
surface handles them once. `unopened` is still the one worth catching.

**The pairing rule took shape 1 of the portal's finding and not shape 2.** Shape
2 was `PaceOptions.inflation` accepting the rows instead of the fraction.
`readingPaceOf` does not know where its counts came from, which is exactly what
lets two windows of one revision be handed to it, and a fixture or a backfill
has no door rows at all. A published rule the caller applies keeps that open; a
parameter that only accepts rows closes it. `null` is kept for *no row* and for
*nothing opened* rather than `0`, because a correction of nought is a measured
claim that nobody straddled.

## Records added

[0231](../decisions/0231-a-funnel-is-three-shares-of-the-arrivals-and-the-straddle-is-the-one-error-here-that-leans-down.md)
— *A funnel is three shares of the arrivals, and the straddle is the one error
here that leans down.* Accepted; nothing superseded. 0231 was free on `main` and
neither open pull request claims a number, which I checked against both branches
rather than against `main` alone.

`docs/signals.md` gains §13, marked done.

## Findings

**Closed:** `Loom portal`'s entry of 5 October — *every consumer of
`readingPaceOf` will write the same four lines to find its correction, and the
pairing is the part that can be got wrong.* The entry was right that the next
consumer was predictable; it turned out to be this lane's own, one run later.

**Filed, for this lane:** a funnel pair can name a node its revision no longer
has, and `funnelReachOf` reports that as a pair nobody reached — entry share
nought, `worse: "before"` — which reads exactly like a band readers never scroll
to, with the opposite remedy. The fix is the §6 join one step further and §10's
five fates are the vocabulary. Left out of this unit on scope: `funnelReachOf`
takes counters and rows, and giving it a tree is a different signature. It is
the most useful thing left in this lane's queue.

**Still open, not mine:** the 2 October `role`/`copy` declaration entry for
`Loom primitives` is the thinness every reading here inherits; 0223 landed the
`copy` half on 4 October.

## Real test numbers

`pnpm verify` — **green, exit 0**, written to a file and the status read in a
separate command, per `docs/routines.md`. Two suites:

- the framework — **184 test files, 3,939 tests**, 0 failed, 0 skipped;
- `@loom/app` — **384 test files, 6,917 tests**, 0 failed, 0 skipped.

- `src/signals/funnel.test.ts` — **33 tests**, new.
- `src/signals/reach.test.ts` — 17 tests, unchanged and still green after
  `pageReachOf` was moved onto the shared pairing rule.
- `src/signals/page-views.test.ts` — 18 tests, unchanged.

**Two things failed on the way and both were mine.** `documentation.test.ts`
caught three doc comments where a record number was part of the grammar —
*"for 0229's reason"*, *"the one control 0147 gives"*, *"0221's ranking rule"* —
which the site cannot lift out, so those three exports would have rendered on
the API reference with no summary at all. Rewritten as parentheticals. Nothing
was weakened; it is a rule about published prose and the prose was wrong.

Then `offered.test.ts` in the documentation app, which holds every published
export against the site that has to mention it, named all five new names as
published and unfindable. `reference.generated.json` is generated, so it was
regenerated with `pnpm docs:api` rather than hand-resolved — 17 entry points and
1,325 exports. The gate was then green on the second full run.

**Planted defects: eight planted, eight caught.** Each mutation reverted before
the next:

| the defect | caught by |
| --- | --- |
| the rate ceiling ignores the drift | *bounds the rate above where visits spanned two windows* |
| `unreconciled` at `>=` rather than `>` | *reconciles a funnel every reader met* |
| the two stages swapped | 3 tests |
| the duplicate-pair filter removed | 2 tests |
| the headcount multiplied back up from the share | *divides two whole numbers* |
| foreign funnel rows trusted | *ignores funnels for another revision* |
| `lostBefore` against `reached` rather than the appearances | 2 tests |
| the pairing rule matching on tree and ignoring the revision | 5 tests |

The last one is the finding this run closed, as a defect: a rule that matched on
the tree alone handed one revision's straddle rate to another's counters, and
five tests across two files said so. Before the extraction that mutation existed
in two files and would have had to be planted twice.

**The double-count case (0158).** *Reports the same shares for a window read
once and read twice* — a caller who concatenates two reads of the store gets the
same conversion share, the same openings, and `duplicated: 1` and
`duplicatedPairs: 1` saying what was dropped. Adding them would have doubled a
total that is already one.

**One exhaustive sweep.** `rate ≤ rateAtMost ≤ 1` across every
`reached` 0–12, `converted` 0–reached, `drift` 0–12 — 1,183 cases, 61 ms. That
is the sweep that proved the deleted clause was unobservable.

## Browser cost

**Nothing was added that runs in a browser**, and it was measured rather than
assumed. The broadcaster bundles to **6,477 bytes minified and 2,941 gzipped**
(esbuild, ESM, from `src/signals/broadcast.ts`) — byte-identical to the figure
the last run recorded, because it was not touched. `src/signals/funnel.ts` is
read-time only and imports nothing outside `src/signals/` and
`src/closed-set.ts`; `browser-weight.test.ts` is unchanged and green. This is
the sixth
thing taken out of the server-side reading rather than collected: no payload, no
browser byte, no column, no store change, no sixth kind.

## The parked door

**Per-reader identity is neither cheaper nor dearer for this change**, with one
thing worth flagging in the direction the brief asks about.

The three shares here are shares of *page views*, and the reason the arithmetic
works at all is that `converted` and `reached` are distinct-view counts off the
same window — by which point rule 2 has thrown the view keys away. What an
identity feature would want is *which readers converted and which did not*,
which is a per-view breakdown, and the reason this cannot be bent into one is
the reason it is honest.

**The one place this run touches that door is `rateAtMost`, and it touches it in
the right direction.** The interval exists because a page view that straddles
two rollup windows cannot be recognised as one page view. A durable identity
would collapse that interval to a point — and nothing in `funnelReachOf`
assumes the interval is wide, or even that it is open: where `drift` is nought
the ceiling already equals the rate, and an exact collection would simply be
that case everywhere. The function is handed the two numbers and does not know
how they were counted.

## Open questions

**1. The `fetch` hole in `completed`.** Eight days open; I am not restating the
case, which is in the finding of 1 October and in five reports. One line is
enough either way and this is where it bites hardest: a funnel ending in
`completed` is the conversion rate this run just learned how to put as a share
of arrivals, and on a deployment whose forms post with `fetch` every one of
those shares is nought. **Recommendation unchanged: allow `completed(node)` on
the broadcast handle and let me write the rule-3 distinction into a record that
amends nothing.** A plain *no* closes the finding and I will stop asking.

**2. Does the 0147 correction want a supersession?** I wrote it as a correction
inside 0231 rather than as a supersession of 0147, for the reason above.
**Recommendation: leave it as a correction.** It is one sentence of consequences
in a record whose decision is entirely right, and a supersession would make a
reader think the additive rollup had been reconsidered.

**3. What I would do next if you say nothing.** The finding this run filed: a
funnel pair naming a node the revision no longer has, given a standing from the
tree. It is the §6 join applied to the one input here that is written down in
advance and therefore the one input a change can invalidate — and today a stale
question and a cold band look identical. Code I own, nothing needed from another
lane.

**4. Carried over, neither blocking.** 240 words a minute is still one constant
if it is not your number, and the region floor of 25 is the other.
`docs/deployment.md`'s reader-signal half is still one line of your reading; this
unit added no environment variable, so `docs/signals.md` carries everything new.

## Found while working

**No other lane is on the signal path.** Of the two open pull requests, #523 is
`apps/loom/app/(portal)/` and #526 is the demo surface; neither touches
`src/signals/` and neither claims a decision number, which I checked by diffing
both branches against `main` rather than by reading their descriptions. This
branch is off `main` and stacks on nothing. The three shared files collide only
in ways `Loom merge` already handles: an append to the union-merged ledger, a
generated index, and a new section of the plan.

**The portal lane and this lane reached the same conclusion from both ends
again, which is now a pattern worth naming.** Its finding this morning said the
matching rule should live beside the counters; this run needed that rule for a
second consumer within twelve hours. The same thing happened on #513 and §11 —
*the rounded share is the honest figure and the exact counts are the misleading
ones* — one lane finding from the screen what the other was about to find from
the arithmetic. It is the cheapest review this project has and neither lane is
asking for it.
