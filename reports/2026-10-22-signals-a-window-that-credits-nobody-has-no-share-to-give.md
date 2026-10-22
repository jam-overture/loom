# 22 October 2026 — a window that credits nobody has no share to give, and the fix was one level below where it was filed

**Routine:** `Loom signals` · **Branch:** `signals-46-what-readers-do-inside-a-page-form-by-form`
(#693) · **Section:** §47

## Before anything was built

Two pull requests open. **#693** is this lane's, from last night, carrying 0303
and §46. **#694** is the maintainer's own — sign-up, sign-in and password reset
— and touches nothing under `src/signals/` or
`apps/loom/app/_lib/reader-signals/`, so there was nothing to race.

**No maintainer comment anywhere**, on either pull request, and no review comment
of any kind. The only comment on #693 is this lane's own from last night, which
is not input. So nothing outranked the queue, and the queue picked the work: the
open finding this lane filed on #693 last night, which the brief puts ahead of
the plan.

#693 is **unmerged** and green, so this work is **on that branch** rather than on
a second one — `docs/routines.md`'s procedure is explicit that two open branches
from one lane touching one file is a conflict the lane created for itself. The
branch was already at `origin/main` (`2f3723a`) with nothing to merge in, so
there was no conflict in the whole run.

## The plain version

A press is filed against the control and credited to the **ancestors the signal
says it happened inside** (0167). So a deployment whose sender stops sending that
ancestry files presses that belong to nobody — and the page then reads as a page
where every band was reached and nothing happened in any of them.

The subsystem has named that state since 0242. It is `PageAction.unwalked`, its
own documentation says exactly what it costs, and **it was named and not
applied.** The figures went on being published:

> every band on this page collapsed to nothing

about a configuration change. That sentence is now impossible to print.

## What the finding said, and where it was wrong

Last night's finding measured one instance precisely. `actionChangeOf` publishes
`shareRatio` through

```ts
was === undefined || now === undefined || was === 0 ? null : now / was
```

so an unwalked **earlier** window gives `was === 0` and comes back `null` — that
direction covered by accident — while an unwalked **later** window gives a real
`was` against a nought and comes back **`0`**, on every part that bears an inside,
with `movements.abandoned` and `mostAbandoned` populated to match.

The finding then named the file to fix: `src/signals/action-change.ts`. **That was
one level too high**, and finding out why was the useful part of the run. Three
readings are built on `pageActionOf` and each already answered the same fault
differently:

| reading | what it did with `unwalked` |
| --- | --- |
| `libraryActionOf` | refuses the roll outright, and names the pages |
| `formActionComparisonOf` | withholds every gap, through a `walked` argument of its own (0303) |
| `actionChangeOf` | named the state and left every figure computed |

Fixing the third in the third would have made **three spellings of one rule over
one reading, two of which already disagreed about whether to apply it** — the
fault 0218 and 0235 were both written about. So it is fixed in the one place the
fault is visible, which is also the direction 0282 says a rule should travel:
down to the reading the figures are derived from.

## The unit — two fields in `action.ts` (§47)

Taken as
[0304](../decisions/0304-an-unwalked-window-has-no-share-and-nothing-untouched-to-give-and-the-rule-belongs-to-the-reading.md),
planned as §47. In an unwalked window, `pageActionOf` now:

- **withholds `share` on every part**, whatever its standing — it is
  `engaged ÷ reached` and `engaged` is the one counter the ancestry walk feeds;
- **turns `untouched` into `unknown`** — that member is *readers reached it, it
  has an inside, and nothing happened in or on it*, read off the same nought. It
  is a fourth way to be `unknown`, beside no row, a `reached` of nought, and a
  leaf.

Everything the walk does not feed stands in full: `reached`, `within` as the
store holds it, `uses`, the four counters, `usesPerReader`, `shutAgain`,
`bearsParts`, and the `acted` a part earns from uses filed against **itself**.

### What that cost in lines

**`actionChangeOf` changed not one line of code**, which is the proof the rule was
in the wrong place. Every movement across an unwalked side falls to `unknown`
through `movementOf`'s existing collapse, every `shareRatio` to `null` through
`ratioOf`'s existing `undefined` clause, and `mostTakenUp`, `mostAbandoned` and
`stillUntouched` empty themselves by rules they already had. The asymmetry
between the two directions is gone because neither direction has a nought to
divide. Its prose changed and its suite gained seven cases.

**`formActionComparisonOf` lost its `walked` argument** and `gapOf` is one check
again. **Its suite passed untouched**, which is the assertion that its answer did
not move; one case was added that pins *where* the withholding now comes from, so
the move cannot be quietly undone.

**`libraryActionOf` and `health.ts` are untouched.** The library roll still
refuses, because one poisoned page poisons a mean across pages and that is a
different and correct argument.

## Decisions I took that were not specified

- **The fix went in `action.ts` and not in the file the finding named.** The
  finding is closed with that correction written into it rather than quietly, and
  the entry now says the symptom was measured correctly and the fix was placed
  one level too high.
- **A withheld share no longer implies an unknown standing**, and this is the
  part of 0304 a later reading is most likely to get wrong. 0303 relies on *an
  unknown standing and a withheld share are the same fact said twice and never
  disagree*. The direction it needs survives in full — unknown standing ⇒
  withheld share. The converse now fails in exactly one window, because a
  disclosure band with `opens` of its own and children under it is `acted` on
  evidence that needed no walk **and** has a share that is a filing artefact. It
  is the one part that can hold both at once, so the share rule is deliberately
  **not** read off the standing. There is a fixture for exactly that band.
- **`acted` from a part's own uses survives, and so does a `held` between two of
  them.** Refusing the comparison wholesale, as the library roll does, would have
  been simpler and would have thrown away the half a deployment diagnosing its
  own sender actually wants: *presses are arriving and nothing can say where* is
  two facts, not one.
- **`within` is passed through unaltered and only the figure is withheld.** That
  is this module's existing rule for a leaf, and it is what lets somebody read one
  row and see what the store wrote.
- **I did not change `ratioOf`.** The finding's second option — make `null` say
  which of its causes it is — is filed again, narrowed: the unwalked cause no
  longer reaches it, so what is left is *no share on a side* against *a nought on
  the earlier side*, which changes a published field's type on three comparisons
  at once and is a decision about what a surface draws.
- **I numbered the record 0304.** `main` carries up to 0302 and this branch holds
  0303, so 0304 is the next number free to this branch; two records sharing a
  number is fatal (0097).

## The same wrong sentence one level up, which nothing had reported

Found while fixing the comparison, and it is the sharper of the two instances:
`pageActionOf.mostIgnored` named **the band the most readers reached** as the
page's most ignored part, and `standings.untouched` was the whole page. A
headline that reads *readers are ignoring your pricing band* is worse than a bad
number, because it names a remedy. Both are now `null` and nought, and it is in
0304 rather than filed, because it is the same two fields in the same window.

## Real test numbers

`pnpm install && pnpm verify` — **green**, exit code 0 through every stage:
build, typecheck, the root suite, `findings:check`, `reports:check`, the app's
own verify and `prerender:check`. Nothing skipped.

| suite | files | tests |
| --- | --- | --- |
| root (`vitest run`) | 235 | **5,593** |
| the app's own | 349 | **6,197** |
| `src/signals/` alone | 44 | **1,462** |

The three suites that moved: `action.test.ts` 30 → **36**, `action-change.test.ts`
35 → **41**, `form-action.test.ts` 24 → **25**. `library-action.test.ts`,
`health.test.ts` and `silences.test.ts` passed **untouched**, and no silence set
gained a condition.

**One red on the way, and it was mine.** `src/documentation.test.ts` failed on
*never makes a decision-record number part of a published sentence* — a bare
`0303` and a bare `0304` as the subjects of two clauses inside an **indented**
doc comment, which is published whole where a left-margin one has only its first
paragraph lifted. That is the rule yesterday's report wrote down, met on the
first run after writing it: **inside an indented doc comment, cite as `(0304)`
and never as a link or as the subject of a sentence.** Rewritten as parentheticals
and the reference regenerated after the final word of every comment, which is the
other rule from yesterday and was followed this time.

### The planted mutations

Five, each reverted after measuring, over `action.test.ts`,
`action-change.test.ts`, `form-action.test.ts`, `library-action.test.ts` and
`health.test.ts` together (182 tests).

| what I broke in `action.ts` | tests that failed |
| --- | --- |
| left the share computed and only changed the standing | **5** |
| left the standing and only withheld the share | **8** |
| made `acted` fall to `unknown` as well | **3** |
| applied the withholding to **every** window, walked or not | **22** |
| blanked `within` as well as the share | **3** |

No survivors. Row three is the one worth reading: it is the fixture of a control
whose own presses account for it, and of the `held` between two of them — the half
of this rule that a wholesale refusal would have lost, so the test that bites
there is the one defending the thing that is *not* withheld. Row five bites on the
counter-versus-figure rule. Row four is the double-counting-shaped case the
standards ask for by name: a withholding that fires when it should not is a
figure removed from every healthy window, and 22 tests say so.

The two orderings in this unit were already reachable by one input and already
asserted; nothing new was claimed as a decision on an ordering.

## Nothing reaches a reader

No payload field, no browser code, no column, no store, no new kind, and no new
member of any closed set. `broadcast.ts` is **byte-identical to `origin/main`**
and measures **6,513 bytes minified** (esbuild, bundled, browser platform, ESM).
That is 123 bytes above the 6,390 of yesterday's measurement and nothing in this
run caused it: `broadcast.ts` has not been touched on this branch, and the two
figures differ because #692 landed in its import graph.

Rule 4's budget is untouched and `browser-weight.test.ts` passes.

This is the thirty-fifth thing taken out of what this subsystem already knows
rather than collected — and the **first that removes a figure rather than
deriving one**, which is worth noting against the brief: the best thing a
measurement subsystem did today was publish less.

**Nothing here makes per-reader identity cheaper or dearer to add later.** The
rule is about a counter the ancestry walk feeds and would read an identified
window exactly the same way. There is no reader in it at any point.

## Findings

One closed, two filed.

- **closed:** *`actionChangeOf` publishes a share ratio of nought across an
  unwalked later window* — closed by this unit, with the correction that the fix
  was not in the file the entry named and why, because the shape of the misplacement
  is the useful part.
- **filed, this lane:** *`ratioOf`'s `null` is still two states in three
  comparisons.* Narrowed by 0304 rather than resolved. No wrong sentence is
  published today — only a sentence a surface cannot tell from another one — so it
  is a design question about a published field's shape across `actionChangeOf`,
  `paceChangeOf` and `copyChangeOf` at once, with the order to take it in written
  down.
- **filed, `Loom portal`:** *a reading withholds a figure and a surface has no
  sentence for the fourth reason it is withheld.* `ActionStanding.unknown` gained
  a cause that, unlike the other three, has a remedy on the deployment's own
  side. The page-level flag and the sentence both already exist; whether a card
  drawing `unknown` rows reads the flag first is a drawing decision. Filed against
  a paused routine, which still waits.

## Open questions

Three, each with a recommendation, none blocking. They are in the pull request
comment. The one that has now been open two runs is whether this lane should keep
adding readings at all: there are five comparisons over two page readings and two
over two forms, and **nothing draws any of them**, with the lane that would be
paused.

## What the merge has to deal with

One branch, two units on it (§46 from last night, §47 from this run). `origin/main`
at `2f3723a` was already the branch's base, so **nothing was merged in and there
was no conflict anywhere in the run**. `decisions/README.md` and the generated API
reference were regenerated rather than hand-resolved, the reference twice —
once after the first pass and again after the doc-comment correction.
`FINDINGS.md` was appended to and never reflowed.

Preview:
<https://loom-git-signals-46-what-rea-f741f4-jpizzolato36-6341s-projects.vercel.app>
— the branch alias, which stays the same across pushes; Vercel's own comment on
#693 carries the per-deployment link. Nothing in either unit draws a screen, so it
is the branch deployed rather than something to look at. The egress policy for
this session refuses that host, so the URL is quoted from Vercel's comment on
#693 rather than checked from here.
