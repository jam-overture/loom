# 0240 — A silence is a condition and a subject, and the two names for one state were not synonyms

**Status:** Accepted
**Date:** 2026-10-07
**Section:** §4c (reader signals)

## Context

Five readings in `src/signals/` publish a closed set of reasons a figure is
absent, and each set was written by whoever was writing its module:

| set | record | members |
| --- | --- | --- |
| `ChangeSilence` | [0224](0224-a-before-and-after-reading-compares-two-shares-and-a-pair-the-change-dissolved-is-an-answer.md) | `different-trees`, `nothing-measured` |
| `ReachSilence` | [0229](0229-a-share-of-readers-is-estimated-against-the-appearances-and-bounded-against-the-openings.md), reused by [0231](0231-a-funnel-is-three-shares-of-the-arrivals-and-the-straddle-is-the-one-error-here-that-leans-down.md) | `unmeasured`, `unopened`, `uncounted` |
| `PaceSilence` | [0230](0230-a-part-was-read-when-readers-had-time-for-its-words-and-only-the-skim-is-a-safe-claim.md) | `unreached`, `unreadable`, `wordless` |
| `CopySilence` | [0235](0235-how-much-of-a-page-gets-read-is-a-share-of-words-that-partition-it-and-the-typical-reader-is-a-ceiling.md) | `wordless`, `unmeasured`, `floored`, `inconsistent` |
| `CopyChangeSilence` | [0239](0239-a-change-is-read-against-the-words-both-revisions-say-and-a-floor-costs-the-page-total-and-not-the-passage.md) | `different-trees`, `wordless`, `nothing-measured`, `inconsistent`, `dissolved`, `floored` |

A window that held no page views is `nothing-measured` to the first set and
`unmeasured` to the fourth. The lane filed that on 7 October as a wart rather
than a defect — every set is right in its own sentence, and the cost falls on a
surface drawing two readings on one card, which meets two spellings of one
thing and has nothing to tell it they are one thing. The finding's own remedy
was **one exported mapping rather than a renaming**, on the ground that each
set's names are right where they are and four accepted records would have to be
amended to change them.

Building it turned up the half the finding had not seen, and it is the half that
matters.

**One name already means two different things.** `CopySilence.unmeasured` is
*the window's counters report no views of this revision* — `views === 0` on the
node rows. `ReachSilence.unmeasured` is *there is no page-view row at the door
for this revision* — the row the join looked for was not there. The two are read
off different rows and a deployment can be in either without being in the other:
the node counters hold a window of readers while the door row is missing, which
is exactly what the first reading of a deployment upgraded past
[0219](0219-a-page-view-is-counted-once-at-the-door-and-the-over-count-in-the-node-counters-is-a-measurement.md)
looks like. A surface keeping its own table of synonyms — the thing the finding
said it would otherwise have to keep — would have mapped those two together,
and would have been wrong in the direction that hides a fault: *nobody has read
this page* printed over a page several hundred people had read.

So the overlap runs both ways, and a vocabulary that only recorded *these two
names are one state* would have been as misleading as no vocabulary at all.

## Decision

**A silence has two parts: the condition it reports, and the subject that
condition is true of.** `src/signals/silences.ts` publishes both, and maps every
member of all five sets onto them. Nothing is renamed and nothing is
superseded: each reading still reports its own vocabulary and its own sentence,
and this is the statement of what that vocabulary means.

**Nine conditions over fifteen members** — `two-pages`, `no-view-reported`,
`no-arrivals-counted`, `no-openings-marked`, `no-window-folded`,
`says-nothing`, `words-a-floor`, `readers-above-views`, `nothing-carried`.

**Three subjects** — `page`, `part`, `comparison` — and the subject turned out
to be a property of the **reading** rather than of the silence. Every reason a
copy reading gives is about its one page, every reason a pace reading gives is
about one part, and every reason either comparison gives is about the pair. So
the subjects are published as one table over the five vocabularies rather than
as a field repeated on nine conditions, and a surface that knows which reading
it is drawing already knows what its silences are about.

**Renaming could not have settled it, and the subject is why.** The two
spellings the finding named are *the same condition said of different things*.
A comparison names no side — `nothing-measured` is *one of the two windows held
no page views* and does not say which — while a copy reading's `unmeasured` is a
fact about the page on the screen. Collapsing them to one name would have
licensed a card drawing *nothing has been measured* over a page whose own window
was busy, because it was the other side that was quiet. Two names are not
synonyms when one of them is about twice as much.

**So the relation of two silences is a closed answer of three**, and it is what
a surface asks for:

- `one-state` — one condition, one subject. One sentence serves both.
- `one-reason` — one condition, two subjects. The same thing is true of a page
  and of one of its parts, or of a pair and of one side of it. Worth two
  sentences and never one: the narrower is not evidence for the wider, and the
  wider does not say which side it is about.
- `unrelated` — two conditions, however they are spelled.

`relateSilences` deliberately ignores which reading published either silence.
Two readings that report one state report one state whether or not they spell it
the same, which is the whole of what the module is for.

**And one operation, because it is the one the mapping exists for.**
`distinctSilences` takes the silences as a surface holds them — one per reading,
most of them `null` — and gives back the distinct states in the order they
arrived, keeping the first reading's vocabulary so that reading's own sentence
can still be printed. Nulls are dropped rather than refused, because that is the
shape of the call.

## Consequences

**The mapping cannot drift, and that is a compile-time property rather than a
convention.** Each `meaningOf*` is an exhaustive `switch`, so a sixth member
added to any of the five sets stops `pnpm typecheck` until it is mapped. That
was measured rather than assumed: a member added to `CopySilence` produces
exactly one new error, in `silences.ts`, naming the function that no longer
returns. A member *renamed* does the same. The published condition list is held
from the other side by a test asserting that no condition is published which no
silence reports, so a rename cannot leave an unreachable condition behind.

**A card can now say a thing once.** Two readings reporting one state collapse
to one entry, which is the double-count case this subsystem's rules require
stated in the one form it takes here: not a reader counted twice, but a state
printed twice in two voices about the same page.

**`ReachSilence.unmeasured` is now documented as the exception it is**, in the
one place a reader of this subsystem will look for it. The name is kept — 0229's
sentence for it is right, and it is the name a deployment's operator has already
seen — and what is added is the statement that it is not the `unmeasured` of a
copy reading.

**Nothing is on the wire, in a browser, in a column or in the vocabulary of
kinds.** The imports in `silences.ts` are types only, so the module does not
survive into any bundle; the broadcaster was not touched and its weight is
unchanged. It is the tenth thing taken out of what this subsystem already knows
rather than collected.

**The next comparison reading has one choice fewer to make.** Two windows' pace
readings is the obvious one, and its author now writes a set whose names are
right in its own sentence and adds five lines here, rather than deciding for a
third time whether to borrow a spelling from a neighbour.

**What it does not do.** It does not order the subjects, so a surface holding a
`one-reason` pair is told they are two sentences and not which to lead with.
That is a judgement about a screen and belongs to whoever owns one; a framework
answer would have to guess which of a page and its part a person came to read.

## Alternatives considered

**Rename the members so that one state has one name.** The finding's own
recommendation was against it and the building confirmed why. It needs four
accepted records amended, it costs every existing surface a migration, and —
decisively — it is *wrong*: `nothing-measured` and `unmeasured` are not
synonyms, because one is about a pair of windows and the other about one. A
rename would have encoded a falsehood in the place hardest to take back out.

**Publish the subject as a field on each condition.** The first shape tried, and
it was redundant: the subject came out uniform across every member of every set,
so a field on the condition would have been the vocabulary's own identity
written nine times, with nine chances to write it differently. The table over
vocabularies says the same thing once and says something true that the field
form obscured — that what a reading's silences are about is a fact about the
reading.

**A discriminated union of every silence, so a caller can hold them
heterogeneously.** Rejected because it moves the tagging to the caller, which is
where it can go wrong: a surface that tagged a `ReachSilence` as a copy reading's
would get a confident and wrong answer out of the mapping. Five functions, each
taking one union, cannot be called with the wrong set. Heterogeneity is wanted
only after the mapping, where every silence is a `SilenceMeaning` and the
difference has already gone.

**A rule that a wider state suppresses a narrower one** — print the comparison's
silence and hide the page's. Rejected as speculative: nothing has drawn one of
these cards yet, the two sentences are both true, and a framework that hid one
of them would be deciding a layout from inside `src/`. The relation gives a
surface what it needs to decide.

**Supersede 0224, 0229, 0230, 0235 or 0239.** None of them is wrong. Each
decided what its own reading should withhold and why, and every member of every
set still reads correctly in the sentence it was written for. This adds a
statement across them, which is what a mapping is.
