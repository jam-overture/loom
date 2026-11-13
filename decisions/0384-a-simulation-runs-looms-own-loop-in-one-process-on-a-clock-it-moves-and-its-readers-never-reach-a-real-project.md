# 0384. A simulation runs Loom's own loop in one process on a clock it moves, and its readers never reach a real project

**Status:** Accepted
**Date:** 2026-11-12
**Section:** §1 (process), §4c (reader signals), the reasoning plane

## Context

The maintainer, on 12 November 2026:

> *"We need to create a way to run a simulation, so that I can better test
> hooking up to a model. It should be a simulation of several different personas
> interacting with the site in a different meaningful way. … We need to set up a
> small custom model and hook up into it. … We'll simulate the events, we
> broadcast the signals out, we'll feed them to the model, we trigger updates to
> the site. We'll keep the updates if they are an improvement."*

and, asked whether to build the simulation first and the model after:

> *"Yes, let's plan it out."*

The loop exists piece by piece: the door counts readers, Loom proposes a change
per page toward a goal (0329, 0352) with the project's own key (0332), the Gate
holds it, *Accept* puts it live on the site's next pull (0358), and the verdict
on *Page history* compares 14 days before with 14 days after at 1,000 page views
a side. Nothing has run the whole of it many times and counted how often it was
right, and on a real site it cannot: a verdict takes four weeks at the least.

Every stage already takes its clock and its transport as arguments (the
intake's `now`, the collector's and interpreter's `clock`, the pull's `fetch`),
and `tools/pglite` gives an in-process Postgres. The plan is
[`docs/simulation.md`](../docs/simulation.md).

Accepted by the maintainer on 13 November 2026: *"867 and 869 seem okay to
move forward."*

## Decision

1. **A simulation is Loom's own loop, run in one process.** The door, the
   counters, goals, the proposer, the interpreter, the Gate, the answer path,
   the read door, the pull and `measuring.ts` are the production code, unchanged.
   What is new is the readers, the clock and the report, and it lives in
   `tools/simulate/`, which neither the package nor the application imports.

2. **Time is compressed by moving the clock, never by changing a rule.** The
   simulation hands every stage a virtual clock and advances it a day at a time.
   The measuring window stays 14 days and the floor 1,000 page views a side. A
   rule changed for the simulation would make it measure a different product.

3. **Its readers never reach a real project.** A simulation's project exists
   only in its own in-process database. It holds no production credential,
   posts nothing to any deployment, and a run against a deployed portal is not
   part of this record.

4. **A simulated reader sends exactly what a browser sends, and Loom learns
   nothing more about it than about a real one.** 0262 holds. A persona's traits
   reach Loom only as the `aud_` id the simulated site sorts it into under 0371.

5. **A world is a pure, seeded function, and it knows the true effect of every
   change.** Personas and their rules are data; given a seed, a world, a page and
   a day, the batches are always the same. Because the rules are ours, the true
   effect of a change is computed from the old and new trees, and every verdict
   is scored against it. At least two worlds are kept and one is held out from
   anybody tuning the proposer.

6. **The order is the simulation, then the Claude baseline, then an open
   model.** The first two milestones use no model. The proposer that exists is
   run next, to give the number a custom model has to beat. An open model comes
   in behind the existing `ModelClient` seam (0005) as a second adapter and
   entry point, and training is only attempted if the untrained model's results
   say it is worth it.

7. **Simulated outcomes test the machinery; they are not a model's curriculum
   for real readers.** A model trained on them learns the world's rules. Whether
   real projects' outcomes may train a shared model is a separate decision for
   the maintainer, and this record does not take it.

## Consequences

- `pnpm simulate` exists from the second milestone and needs no key, no network
  and no `pnpm db:push`.
- For the first time Loom will publish how often *Helped* and *Hurt* are right,
  including how often a change that does nothing is called either. If the
  number is bad, that is a finding about the verdict, and it gets its own
  record.
- The simulation's reviewer (accept what the Gate holds, propose reverting what
  is called *Hurt*) is the simulation's own behaviour. Nothing about a real
  project's reviewing changes.
- The Claude baseline spends a key and a budget the maintainer gives it, set
  per run as a number of calls, never a project's sealed key.
- Choosing an open model on a project's *Settings* is out of scope. It needs a
  table, `pnpm db:push` and its own record once an open model has earned it.

## Alternatives considered

**Simulate against the deployed portal, into a dedicated project.** This is the
most faithful version: real HTTP, the real database, the real cron, and a real
site pulling. It was the first shape suggested. It was set aside because the
clock cannot be moved on a deployment, so every verdict still takes four weeks,
which is the problem the simulation exists to solve; and because a simulated
project in the production database is one mistyped key away from mixing into a
real project's numbers, which no later fix can separate. A deployed run is still
worth one smoke test of the wiring some day, and the plan names it as the
maintainer's call rather than a milestone.

**Shorten the measuring window for simulated projects**, for example a setting
of one hour instead of 14 days. That makes a deployed simulation fast, but it
changes the rule being tested. A window of an hour has different drift, a
different number of page views per side and different false verdicts from a
window of two weeks, so the simulation would report on a product nobody ships.
Moving the clock keeps every rule exactly as the maintainer set it on 5 November.

**Let a language model play the personas.** It would produce richer, less
predictable behaviour than rules do. It was rejected because the same kind of
model would then both propose the change and judge it as the reader, and could
win against its own guesses rather than any behaviour; because nobody would know
a change's true effect, so no verdict could be scored; and because every
simulated page view would cost a model call, where rules cost nothing.

**Train the custom model alongside the simulation, from the start.** It answers
the maintainer's second request soonest. It was put third because a model only
gets better with examples of what helped and what hurt, and the simulation is
what produces those examples; and because without the Claude baseline there is
no number to say whether the trained model is any good.
