# 0251 — A change to what readers did is a ratio of two shares, and an inside a change gave a part is not a reader

**Status:** Accepted
**Date:** 2026-10-10
**Section:** §4c (reader signals)

## Context

Four comparisons of two windows exist in this subsystem and every one of them is
about **attention**: what a change did to where reading stops
([0224](0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md)),
to how many of a page's words get reached
([0239](0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md)),
to whether readers had time for them
([0244](0244-a-pace-moved-because-the-words-moved-or-the-readers-did-and-a-counterfactual-says-which.md)),
and who the readers were
([0247](0247-a-readership-comparison-is-built-from-two-floored-maps-and-the-mix-is-the-only-figure-with-no-window.md)).

[0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md)
answers what readers **did** — *four in ten readers who got to the pricing band
did something in it* — of one window of one revision. Nothing held two of those
against each other, so the sentence a change to a band nobody uses is made for,
*the band readers reached and touched nothing is used now*, had no answer. It is
the sentence closest to the commercial half of the premise: a deployment that can
see which of its asks a change got answered has a reason to open the portal the
morning after it ships one.

Two facts about the counters decide the shape, and the first is a limit of
0244's method rather than an application of it.

**0244's counterfactual is not available here.** A pace is `spentMs ÷ needMs`,
and the attribution works because one side of that division is **exact and
reader-free**: the words a revision says are a property of the tree, costed
identically in any window, so one term can be held still while the other moves. A
share of readers who acted is `within ÷ reached` — two distinct page view counts
off one row — and has readers on **both** sides. There is no reader-free term to
hold still, so a share that rose because more readers acted and one that rose
because fewer readers reached the part are indistinguishable, and those are
opposite findings: the second is a page that got worse at carrying readers to a
band, with the keener ones left behind.

The decomposition anybody would reach for instead is worse than none.
`now.within ÷ was.within` beside `now.reached ÷ was.reached` is two ratios whose
terms are in **different windows**, and a distinct view count is generous by its
own window's straddle
([0147](0147-a-rollup-is-added-to-what-is-stored-and-a-distinct-view-count-is-therefore-approximate.md)).
That inflation divides out of a ratio taken inside one window and not out of one
taken across two, so a rollup window a deployment shortened moves both of those
ratios and moves no reader. It is
[0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)'s
fact one level across, and there the remedy was to scale the count at the door.
Here there is nothing to scale it to: a share is already the scaled figure.

**A share can appear where there was none without a reader doing anything.**
`engaged` counts the views whose reader acted *strictly inside* a node
([0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)), so it
is structurally nought on a part with no element children and 0242 withholds the
share rather than printing a nought. Whether a part has an inside is a fact about
the **tree**, and a change may move it: wrap a button in a band and the band has
a share where one was withheld; unwrap it and a share that was a measurement
disappears. Neither is readers behaving differently, and the first reads exactly
like the thing this comparison is for.

## Decision

`actionChangeOf(was, now)` in [`src/signals/action-change.ts`](../src/signals/action-change.ts)
takes two `PageReading`s, derives both readings of what readers did, and compares
them part by part, matched by node.

**The share ratio is the only ratio published, and no ratio or difference of two
windows' counts is published at all.** `shareRatio` is sound because each side's
share has its own window's straddle divided out of it before the two sides meet,
which is 0221's cancellation. The counts travel on the two sides' rows as the
weight behind it and never as a movement — which is how 0247 carries its two
arrival totals and refuses the growth between them. `usesRatio` is published on
the same test: `usesPerReader` is occurrences over that window's own readers, so
each term is already normalised.

**Five movements, not nine.** `taken-up`, `abandoned`, `still-untouched`, `held`,
and `unknown` for the five combinations in which either side cannot speak.
`unknown` is *nothing can be said* rather than a third verdict (0242), so a part
it is true of on either side has not moved; collapsing those five is what keeps
the other four as claims. `still-untouched` is kept apart from `held` because both
are *the standing did not move* and they are opposite findings, which is 0244's
rule for `still-skimmed`.

**`InsideMovement` is published on every compared part**, with four members, and
it is the one movement here that can be stated of a page nobody has read.

Two properties fall out of the definitions rather than being asserted by guards,
and both are pinned by tests:

- **A part the change gave an inside cannot be reported as `taken-up`**, because
  `untouched` on the earlier side requires that side to have borne element parts.
  The movement vocabulary is therefore immune to the shape change, and the one
  combination to read `inside` for is `lost`.
- **`shareRatio` is non-null only where `inside` is `kept`**, because a side
  without an inside withheld its share. A ratio across a part whose shape changed
  would be a ratio of two different measurements.

**`unwalked` is a silence over the reading, and the occurrence figures survive
it.** A window whose delegated signals carry no `within` credits nobody with
acting inside anything, so every band in it reads `untouched` with the counters
looking healthy — and a comparison between a walked window and an unwalked one
reports the whole page as abandoned, which is the most alarming sentence this
module can print and is about a configuration change. It is reported once over
the reading rather than part by part, because the fault is a property of the
window and not of any part: deciding part by part would mean a second rule for a
standing 0242 already publishes. `activations`, `opens`, `closes` and
`completions` are filed against the part a reader used and need no ancestry, so
`usesRatio` and the four counts stand in full under it.

**The page's one headcount is the root compared against itself.** Every action is
strictly inside the root, so summing `within` across parts would charge one
reader once per level they acted inside (0147, 0167). There is no page-level total
of readers who acted, the published keys are pinned by a test, and `whole` stands
in for one. The rankings are by the readers the **later** window reached, which is
a count inside one window and so not the cross-window ratio this record refuses —
0221's rule that a band four hundred readers ignore is a worse problem than one
two out of three do.

**A tenth silence condition, and the first that is not an absence.**
`src/signals/silences.ts` gains `action-change` as an eighth vocabulary and
`no-action-credited` as a tenth condition. 0240's evidence — that the sixth and
seventh sets needed no new condition — is narrowed and not falsified: this is the
first reading built on a counter whose **nought can be a filing rule rather than
a measurement**, so it is the first that can be in a state nothing before it
could. 0240 is **not** superseded and is not edited; the module carries the
corrected counts and a test now declares, per later set, which conditions it
brought that no earlier set reported, so a ninth set adding one silently is still
caught.

Nothing is added to a payload, a browser, a column, a store or the vocabulary of
kinds, and the broadcaster is not touched.

## Consequences

- *The ask readers reached and ignored is answered now* is one row, and
  `mostTakenUp` is the sentence a reader screen can lead with the morning after a
  change ships.
- **A surface must not draw `now.share` beside an absent `was.share` without
  reading `inside`.** `gained` is the member that reads like success and is not;
  the share did not appear because readers started acting.
- **Which side moved is not available and will not become available** by adding
  fields. It needs a reader-free term in the division, and a share of readers has
  none. A deployment that wants the narrower question names a `FunnelPair`, which
  is what pairs are for (0231).
- **A control whose presses began reports `unknown`.** A leaf with no uses on the
  earlier side has no verdict to move from, because nothing in the tree says
  whether it could be pressed — `role` declares one member and it is not *a
  control* (0238). That is the §6 thinness in a third place; the day a primitive
  can declare what it can report, every counter already stored reinterprets
  (0212). Filed for `Loom primitives`.
- A card drawing this reading beside another reads both silences through
  `silences.ts` as before; `unwalked` and `PageAction.unwalked` are one state and
  now say so.

## Alternatives considered

**Publish `now.within ÷ was.within` and `now.reached ÷ was.reached` as 0244
publishes `timeRatio` and `needRatio`.** Rejected, and it is the first thing that
was built. The two ratios are each scaled by their window's straddle; the scaling
is common to both, so their **quotient** is sound — but the quotient is
`shareRatio`, which is published already, and neither factor alone means anything.
A surface would have printed *readers reached this band half as often* off a
rollup cadence a deployment changed.

**Correct the two factors with the straddle inflation handed in per side**, as
0230 takes a `PaceOptions.inflation`. Rejected: `drift ÷ opened` is itself an
estimate off the door rows, so the correction would leave a figure whose error is
unstated resting on a figure whose error is published. 0229 spends that drift on
an interval, which is honest; spending it on a point estimate that decides which
of two findings a screen prints is not.

**Withhold the shares and the movements part by part on an unwalked window**,
rather than once over the reading. Rejected: it would be a second rule for a
standing 0242 already publishes, and two spellings of one rule is the fault this
subsystem has been bitten by twice (0218, 0235). The silence is the instruction a
surface needs and the rows are left in place so the fault can be seen.

**Nine movements, one per pair of standings.** Rejected for 0244's reason: five of
the nine have `unknown` on a side, which is not a verdict, and naming them
separately would publish eight members of which three are claims.

**Rename `PageAction.unwalked` so the two spellings are one word.** Rejected:
0240 settled that the remedy for two names is a mapping and not a renaming, and
the two are not synonyms — one is a fact about a window, the other about a pair of
them, which is exactly the subject distinction 0240 exists for.

**A `usesChange` or `usesTaken` to answer the control whose presses began.**
Rejected as a second verdict vocabulary over the same counters. An occurrence
total is exact across windows but is a measurement of exposure, and the
normalised figure is `usesPerReader`, whose ratio is published. The missing half
is a declaration in another lane, not a field here.
