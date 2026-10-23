# 23 October 2026 — a ratio names the state it has no quotient in, and the finding named the wrong third module

**Routine:** `Loom signals` · **Branch:** `signals-48-what-two-forms-say-and-how-much-of-each-is-read`
(#697) · **Section:** §49

## Before anything was built

**Two pull requests open.** **#697** is this lane's, from last night, carrying
0305 and §48 — green, based on `origin/main` at `2cfd93d`, nothing merged in and
no conflict anywhere in the run. **#694** is the maintainer's own — sign-up,
sign-in and password reset — and touches nothing under `src/signals/` or
`apps/loom/app/_lib/reader-signals/`. The framework lane has no branch open at
all, so there was nothing to race on the signal path.

**No maintainer comment anywhere**, on either pull request, and no review comment
of any kind. The only comment on #697 is this lane's own from last night, which
is not input. So nothing outranked the queue.

**What the queue said, and what it picked.** Last night's comment put two
recommendations to the maintainer and said what this lane would do by default
without an answer: *pause new readings for a run or two and spend them on
corrections to what exists*. No answer arrived, so the default applies and this
run is a correction rather than §50 of the plan. The correction is the open
finding this lane filed on 22 October, which the brief puts ahead of the plan.

#697 is **unmerged**, so this unit is on that branch rather than on a second one:
two open branches from one lane touching one file is a conflict a lane creates
for itself, and `docs/routines.md` is explicit about it.

## The plain version

Three comparisons of two windows publish ratios, and a `null` on any of them
meant two different things a surface could not tell apart: **neither side
measured this**, and **the earlier side measured nought**. *Nobody acted in this
band and four in ten do now* arrived at a screen as the same value as *nothing
here can be compared*.

A ratio is now a pair — the quotient, or the reason there is not one — published
from one module and imported by all three, where the rule was spelled three
times in three copies that agreed.

## What the finding got wrong, which was the useful part

It named `action-change.ts`, `pace-change.ts` and `copy-change.ts`.

**`copy-change.ts` does not divide.** `ComparedPassage.gain` is
`words × (now.reach − was.reach)` — a difference, whose `null` means *one side
is not a measurement* and nothing else (0282). The third copy of the helper was
in **`funnel-change.ts`**, which the entry does not mention and which holds the
figure a deployment opens the portal for: `rateRatio`, `entryRatio`,
`conversionRatio`. So the fields were **eight and not six**, and the one most
likely to be drawn first was outside the scope the finding set.

Counted from the files with `grep`, not from the entry. The entry is closed with
that correction written into it.

**And the shape the entry proposed turned out to be necessary rather than
tidier.** Its own alternative — *let a surface derive the reason from the two
sides* — cannot work on one of the eight. `PartAction.usesPerReader` is withheld
at a **measured** nought on purpose, because a nought there is the ordinary state
of every heading on a page and `uses` beside it already says so (0242). A surface
deriving the reason from an absent `was.usesPerReader` would call *readers used
this twice each and do not touch it now* unmeasured, which is exactly backwards.
That is the argument for publishing the reason, and it is now in the record as
the argument.

## The unit

Taken as
[0306](../decisions/0306-a-ratio-names-the-state-it-has-no-quotient-in-and-the-rule-is-published-once.md),
planned as §49. One new module, [`src/signals/ratios.ts`](../src/signals/ratios.ts),
and three adopters.

```ts
export type RatioAbsence = "unmeasured" | "from-nothing"
export type Ratio = { readonly ratio: number | null; readonly absent: RatioAbsence | null }
```

- **Exactly one of the two fields is non-null**, over every branch, asserted
  rather than described.
- **`unmeasured`** is either side having no such figure, with `undefined` and
  `null` both accepted — the readings spell a withheld figure both ways, and a
  helper that made its callers normalise first would be a fourth thing to get
  wrong.
- **`from-nothing`** is both sides measured with the earlier one at nought.
- **Two members and not three.** A nought on both sides is `from-nothing` too:
  every comparison publishes both sides and the movement between them, so *it
  was nothing and it is nothing* is already answerable and a third member would
  be a second way to say what the later side says.
- **The nought a reading withholds on purpose is restored for the quotient and
  only for the quotient.** `usesRatio` divides occurrences per reader with a
  side that reached readers and was used by none of them counted as a nought;
  `PartAction.usesPerReader` is published unaltered.
- **A bound on a tagged figure is not tagged.** `rateRatioAtLeast` and
  `rateRatioAtMost` stay bare `number | null`.
- **No reading changed.** `pageActionOf`, the pace reading and the funnel's
  reach are untouched: a window's rule about its own figures stays that
  reading's, which is the direction 0282 and 0304 both send a rule in.

### What it cost in lines, and what answers that did not before

`ComparedAction.usesRatio` **answers where it used to be silent**. The suite had
a case called *withholds the use ratio where a side used nothing*, which was the
old behaviour stated as an intention; it is now two cases, *publishes a quotient
of nought where readers have stopped using a part* and *names a part nobody used
before and half the readers press now*, plus a third pinning the one state that
really is unmeasured — a side with no readers to divide by.

`funnel-change.ts` lost its copy of the helper and its bracket reads the tagged
figure. `pace-change.ts` lost its copy and nothing else; its three divisions now
disagree about **why** they have no quotient, which is a fixture: a band the
earlier revision left wordless has `needRatio` `from-nothing`, `timeRatio` a
real quotient, and `paceRatio` `unmeasured`.

## Decisions I took that were not specified

- **I built it rather than waiting for an answer.** Last night's comment put the
  shape of this to the maintainer as a question, on the grounds that it moves a
  published type. Nothing reads one of these eight fields — no screen, no route,
  no other module — so this is the cheapest moment it will ever be, and the lane
  had already said it would spend a run on corrections by default. The question
  it was holding (*would you rather no published type moved until something draws
  it*) is answered in the one direction that is reversible: a tagged absence can
  be flattened back to a number by anybody who wants one, and a `null` that was
  never told apart cannot be recovered after a surface is built on it.
- **Eight fields, not the six the finding counted**, because the third module was
  not the one it named.
- **Two members rather than three**, with the both-nought case documented and
  fixtured rather than given a name of its own.
- **The intensity's nought is restored in the comparison and not in the
  reading.** Changing `usesPerReader` itself would publish a nought per heading
  on every page, which is the noise 0242 chose against; the one-window argument
  is still right and the two-window one is not the same argument.
- **The bracket is left untagged.** A bracket around a quotient that is not there
  has nothing to say that the quotient has not said, and a bracket absent where
  the quotient is present is the door's drift and nothing else. Both are now in
  the field's own documentation.
- **The helper is a new module rather than `audiences.ts`.** That module is about
  which two readings may be held against each other; arithmetic over two figures
  is not that.
- **I numbered the record 0306.** `main` carries up to 0304 and this branch holds
  0305, so 0306 is the next number free to this branch; two records sharing a
  number is fatal (0097).

## Real test numbers

`pnpm install && pnpm verify` — **green, exit code 0** through every stage:
build, typecheck, the root suite, `findings:check`, `reports:check`, the app's
own verify and `prerender:check`. Nothing skipped, nothing weakened.

| suite | files | tests |
| --- | --- | --- |
| root (`vitest run`) | 237 | **5,656** |
| the app's own | 349 | **6,209** |
| `src/signals/` alone | 46 | **1,525** |

The suites that moved: `ratios.test.ts` is new at **18**, `action-change.test.ts`
41 → **43**, `pace-change.test.ts` 33 → **34**, `funnel-change.test.ts` 44 →
**45**. Everything else passed untouched, and no silence set gained a condition.

**One red on the way, and it was expected rather than a mistake.**
`tools/decisions/decisions.test.ts` failed on *are cited by a number that
resolves* after the code was written and before the record was: `(0306)` is cited
in three modules and the record did not exist yet. Every slug in 0306 and in
`docs/signals.md` was copied from `ls decisions/` rather than typed from the
record's subject, which is this lane's rule from last night, met on the first run
after writing it.

### The planted mutations

Six, each reverted after measuring, over the four suites together (140 tests).

| what I broke | tests that failed |
| --- | --- |
| both absences collapsed to one tag | **6** |
| the nought on the earlier side divided anyway | **6** |
| the intensity's withheld nought not restored | **2** |
| a nought restored where no reader was measured either | **1** |
| a bracket computed around an absent quotient | **1** |
| `ratio` and `absent` both non-null at once | **17** |

No survivors. Rows three and four are the pair worth reading: they are the two
directions of the one rule a surface could not have derived, and each is caught
by a different new case rather than both by one. Row six is the
double-counting-shaped case the standards ask for by name — a value saying two
things at once — and seventeen tests say so, because exclusivity is asserted over
every branch rather than at one.

## Nothing reaches a reader

No payload field, no browser code, no column, no store, no new kind and no new
member of any closed set reachable from a batch. `broadcast.ts` is
**byte-identical to `origin/main`** and measures **6,513 bytes minified**
(esbuild, bundled, browser platform, ESM) — the same figure as yesterday, and the
new module reaches no package, so a comparison importing it stays outside the
broadcaster's import graph. Rule 4's budget is untouched and
`browser-weight.test.ts` passes.

This is the thirty-seventh thing taken out of what this subsystem already knows
rather than collected, and the second in a row that **publishes less ambiguity**
rather than deriving a new figure.

**Nothing here makes per-reader identity cheaper or dearer to add later.** Every
term divided is a distinct-view count, a word count or a millisecond total; an
opt-in identified window would be divided by the same function unchanged.

## Findings

One closed, two filed.

- **closed:** *`ratioOf`'s `null` is still two states in three comparisons* —
  closed by this unit with two corrections written into the entry: the third
  module it names does not divide, and the tagged absence it proposed is
  necessary rather than tidier, because one of the eight fields cannot be read
  off the two sides at all.
- **filed, this lane:** *a distance of nought where there is no distance,
  guarded by a silence rather than withheld.* `weightMovedOver` in the two
  library rolls returns `0` where either side has no weight. Either it is
  reachable, and a card reads *the weights did not move* about a roll that has
  no distance to report, or it is unreachable and is a clause nothing can
  falsify (0231). Neither suite has a case that reaches it. Left rather than
  folded in: it is a sum of absolute differences in two other modules, not a
  quotient in these three.
- **filed, `Loom portal`:** *every ratio a comparison publishes is a pair now.*
  Eight fields, `describeRatioAbsence` for the sentence, and one drawing
  decision that is genuinely the surface's: a `from-nothing` row has no number
  to rank by while being the row somebody most wants ranked first. Filed against
  a paused routine, which still waits.

## Open questions

Two, both with a recommendation, neither blocking. They are in the pull request
comment. The one now open four runs is **nothing draws any of this**, and the
routine that would is paused.

## What the merge has to deal with

One branch, two units on it (§48 from last night, §49 from this run).
`origin/main` at `2cfd93d` was already the branch's base, so **nothing was merged
in and there was no conflict anywhere in the run**. `decisions/README.md` and the
generated API reference were regenerated rather than hand-resolved.
`FINDINGS.md` was appended to, and the one line changed inside it is the status
of this lane's own 22 October entry.

Preview:
<https://loom-git-signals-48-what-two-fa2361-jpizzolato36-6341s-projects.vercel.app>
— the branch alias, which stays the same across pushes; Vercel's own comment on
#697 carries the per-deployment link. Nothing in either unit draws a screen, so
it is the branch deployed rather than something to look at. The egress policy for
this session refuses that host, so the URL is quoted from Vercel's comment on
#697 rather than checked from here.
