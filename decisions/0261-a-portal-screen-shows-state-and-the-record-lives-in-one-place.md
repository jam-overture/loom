# 0261 — A portal screen shows state, and the record lives in one place

**Status:** Proposed
**Date:** 2026-10-12
**Section:** §5

> **Why it is raised.** It narrows a brief this lane has enforced since 18
> August as a machine property, across 45 assertions in 16 test files. The
> brief produced a portal of eight empty screens and three that cannot be
> scrolled to the bottom, and the maintainer's verdict on 12 October was that
> he *"can't even make heads or tails of what I should be looking at and
> therefore can't give you any real direction."* A convention enforced by tests
> does not change by being disagreed with in a report.
>
> **Why this number.** `0260` is raised on the same branch and takes the number
> below.
>
> **Scope settled by the maintainer, 12 October:** *"The portal stands apart
> from marketing, docs, lessons, etc."* Nothing here touches those three.

## Context

The governing brief for every portal screen is one sentence, written in
`_lib/vocabulary.ts` and cited three times in `FINDINGS.md`:

> **Plain language is the default. The technical record is one click away.
> Nothing is ever removed.**

**Two of those three sentences are right and have earned their place.** Leading
in a person's words is why the portal does not say `did-not-apply` at a human
being, and the check that enforces it is cheap and catches real leaks.

**The third is the problem, and it is a mechanism rather than a taste.**
*Nothing is ever removed* is monotonic: it says every fact a screen has ever
carried keeps a home on that screen. There is no clause anywhere that permits
deleting one. The clearest evidence is the lane's own report of the pass that
introduced the disclosures — moving technical fields behind them, it
**added** three fields that rows used to drop, *"so the technical record is
strictly larger than it was."* That is the rule working exactly as written.

Counted on 12 October, this is what it produces. Prose is words inside a `<p>`
on the screen's own file; controls are every `input`, `select`, `textarea` and
`button` in it:

| screen | prose words | controls |
| --- | ---: | ---: |
| front door | 493 | 0 |
| Trust | 403 | 0 |
| What-if | 361 | 0 |
| Readers | 322 | 0 |
| Rules | 299 | 0 |

In the whole portal — 35,438 lines — there are **32 interactive controls in six
files**. `Rules`, whose entire subject is settings, has none: it states the
thresholds in sentences and offers no way to move one.

**There is a second error underneath, about who is reading.** The banned-word
list was written for a layperson. The portal's reader is a developer running an
application. `log` and `logs` were on that list — because Loom's runtime means
*the revision journal* by it — which made the plainest available word
unsayable on the screen the maintainer commissioned by name: *"Viewing /
inspecting your loom logs / signals."*

## Decision

**Inside `(portal)` only, the brief is replaced by:**

> **A portal screen shows state. The default unit is a row, a number or a
> control — never a paragraph. Explanation lives beside the control it is
> about, behind a label or an info affordance. The complete record lives in one
> place, which is the log and its detail pane, not in a disclosure on every
> screen that touches it.**

Four clauses, each load bearing:

1. **Plain language survives, and so does its check.** Leading with the
   runtime's vocabulary stays banned. This record removes no assertion that
   stops `delta`, `gate`, `node`, `tree` or `revision` reaching a reader
   unasked.

2. **The audience is a developer.** `log` and `logs` leave the banned list,
   because they belong to the industry rather than to the runtime. Where the
   journal sense is meant precisely, write *journal*. Nothing else moves.

3. **"Nothing is ever removed" is withdrawn as a screen rule.** A screen may
   drop a fact. What it may not do is lose one: the fact goes to the log, which
   is a *place*, and the screen links to it.

4. **A screen that cannot be understood without a paragraph is the wrong
   screen.** The paragraph is evidence about the layout, not a fix for it.

## Alternatives considered

**Leave the brief and write denser screens anyway.** What a report would do and
a test would undo. The brief is 45 assertions; the next routine writes the
prose back and is right to, because the rule says so.

**Drop the plain-language check entirely.** Throws away the half that works.
`did-not-apply` and `Allowed by nobody` were real, were printed at people, and
the check is why they are gone.

**Apply this to every surface.** Refused, and the maintainer scoped it himself.
The marketing site's job is to explain to a stranger, and the documentation's
is to be complete. Both should keep *nothing is ever removed*; only the tool
should not.

## Consequences

- `_lib/vocabulary.ts` keeps its three-string shape — `label`, `meaning`,
  `technical`. That was never the problem and it is what makes a detail pane
  possible.
- The disclosure widgets on the portal's screens are no longer required, and
  most of them go when their screen is rebuilt under
  [0260](0260-a-project-is-the-unit-loom-stores-governs-and-measures-under.md).
- **A new check is owed and is not in this record:** something that fails a
  portal screen whose prose-to-control ratio looks like the table above. It is
  not written here because the right threshold is not yet known, and a number
  invented to make a point is the kind of rule this record exists to retire.
- If this is **refused**, the plan under 0260 should stop at the schema: there
  is no point rebuilding screens that the tests will re-inflate.
