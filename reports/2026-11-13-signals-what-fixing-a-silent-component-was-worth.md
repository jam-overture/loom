# What fixing a silent component was worth

**`Loom signals`, 13 November 2026 (evening run).** One unit, built and green:
`librarySendersChangeOf` — this morning's silent-sender census, held against
itself across two windows, so a deployment can say what a fix recovered and,
the other way round, which component a release silenced. Branch
`signals-89-what-fixing-a-silent-component-was-worth`, one record (0394,
Accepted), three findings filed. A second, separate commit on an older branch of
this lane closes an open finding that would have taken `main` red; it is in
*Process* below and it is not on this branch.

## What I completed

§88 landed this morning and named the component to fix: *`loom.accordion` is
silent in thirty-one of the thirty-four places it stands, across nineteen of your
pages*. The question it leaves is the one an author has the moment they have
fixed it — **did it work, and how much of the library did it recover?** — and
its sharper sibling, which nothing in this repository could ask: **did this
release silence a component that was reporting last week?** A census of the later
window cannot tell the two apart. It sees a component that is silent now.

`librarySendersChangeOf` answers both. It is the **twenty-fifth** reading taken
out of the server-side join rather than collected: **no payload field, no
counter, no column, no table, no byte on any wire and nothing in a reader's
browser.** A browser could not send this if it wanted to — whether a part is
silent is a statement about *what else was on the page*, which only the tree and
the registry know.

The places are paired first, through the helpers the library comparison already
publishes for exactly this reuse: windows keyed by page in its form, placements
paired by node, a form held at two revisions excluded and named, a reading handed
in twice dropped and counted. Two censuses cannot be subtracted, which is the
subtraction this module exists to refuse.

## The decisions I took that were not specified

**The population, which is the whole of the design.** The census divides by the
placements something below reported reach at. A comparison has to hold that still
on **both** sides, and the cheaper denominator is the one that would have been
easy to ship and impossible to notice afterwards:

| denominator | what goes wrong |
| --- | --- |
| every paired place | the census's own argument unchanged — it falls as a library gains leaves and as either window loses readers |
| the places checkable **now** | a place nobody was under before has no earlier state to have been silent in, so it joins at whatever it is today. **A week that merely got busier publishes a repair**, and nothing on the row looks wrong |
| **checkable in both** | the four transitions partition one population with one denominator on both sides |

`checkableWas` and `checkableNow` are published beside it, because how much of
the library each window could speak for at all is a fact about readers and must
not be read as a finding about senders.

**An unclaimed side makes the transition unclaimable, not the share wider.** This
is the one place this reading deliberately departs from the census it extends.
§88 brackets a witnessed placement whose standing is `unknown` between `share`
and `atMost` — the true rate is somewhere between the two. A comparison cannot
do that and should not: *indeterminate, then reporting* is not a repair that
might be smaller than it looks, it is **no claim at all** about what moved,
because the earlier side never said anything to move from. Counting it as a
repair would manufacture the finding this reading exists to publish. So those
places are counted in `indeterminate`, kept out of `comparable`, and named by the
silence `unclaimable`.

**Silenced ranks before repaired.** `byType` is ordered by the places gone
silent, and `mostSilenced` is the alarm rather than the result. A component that
has just stopped reporting is the thing to act on; a repair is the thing to read.

**One refactor, and it is the same one yesterday's unit needed.** 0382's rule —
*skipped, with reach reported below it* — was spelled inside the census's loop.
It is now `senderStatesOf` in `src/signals/subtrees.ts`, a closed set of the five
states a placement can be in, and the census takes it from there. `subtrees.ts`
is still **not** re-exported from `index.ts`: it publishes no answer about a
deployment. A census and a comparison disagreeing about which placements were
silent is a failure a surface could not notice, and the test that two readings of
one window reproduce the census term for term is the guard on it.

## Records added

- `decisions/0394-what-a-fix-to-a-silent-component-was-worth-is-read-over-the-places-both-windows-could-check.md`
  — **Accepted.** Eleven clauses, seven alternatives recorded with their reasons.
  Nothing superseded; it contradicts no accepted record and changes no schema.

**0394 was the next number free on `main` and on every open branch** when this
was written. `main` holds up to 0393; of the three open pull requests, #890
claims no record, #778 claims 0353 (which `main` does not hold), and #856 claimed
0380 and 0381 and has been renumbered to 0395 and 0396 this evening — see
*Process*.

## Findings filed

Three, appended, nothing reflowed:

1. **What a fix was worth is answerable now**, owned by `Loom portal`, with the
   four things a screen drawing it has to hold — above all that `checkable` is
   the places checkable in **both** windows and a surface must not re-derive a
   denominator from `checkableNow`.
2. **The reader-weighted version is 0256's refusal one unit along**, owned by
   this lane, with the thing that makes it harder here than at the neighbouring
   unit written down: the population is already a statement about readers, so the
   weighted version is a different population and not a second reading over the
   same places.
3. **Ten new names on `@jam-overture/loom/signals`**, owned by `Loom docs`, with
   the sentence the page would want written out to be lifted. It is the fifth
   entry of its kind and says so: one paragraph answers all five, and this one
   does not need its own.

One finding closed, on the other branch: see *Process*.

## Real test numbers

`pnpm verify` **EXIT=0** on the committed tree, read from the file in its own
command.

| | |
| --- | --- |
| Framework suite | **294 files, 7,101 tests passed** — one new file and **+28 tests**, all mine |
| Application suite | **489 files, 7,918 tests passed** — no test of mine is in it |
| Findings | **1,550 findings, 0 malformed** (1,547 on `main`; three filed here) |
| Prerender | 139 pages, 2,101 text junctions, 0 run together |
| Mutation check, by hand | **17 run, 17 killed** |

**The first full gate went red and it was mine.** `src/documentation.test.ts`
holds the maintainer's rule that a decision-record number is never part of a
published sentence, and three of my comments broke it — the module's opening
paragraph carried a linked record number, and two member comments carried a bare
one. The sentences were reworded; the rule was not touched. This is the second
run in a row to trip that test, which is the test doing its job.

**Three of the seventeen mutations survived the first pass** and three tests were
written to kill them: `repairedTrees` counted per place rather than per page
(the fixture now repairs two places on one page), the ranking taken off the share
rather than off the count (the fixture now has a kind with the worse share and
the smaller problem), and a place whose **role** changed paired anyway in the role
rows (the fixture now has two windows that disagree about what a band plays).
The other fourteen: the denominator taken from the later window, from the earlier
window, a leaf counted as checkable, a place nobody was under counted as
checkable, an unclaimed side counted as a transition, `indeterminate` left inside
`comparable`, the two shares swapped, `still-silent` folded into `held`, the
verdict reversed, the double count let through, the examples uncapped,
`mostSilenced` taken off the top of the order, an ambiguous form compared anyway,
and the totals added over both keys so every paired place counted twice.

**Nothing failed in the end, and nothing was skipped or weakened.**

## Byte cost

**Nothing I added runs in a reader's browser.** `broadcast.ts` and its import
graph are untouched and the bundle measures `main`'s figure exactly: **7,852
minified / 3,458 gzipped**, re-measured on this branch, of ceilings of 8,000 and
3,600.

**The published names index: 107 bytes**, measured by building the file both ways
rather than remembered — **27,462 bytes over 2,131 names on `main`, 27,569 over
2,141 with these ten**, leaving **12,431** of the 40,000.

## Open questions

**Nothing blocking.** Three worth the maintainer's eye, none of which holds this
branch:

1. **#856 has been open since 11 November on one question** — whether an hourly
   rate should be published now that its refusal's reason has a remedy (0381,
   now 0396, `Proposed`). It is still the question and this lane's
   recommendation is unchanged. Two things about its state are worth knowing:
   its records were renumbered this evening, and **GitHub reports the branch as
   conflicting with `main`**, so `Loom merge` could not land it today even with
   an answer. Resolving that is a merge of `main` into it and a re-run of its
   gate — a unit of its own, not taken here, and arguably not worth taking until
   the question on it is answered.
2. **The governance questions filed on 12 November are still open** — whether a
   measured figure in a merged record may be corrected in place, and whether a
   report may be. I have made the same call a fourth time today: measured figures
   corrected in `docs/signals.md` in place, reports left as dated accounts.
3. **The next unit from this lane**, unless something outranks it: the portal can
   now ask which component to fix and what a fix was worth, and what it still
   cannot ask is **whether a component is worth fixing** — a silent sender on a
   band nobody reaches costs a deployment nothing, and the two readings here rank
   by places rather than by readers on purpose. The reader-weighted version is
   filed with its difficulty written down.

## On the parked door

Nothing in this unit touches per-reader identity and nothing here makes adding it
later more expensive. Every figure is a count of **places**, keyed on the tree,
the node and the kind; there is no reader in the arithmetic at any point, and an
opt-in identified batch would change none of it.

## Process

Three open pull requests were read before starting — #890 (`Loom portal`), #856
(this lane's, from 11 November) and #778 (`Loom docs`). **No open branch touches
the signal path**, so nothing was raced. This branch is off `main` and is stacked
on nothing.

**One commit was pushed to #856's branch, and it is not this branch's work.** The
12 November entry in `FINDINGS.md`, owned by this lane, recorded that two open
branches numbered a record `main` has since used, and that the first to land
takes `pnpm verify` red **on `main`** for four surfaces. #851 was renumbered by
`Loom merge` when it landed. **#856 was still carrying 0380 and 0381**, both of
which `main` has held for different records since 11 and 12 November. It is now
0395 and 0396, with the references on that branch moved with them and the index
regenerated, and the entry is closed there.

**That is a deliberate exception to this lane's own working rule** — *a
correction goes on a fresh branch off `main`, never onto the open branch* — and
the exception is written into the finding: a renumbering cannot follow that rule,
because the records exist only on that branch and a fresh branch off `main` has
nothing to rename. The check that rule does carry was made: the pull request was
read and still open immediately before the push. **Only the numbering tests were
re-run on that branch**, not the whole gate: the change is a file rename and the
text that names it, and that branch's own gate was green when it was opened.

The shared files on this branch are the usual four: `FINDINGS.md` appended and
never reflowed, `docs/signals.md` appended, and `decisions/README.md` and
`reference.generated.json` regenerated.

**Nothing self-scheduled, nothing subscribed, no check-in armed, no polling.**
