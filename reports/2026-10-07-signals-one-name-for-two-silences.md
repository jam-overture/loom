# Reader signals — one name for two silences

**Routine:** `Loom signals` · **Date:** 2026-10-07 · **Branch:**
`signals-13-one-name-for-two-silences`

## What I completed

§17 of [`docs/signals.md`](../docs/signals.md):
[`src/signals/silences.ts`](../src/signals/silences.ts), published from
`@jam-overture/loom/signals`.

It is the open finding this lane filed twelve hours ago and recommended taking
next, and the maintainer left no comment pointing elsewhere. Five readings in
this subsystem publish a closed set of reasons a figure is absent, each written
by whoever was writing its module, and a window with no page views is
`nothing-measured` to one set and `unmeasured` to another. The filing's remedy
was **one exported mapping rather than a renaming**, because four accepted
records would have to be amended to rename and each set's names are right where
they are.

The mapping is built and the finding is closed. It is the tenth thing taken out
of what this subsystem already knows rather than collected: **nothing was added
to a payload, a browser, a column, a store or the vocabulary of kinds**, and the
broadcaster was not touched.

### The filing was right about the remedy and wrong about the problem, in the direction that mattered

Two things the finding did not have, and the second decides the whole shape.

**The sets are five, not three.** `PaceSilence` is the one it missed, and it is
the one that forced a second axis: its three members are about **one part**
where every other set's are about a page or a pair.

**One name already meant two different things.** A copy reading's `unmeasured`
is *the window's counters report no views of this revision* — `views === 0` on
the node rows. A share-of-readers reading's `unmeasured` is *there is no
page-view row at the door for this revision* — the row the join went looking for
was not there. They are read off different rows, and a deployment can be in
either without being in the other: the node counters hold a window of readers
while the door row is missing, which is exactly what the first reading of a
deployment upgraded past §8 looks like.

So the table of synonyms the filing said a portal would otherwise keep **would
have mapped those two together**, and would have been wrong in the direction
that hides a fault: *nobody has read this page*, printed over a page several
hundred people had read. A vocabulary that recorded only *these two names are
one state* would have been as misleading as none.

### Which is why a silence has two parts

The condition it reports, and the subject that condition is true of. Nine
conditions over the fifteen members, and three subjects — `page`, `part`,
`comparison`.

**That is why renaming could not have settled it, and I think this is the useful
result of the run.** The two spellings the filing named are *the same condition
said of different things*. A comparison names no side — `nothing-measured` is
*one of the two windows held no page views* and does not say which — while a
copy reading's `unmeasured` is a fact about the page on the screen. Renaming
them to one name would have licensed a card drawing *nothing has been measured*
over a page whose own window was busy, because it was the other side that was
quiet. Two names are not synonyms when one of them is about twice as much.

`relateSilences` therefore answers in three rather than two: `one-state` (one
sentence serves both), `one-reason` (one condition, two subjects — worth two
sentences and never one), `unrelated`. `distinctSilences` is the one operation
built on it, and it is the call a card makes.

## Decisions I took that the step did not specify

**The subject is a property of the reading, not of the silence.** This was the
first shape's mistake and finding it out is most of what the design is. I began
with `subject` as a field per condition, and it came out **uniform across every
member of every set**: every reason a copy reading gives is about its page,
every reason a pace reading gives is about one part, every reason either
comparison gives is about the pair. A field per condition would have been the
reading's own identity written nine times with nine chances to write it
differently, so it is one table over the five vocabularies instead — which says
something true the field form obscured.

**No discriminated union of every silence.** The obvious API is one `AnySilence`
with a tag so a caller can hold them heterogeneously. I refused it because it
moves the tagging to the caller, which is where it can go wrong: a surface that
tagged a `ReachSilence` as a copy reading's would get a confident and wrong
answer out of exactly the mapping that exists to prevent one. Five functions,
each taking one union, cannot be called with the wrong set, and heterogeneity is
wanted only *after* the mapping, where the difference has already gone.

**`distinctSilences` takes nulls and drops them.** Every reading's `silence` is
`T | null` and most of them are `null` on a healthy deployment, so the shape of
the real call is a list of maybes. Refusing them would make every caller write
the same filter with the same type predicate.

**It keeps the first reading's vocabulary when two collapse**, so a surface can
still print that reading's own sentence. Each set's `describe*` stays the right
thing to show for one reading; `describeSilenceCondition` is the sentence for
the *state*, which is what is wanted when speaking about two readings at once.

**No ordering of the subjects, and no rule that a wider state suppresses a
narrower one.** Tempting, and refused: nothing has drawn one of these cards yet,
both sentences are true, and a framework that hid one of them would be deciding
a layout from inside `src/`. Named in the record as what this deliberately does
not do.

**`ReachSilence.unmeasured` keeps its name.** 0229's sentence for it is right
and it is the name an operator has already seen. What is added is the statement
that it is not the other `unmeasured`.

## Records

**[0240](../decisions/0240-a-silence-is-a-condition-and-a-subject-and-the-two-names-for-one-state-were-not-synonyms.md)
— A silence is a condition and a subject, and the two names for one state were
not synonyms.** Accepted. **Nothing is superseded**, which is the point: 0224,
0229, 0230, 0235 and 0239 each decided what its own reading withholds and why,
and every member of every set still reads correctly in the sentence it was
written for. This is a statement across them, which is what a mapping is.

0240 was free on `main` and on both open branches (#544 and #545 add no record),
so there was no number to work around this time.

## Findings

**Closed one** — *two names for one silence, now in three modules*, this lane's
own, filed twelve hours ago. Closed in place under the convention the ledger
uses, with the original status kept below it and the two things the filing did
not have written into the closure.

**Filed two.**

1. **For `Loom portal`** — one sentence per state on a reader card rather than
   one per reading, with the call, and the one pair of `unmeasured`s never to
   collapse. Nothing is blocked; the call is one line per reading.
2. **For `Loom daily build`** — 0240 says *nine conditions over fifteen
   members* and *three subjects*, and all three are counts of lists in
   `src/signals/`. `src/record-claims.test.ts` is the instrument built for
   exactly that kind of sentence, and it is at `src/` root, which the lane table
   makes the framework's. **Filed rather than done**, with the two registry
   entries written out ready to paste. I considered doing it — the registry
   decides nothing about the framework and holds claims from every lane by
   construction, so *follow the content* arguably points the other way — and
   decided the rule as written is a directory boundary and my brief says file,
   not do. The in-lane alternative, having `silences.test.ts` read the record
   itself, is worse: two spellings of one rule, which is the mistake this
   repository has written down three times.

**Not closed, and not raised beyond this line:** the 1 October `fetch` hole in
`completed` is still the maintainer's.

## Test numbers, measured

`pnpm install && pnpm verify`, on this branch, **green, exit 0** (status written
to a file as its own last act, then read in a separate command):

| | Files | Tests | Failed | Skipped |
| --- | --- | --- | --- | --- |
| Runtime (`src/`) | 189 | 4,145 | 0 | 0 |
| Application (`apps/loom`) | 407 | 7,221 | 0 | 0 |

`findings:check`: 1,058 findings, 0 malformed. `prerender:check`: 126
prerendered pages, 1,584 text junctions, 0 run together, 3 metadata
conventions, 0 unserved.

`src/signals/silences.test.ts` is **33 tests**, all new. Nothing was weakened,
skipped or marked todo anywhere, and no existing test changed.

### The eight planted defects

Each was planted alone against the finished suite, and each was caught.

| Defect planted | Tests failed |
| --- | --- |
| a reach reading's `unmeasured` collapsed onto `no-view-reported` | 4 |
| `relateSilences` ignores the subject and answers `one-state` | 3 |
| `distinctSilences` dedupes on the condition alone | 1 |
| `distinctSilences` keeps the later reading's vocabulary | 5 |
| a comparison's subject written as a page | 4 |
| nulls kept rather than dropped | 3 |
| a part nothing reported read as a part that says nothing | 1 |
| a condition published that no silence reports | 1 |

### The compile-time half, measured rather than asserted

The mapping cannot drift, and that is `tsc`'s job rather than a test's. I added a
sixth member to `CopySilence` in `copy.ts` and ran `pnpm typecheck`: **exactly
one new error**, `TS2366` in `silences.ts`, naming the function that no longer
returns. A renamed member does the same. `copy.ts` was restored byte for byte
afterwards — `git diff` over it is empty, and the only change outside this
branch's new files is one `export` line in `src/signals/index.ts`.

### The double-count case this lane requires

Not a reader counted twice — there is no counter here — but the same state
printed twice, in two voices, about one page. `distinctSilences` of a change
reading's `nothing-measured` beside a copy-change reading's `nothing-measured`
is **one** entry. And the opposite error, which is the costlier one, is tested
from both sides: one condition about two subjects stays two entries, and one
spelling of two conditions stays two entries.

### The half of the suite that keeps the table honest

A test of a table against itself proves it was typed twice. So thirteen of the
33 tests drive the five readings into states they really report —
`copyReadingOf` of an empty window, `pageReachOf` with no door row and with a
row holding appearances and no openings, `readingChangeOf` of two trees,
`copyChangeOf` of a page rewritten end to end, `readingPaceOf` of an undeclared
part and of a part nobody reached — and map the silence that actually comes
back. One of them is the pair itself: one reading of one window, counters full
of readers, no row at the door, where the copy reading is silent about nothing
and the reach reading says `unmeasured`.

## Browser cost

**Zero bytes added.** The imports in `silences.ts` are **types only**, so the
module does not survive into any bundle at all, and nothing in this branch is
reachable from a browser entry point. `git diff --stat origin/main -- src/signals/broadcast.ts`
prints nothing and `browser-weight.test.ts` passes unchanged.

Measured on this branch for the record: the broadcaster bundles to **6,477 bytes
minified** (esbuild, ESM, from `dist/signals/broadcast.js`) and **2,944 bytes
gzipped**, byte for byte the figure the last five runs measured.

**One thing worth knowing for the next run that takes this measurement.**
`gzip -9` on the *file* gives 2,944 and `gzip -9 -c` from *stdin* gives 2,956 on
byte-identical input, because the first stores a filename and mtime in the
header. Twelve bytes, and it reads as a regression. The reported figure is the
file one, which is what every previous report measured.

## Cross-lane diffs, named

- `apps/loom/app/(docs)/_lib/api/reference.generated.json` — generated with
  `pnpm --filter @loom/app docs:api`, **after** `pnpm build`, which the previous
  run in this lane learned the hard way.
- `decisions/README.md` — generated with `pnpm decisions:index`. It prints its
  usual notes for the holes at 0123–0154 and nothing else; the 0236 note the
  last run saw is gone, that branch having merged.

Everything else is `src/signals/`, `docs/signals.md`, `FINDINGS.md`, the record
and this report. No existing module changed except one `export` line in
`src/signals/index.ts`.

**Open branches, checked before branching and after `git fetch`.** #544
(`portal-54-how-many-people-were-there`) and #545
(`demo-41-the-way-back-is-not-a-way-on`) are open and **neither touches the
signal path** — #544 is entirely under `app/(portal)/`, #545 entirely under
`app/(demo)/`. Neither adds a decision record. The files I share with them are
`FINDINGS.md`, which is union-merged and which I appended to without reflowing,
and `reports/`, where no name collides. This branch is off `main` and stacks on
nothing.

## The parked door

**Per-reader identity is neither cheaper nor dearer for this change, and this is
the one place in the subsystem where it would show up as a name rather than as
arithmetic.** Three conditions here are about there being no denominator —
`no-arrivals-counted`, `no-openings-marked`, `no-window-folded` — and all three
are states of a *page-view* counter. An identified intake would add states about
a *consent record* rather than about a row: *collection was refused for this
deployment*, *this batch cannot show which decision allowed it*. Those are new
conditions in this vocabulary, not changes to the nine, and the mapping takes
new conditions by adding to a list.

What it does **not** do is make the door cheaper to open, and nothing here makes
it dearer. No condition assumes anonymity and none would have to be withdrawn.

## Open questions

**1. Nothing blocking.** Everything in §17 is built, tested and on this branch.

**2. The registry claim is one paste if you want it now.** The finding for
`Loom daily build` carries the two entries written out. My recommendation is to
let that lane take it on its next run rather than have me cross the boundary —
it is fourteen lines with no behaviour in it, and the rule being literal is
worth more than the two days of an unchecked number word. Say the word if you
would rather I just did it next run; I will not without hearing from you.

**3. Carried over, neither blocking.** The region floor is one constant if 25 is
not your number, and 240 words a minute is the other. Whether the reader-signal
half of `docs/deployment.md` is this lane's is still one line of your reading;
this step added no environment variable, so `docs/signals.md` carries everything
new.
