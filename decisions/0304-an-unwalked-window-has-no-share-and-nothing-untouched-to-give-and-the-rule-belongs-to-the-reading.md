# 0304 — An unwalked window has no share and nothing untouched to give, and the rule belongs to the reading

**Status:** Accepted

**Date:** 22 October 2026

**Section:** §4c (reader signals)

## Context

A press is filed against the control and credited to the **addressed ancestors
the signal carries**
([0167](0167-a-delegated-signal-names-the-regions-it-happened-inside.md)). So
`engaged` — the distinct page views in which a reader did something strictly
inside a node — is the one counter in this subsystem the ancestry walk feeds, and
a window whose delegated signals carry no `within` reports occurrences and
credits no reader with being inside anything. A sender with the walk off, a
server synthesising batches, a fixture replayed.

`PageAction.unwalked` has named that state since
[0242](0242-what-readers-did-is-a-share-off-one-row-and-a-leaf-has-no-inside.md),
and its own documentation said exactly what it costs: *every share on the page is
a nought, every band reads `untouched`, and the counters look healthy.* **It
named it and did not apply it.** The reading went on publishing a share of nought
on every band and a standing of `untouched` on every band, which is the two
sentences this subsystem exists to keep apart — *nobody acted here* said of a
page where nothing could have been credited.

Three readings are built on top of that one, and each met the same fault and
answered it differently:

| reading | what it did with `unwalked` |
| --- | --- |
| `libraryActionOf` | refuses the roll outright, and names the pages (0265) |
| `formActionComparisonOf` | withholds every gap, through a `walked` argument of its own (0303) |
| `actionChangeOf` | named the state and **left every figure computed** |

The third is the one that printed a wrong sentence, and the finding of 21 October
measured it. `ratioOf` is asymmetric about an unwalked side: an unwalked
**earlier** window makes `was === 0` and the ratio comes back `null`, so that
direction was covered by accident; an unwalked **later** window makes `now === 0`
against a real `was` and the ratio comes back **`0`** on every part that bears an
inside. With `movements.abandoned` and `mostAbandoned` populated to match. A
surface drawing the rows and not reading `silence` prints *every band on this
page collapsed to nothing* about a configuration change — and the half of the
pair it is wrong about is the one a deployment is looking at.

`pageActionOf` itself prints the same sentence one level up, which this run found
while fixing the comparison: `standings.untouched` is the whole page and
`mostIgnored` names the band the most readers reached. Nothing had reported that.

0303 filed the comparison rather than fixing it, for a stated reason — the
argument for withholding there is about two windows of one readership and taking
it in that unit would have been two decisions in one record — and left the
general principle on the record anyway:

> A figure cut to fit a fault is a fault made undrawable; a figure withheld on
> account of one is a fault made visible.

## Decision

**An unwalked window withholds every share and calls nothing `untouched`, in
`pageActionOf`, and the three readings built on it inherit the refusal rather
than each spelling it.**

### The two fields, and no others

`uncredited` is applied to every part of such a window:

- **`share` is withheld on every part**, whatever its standing. It is
  `engaged ÷ reached` and `engaged` is the counter the walk feeds, so every share
  in the window is a nought that is a filing artefact.
- **`untouched` becomes `unknown`.** That member is *readers reached it, it has
  an inside, and nothing happened in or on it* — read off the same nought. It is
  the fourth way to be `unknown`, beside a part with no row, a part whose
  `reached` is 0, and a leaf.

Everything the walk does not feed stands in full: `reached`, `within` as the
store holds it, `uses`, the four occurrence counters, `usesPerReader`,
`shutAgain`, `bearsParts`, and the **`acted` a part earns from uses filed against
itself**. A pressed control was pressed whether or not anything walked, and
`usesPerReader` is an intensity off one row.

### A withheld share no longer implies an unknown standing

0303 relies on *an unknown standing and a withheld share are the same fact said
twice and never disagree*, and uses `share === undefined` as its only guard. The
implication it needs still holds in full: **unknown standing ⇒ withheld share.**
The converse now fails in exactly one window, and deliberately, because the two
rules are read off different counters. A disclosure band with `opens` of its own
and children under it is `acted` on evidence that needed no walk and has a share
that is a filing artefact, which is the one part that can hold both at once. The
share rule is therefore **not** read off the standing.

### The consequences for the three readings, which are the proof the rule was in the wrong place

- **`actionChangeOf` changes not one line.** Every movement across an unwalked
  side falls to `unknown` through `movementOf`'s existing collapse, every
  `shareRatio` to `null` through `ratioOf`'s existing `undefined` clause, and
  `mostTakenUp`, `mostAbandoned` and `stillUntouched` empty themselves by the
  rules they already had. The asymmetry between the two directions is gone
  because neither direction has a nought to divide.
- **`formActionComparisonOf` loses its `walked` argument**, and `gapOf` is one
  check again. Its suite passes unchanged, which is the assertion that its answer
  did not move.
- **`libraryActionOf` is untouched**, and still refuses: one poisoned page
  poisons a mean across pages, which is a separate argument and a correct one.
- **`pageActionOf.mostIgnored` is `null`** in such a window, which is the
  sentence this record costs and the one worth costing.

### `unwalked` is still read off the counters as written

The detection runs over the parts as they came out of the store, before anything
is withheld on account of the answer — one pass for the presence test, then the
map. Linear, as rule 4 requires: the ledger was quadratic once and a 6,000-node
page took 314 ms.

## Consequences

- A deployment whose sender stops walking is told *nothing in this window can say
  where actions happened* and is shown no figure that contradicts it. Before, it
  was told that and shown a page of abandoned bands.
- **One rule in one place.** Two of the three readings on top had their own
  spelling of it and the third had none; now none of them do. That is the fault
  0218 and 0235 were both written about, and the direction 0282 says a rule
  should travel — down to the reading the figures are derived from.
- `ActionStanding.unknown` has a fourth cause, so a surface describing it has one
  more thing it covers and no new member to draw. The closed set is unchanged and
  no silence set gains a condition.
- **Nothing was added to a payload, a browser, a column, a store or the
  vocabulary of kinds.** `broadcast.ts` is byte-identical. This is the
  thirty-fifth thing taken out of the server-side join rather than collected, and
  the first that is a figure **removed** rather than one derived.
- Per-reader identity is no further away and no closer. The rule is about a
  counter the walk feeds and would read an identified window the same way.

## Alternatives considered

- **Withhold in `actionChangeOf` alone, which is what the finding asked for.**
  Rejected. It is the smallest change and it makes the problem worse: three
  readings over one reading would then carry three spellings of one rule, two of
  which already disagreed about whether to apply it. The finding named the
  symptom correctly and put the fix one level too high.
- **Make `ratioOf` say *why* it has no value** — the finding's second option, a
  tagged absence rather than `null`. Not rejected, deferred, and it is now a
  smaller question: the unwalked cause no longer reaches it, so what is left is
  *no share on a side* against *a nought on the earlier side*, which reaches
  `paceChangeOf` and `copyChangeOf` too and changes a published field's type on
  every one of them. Filed.
- **Blank `within` as well as `share`.** Rejected. A counter is passed through as
  the store holds it and a **figure** is what gets withheld, which is this
  module's existing rule for `within` on a leaf and the thing that lets somebody
  read one row and see what was written.
- **Make every standing `unknown`, including `acted`.** Rejected: it would hide a
  true fact. An occurrence is filed against the part it happened to, so *this
  control was used* is as sound in an unwalked window as in any other, and
  `usesRatio` across two of them is the one claim a before-and-after can still
  make. The suite pins that survivor.
- **Refuse the reading outright, as the library roll does.** Rejected. A roll
  across pages takes a mean and one poisoned page moves it, so there the whole
  answer is at risk; here the occurrence half is sound and a deployment
  diagnosing its own sender wants exactly that half — *presses are arriving and
  nothing can say where* is two facts, not one.
- **Leave `pageActionOf.mostIgnored` as it was and fix only the shares.**
  Rejected. It is the same wrong sentence in the field most likely to be drawn as
  a headline, and *readers are ignoring your pricing band* is worse than a
  number, because it names a remedy.
