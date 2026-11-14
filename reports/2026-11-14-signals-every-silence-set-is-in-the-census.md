# Every silence set is in the census, and a sweep is what says so

**`Loom signals`, 14 November 2026 (morning run).** One unit, built and green:
the census over this subsystem's silences now reaches every set in it, and a
sweep over the directory's source is what keeps that true. Branch
`signals-90-every-silence-set-is-in-the-census`, one record
([0397](../decisions/0397-every-silence-set-in-the-subsystem-is-mapped-and-a-sweep-is-what-makes-that-true.md),
Accepted), five findings filed and one older entry closed.

## What I completed

`silences.ts` publishes the census 0240 decided on: every reading here has its
own closed set of reasons for saying nothing, and the census says which
**condition** each name reports and what **subject** that condition is true of.
It is what lets a card drawing two readings tell two spellings of one state from
one spelling of two states.

**It is a hand-written table, and nothing looked for a set it had never heard
of.** So a set that landed beside it and was never added was invisible — no test
failed, no type complained, and the module went on claiming to map everything.
Two had accumulated:

| set | published | days outside the census |
| --- | --- | --- |
| `DayShapeSilence` (§82, 0389) | 10 November | 4 |
| `SenderSilence` (§88, 0393) | 13 November | 1 |

The first was **filed as a gap by the run that created it**, with three options
and a stated preference. The second was added by **this lane** three days later,
and nobody noticed the gap had just widened. That is the fact that decided the
shape of this unit: the entry was correct, visible, owned and unactioned, and the
lane that filed it was the one that widened it. A note was not the remedy.

So the artefact is **`src/signals/silence-sweep.test.ts`**. It reads this
directory's source, finds every `export type …Silence` whose alias is a union,
and then resolves that set's own published members and its census entry through
`index.js` — so a set is checked against what the subsystem exports rather than
against a list the test keeps. The two mappings below are what it found, not what
it is for.

Nothing is collected, stored, sent or counted. It is the twenty-fifth reading or
table taken out of what the subsystem already holds: no payload field, no
counter, no column, no table, no byte on any wire, and nothing in a reader's
browser.

## The decisions I took that were not specified, and why

**Three conventions are now checked, and all three already held.** A set
publishes its members as `NAME_SILENCES`; a set is mapped by a `meaningOf…`; and
**a set declared in `foo.ts` is the vocabulary `foo`**. Twenty-two of the
twenty-four held the third by accident of good naming. Making it a rule is what
lets the other two be checked from a file name, and it is the only thing in this
unit that constrains a future run: renaming `library-senders.ts` without renaming
its vocabulary now fails. That seemed a cheap price — the vocabulary is the name a
surface prints, so the two moving together is what a reader of a card would
expect anyway.

**A set is found by the shape of its alias and not by its members, and this is
the one place I got it wrong first.** The obvious predicate is *a union of string
literals*. It found **eighteen of twenty-four** and passed its own suite, because
six sets open on another set rather than on a name of their own —
`KindActionSilence` begins `| KindReachSilence`, which is the reuse 0256 and 0265
argued for. It would have passed for ever while silently excluding exactly the
sets this census exists to relate. A sweep that can be wrong in the direction of
finding less is worse than no sweep, so the discriminator is the alias: a set is a
union, and a row type carrying a silence is an object. Both halves are mutations
below, and both are killed.

**`rhythm` brings the fifth subject, `series`.** A fold of an hourly series into
the hours of a day is silent about a run of hours, which is not a page, a part, a
pair or a kind. I tried `range` first and it is wrong: a range is a pair of
instants and cannot be empty of rows, so neither of the set's two reasons would
be about it. It is the series, because both reasons are facts about what was
handed in.

**It brings both of its conditions, and they are the first here about a clock.**
`no-hour-counted` is a series holding no hour at all; `no-hour-settled` is a
series holding hours not one of which is over. The second is **the only state in
this table that resolves itself if nothing is done** — a deployment read inside
its own first hour — and every other condition is a state of the deployment, the
window, the shape of the page or the questions it wrote, none of which changes
because time passed.

**`no-window-folded` could not serve, and this is the pair that mattered.** The
10 November entry hedged towards it — *`no-window-folded` or its neighbour*. That
condition asserts that readers arrived and the rollup has not caught up, and
three of the four ways a run of hours can be empty have no rollup to run: nobody
came, the range ended before counting began, the range is older than what is
kept. Collapsing them would print *your counting is behind* at a deployment with
no readers.

**`library-senders` reuses two conditions and brings one.** `unplaced` is the
library census's `nothing-of-the-kind`; `unwitnessable` is `nothing-inside`, the
eleventh set's condition said of the one question a part's own report can be
checked by. Both are asserted `one-state` with their originals rather than
described as such.

**`unwitnessed` is `no-reach-below` and not `no-reach-reported`, and this is the
sharpest judgement in the unit.** The cheap reading is that a placement nothing
reported reach under is a placement reporting no reach. It is not: that condition
is about the subject's **own** counters and its remedy is a sender to fix, and
this one is about the parts **underneath** and its remedy is to come back in a
week with readers. A reading that conflated them would publish *this component is
silent* about a component nobody has stood under — which would undo 0393's whole
design, in the one place a card reads the census rather than the row.

**`rhythm.ts` gains `DAY_SHAPE_SILENCES`.** It was the one set in the directory
publishing no members, which is why nothing could enumerate it — including the
census and including the sweep. I did **not** add a `describe…Silence`: three
sets here publish none, and a sweep that failed on the state of the tree it was
written against is a sweep nobody can land. The thinness is filed instead, with a
recommendation and the order to do it in.

**The counts come out of the module's prose.** `silences.ts` opened by saying how
many sets and how many members there were — twenty-one and a hundred and
eighteen, against twenty-four and a hundred and fifteen. Both false, in a module
whose own lane has filed four entries about remembered figures. The sentence
carries no number now and the claim it was making, that there are fewer
conditions than members, is an assertion in the sweep. **That is the pattern
rather than the correction:** a figure the test cares about should be measured
there.

## Records added

- `decisions/0397-every-silence-set-in-the-subsystem-is-mapped-and-a-sweep-is-what-makes-that-true.md`
  — **Accepted.** Ten clauses, eight alternatives recorded with their reasons.
  Nothing superseded: it contradicts no accepted record, changes no schema and
  adds to 0240's table rather than amending what it decided.

**0397 is the next number free on `main` and on every open branch.** `main` is at
0393; 0394 is claimed twice — by #892 here and by #893 in the framework lane —
and 0395 and 0396 are claimed by #856.

## Findings filed and closed

Five appended, none reflowed, and one older entry closed by the first of them:

1. **The census is swept, and the set that filed the gap had been joined by a
   second nobody noticed.** Closes the 10 November entry, takes the option it
   preferred, and records the two it rejected with its own reasons. The part
   worth reading twice is the predicate that found eighteen of twenty-four.
2. **Three sets publish no `describe…Silence`** — `conversion`, `deployment`,
   `deployment-change`. Open, owned here, with the recommendation to add the
   three *and then* make the sweep require one, so the rule lands green.
3. **The hourly series publishes two statements about a clock as fields.**
   `clipped` and `begins`, which the 10 November entry predicted. Filed as a
   boundary and **not** as an argument for moving them: they are fields on a
   reading that answers.
4. **Two entries in this file read as open and are not** — 8 November's
   `parentId` entry (closed by §80) and 9 November's fix-list-ordering entry
   (answered by §81 and §83). Closed on filing. This one cost the run an hour of
   its queue, which is why it is written down.
5. **Three new names on `@jam-overture/loom/signals`**, owned by `Loom docs`,
   with the sentence the page would want. Fifth entry of its kind from this lane.

## Real test numbers

`pnpm verify` **EXIT=0** on the committed tree.

| | |
| --- | --- |
| Framework suite | **294 files, 7,087 tests passed** — one new file and **+14 tests**, all mine |
| Application suite | **496 files, 7,983 tests passed** — untouched by this branch |
| Findings | **1,553 findings, 0 malformed** |
| Prerender | 139 pages, 2,101 text junctions, 0 run together |
| Mutation check, by hand | **18 run, 17 killed, 1 survivor** |

`main` is 293 files and 7,073 tests on the same scope: `silence-sweep.test.ts` is
the new file with ten tests, and `silences.test.ts` goes from 55 to 59.

**Nothing failed, nothing was skipped and no test was weakened.** The first full
gate was green; the two reds during the work were both mine and both in the test
file — a fixture that handed `arrivalSeriesOf` a `begins` and so produced a
series that was not empty, and two member names that do not exist in the sets I
reached for (`DeploymentSilence` has no `uncounted`, `CopySilence` no
`unreached`). Both were the test being wrong about the subsystem, which is what a
suite driven through real readings is for.

**The eighteen mutations**, because the list is the evidence and three of them
are the ones this unit exists to get right:

*The sweep* — a set is a union of string literals (the first predicate, which
found 18 of 24); a set is anything, so a row type is one too; the members const
named without its plural; the vocabulary taken from a constant rather than from
the file; the leading doc comment not stripped before the alias shape is read;
the overlap floor dropped.

*The mappings* — an empty run of hours mapped to the rollup being behind; the two
clock states made one; nothing reported below a part mapped to the part reporting
no reach; a kind with nothing inside it mapped to a kind nothing places; a day
shape made about the page; the fifth subject unpublished; the new condition
unpublished; the new vocabulary unpublished; two conditions sharing one sentence;
a set's members mapped through another set's vocabulary.

*The set* — `rhythm` publishing no members; `rhythm` publishing one of its two.

**The survivor, stated plainly: `expect(members).toBeGreaterThanOrEqual(115)`.**
Relaxing it to `0` leaves the suite green, because the assertion beside it
(`members > SILENCE_CONDITIONS.length`) still holds. It is a ratchet and nothing
double-checks a ratchet — its job is to fail if a set silently loses members,
which `sets.length >= 24` does not cover. I kept it and am reporting it rather
than deleting a check I cannot kill a mutation of.

## Byte cost

**Nothing I added runs in a reader's browser.** `broadcast.ts` and its import
graph are untouched, and the bundle measures `main`'s figure to the byte:
**7,852 minified / 3,458 gzipped**, re-measured on this branch by the gate's own
method, of ceilings of 8,000 and 3,600.

**The published names index: 50 bytes for three names**, measured by building the
file both ways rather than remembered — **27,462 bytes over 2,131 names on
`main`, 27,512 over 2,134 with `DAY_SHAPE_SILENCES`,
`meaningOfDayShapeSilence` and `meaningOfSenderSilence`** — leaving **12,488** of
the 40,000.

## Open questions

**Nothing blocking.** Four worth the maintainer's eye, none of which holds this
branch:

1. **#856 is still the only thing from this lane waiting on you**, and it is on
   one question, now four days old: whether an hourly rate should be published
   now that the reason its refusal gave has a remedy (0396). **Recommend yes**,
   as a partial supersession of 0362 clause 9 and nothing else of it; a refusal
   is equally defensible and the record would be marked `Refused` rather than
   left open. It is green and conflict-free as of last night, so either answer
   lands it.
2. **The `describe…Silence` gap is three short functions and is worth doing** —
   finding 2 above. I did not take it in this unit on purpose, and would take it
   as a small unit of its own unless something outranks it.
3. **The governance questions from 12 November are still open**, and I made the
   same call a fifth time today: a measured figure in `docs/` corrected in place
   with the old value and date visible, reports left as dated accounts. **Same
   recommendation.** The new wrinkle this run adds is smaller and cheaper: a
   *count* in a module's prose should not be corrected at all, it should be moved
   into the test that cares about it, which is what clause 10 of 0397 does.
4. **The next unit, unless something outranks it.** #892's recommendation stands
   and I did not take it today: **whether a silent component is worth fixing**,
   the reader-weighted version of §88's census. I left it because it needs
   `senderStatesOf`, which exists only on #892's branch — spelling it a second
   time here is the exact failure `subtrees.ts` was extracted to prevent. It is
   the unit for the first run after #892 merges.

## On the parked door

Nothing in this unit touches per-reader identity and nothing in it makes adding
it later more expensive. A census over vocabularies has no reader in it at any
point; an opt-in identified batch would change no clause of 0397. The one thing
worth noting in its favour: a consent decision that could not be read would be a
silence like any other, and there is now a subject (`series`) and a sweep that
would make a new set for it impossible to forget.

## Process

Both open pull requests from this lane were read before starting (#856, #892),
along with #890 and #893, and this branch is off `main` and stacked on nothing.
**No code overlaps either.** #892 touches `library-senders.ts`, `subtrees.ts` and
a new `library-senders-change.ts`; #856 touches `acted.ts`; this touches
`silences.ts`, `rhythm.ts` and a new test file. `docs/signals.md` will conflict
with #892's §89 in the ordinary way — both append a section at the same place —
and the resolution is to keep both sides with §89 before §90.

The shared files are the usual four: `FINDINGS.md` appended and never reflowed,
`docs/signals.md` appended, and `decisions/README.md` and
`reference.generated.json` regenerated.

**Nothing self-scheduled, nothing subscribed, no check-in armed, no polling.**
