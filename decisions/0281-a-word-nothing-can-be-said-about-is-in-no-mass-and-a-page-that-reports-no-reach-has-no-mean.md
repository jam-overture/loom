# 0281 — A word nothing can be said about is in no mass, and a page that reports no reach has no mean

**Status:** Accepted
**Date:** 2026-10-15
**Section:** §4c (reader signals)

## Context

A part of a page has three standings and the third exists because the other two
are claims
([0212](0212-what-a-reader-signal-means-is-joined-to-the-tree-when-it-is-read.md)).
`read` is *at least one view reported it coming into view*, `skipped` is *the
window held views and none of them said anything about this part at all*, and
`unknown` is *nothing can be said* — which happens two ways. Either the window
held no views, so every part is unknown; or **the part reported something other
than coming into view**. The second is the sharp one: a press delegated to a
band that no `viewed` ever named
([0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)), so a
reader plainly had it in front of them and the counter that would say so is
missing.

Both readings of a page's words are careful with that distinction in the places
a person would act on. A copy reading keeps `unknown` passages out of `unseen`
and publishes their words under `unknown` instead, "where they can be seen and
not acted on"
([0235](0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md),
§5). A comparison of two windows keeps them out of `stillUnseen` for the same
stated reason
([0239](0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)).

**Neither rule reached the figures those two readings publish**, which is what
this record is about. `CopyReading.typical` and `CopyChange.typical` are both
`Σ(readers × words) ÷ views`, reduced over every passage, and an `unknown`
passage contributes `0 × words`. Counting *nothing can be said* as **nought
reader-words** is acting on it, in the one direction nobody checks.

At one page the cost is a description that is looser than it reads: the mean is
a ceiling over the words that were **measured**, not over the page, and nothing
said so. At two windows the cost is a number.

**The number, which is the case the suite now builds.** Four readers; three
bands of ten, thirty and twenty words, unchanged. In the earlier window every
reader reached the intro and two reached the pricing band. In the later window
the intro's row is still there and reports no reach at all — which is what a
primitive that stopped spreading its identity attributes looks like from the
counters — and two readers still reach the pricing band. Nothing about the
reading of this page changed. What was published:

| | published | honest |
| --- | --- | --- |
| `typical.was` | 25 | 15 |
| `typical.now` | 15 | 15 |
| `typical.change` | **−10** | **0** |
| `mostLost` | the intro | none |

A screen drawing that says *your change took ten words away from the average
reader, and the intro is where you lost them*. The intro is the one part of that
page nothing can be said about.

The same error has a floor at the scale of a library, where it was caught first.
0280 takes every figure over the passages both windows can speak for and
publishes the rest as `unspoken`; this is that rule carried down to the two
readings it was derived from, which is the direction a rule should travel. It is
cited by number and not linked throughout, because 0280 is claimed on the open
branch of #640 and a link to a record that is not here yet is a blocking fault
(`pnpm verify`).

## Decision

**Every signed figure over a page's words is taken over the passages the
windows can speak for, and a reading with none has no figure rather than a
nought.**

**One set, so it is the same set on both sides.** A carried passage whose
standing is `unknown` on **either** side is out of both masses. A passage
dropped from the later mass and kept in the earlier one would read as a loss of
words nobody wrote, which is the error in the table above with the sign kept.

**`ComparedPassage.gain` is `null` where either side's standing is `unknown`.**
It was already `null` where a side held no views. The two refusals are the same
refusal: a gain is a subtraction of two reaches, and a reach of nought that is a
missing counter is not a reader who did not arrive. This also keeps 0239's
published identity — the gains add to `typical.change` — because a passage in no
term of one is now in no term of the other.

**A page-scale mean needs no filter, and the reason is worth stating.** A
passage is `unknown` only where its row reports no reach, so its term is nought
and the sum over every passage is the same number as the sum over the spoken-for
ones. `CopyReading.typical` is therefore unchanged in value and newly correct in
description: **a ceiling over `read + skipped` words, not over the page's
words.** The gap is `wordsByStanding.unknown`, which was already published
beside it. The comparison has to filter because there a passage `unknown` on one
side carries a real term on the other.

**Two new silences, one state.** `CopySilence.unspoken` — no word of the page is
in a part this window can speak for. `CopyChangeSilence.unspoken` — no carried
word can be spoken for in both windows. Both are reachable only with views in
the window, which is what makes them faults rather than quiet traffic, and both
leave every census figure standing: the words stay in `wordsByStanding` and
`wordsByMovement` under `unknown`.

**The order is the missing report before the missing declaration.** Where a page
is both `unspoken` and `floored`, `unspoken` is reported. A floor is a
declaration a library has not made
([0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md)), and a page
where nothing reports reach would still have no mean once every `copy` prop was
declared — so a deployment told *some part declares no copy* would go and fix
that and get the same silence back. `dissolved` still outranks `unspoken`,
because *the change left no word as it was* is a fact about the change and the
stronger thing to say.

**The thirteenth silence condition, and it is a pair with the eleventh.**
`no-reach-reported` in `silences.ts`: *its counters are there and not one of
them reports being reached.* It is deliberately not `no-view-reported`, which is
a nought that is **a reader who was not there**, and not `no-action-credited`,
which is a nought that is **a filing rule** — a press credited to no ancestor
because the sender sent no `within` (0167, 0242). This is a nought that is **a
missing report**. Three senders half-working in three different ways, and a
deployment handed the wrong one looks in the wrong place.

**Nothing is superseded.** The rule 0235 §5 states and the rule 0239 states are
the rules; what moved is which passages their signed figures are read over, and
the words they leave out were already published. This is the shape the 0270
floor fix took on 14 October, for the same reason.

## Consequences

- **A page that stopped reporting reads as a page that stopped reporting.** The
  comparison above returns `typical.change` of nought and no `mostLost`, and a
  page where every carried passage is in that state returns `unspoken` and no
  comparison at all.
- **`CopyReading.typical` is unchanged in every window, and its ceiling is
  tighter than it was documented to be.** A consumer that checked the figure
  against `words` was checking a bound that was true and loose; the bound is now
  `wordsByStanding.read + wordsByStanding.skipped`, which the suite asserts
  exactly on a page where every spoken-for word reached every reader.
- **One state of the world gained a name and the table did not grow a set.**
  This is the first time a published silence vocabulary has gained a member, and
  the first time a condition arrived without a new reading. It narrows what the
  evidence in `silences.ts` was ever evidence of: a new condition needs a
  reading that can be in a state nothing else could, and a set published for a
  month can turn out to have been in one all along.
- **A surface must not add `unknown` words back.** `wordsByMovement.unknown`
  and `wordsByStanding.unknown` are how much of the page is in doubt. A card
  that adds them to the mean puts back exactly the number this refuses, and a
  card that calls them *unread* makes the claim 0235 §5 refuses.
- **`share` is untouched and is the thing left open.** `CopyReading.share` is
  `read ÷ words`, so a page where nothing reports reach publishes a share of
  nought beside an empty `unseen` list. Nought is literally what a standing of
  `read` asserts of that page and the standings are published next to it, so it
  is not a false number — but it is the same sentence in a different shape, and
  whether it should become a ceiling over the spoken-for words is one question
  about two published shares and every role row under them. Filed rather than
  taken here.
- **Nothing runs in a browser.** No payload, no column, no store, no kind, and
  the broadcaster is not touched.

## Alternatives considered

**Leave both figures and fix only the description.** What the finding of 14
October proposed as the safe reading: both are ceilings, and counting an
`unknown` passage as nought makes them looser ceilings, which is the harmless
direction for a number published as *at most*. Rejected once the comparison was
written down. It is true of one window and false of two: `typical.change` is a
**difference** of two ceilings, and a term present on one side and absent on the
other is not a loose ceiling but a movement that did not happen, with a name
attached by `mostLost`.

**Withhold the whole comparison where any carried passage is `unknown`**,
mirroring how a floor withholds it. Rejected as far too strong. A floor withholds
because floors scale the signed terms **unequally** and can reverse the sum's
sign; an `unknown` passage is simply not in the sum, and the figure over the rest
is as sound as it ever was. One part going quiet on a page of two hundred would
cost the whole reading.

**Count an `unknown` passage at the other side's reach**, on the argument that
the reading most likely held. Rejected outright: it invents a counter. The whole
point of the standing is that the window cannot say, and filling it in with the
number that makes the change look like nothing is as much a claim as filling it
in with nought.

**Reuse `no-view-reported` for the new condition** rather than adding a
thirteenth. It is the smaller change and it is what 0280 does at its own scale,
where its set has no separate member for an empty window. Rejected here because
`copy`'s set does: `unmeasured` already maps to `no-view-reported`, so two
members of one vocabulary would report one condition and a surface could not
tell *nobody came* from *nobody is reporting* through this table — which is the
failure the table exists to prevent, in the direction that hides a fault.

**Spell the silences `unread`, as 0280 spells its own.** Rejected for a local
reason: `PassageMovement.unread` already means *nobody reached it before or now*
in the same file, which is the opposite claim. `unspoken` is 0280's own word for
the words themselves, so the subsystem gains no third vocabulary.

**Publish an `unspoken` field on both readings** beside the figures, as 0280
does on its rows. Rejected as dead weight: `wordsByStanding.unknown` and
`wordsByMovement.unknown` are already exactly that number, published and tested.
0280 needed the field because its rows carry no breakdown by movement.
