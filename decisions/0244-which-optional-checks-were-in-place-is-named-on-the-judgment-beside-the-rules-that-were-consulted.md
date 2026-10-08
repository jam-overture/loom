# 0244. Which optional checks were in place is named on the judgment, beside the rules that were consulted

**Status:** Accepted
**Date:** 2026-10-08
**Section:** §2 → §5

> **Why this number.** `0243` is the highest record on `main`. The three open
> pull requests claim `0241` (#548) and `0242` (#553) — both numbers `main`
> already holds, which is the clash filed on 8 October — and #554 adds none. So
> `0244` is the next number free everywhere.
>
> **Why `Accepted`.** It contradicts no `Accepted` record and touches neither the
> tree schema nor the delta model, so no built code migrates. 0179 is the record
> that put the props vocabulary off the policy, and this does not move it back:
> the seam is still a function handed to the composition root, and what is
> recorded is that it was handed over. A deployment that wires nothing keeps the
> behaviour it has, and the one new field on a recorded type is optional for the
> reason the schema gives.

## Context

`policyFingerprintOf` exists so that a reader of two judgments can prove they
were decided under the same rules (0048). A reader hears that as *the same thing
judged both*, and it is not quite that.

[0179](0179-what-a-primitive-accepts-is-a-vocabulary-the-write-path-is-handed-not-a-field-on-a-policy.md)
keeps a props vocabulary off the policy on purpose, because it is a function and
a policy is a Zod-parsed serialisable value with a digest over it. The
consequence was written down in the same breath, as a finding this lane filed
against itself on 21 September: a deployment that wires one on Tuesday produces
dispositions on Wednesday whose fingerprint is byte-identical to Monday's, and a
reader comparing the two weeks is told the policy did not change — which is true,
and is not the whole truth about what judged the change.

That entry called it a stated limit rather than a gap waiting on a fix, and gave
the reason it was worth an entry at all: it was the first unfingerprinted input
that could turn an `accepted` into a `rejected`. The interpreter, the repairer and
the renderer's validator decide what a proposal *says*; this one decides whether
it is allowed.

**Two things have happened since.** 0208 wired a `BindingReader` into the write
path the same way, so there are now two such inputs rather than one, and the
entry's own argument for why it mattered has doubled. And
[0241](0241-a-policy-is-a-logged-object-and-what-changed-is-a-view-over-the-log.md)
made the policy a logged object, so a host can now prove exactly which revision
of which policy judged a change — which sharpens this rather than settling it. The
more precisely the rules are pinned, the more a reader trusts that the pinning is
the whole account, and `calibrationOf` is where that trust is spent: it segments
survival rates by policy, carries the distinct fingerprints per segment, and the
portal reads `rulesetContinuityOf` over them to tell an operator the gate held.

A refusal rate that moved in the week somebody wired a registry into the write
path is either explained by that wiring or is a fault. Nothing in this repository
could tell those apart.

## Decision

**A judgment records which of the write path's optional checks were in place,
beside which rules were consulted.** Four parts.

**1. The checks are named, not digested.** `WriteCheck` is `props` or
`bindings`, and `Disposition.wiredChecks` is a list of them. A policy has
fourteen knobs of host data, so what it contains can only travel as a hash; the
seams are two, their names are Loom's own, and a list of them is something a
person can read against their own composition root. The fingerprint's own doc
comment makes the argument for the other side of the trade — *a digest is not
something a person can look up in their own configuration* — and here there is
nothing to look up.

Naming also means no shape half is needed, which is the one structural way this
differs from a fingerprint. A fingerprint carries its shape in front of the colon
because adding a knob would otherwise change every digest in the corpus and make
every host look as though it had edited a policy it never touched. Adding a
*check* changes no existing list: a judgment from a version with two checks that
wired both reads identically to one from a version with three that wired the same
two, and they compare equal — correctly, because a check that was not wired and a
check that did not yet exist were applied exactly as much as each other.

**2. The assessment is what says so, and the Gate stamps what it says.**
`assessChange` is the last function that can know, because a seam arrives there as
an argument and is a closure by the time anything else sees it. So
`ChangeAssessment.wiredChecks` is a fact that function holds about its own call,
and the Gate copies it onto the disposition the same way it copies the policy it
consulted — not because the Gate consulted the seams, which it does not, but
because the assessment is the record of what did.

This is why `assessChange`'s two seam parameters lost their defaults. They now
fall back to the same two no-ops inside the call, so no decision changes; what
changes is that *handed nothing* and *handed the sentinel* are two different
calls, and the record can report which arrived instead of reporting what the
signature filled in.

**3. Presence, and never behaviour.** A host that hands `EVERY_TYPE_UNDECLARED`
across the props seam is recorded as having wired a props check, because it did.
The alternative was to recognise that one sentinel and quietly believe every
other no-op a host might write, which would make the record mean *this seam does
something* in some cases and *this seam was handed over* in the rest.

The same bound holds at the other end: the record cannot see a wired seam's
answers change. A props vocabulary is `propsVocabularyFor(registry)`, so
tightening one primitive's schema changes what it refuses while this record stays
identical. The runtime cannot read a function, and a record that implied
otherwise would be worse than one with a single clear meaning.

**4. The empty list is written; the absent field means something else.** Both
states are reachable and they are not the same: `[]` is *asked, and none were
wired*, and the field missing is *judged before the Gate recorded this*. This is
the opposite of `irreversibilityReasons`, which is omitted when nothing fired
because `reversible` already disambiguates the absence. Nothing here plays that
part, so the list is always written and the schema leaves the field optional and
never defaults it — `policyFingerprint`'s bargain rather than `policyId`'s, for
`policyFingerprint`'s reason: there is no honest stand-in for a fact nobody wrote
down.

`PolicyCalibration` grows `checkSets` and `unrecordedChecks` beside
`fingerprints` and `unfingerprinted`, with `checksContinuityOf` reading the
first as `rulesetContinuityOf` reads the second. A segment with one fingerprint
was judged under one set of rules; whether it was judged by one write path is the
second half of that sentence, and now a readable one.

## Consequences

**A reader of two judgments can tell a rewired runtime from an edited policy, and
neither from the other.** The two axes are independent: an edit moves the
fingerprint and leaves the list alone, a wiring moves the list and leaves the
fingerprint alone. A calibration segment can now be constant in both, in one, or
in neither, and the three readings are distinguishable.

**The deployment that benefits most is the one that has not wired anything yet.**
Every judgment on it records `[]`, and the day somebody wires a registry the
record says which day. Without that, the arrival of a check is the one change to
a write path that leaves no trace anywhere.

**Three test fixtures in `apps/loom/app/(portal)/` gained two keys each**, because
`PolicyCalibration` is a computed report and a field on it cannot honestly be
optional — a report is never read back from storage, so *absent* has no meaning
there to borrow. Filed for `Loom portal` rather than left to be found in a diff.

**Nothing on any surface shows this yet.** The portal's `readRuleset` still reads
`fingerprints` alone, which is correct and incomplete, and the row it would need
is theirs to write. 0200's control is the other half of the same shape.

**The repairer stays out, deliberately**, and it is the input a reader is most
likely to expect here. Wiring one changes observed refusal rates considerably —
a refused proposal gets one more attempt — but it changes no single judgment: a
disposition is a judgment of one proposal, and a disposition naming an input that
did not take part in it would be recording the wrong thing. Its effect is already
partly legible through `repairOf` and `repairFailure`, and only when it fires.

**The interpreter stays out for a stronger reason:** its whole contribution to a
refusal is `confidence`, and the disposition records that as a number. An input
whose effect is already on the record does not need a second entry saying it was
present.

**A third check will be a compile error until it is named.** `SEAM_OF` is mapped
over `WriteCheck`, so a member added to the schema has nowhere to hide; the other
direction — a seam added to `WriteCheckSeams` that no check reads — is a compile
error in `checks.test.ts`, where the correspondence is asserted from the seam
side. Between them there is no way to add either and have the record quietly stay
the same size.

## Alternatives considered

**A second fingerprint over the wired seams**, which is what the 21 September
entry proposed first. It was the obvious shape and it is worse for this subject
in two separate ways. A digest over two bits of presence is a string that hides
four states a person can simply be told; and a digest would need a shape half, so
the day a third check lands every record in the corpus becomes incomparable to
every other — the exact failure the policy fingerprint's shape half exists to
prevent, imported for no benefit, because the thing being compared here is a list
of names rather than the contents of a host's configuration.

**A `checkDeclaredProps` boolean on the policy**, the entry's second option.
0179 rejected it under *Alternatives considered* and its reasons have not changed:
a policy that carries a claim about a seam it does not hold is a policy that can
disagree with the runtime, and the fingerprint would then prove a claim rather
than a fact.

**Recording what the seams concluded rather than that they were present** — the
count of props a vocabulary refused, say. It is a measurement of the change rather
than of the apparatus, the analysis already carries it, and it answers a different
question: *this change had no invalid props* and *nothing checked* are both quiet,
and only the second is the gap.

**Folding the checks into the policy fingerprint.** One field, one digest, one
comparison. It would have made every existing fingerprint in the corpus change
meaning, pooled two independent axes into one verdict, and left a reader who saw
`changed` unable to tell a nudged threshold from a wired registry — which is the
same loss 0241 was written to close one level up.

**An enum member for the primitive-type vocabulary**, to make the list read as
*every check the write path does*. It is `registeredPrimitiveTypes`, a policy
field, already inside the fingerprint and already reading an empty list as a host
that has not spoken (0173). Recording it twice would leave a reader unable to tell
which of the two records to believe.
