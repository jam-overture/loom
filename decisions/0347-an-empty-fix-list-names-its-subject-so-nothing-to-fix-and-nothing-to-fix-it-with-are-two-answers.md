# 0347 — An empty fix-list names its subject, so *nothing to fix* and *nothing to fix it with* are two answers

**Status:** Accepted

**Date:** 4 November 2026

**Section:** §4c (reader signals)

## Context

`deploymentAgendaOf` is the reading a deployment's screen opens with. It joins
three readings and publishes `first` — *the one thing to do first, or `null`
where the three readings ask for nothing*
([0330](0330-the-page-to-fix-first-is-not-the-page-to-fix-when-its-own-fault-made-the-fall.md),
[0336](0336-a-fault-reaches-a-conversion-and-a-fall-differently-so-the-fix-list-asks-each-order-its-own-question.md),
[0343](0343-a-deployments-fix-list-is-read-off-one-window-and-states-its-collection-schedule-or-says-it-has-none.md)).

**That `null` was two opposite sentences in one value.**

A deployment whose pages are read, answered and soundly collected has nothing to
do, and `null` says so. A deployment whose door turns every delivery away has no
counters — so no readings, so no rows, so no two orders, so no faults and no
first row either — and the fix-list said *nothing to do* about it too. Nothing
anywhere in the join distinguished them, and the second is not an edge case: it
is the commonest failure a new deployment has, a snippet on `loomjs.org` behind
a project that names `www.loomjs.org`, and the remedy is one line in a settings
field.

[0326](0326-a-quiet-window-and-a-refusing-door-are-two-states-and-a-refusal-names-no-page.md)
built the reading that answers it. `arrivalStandingOf` joins a health reading to
the deployment's own refusal counter and publishes five standings — `silent`,
`turned-away`, `collecting`, `mixed`, and `unasked` where nothing offered a
count. **Nothing joined that reading to the fix-list**, so the one screen a
person opens when their deployment reports no readers was the one place the
answer was missing.

[0327](0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)
declined to carry the arrival standing on `WindowFigures`, and that still
stands: it would have added no figure there and made the type generic in a
deployment's refusal reasons for one passthrough. The fix-list is the one
reading whose **answer is reversed** by it, which is a different trade.

## Decision

**`DeploymentAgenda.subject`**, a closed set of four, and a required fourth
argument to `deploymentAgendaOf` carrying the arrival standing.

```ts
const health = collectionHealthOf(assembly.readings.pages, window.pageViews, schedule)
const agenda = deploymentAgendaOf(
  order,
  conversion,
  health,
  arrivalStandingOf(health, turnedAway, at)
)
```

| | nothing turned away | deliveries turned away | nothing said |
| --- | --- | --- | --- |
| **the health reading named a page** | `pages` | `pages` | `pages` |
| **it named none** | `silence` | `intake` | `unverified` |

- **`pages`** — the rows are the answer, and `first === null` from here is the
  honest *nothing to do*.
- **`intake`** — the state this exists for. Repair the intake; no row below is
  evidence of anything, because there are none.
- **`silence`** — no page is posting at all: no snippet, or the broadcaster was
  never called.
- **`unverified`** — nothing was collected and nothing counted refusals, so
  this declines to choose between the two silences above it. The refusal rather
  than the gap, on 0240's rule that an absent store is not an empty map.

It is the rule this reading already keeps about a contested page — *while one
exists, an order is not evidence* — generalised one level up: **while nothing
is arriving, no reading is evidence**, and the absence of rows is not the
absence of work.

### Each half comes from the reading that owns it, and only `standing` is taken in

**Whether anything was collected is the health reading's pages, counted once** —
the rows are joined from them, so the subject is a claim about *these rows*. It
is deliberately **not** read off `ArrivalStanding.collected`, although that is
the same number for a caller that read one window
([0326](0326-a-quiet-window-and-a-refusing-door-are-two-states-and-a-refusal-names-no-page.md)
computes it from the same `health.pages.length`). A caller holding a stale
arrival standing and a fresh empty window would otherwise get a verdict about
one deployment and rows from another, and the count that is right about the rows
is the one beside them.

**Whether anything was turned away is the arrival standing's, and only that.**
So the argument is `Pick<ArrivalStanding, "standing"> | null` — the shape
`arrivalStandingOf` itself takes its health reading in, so that what is judged
is what a reading published rather than two loose values. It keeps
`deploymentAgendaOf` non-generic in a deployment's reasons, which is 0327's
objection answered rather than overruled, and it carries no copy of `refused`,
`newest` or the origin: the caller holds the standing it handed in, and a second
copy of one figure is how two figures come to disagree.

The mapping is an exhaustive switch over the five standings rather than a test
for one member, so a sixth cannot be added without this file being asked what it
means here. `silent` and `collecting` collapse to the same answer — *the door
turned nothing away* — for opposite reasons, and that is correct because the
other half of the subject comes from the rows.

### `null` and `unasked` are one answer

Both read `unverified`. A caller with no counter to read and a deployment with
no counter to offer are the same absence, and a separate word for the first
would be a sixth member of a closed set of five, said twice.

### Required rather than optional, on 0322's and 0343's terms

An argument a caller may omit is a fix-list that type-checks, runs, and cannot
tell *nothing to fix* from *nothing to fix it with*. `null` written out is a word
a reviewer reads; a missing argument is a space where one is not
([0322](0322-a-window-is-read-off-one-deployment-context-and-the-region-floor-is-not-optional.md),
0343).

### The rung takes the refusal rows, not the reading over them

`windowAgendaOf` gains a fifth required parameter, `turnedAway`, and makes the
arrival reading itself — publishing it whole on `WindowAgenda.arrival`, generic
in the deployment's reasons so that `newest.reason` comes back in the host's own
closed set and the remedy stays the host's to word (0311, 0326).

The 31 October finding asked that a rung **take the reading's result** rather
than compute one, and 0327 upheld that for the figures rung. **That reason was
about reaching a store** — a refusal counter is the deployment's own table, keyed
by application and reason, written on the request path and holding nothing a
window holds (0309) — and this does not: the rows are handed in, exactly as the
window's rows are. What this rung has that the figures rung did not is the other
half of the reading: `arrivalStandingOf` is taken over a health reading, and
this is the one place in the subsystem where that reading is made. A caller
asked for the *result* here would have to compute the health reading itself to
get one, which is the second copy of a reading this rung exists to prevent.

So the finding is refined rather than contradicted: **a rung that owns one half
of a reading takes the other half's rows; a rung that owns neither takes the
result.**

The instant the newest refusal is aged against comes off
`CollectionSchedule.at`, parsed with the `NaN` guard `collection-stalled`
already puts on the same field, so one reading of one window is taken at one
instant. A `null` schedule or an unreadable instant gives every arrival figure
and no age — a published state of that reading rather than a degraded one.

## Consequences

**The fix-list can say what it is about before any row of it is read.** A
deployment whose door is refusing every delivery is told to repair its intake
instead of being told there is nothing to do, and the reason, the origin and how
long ago are on `WindowAgenda.arrival` for the sentence that names the remedy.

**`first === null` now has a companion that says which `null` it is**, and the
invariant is tested: on every subject but `pages` there are no rows, no lists and
no first row, because the rows are joined from the health reading's pages.

**`deploymentAgendaOf` and `windowAgendaOf` both gain a required argument**,
which is a breaking change to two published calls in a pre-production alpha with
no caller outside this repository's tests. It is the third time this lane has
chosen that over an optional one, and for the same reason each time.

**Nothing reaches a reader's browser.** No payload field, no counter, no column,
no store method, no migration and no new kind. `broadcast.ts` is byte-identical.

**A stale arrival standing cannot claim pages for an empty window**, and a
caller that hands one in gets the subject its rows deserve. That it *can* be
stale is unchanged and is what `unpaired` already exists to catch for the other
three readings; nothing here counts it, because the subject is not a count.

**Nothing is superseded.** 0326's five standings, 0330's and 0336's orders,
0343's rung and 0327's refusal for `WindowFigures` all stand as written.

## Alternatives considered

- **An eighth `CollectionFault`.** Rejected, as 0326 rejected it: every one of
  the seven is about one revision of one page, and a refusal names no page.

- **A fifth `AgendaWork` member.** Rejected. That vocabulary answers *whose
  hand* for **one page**, and there is no page here to put it on. It would also
  rename `both` and widen a flat set of four to a second dimension, which 0330
  and 0336 both refused.

- **Change `DeploymentAgenda.first` to a tagged union of a page row and an
  intake verdict.** Rejected. 0330's `first` is a page or nothing and is drawn
  as one; making it two shapes would break every surface for a fact that belongs
  above the list rather than at the head of it, and the intake is not *the first
  of the rows*.

- **Carry the whole `ArrivalStanding` on `DeploymentAgenda`.** Rejected for the
  reason 0327 rejected it on `WindowFigures`: it would make the type generic in
  a deployment's reasons for a passthrough of a value the caller handed in one
  line above. The rung publishes it, because the rung is what computed it.

- **Derive `collected` from `ArrivalStanding.collected`.** Rejected: it is the
  right number only for a caller that read one window, and the subject's whole
  job is to be a claim about the rows beside it.

- **A fifth subject for `mixed` — *the rows are sound but may not be every
  page*.** Rejected. 0326 says the arrival reading deliberately declines to
  judge `mixed`, because a second sender with a stale key, one page of several
  carrying the wrong snippet and a misconfiguration since fixed are the same
  rows. A subject that judged it would be the join second-guessing the reading it
  was handed, and `newest.sinceMs` beside it is what tells those apart.

- **Leave `turnedAway` optional on `windowAgendaOf`.** Rejected. Every existing
  caller would silently read `unverified`, which is honest but leaves the hazard
  one omitted argument away in the one call whose job is to make the safe route
  the shortest one.
