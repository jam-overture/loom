# 0203. A props vocabulary is handed the props a primitive is handed

**Status:** Accepted
**Date:** 2026-09-28
**Section:** §2

> **Why this number.** `0202` is the highest record on `main`. Neither open pull
> request — #442 and #443 — adds a record, so `0203` is the next number free
> everywhere.
>
> **Why `Accepted`.** It contradicts no `Accepted` record and narrows none:
> 0179's floor is kept exactly as argued, and what changes is which bag of props
> the floor is asked about. It touches neither the tree schema nor the delta
> model, so no built code migrates, and a deployment that wires no props
> vocabulary keeps the behaviour it has byte for byte.

## Context

`Loom lessons` filed a finding on 28 September, found by executing exercise D of
lesson 30 rather than by reading anything: on a deployment that wires 0179's
props floor, inserting a `loom.feed` carrying a correctly spelled binding to a
registered source, with params its schema accepts, comes back `invalid-props`,
**critical**, and the Gate rejects it. A node with nothing whatever wrong with
it.

The message names the cause. `Unrecognized key(s) in object: 'loom:data'`.

Two seams answer *are these props acceptable* and they were answering about
different things.

**The render path splits the runtime's keys off first.** `renderElement` calls
`partitionReservedProps`, hands the primitive's own props to the validator, and
reports anything reserved that nothing read. `render.ts` says why in a sentence
that has been there since 0050: *"Reserved keys are removed from every node's
props, whether or not anything reads them here; a key that reaches a primitive
is a key that primitive has to know about."* Every props schema in the starter
library is `.strict()` on the strength of it, and that is correct — a primitive
that tolerated `loom:` keys would be a primitive claiming to know about a
namespace it never sees.

**The write path did not split them.** `invalidPropsIn` walked the tree a delta
produces and handed `current.props` to the vocabulary as they were.
`propsVocabularyFor` is a one-line adapter onto `registry.validateProps`, which
is the same strict schema the renderer uses. So the floor refused the key the
runtime itself put there, at critical stakes, on every deployment that wired it
— the portal (`portalPropsVocabulary`, and `settingsAreChecked` derived off it)
and marketing's adapt path (`SITE_PROPS_VOCABULARY`).

Three things make this worse than an ordinary bug and they are why it is worth a
record rather than a line in a report.

**It refused precisely what the system asks for.** `interpretation/prompt.ts`
teaches a model to write `{"loom:data":{"<binding name>":{"source":"<id>",
"params":{…}}}}` into a node's props, in those words, and 0181 and 0184 spent two
records making binding names available to it so that it could write new ones. The
floor refused the exact JSON the prompt asks for.

**Nothing noticed for a week.** `introducedInvalidProps` counts only nodes that
were not already failing before the change — a good rule, and 0179 argued it well
(a half-repair must not be refused for the hole it did not make). Its effect here
was that the only changes on bound nodes that passed were the ones on nodes this
check had already condemned. A deployment repointing existing bindings saw
nothing. The first thing to hit it would have been the first *new* binding
anybody proposed.

**The code argued for the defect.** `invalidPropsIn` carried a paragraph
justifying the omission, resting on a claim that is simply false:
*"`partitionReservedProps` lives behind the render boundary and importing it here
would make the write path depend on the renderer's internals."* It does not. It
lives in `src/reserved-props.ts`, beside `json.ts`, and moved there precisely
because a reserved key is a property of a node's props rather than of rendering.
The doc comment was reasoning about an older shape of the tree and nothing
re-read it when the module moved.

## Decision

**A `PropsVocabulary` is handed a node's own props, with the runtime's reserved
keys already removed — the same bag `renderElement` hands the validator, and the
same bag the primitive itself is handed.** The contract is stated on the type
rather than left to each implementation, and `invalidPropsIn` performs the split
by calling `partitionReservedProps`, the one function the render walk calls.

Three things follow, and the third is the one that keeps this fixed.

1. **One implementation, not two that agree.** The split is not reimplemented at
   the write path. Both seams call the same function, so a fifth reserved key
   lands in one module and both seams learn it in the same edit.
2. **A host's own vocabulary gets the guarantee too.** The split is in the walk
   rather than in `propsVocabularyFor`, so a deployment that writes its closure
   by hand — which the SDK explicitly invites — cannot be handed the runtime's
   keys either. Putting it in the adapter would have fixed one caller and left
   the seam still able to break.
3. **The test derives its rows from the namespace.** `RESERVED_KEYS` is read off
   the exports of `reserved-props.ts`, not listed, in both suites. A fifth key
   grows the rows with it. The reason to insist is the defect's own history: the
   asymmetry survived because nothing ever compared the two seams over the whole
   namespace, and a hand-written list of four is a test that stops comparing them
   the day a fifth arrives.

**What this seam does not judge is the reserved keys themselves.** A key the
runtime does not recognise, and `loom:theme` on a node that is not the root, are
real faults; the render seam reports them as `reserved-prop-unrecognised` and
`theme-misplaced`. The write path stays silent about both, and **this is a known
narrowing, not an oversight** — see the consequences.

## Consequences

**The floor now refuses what the renderer refuses and nothing else**, which is
the property 0179 claimed and did not have. What a deployment could draw
perfectly well is no longer rejected at critical stakes.

**One catch is lost, and it was an accident.** Before this, a node carrying an
unrecognised `loom:` key — `loom:nonesuch` — was refused by the write path, for
the wrong reason, labelled as the primitive's refusal. It now passes the Gate and
surfaces at render as `reserved-prop-unrecognised`, which is where every other
deployment without a props vocabulary has always met it. The loss is real and
small: the key is the runtime's, the diagnostic names it, and no page has a hole
where a reader is looking.

**Catching it properly is a change this record does not make, and the cost is
the reason.** The honest shape is *strip, then check the reserved keys against
the rules that govern them* — a stake factor of its own, because
`invalid-props`' English on two surfaces says *"it would set a part up in a way
that part itself refuses"*, and the part is not the thing refusing. A new
`StakeFactorCode` is an exhaustive `Record<StakeFactorCode, string>` in
`(portal)/_lib/vocabulary.ts` and another in `(marketing)/_lib/adapt/record.ts`,
both other lanes' files, both of which stop compiling the moment the enum grows.
That is a four-lane change to catch a fault the renderer already reports, and it
is filed for the maintainer rather than taken unilaterally.

**`theme-misplaced` has a second obstacle beyond the cost above**, and it is
worth recording because it is not obvious: `invalidPropsIn` walks a *subtree* and
cannot tell the tree's root from an inserted subtree's root. *Is this node the
root* is knowledge `analyzeDelta` holds and this walk does not, so catching a
misplaced theme at the write path is a different signature, not a stricter check.

**Lesson 30 changed, and it is another lane's file.** Its exercise D printed the
defect, the transcript test executes the exercise and compares, and the block is
pinned. The transcript and the prose around it were updated in this branch —
declared here and in the report, per the cross-lane rule in `docs/routines.md`.
The lesson is *more* internally consistent afterwards: its own debrief told a
reader that a system with a props floor still accepts a change whose only fault
is a misspelled binding name, and the second block used to contradict that.

**A host relying on a strict schema to police the `loom:` namespace has to stop.**
Nothing in this repository did, and nothing could have relied on it deliberately —
the behaviour was never written down as a contract anywhere, which is how it
survived a week.

## Alternatives considered

**Split inside `propsVocabularyFor`.** One line in the SDK adapter, and it fixes
both deployments in this repository. Rejected because it fixes callers rather
than the seam: the SDK documents writing the closure by hand, and a hand-written
one would still be handed the runtime's keys. The guarantee belongs where the
walk is, so that it holds for every vocabulary and not for the derived one.

**Leave the write path as it was and make the starter schemas tolerate `loom:`
keys.** Rejected, and it is the option that would have done the most damage.
`.strict()` is what makes *features are child nodes* a fact rather than a hope;
loosening ninety-nine schemas to work around one walk would have traded a real
guarantee for a workaround, and every primitive added afterwards would carry the
hole.

**Report the reserved keys as `InvalidProps` with runtime-authored issues**, so
the existing stake factor catches an unrecognised `loom:` key with no new code.
Rejected as dishonest: `InvalidProps.issues` are what a *schema* said, two
surfaces have written English describing the primitive as the refuser, and a
reader told *the part itself refuses this* about a key no part ever sees is
being misinformed by the machine that knows better.

**Build the new stake factor anyway and edit the two other lanes' clause maps.**
Rejected on the standing rule — work that belongs to another lane is filed, not
done — and on a worse property than the rule: a four-lane diff landing in one PR
to close a fault the renderer already reports is not reviewable by any of the
four owners. Filed as a finding with the two files named.

**Export a `RESERVED_PROP_KEYS` array for the tests to iterate.** Rejected as
production surface that only tests read. Reading the module's own exports gives
the same derivation with nothing shipped, and it cannot fall out of step with the
constants because it *is* the constants.
