# Rollout

The path from where Loom is today to something the public can use. Dates are
conditional and the conditions are named; treat them as a schedule to steer by,
not a promise.

**Written 2026-08-15.** Throughput assumption: the build routine runs twice a
day and lands roughly one coherent unit per run, which is what forty-five days
of reports actually show.

## Where we are

Sections 1–6 are functional end to end — 1,044 runtime tests, 381 portal tests.
The registry is empty. Nothing has been used by anyone outside this repository,
and no page built with Loom exists.

That last sentence is the honest summary of launch readiness.

## Phase 0 — The demo · target 24–26 August

Everything downstream is blocked on this, so it is the only thing the build
routine does.

| | Runs |
| --- | --- |
| Mount theme variables at the render root | 1 |
| Three primitives to prove the port pattern | 2 |
| ~15 primitives at the quality bar | 6–7 |
| Demo page and the governance split view | 3–4 |
| Polish to "not marginal" | 1–2 |

**Exit condition:** a page you can look at, built from real primitives, with the
proposal and the Gate's verdict beside it. Not "the code runs" — a URL.

## Phase 1 — The three surfaces · target 5–9 September

Docs, marketing and portal are separate routines precisely so they can run in
parallel once unblocked. Each is roughly 8–12 runs.

| Surface | Exit condition |
| --- | --- |
| **Docs** | A stranger can install Loom, register a primitive, and get a proposal accepted, working only from the site |
| **Marketing** | Pages that show the adaptation and the record beside it, good enough to send to someone cold |
| **Portal** | A developer using Loom opens it daily because it tells them something they cannot get elsewhere |

**Cost note.** Enabling all three at once a day takes the standing bill from 2
sessions a day to 5. That is the decision that sets this phase's length: three
in parallel is roughly ten days, one at a time is roughly a month. It is a
budget question, not an engineering one.

## Phase 2 — What launch actually requires · target 14–23 September

The work nobody remembers until it blocks them.

- **[F-001, the data adapter](../FINDINGS.md).** A framework whose primitives
  cannot read data is fine for a marketing page and not fine for "build
  applications with AI". **This is the most likely thing to move the date**, and
  it is architectural — see §4e. Everything else in this phase is measurable;
  this one is not until the port hits it.
- **Publishing** — npm, a version number that means something, and a public
  commitment about what may break. Ten entry points ship compiled output
  already, which is most of the way.
- **Licensing** — undecided, and it gates whether the repository can be public
  at all.
- **A getting-started path that works for a stranger**, verified by someone who
  did not build it.
- **Somewhere for people to report things** — issues, a channel, an address.

## Phase 3 — Private alpha, before anything public

**Strongly recommended, and currently not in the plan.** Five to ten developers
building something real, for one to two weeks, before a public launch.

The argument: every guarantee in this system is currently validated by its own
tests and fixtures. Nobody outside this repository has registered a primitive,
hit a Gate refusal they did not expect, or read the docs without already knowing
the answer. The first ten strangers will find things no amount of internal
review would — and finding them in public is far more expensive than finding
them in a private channel.

It costs one to two weeks and it is the cheapest insurance available.

## Phase 4 — Public

**Late September at the earliest**, and only if Phase 2 holds.

## What would move these dates

Honestly, in order of likelihood:

1. **F-001 turns out to be large.** It reaches the prop model. Could be days;
   could be a fortnight.
2. **Review latency.** The schedule assumes PRs are merged within a day or so.
   A fourteen-PR stack cost four days of visibility once already.
3. **Token budget.** Phase 1 in parallel needs 5 sessions a day. At 2 it takes a
   month instead of ten days.
4. **The quality bar.** "Nothing marginal" is a real constraint and it is the
   right one, but a primitive rejected and rebuilt is a run spent twice.

## Marketing — not now, but the shape of it

Deliberately unscoped; the maintainer has it as a later priority. Three things
worth recording while they are fresh, because they narrow the work later:

- **The differentiator is not adaptation, it is the record.** Plenty of things
  change a page with AI. Loom can say what changed, who asked, which rule
  allowed it, and how to undo it. That is an audit story, and audit stories sell
  to people with something to lose.
- **Which means the audience is probably not hobbyists.** The people who care
  most about gateable, attributable, reversible change are the ones who cannot
  ship un-reviewed AI output — regulated teams, agencies answering to clients,
  anyone with a compliance function. That is a narrower and better-paying
  audience than "developers who want AI in their UI".
- **The marketing site is the demo, not a description of it.** It is built in
  Loom and adapts in front of the visitor. The strongest asset available is the
  product working on the page they are reading.

None of this is a plan. It is three constraints for whoever writes one.
