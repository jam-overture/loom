# 0382. A routine reads back what it posted, because no safe link length can be computed in advance

**Status:** Accepted
**Date:** 2026-11-11
**Section:** §1 — Process, how a run reports

## Context

A markdown link posted to GitHub from a routine session can arrive with a run of
backticks — and, since 10 November, apostrophes — welded onto it. The run is in
the **stored** body: a read through the API returns it in the raw markdown, so
whatever inserts it does so before GitHub sees it. Re-posting the same text
changes nothing; replacing the text in one `update_pull_request` call produces a
clean body on the first attempt, so the round-trip is deterministic rather than
flaky.

**Six entries in `FINDINGS.md` carry it, from four lanes over seven weeks.** The
23 September entry alone runs a tally to **twenty-three read-backs** by 6 October
and four later instances are entries of their own; every one of them was read
back from the API after posting. They
agree that URL length moves the outcome and agree on nothing else:

| the body | survived | mangled |
| --- | --- | --- |
| #378 (23 September) | 157 | 158 |
| #390 (25 September) | markdown links of 145, 146, 146, 147 | 151, 156, 168, 169, 170, 172 |
| #423 (27 September) | 114, 124 | 150, 152, 162, 188 |

**No constant fits all three.** The only reading that does is that the limit is
the tail of some other budget the whole body spends — #423's body is the longest
and has the lowest boundary — and that possibility has never been tested.

Five explanations have each lasted exactly one measurement and are written into
the 23 September entry as a graveyard: that every mangled URL ends in `.png`;
that an apostrophe after the closing paren does it; that it is the markdown link
syntax; that it is position in the body; and that the surviving band was *alone
on its line* rather than *bare*. Three of the five were this lane's. The sixth
was the form rule proposed on 9 November — *post an autolink, never a markdown
link* — which the next body falsified the following evening by mangling two long
links and leaving a short one intact beside them.

**It has twice eaten something load-bearing.** On #848 the two links a reviewer
would follow first; on #854 a before-and-after pair of pictures that were the
argument of the change. Five of the six entries are open and all five are owned
by this lane, because `docs/routines.md` is this lane's file and the lanes that
filed them said so.

## Decision

**A routine reads back what it posted.** After opening a pull request and after
commenting on it, the run reads the stored markdown through the API and runs
`pnpm posted` over it. That is step 10 of the procedure in `docs/routines.md`.

Four clauses.

1. **The check is the read-back, not a length budget.** No lane computes a safe
   URL length, and a proposal to do so is refused by pointing at the table
   above. The read-back is one call; it is how every one of those measurements
   exists; it is the only thing that has ever been reliable.

2. **The form is a precaution and it is stated as one.** A repository file is
   written as a backticked path; a record is cited by number with its path in a
   code span and is **never** linked, because its filename alone runs to 89
   characters; a report is linked as a bare URL on its own line and carries its
   images by relative path. These forms have survived every measurement. They
   reduce how often the read-back finds something; they do not replace it, and
   the 10 November body is why — a short markdown link survived in the same body
   that ate two long ones.

3. **`pnpm posted` fetches nothing and is not in `pnpm verify`.** It reads a
   body from a file. The text it reads is never committed, so there is nothing
   on a branch for a gate to check, and a gate that made a network call to
   GitHub would be a gate that can hang — 0140 applied to the merge gate.
   Splitting the fetch from the reading is also what keeps the half that can be
   tested testable, which is the split `pnpm weigh` already makes.

4. **A body already posted twice is weighed rather than corrected reflexively.**
   Re-posting the same text does not fix it, and a second `update_pull_request`
   has its own failure mode. Against a reviewer's one click, leaving it and
   naming the report and the record by path is a legitimate answer — it is what
   #854 did and said.

## Consequences

**Every lane gains a step and it costs one call.** The step is in the shared
procedure rather than in any lane's brief, so it applies to the seven routines
that post and to `Loom merge`, which posts comments on other lanes' branches.

**The detector is a pure function and its fixtures are the record.** The runs
recorded on #848 and #854 are reproduced character for character in
`tools/posted/mangling.test.ts`, the #854 case as the whole body read back from
the API. A sixth instance that this module does not catch is a test to add, and
the fixture file is where the next lane looks before guessing.

**It will accuse something eventually, and the threshold says what.** A run of
one character inside a link's parentheses cannot be anything but inserted,
because no URL begins with a backtick. A run of one against a bracket *can* be
an ordinary code span beside an ordinary link, so two is the floor there, and a
code span separated by a space is never accused. The one shape this cannot tell
apart is a deliberate double-backtick span ending exactly at a link's bracket,
which nothing in this repository writes.

**What stays unknown, deliberately.** Where the wrapping happens, and whether
the budget reading is right. Four lanes have now spent part of a run on it.
Nobody should spend a whole one.

## Alternatives considered

**Compute a safe length and hold bodies to it.** The obvious shape and the one
three lanes reached for. Refused by its own evidence: the three bodies above give
three incompatible boundaries, and a rule built on any of them is green on the
bodies it was measured against and silent on the next one. Worse than nothing,
because a run that believes it has a budget stops looking.

**A rule about form alone — autolinks only, no markdown links.** Proposed on
9 November on the strength of one clean comparison, and falsified on 10 November
by a body in which a short markdown link survived beside two long ones that did
not. It is kept as clause 2 at the strength the evidence supports — a precaution
that reduces the rate — and is not kept as the check.

**A sweep over `reports/` inside `pnpm verify`.** The shape the git-floor rule
takes, and the natural instinct: catch it on the branch that writes it. It does
not apply. The damage happens to text that is never committed, and a report's
links are not the body's. It would also open with **fifty-two** faults of
history, across 61 absolute links, which is the kind of gate people learn to
scroll past.

**Find the cause.** The honest answer to *why not just fix it* is that nobody
knows where the insertion happens — the API, a sanitiser, or the client — and the
23 September entry's closing sentence has held for seven weeks: the workaround is
one line of discipline and the fault is cosmetic. Four lanes have already spent
part of a run on it. This record makes the workaround cheap instead of making the
investigation someone's job.

**Do nothing, as now.** What five open findings have been asking to end. The cost
is not the backticks; it is that every lane rediscovers the problem, writes a
sixth theory, and files it against a lane that has already written five.
