# 0337 — A deployment's fix-list is read off one window, and states its collection schedule or says it has none

**Status:** Accepted

**Date:** 2 November 2026

**Section:** §4c (reader signals)

## Context

[0330](0330-the-page-to-fix-first-is-not-the-page-to-fix-when-its-own-fault-made-the-fall.md)
and
[0336](0336-a-fault-reaches-a-conversion-and-a-fall-differently-so-the-fix-list-asks-each-order-its-own-question.md)
built the reading a deployment's screen opens with: one line saying *rewrite this
page*, *rewrite this ask* or *repair this measurement*, with the page named. It
joins three readings — an order of falls
([0250](0250-a-deployment-is-ordered-by-readers-lost-at-the-doors-scale-and-a-page-the-door-cannot-scale-is-out-of-the-order.md)),
an order of conversions
([0333](0333-a-deployments-conversions-are-a-third-order-ranked-on-the-loss-between-the-two-ends.md))
and the health of the deployment's own collection
([0271](0271-a-fault-in-a-deployments-collection-is-named-by-what-it-costs-and-a-pages-readers-are-counted-once.md)).

**It is also the furthest thing in this subsystem from a store.** Every other
reading of a window is now one call with one argument, because three rungs were
built to make it so: the assembly turns a window into the subjects
([0309](0309-a-window-of-counters-is-read-into-the-readings-it-holds-and-the-trees-stay-the-callers.md),
[0322](0322-a-window-is-read-off-one-deployment-context-and-the-region-floor-is-not-optional.md)),
the figures rung publishes the three readings the assembly deliberately does not
([0327](0327-the-figures-a-window-holds-about-itself-are-a-second-rung-and-a-region-row-set-is-deduplicated-once.md)),
and `windowFunnelsOf` publishes the funnel answers (0333). The fix-list is what
is left: three readings, over two row sets, with a per-page reading derived under
one of them, and a caller writing that line by hand.

### What 0330 said about a home for that line, and what has changed

0330 rejected `windowFiguresOf` as the home, on the ground that *this takes two
readings a caller already has and already draws, and both of its inputs are one
call with one argument — so there is nothing here a caller can get wrong to be
protected from.* **That was true of two inputs.** 0336 made it three, and the
third needed the funnel answers, which needed a rung of their own. This is the
line as it now stands:

```ts
const agenda = deploymentAgendaOf(
  deploymentReadingOf(assembly.readings.pages.map(readingProgressOf), window.pageViews),
  deploymentConversionOf(windowFunnelsOf(window, assembly).pages),
  collectionHealthOf(assembly.readings.pages, window.pageViews)
)
```

Three of its parts can now be wrong, two of them silently, and the last one is
the reason this is a record rather than a tidying commit.

**The progress readings are over the window's readings and not over a library.**
The nearest line to hand maps `libraries.now.readings`, which type-checks, runs,
and drops the earlier revision of every page revised inside the window and every
form the placings could not place — so the fix-list is an order over some of a
deployment's pages with nothing saying which. The same hazard as the pace
reading's (0327).

**All three readings have to be of one window.** `DeploymentAgenda.unpaired`
exists because they need not be, and it is the subsystem's standing answer to a
caller error it can see and cannot repair (0330). It does not stop the error.

**The collection schedule is optional, and leaving it out is the unsafe
direction.** This is the one that matters.

### The argument nothing asks for, and the sentence it changes

`collectionHealthOf`'s third argument is a `CollectionSchedule`: what the
deployment folds within, and the instant the reading is taken. It is optional
because a caller with no schedule to state should get a reading that judges
nothing rather than one that judges against a default, which is right.

The composed line above omits it, and the cost is **not** a missing row.
`collection-stalled` is never raised; and because a stalled fold reaches both
ranking keys — `spoilsTheLoss` and `spoilsTheConversion` are both `true` for it
(0336) — the fall and the leak that the stall manufactured are never withdrawn
either. Two readings of one window, differing by one omitted argument, say the
opposite thing about the same page:

| the schedule | `work` | the orders | `contested` |
| --- | --- | --- | --- |
| stated | `collection` | both withdrawn | the page |
| omitted | `page` | both ranked | empty |

So the omission does not merely under-report. It sends an operator to rewrite a
page whose numbers are an artefact of its own stopped collection, which is the
precise failure 0330 exists to prevent, arriving through the one argument nothing
reminds anybody of. It fails silently, it is invisible in a diff, and it is
indistinguishable from a caller that meant to judge nothing.

## Decision

**A third rung, `windowAgendaOf` in
[`window-agenda.ts`](../src/signals/window-agenda.ts)**, which reads a
deployment's fix-list and each of the four readings it was joined from off one
window, one assembly and one set of funnel answers.

```ts
const assembly = windowAssemblyOf(window, context)
const funnels = windowFunnelsOf(window, assembly)
const { agenda } = windowAgendaOf(window, assembly, funnels, { at, foldsWithinMs })
```

**1. The schedule is required, and may be `null`.** Not optional. A deployment
that states no schedule passes `null` and has said so in a word a reviewer can
read, which is the shape the region floor was given for the same reason (0322).
This is the whole safety the rung adds and the rest follows from it.

**2. The progress readings and the health reading are made here; the funnel
answers are handed in.** The rule, stated so the next reading added to this rung
does not have to re-derive it: **a reading with a published call of its own is
handed in, and a reading that is one call over the assembly's own readings is
made.** `windowFunnelsOf` is that published call, and its whole point is that
every side of every funnel comparison is the same object as the reading of that
form — so answering the funnels again here would put two answers of one revision
on one screen, which is the thing that call exists to make impossible. The order
of falls and the health reading have no such call.

**3. All four readings are published, not only the join.** Each is separately
drawn: a screen that names the page to fix next shows the run of parts the fall
is in, the standings of the two orders, and the faults. They are the readings the
join was made from rather than a second set of them, and the fix-list's rows
carry the published rows themselves — `rows[0].conversion` *is*
`conversion.ranked[0]`, by identity.

**4. `unpaired` and `duplicated` are nought by construction.** The three
readings are over one assembly's one set of readings, and the assembly never
holds two readings of one page. Both are kept published and carried as they come,
for the caller that assembled a reading of its own, exactly as the assembly keeps
its own two (0327).

**5. It composes and does not count.** Nothing here counts, divides, sums or
withholds — the rule the rungs under it keep. There is deliberately no total over
what the four readings left out: an unranked page, a page with no question, a
faultless page and a page the door cannot scale are four different absences, and
a sum over them would be a figure in none.

**6. The context is not taken.** None of the readings holds a region bucket or
places a form, so neither of the two context fields the figures rung needs has
anything to reach. And the schedule is not a context field: half of it is the
instant the reading is taken, and a context holding a clock reading would answer
differently on two calls over one window. That boundary was filed on 29 October
and this is the answer to it — the rung takes the whole schedule, so the
`scheduleAt(at)` shape the finding suggested has no caller to need it.

## Consequences

- **A deployment's fix-list is three lines from a store**, which is what the
  *Signals* screen has been recommended to open with for three runs. Nothing
  draws it yet; that is `Loom portal`'s and is unchanged by this.
- **A caller that states a schedule gets a fault the hand-written line could not
  raise**, and loses two ranks it should never have had. That is a behaviour
  change for nobody, because the composition had no caller — but it is the
  reason the rung is worth more than the lines it saves.
- **`collectionHealthOf` keeps its optional third argument.** It is right there,
  for the reason it was made optional, and this rung is not a reason to break
  every caller of it. The requirement is at the rung, which is where a screen
  calls in.
- **`DeploymentReadingContext` is unchanged**, and the 29 October boundary is
  closed with an answer rather than a fifth field.
- **A fourth rung is now possible and is not built**: nothing composes the three
  rungs into one call. That is deliberate — a caller wanting the figures, the
  funnels and the fix-list writes four lines, and a single entry point over them
  would have to decide which of the forty-two readings a deployment wants by
  default, which is the policy decision no surface has asked for (0327).
- **Nothing reaches a reader's browser.** No payload field, no counter, no
  column, no store method, no migration and no new kind. The whole unit is
  interpretation of metadata the server already holds.

## Alternatives considered

- **Making `collectionHealthOf`'s schedule required.** Rejected, and it is the
  shape that closes the hole rather than making it narrower. It costs every
  caller of a published reading — and every test in `health.test.ts` — a `null`
  it has nothing to say with, to protect a composition that has one caller. The
  weaker guarantee is the same trade the region floor's own limit was left at:
  the safe route is the shortest one, and the step below it is still reachable.
- **Adding the fix-list to `windowFiguresOf`.** Rejected again, for 0327's
  reason rather than 0330's: that rung is *the figures a window holds about
  itself* and takes three readings nothing else composes. This takes four
  readings every one of which is separately drawn, and publishes all four.
  Folding them in would make one type the answer to two different questions.
- **Deriving the funnel answers here too, so the rung takes three arguments
  instead of four.** Rejected: it is the one input with a published call of its
  own, and reading it twice is how a screen comes to hold two funnel answers of
  one revision — the property 0333 was built to guarantee.
- **Taking the progress readings as an argument as well.** Rejected: that is the
  hazardous line, so taking it in preserves the hazard while keeping none of the
  benefit. A progress reading is one call with one argument over a reading the
  assembly publishes, and a caller that wants them has them on the result.
- **A `scheduleAt(at)` function on the reading context**, which is the shape the
  29 October finding suggested. Rejected as unnecessary rather than wrong: it
  requires the context to hold a fold window, which every caller reading regions
  would then have to state, and it saves a caller nothing — `at` is the caller's
  and `foldsWithinMs` is one field, so the assembled schedule is shorter than the
  call that would build it.
- **Refusing a reading whose schedule is `null`.** Rejected: a deployment that
  genuinely schedules nothing — a fixture, a first run, a store read by hand —
  is entitled to the two orders and the five faults that do not need a clock. A
  refusal would take a correct fix-list away from it.
- **A boolean rather than a nullable schedule**, something like
  `judgeFolds: false`. Rejected: two arguments where the value's own absence says
  it, and a caller could then pass `true` with no schedule to judge against.
