# Framework — the checks that were wired

**Routine:** `Loom framework` (`Loom daily build`) · **Date:** 2026-10-08 (evening) ·
**Branch:** `framework-59-the-checks-that-were-wired`

## What I completed

A judgment now says which of the write path's optional checks were in place when
it was made, beside which rules were consulted. It closes this lane's own
21 September finding — *a props vocabulary is not in the policy fingerprint, so
two dispositions either side of wiring one read as identical* — and is recorded as
[0244](../decisions/0244-which-optional-checks-were-in-place-is-named-on-the-judgment-beside-the-rules-that-were-consulted.md).

One new module and four edits, all in this lane:

| | |
| --- | --- |
| [`src/runtime/checks.ts`](../src/runtime/checks.ts) | `WriteCheck`, `wiredChecksOf`, `canonicalChecksOf`, `checksContinuityOf`, `describeWiredChecks` |
| [`src/runtime/assessment.ts`](../src/runtime/assessment.ts) | `ChangeAssessment.wiredChecks` — the fact, recorded where it is held |
| [`src/runtime/gate.ts`](../src/runtime/gate.ts) | stamped on every disposition, beside `policyFingerprint` |
| [`src/runtime/disposition.ts`](../src/runtime/disposition.ts) | `wiredChecks?`, optional and never defaulted |
| [`src/telemetry/calibration.ts`](../src/telemetry/calibration.ts) | `checkSets` and `unrecordedChecks` on a segment |

**Nothing on the decision path changed.** No rung was added or reordered, no
threshold moved, nothing was added to a payload, a tree, a delta or the vocabulary
of kinds, and a deployment that wires neither seam produces exactly the
dispositions it produced yesterday with one more field on them.

## Why this was worth a run

`policyFingerprintOf` proves two judgments consulted the same rules. A reader
hears that as *the same thing judged both*, and it is not quite that.

0179 keeps a props vocabulary off the policy on purpose, because it is a function
and a policy is a Zod-parsed serialisable value with a digest over it. So **a
deployment that wires one on Tuesday produces Wednesday's judgments under a
byte-identical fingerprint.** The policy did not change. What decided did.

The 21 September entry called that a stated limit rather than a gap, and gave the
reason it was worth writing down: it was the *first* unfingerprinted input that
could turn an `accepted` into a `rejected`. Two things dated it. 0208 wired a
`BindingReader` the same way, so there were two by the time anybody read the entry
again. And 0241 — this lane's own work this morning — made the policy a logged
object, which sharpens this rather than settling it: the more precisely the rules
are pinned, the more a reader trusts that the pinning is the whole account.

That trust is spent in a specific place. `calibrationOf` segments survival rates
by policy, carries the distinct fingerprints per segment, and the portal's
`readRuleset` reads `rulesetContinuityOf` over them to tell an operator the gate
held. A refusal rate that moved in the week somebody wired a registry into the
write path is either explained by that wiring or is a fault, and nothing here
could tell those apart.

## The same two judgments, read both ways

A real run, not a mock-up. Two `composeChange` calls over one tree and one
policy, with a props vocabulary wired in between:

```
two judgments, one policy, a registry wired in between them

  day         decision  policy    fingerprint               checks
  Monday      accepted  default   b22582aa:a1ae662472a7ee8b  none
  Wednesday   accepted  default   b22582aa:a1ae662472a7ee8b  props

  what the fingerprints say: single
  what the checks say:       changed
```

The fingerprints are identical and `single` is the right answer about them. The
last line is the sentence nothing in this repository could say this morning.

**There is no screenshot, because nothing on any surface changes in this branch.**
The transcript is the artefact, and every property it shows is a decision taken
below.

## The four decisions that are the substance

**1. The checks are named, not digested** — and the first draft of this unit was a
second fingerprint, which is what the finding itself proposed. Naming is better
here for two separate reasons. A policy has fourteen knobs of host data, so what
it contains can only travel as a hash; the seams are two, their names are Loom's
own, and a digest over two bits of presence hides four states a person can simply
be told. `policy-fingerprint.ts` makes the argument for the other side of the
trade in its own doc comment — *a digest is not something a person can look up in
their own configuration* — and here there is nothing to look up.

**2. Naming is also why there is no shape half.** A fingerprint carries its shape
in front of the colon because adding a knob would otherwise change every digest in
the corpus and make every host look as though it had edited a policy it never
touched. Adding a *check* changes no existing list: a judgment from a version with
two checks that wired both reads identically to one from a version with three that
wired the same two, and they compare equal — correctly, because a check that was
not wired and a check that did not yet exist were applied exactly as much as each
other. So `checksContinuityOf` has no `incomparable`, which is the only member it
does not share with `rulesetContinuityOf`. A second fingerprint would have
imported that failure mode for no benefit.

**3. The assessment says so, and the Gate stamps what it says.** `assessChange` is
the last function that can know, because a seam arrives there as an argument and
is a closure by the time anything else sees it. The Gate copies the list onto the
disposition exactly as it copies the policy it consulted — not because the Gate
consulted the seams, which it never does, but because the assessment is the record
of what did. This is why the two seam parameters lost their defaults: they fall
back to the same no-ops inside the call, so no decision changes, and *handed
nothing* and *handed the sentinel* stop being the same call.

**4. The empty list is written; the absent field means something else.** `[]` is
*asked, and none were wired*. The field missing is *judged before the Gate recorded
this*. That is the opposite of `irreversibilityReasons`, which is omitted when
nothing fired because `reversible` already disambiguates the absence — nothing
here plays that part. **The deployment this helps most is the one that has wired
nothing**, because every judgment on it records `[]` and the day somebody wires a
registry becomes legible from the record rather than from a changelog.

### What it deliberately does not reach, and what it refuses to include

**It records which checks were wired, never what they concluded.** A props
vocabulary is `propsVocabularyFor(registry)`, so tightening one primitive's schema
changes what it refuses while this record stays identical. Presence is also why
`EVERY_TYPE_UNDECLARED` handed across the seam records as a wired props check: the
alternative was to recognise that one sentinel and quietly believe every other
no-op a host might write, which would make the record mean two different things
depending on which no-op arrived.

**The repairer is left out, and it is the input a reader will most expect to
find.** Wiring one moves a deployment's refusal rate considerably. It changes no
single judgment: it adds an attempt rather than deciding one, and a disposition
naming an input that did not take part in it would be recording the wrong thing.
It is named in `checks.test.ts` as the one optional field on the runtime that is
not a check, so the exclusion is a declaration rather than an omission.

**The interpreter is left out for a stronger reason:** its whole contribution to a
refusal is `confidence`, and the disposition records that as a number. An input
already on the record does not need a second entry saying it was present.

## Found while building

- **The guard rail I wanted cost a lesson, and the lesson was worth more.** The
  first draft moved the two seams into a `WriteCheckSeams` type and left
  `CompositionRuntime` as an intersection — a mapped type over the seams then makes
  a third seam a compile error until somebody names its check, which is the move
  `policy-fingerprint.ts` makes over `GatePolicy`. `pnpm verify` refused it from
  `app/(lessons)/_lib/declarations.test.ts`: **lesson 5 prints `CompositionRuntime`
  whole**, and a type assembled from two files cannot be printed whole. The
  intersection would have turned a complete quotation into a partial one and
  changed a teaching claim from outside the lane that owns it.

  So the runtime is unchanged and **the guard rail moved to the test side**, where
  it is stronger than the version I lost: `checks.test.ts` enumerates
  `CompositionRuntime`'s own optional fields with a mapped type and names the one
  that is not a check, so a seam added, renamed or removed is a compile error until
  somebody decides which it is — against the runtime's own declaration, with no
  second declaration to drift from it. Filed, because nothing in `src/` says which
  of its types a lesson quotes whole and the only thing that does is a test in
  another lane.

- **Three fixtures in the portal's lane gained two keys each**, and the field could
  not honestly be made optional to avoid it: `PolicyCalibration` is computed and
  never read back from storage, so *absent* has no meaning there to borrow. Filed
  so the owner reviews the edit rather than finding it in a diff.

- **A `flatMap` over arrays flattened the sets into one list**, found by reading my
  own line rather than by a test — `Array.from(map.keys()).flatMap((key) =>
  map.get(key) ?? [])` types as `WriteCheck[]`, not as a list of sets, and the `??
  []` is what makes it compile. It is now the look-it-back-up shape
  `vocabulary.ts` uses, and it is row 13 of the matrix below.

- **Two of my own tests were tautologies and I caught them on a re-read.** One
  asserted `checksContinuityOf` returns `single` for two identical lists while
  claiming to be about versions with different numbers of checks; the other
  asserted `wiredChecksOf({})` equals itself. Both now assert the property they
  were named for — that the comparison is over names and carries nothing about the
  version that wrote them, and that an edit moves the fingerprint while a wiring
  moves the list, in both directions.

- **The gate-reading trap, caught by having followed the rule, for the fourth
  recorded time.** The harness reported the verify command's exit code as **0**
  while the file it wrote said `EXIT=1` — the status of a compound line is the last
  command's, and the last command was the `echo`. The file won, the run was red
  (the API reference was stale and the lesson above had not been dealt with), and
  the remedy in `docs/routines.md` worked exactly as written.

- **The findings queue is where the work came from, and the brief's plan is still
  spent.** The one-application migration it leads with has been done since
  19 August — `apps/loom` holds the four route groups, `apps/portal` and
  `apps/docs` are retired, sign-in is at the `(portal)` boundary — which is the
  third consecutive run to say so. `(demo)` is `Loom demo`'s by `docs/routines.md`
  and I left it alone. Not re-filed, because the ask to cut that paragraph is still
  open on #547's thread.

## Records

**Added:** 0244 — *which optional checks were in place is named on the judgment,
beside the rules that were consulted*, `Accepted`, §2 → §5.

It supersedes nothing and contradicts no `Accepted` record. 0179 put the props
vocabulary off the policy and this does not move it back: the seam is still a
function handed to the composition root, and what is recorded is that it was
handed over. 0241 is the record this reads against — a logged policy is what makes
the gap worth closing — and this does not change it.

**Numbering.** `main` at `19e0f16` holds records to 0243. The three open pull
requests claim 0241 (#548) and 0242 (#553), both numbers `main` already holds,
which is the clash this lane filed this morning; #554 adds none. So 0244 is free
everywhere and nothing else claims it.

## Findings

**Closed:** this lane's own 21 September entry, *a props vocabulary is not in the
policy fingerprint*. Neither of the two closes it proposed is what shipped, and
the entry's Status says which and why.

**Filed:**

1. **For `Loom portal`** — the three fixtures that gained two keys, and the row
   `readRuleset` could now write. Four shape facts so none of them costs them a
   read: `[[]]` is the healthy state and means *one write path, which wired
   nothing*; `describeWiredChecks` gives the empty set the word "none" for exactly
   the row that would otherwise render as blank space; `unrecordedChecks` is kept
   out of the sets for `unfingerprinted`'s reason; and the record says which checks
   were wired, never what they concluded.

2. **For this lane** — a type a lesson prints whole cannot be assembled from two
   files, and the only check that says so is in another lane's directory. No edit
   outstanding; filed because this lane will refactor a published type again and
   nothing it reads first would warn it.

## Tests

`pnpm install && pnpm verify` — **green, exit 0**, from a deleted `dist` and
`.next`, with the status written to a file as the last thing on its own line and
read in a separate command.

| | base (`19e0f16`) | this branch |
| --- | --- | --- |
| package (`src/`, `tools/`) | 195 files / 4,334 | 196 files / **4,371** |
| application (`apps/loom`) | 412 / 7,385 | 412 / **7,385** |
| findings ledger | 1,074 | **1,076**, 0 malformed |
| prerender | — | **128 pages, 1,586 text junctions, 0 run together; 3 metadata conventions, 0 unserved** |

**Every figure is first-hand.** The base row is not quoted from this morning's
report, which measured a different commit: I stashed the branch, rebuilt, ran
`pnpm test` and `pnpm findings:check` on `19e0f16` itself, and those are its
numbers. `pnpm vitest run` on the two existing files I touched reported 62 and 29
there against 66 and 35 here, and `checks.test.ts` holds 27 — which is the +37
exactly, arrived at as well as quoted.

**The application total is unchanged, and that is checkable rather than
asserted:** the only application files in this branch are the three portal
fixtures, which gained two object keys each, and
`app/(docs)/_lib/api/reference.generated.json`, regenerated with the command its
own failure message names. `git diff -- apps/` adds **zero** `it(`, `test(` or
`describe(` lines.

**+37 tests in one new file and two existing ones**, none weakened, skipped or
deleted, and no existing assertion rewritten. Two doc comments on
`assessChange`'s parameters are new; nothing anywhere was relaxed.

**Seventeen planted defects, seventeen red.** Fifteen were run against
`checks.test.ts`, `pipeline.test.ts`, `gate.test.ts` and `calibration.test.ts`;
the last two are compile errors, confirmed by `pnpm typecheck` with the four
pre-existing `scaffold-fixture` errors excluded.

| | defect | caught by |
| --- | --- | --- |
| 1 | every seam reported as wired whether or not it was handed over | red |
| 2 | nothing ever reported as wired | red |
| 3 | a list left in the order the caller held it | red |
| 4 | a repeat left in, so one set reads as a longer one | red |
| 5 | continuity compared without canonicalising, so two spellings are two sets | red |
| 6 | an empty run read as agreement rather than as unrecorded | red |
| 7 | the empty list named for every judgment, whatever was wired | red |
| 8 | the field omitted when nothing was wired, conflating two states | red |
| 9 | the schema defaulting an absent list to empty | red |
| 10 | the seams defaulted again, so the signature reports itself | red |
| 11 | a judgment that recorded nothing folded in as one that wired nothing | red |
| 12 | the sets handed back unsorted | red |
| 13 | the sets flattened into one list by a `flatMap` over arrays | red |
| 14 | the empty set rendered as blank space rather than as a word | red |
| 15 | a check consulted on the confirmation path and not recorded there | red |
| 16 | a third optional seam on the runtime, named as no check | compile error |
| 17 | a third check in the vocabulary with no seam to read it from | compile error |

Rows 7, 8, 10 and 11 are the four that work on the happy path and lie quietly:
each produces a well-formed record that a reader would believe. Row 13 is the one
that was a real bug in a draft rather than a plant, and row 16 is the guard rail
the lesson above cost and then paid back.

## Open questions

**Nothing blocking.** Three worth an answer when somebody has one.

**Should the portal's trust page say this, and in which row?** The data is there
and `readRuleset` still reads fingerprints alone, which is correct and half the
sentence. It is their lane and their call, and the finding gives them the four
facts rather than a recommendation about layout. My own view, offered and not
acted on: a segment whose rules held and whose write path did not is the one
combination worth a sentence of its own, because it is the case an operator will
otherwise explain by blaming the model.

**Is `props` and `bindings` the right granularity, or should a check name its
seam?** The list says `props`, not `propsVocabulary`. A check is what the write
path does and a seam is how a host supplies it, and naming the act rather than the
field is what lets the vocabulary survive a seam being renamed. It also means the
record cannot say *which* props vocabulary, only that one was there — see the next
one.

**Should a host be able to name the apparatus it wired?** 0033 put a contract on
the host — a name identifies content, so a host that edits a policy renames it —
and the fingerprint is the check beside that name. There is no equivalent here: a
host that swaps one registry for another of the same size records `props` both
times. A declared `seamsId` on the composition root would be the same move one
level over, and I did not build it because nothing has asked and a name nobody
maintains is worse than no name. Worth knowing it is the shape of the next
question rather than a gap in this one.
