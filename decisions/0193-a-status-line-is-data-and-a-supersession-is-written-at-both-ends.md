# 0193. A status line is data: its opener is a closed set, and a supersession is written at both ends

**Status:** Accepted
**Date:** 2026-09-26
**Section:** §1 (process)

## Context

`decisions/README.md` makes two claims about a record's `**Status:**` line.
Neither was checked, and on 25 September `Loom lessons` measured both while
writing [lesson 28](../lessons/28-corroboration.md), whose subject is which
claims in this repository carry a second copy to be held against.

**The first claim is a closed set.** *Format* says a status is one of `Proposed`,
`Accepted`, or `Superseded by NNNN`. `parseDecisionRecord` requires the line to
be present and reads everything after the colon as an opaque string, so a status
of `Bananas` parsed, entered the generated index verbatim, and drew no complaint
from anything. The 173 statuses on disk all begin with one of the three words —
the sentence is obeyed — but nothing was holding them to it, which made it the
one sentence in `decisions/README.md` measurably not true *of* `decisions/`.

The statuses are also more various than three words, and that variety is not the
problem:

| | |
| --- | --- |
| `Accepted — it changes no schema, no tree and no delta model, and …` | a qualifying clause |
| `Proposed — **ARCHITECTURAL, needs review.** It reverses a named …` | an escalation, flagged in the status |
| `Accepted for the first half (the completeness check), **Proposed for** …` | 0166, half-decided and honest about it |

**The second claim is a relationship, and it was a habit.** *Changing direction*
requires the **old** record to be marked `Superseded by NNNN`. It says nothing
about the replacement. The replacement has nonetheless named what it replaces in
almost every case — `0027` carries `partially superseded by 0029` and `0029`
carries `partially supersedes 0027` — which is one fact written in two files and
therefore comparable. `checkNumbering` verifies that a number named in a status
belongs to a record that exists; whether the record named agrees was never asked.

The lesson's count, run against `decisions/` on 25 September:

| | |
| --- | --- |
| directions written in a status line | eleven |
| answered at the other end | ten |
| not answered | `0109 -> 0137` |

**And then the habit broke, the next day.** This lane wrote
[0191](0191-the-harness-may-start-the-application-because-there-is-now-only-one.md)
on 25 September, marked `0117` as `partially superseded by [0191]`, and gave
`0191` the status `Accepted` and nothing else. So a convention that had held ten
times out of eleven for two months failed within twenty-four hours of being
described — in the lane that owns the tool, on the branch that was reading the
finding about it. Eleven directions and one gap is a statistic. Twelve and two,
one of them a day old, is a measurement of what a habit is worth.

## Decision

**A status line is data. Its opener is a closed set, and a reference in it is
answered at the other end.** Both are checked by `pnpm verify`.

1. **The opener** — the first word of a status must be `Proposed`, `Accepted` or
   `Superseded`, written bare with no emphasis around it. Everything after that
   word is free prose. `tools/decisions/status.ts` holds the set as an
   `everyMemberOf` list and checks it; the README now says *begins with* rather
   than *is*, which is the same sentence made true.
2. **Both ends** — where a record's status names another record, that record's
   status names it back. `oneWayIn`, in `tools/decisions/numbering.ts` beside
   `danglingIn`, is what holds it. The README's *Changing direction* section
   now requires the reciprocal form, so the check is enforcing a stated rule
   rather than a preference.

The check is **symmetric and direction-blind**: it does not read `supersedes`
against `superseded by`, only whether the record named names this one. Parsing
the direction would make the check an opinion about English, and the fault — one
end silent — is the same fault whichever end wrote first. A reference to a record
that does not exist stays `danglingIn`'s, so one missing record is one problem
and not two.

**The two existing one-way pairs are closed in the same change**, because
shipping the check without them is shipping a red build. `0137` gains
`Accepted — supersedes 0109` and `0191` gains
`Accepted — partially supersedes 0117`. Neither is a change of direction and
neither needs the dated amendment block of
[0099](0099-a-record-is-amended-when-only-the-count-moved.md): `0109` already
asserts that `0137` replaced it, and all this does is write the other half of a
fact the directory already carried. The form is `0014`'s, which has carried
`Accepted — supersedes 0004` since the first supersession this project made.

## Consequences

**A run that writes a supersession now edits two status lines instead of one**,
and a run that writes only the old one gets a red `pnpm verify` naming both
records. That is a gate in front of six lanes, which is the cost and it was
argued both ways (below). The act being gated is rare — six pairs in 173
records — and is always performed by the run that is already editing both files.

**Eleven data points and a habit become a rule**, which is the thing worth
having. A reader who opens `0137` now learns that it replaced something. Before
this they had to find `0109` to be told.

**`decisions/README.md` no longer describes a set the directory does not have.**
The variety in the real statuses is preserved deliberately: the closed set is one
word long, so 0166 stays exactly as written.

**Lesson 28's exercise E now prints nothing** under *supersessions whose other
end says nothing back*, which makes the transcript in that lesson stale in the
opposite direction to the one it warned about. The lesson said this would happen
and said the lane would fix it; it is filed for `Loom lessons` rather than edited
from here.

**What is not checked.** That the two ends agree about *which* direction, that a
partial supersession names which part, and that the clause after the opener says
anything sensible. Each is a judgement about prose, and the README's sentences
about them stay sentences.

## Alternatives considered

**Write the asymmetry down as deliberate instead — one sentence in the README
saying the replacement need not name what it replaces.** This was the option
this lane recommended on #395 twelve hours ago, on the reasoning that (1) turns a
README-compliant act into a red build on somebody else's branch, which is the
thing [0118](0118-a-citation-is-a-claim-and-only-a-link-can-be-checked.md)
declined to do to `apps/loom`. Rejected on the evidence that arrived after the
recommendation: `0191` is the README-compliant act, it was performed by this lane
the same day, and the result is a record that replaced something and does not say
so. Writing the asymmetry down would have made that outcome correct rather than
fixed it. The 0118 comparison is also weaker than it looked — 0118 declined to
gate *four other lanes' prose*, where this gates a field that six lanes write
about six times a year, and the fix is one clause written by the run that is
already there.

**Do nothing.** The lesson's exercise E keeps printing the list, and the list
grows. Rejected: it had already grown, from one to two, in a day.

**Check the whole status string against a grammar rather than the first word.**
Rejected outright. 0166 is accepted for one half and proposed for the other, and
0135's status carries the reasoning for why it is not an escalation. A grammar
tight enough to be worth checking would make both of those illegal, and they are
the records doing their job. The first word is the part that is a state; the rest
is a person writing.

**Parse `supersedes` against `superseded by` and check the directions agree.**
Rejected as an opinion about English for no gain. Five spellings are already in
use across six pairs, the set will grow, and the fault being caught is silence at
one end rather than disagreement between two. A pair that names each other in the
same direction is wrong in a way a reader catches and a regular expression argues
about.

**Exempt the two existing pairs with an allowlist**, the way
`SECTION_EXEMPTIONS` excuses 0081 its missing *Alternatives considered*. Rejected
because the reason that allowlist exists does not apply: 0081's exemption stands
because backfilling it would mean inventing alternatives nobody weighed and
presenting them as the ones that were. Here the fact is already in the
repository, written at the other end, and copying it across is not an invention.
