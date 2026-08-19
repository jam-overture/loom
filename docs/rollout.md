# Rollout

The path from where Loom is today to something the public can use. Dates are
conditional and the conditions are named; treat them as a schedule to steer by,
not a promise.

**Rewritten 2026-08-16.** The first version of this file was written a day
earlier from a stale checkout and shipped with Phase 0 already complete — it
targeted a demo that had landed four days before. Anything below that reads as a
status claim goes stale quickly; check it against `main`, the decision index and
the most recent reports before planning against it.

Throughput assumption: four routines, each landing roughly one coherent unit per
run. That is what fifty days of reports actually show.

## Where we are

Sections 1–6 are functional end to end, on 1,173 passing tests. Eighteen
primitives are registered and the demo is live at `apps/loom/app/(portal)/portal/demo`. The
data seam landed as
[0058](../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md),
so a primitive can now be fed from somewhere other than authored content.

What remains true, and is the honest summary of launch readiness: **nothing has
been used by anyone outside this repository.**

## Phase 0 — The demo · **complete, 12 August**

A page you can look at, built from real primitives, with the proposal and the
Gate's verdict beside it.

It landed roughly two weeks ahead of the original target, because the estimate
was written without knowing the primitive port was already underway.

## Phase 1 — Breadth and the three surfaces · target early September

Four routines, and only two of them are running.

| Effort | Routine | State | Exit condition |
| --- | --- | --- | --- |
| **Primitives** | `Loom primitives` | **enabled 16 Aug** | Enough vocabulary to build a real page — Hermes has ~70 blocks, 18 are ported |
| **Portal** | `Loom portal` | enabled | A developer using Loom opens it daily because it tells them something they cannot get elsewhere |
| **Docs** | `Loom docs` | **disabled** | A stranger can install Loom, register a primitive, and get a proposal accepted, working only from the site |
| **Marketing** | `Loom marketing` | **disabled** | Pages that show the adaptation and the record beside it, good enough to send to someone cold |

Docs and marketing were held until the vocabulary existed. It now does — the
pattern is proven and eighteen primitives are real — **so nothing is blocking
them.** Each is roughly 8–12 runs, and they are the two surfaces a launch cannot
happen without.

The phase's length is set by how many of the four run in parallel, not by
anything technical. Sequential is roughly a month; all four is roughly ten days.

## Phase 2 — What launch actually requires · target mid-to-late September

The work nobody remembers until it blocks them.

- **Publishing** — npm, a version number that means something, and a public
  commitment about what may break. Ten entry points ship compiled output
  already, which is most of the way there.
- **Licensing** — undecided, and it gates whether the repository can be public
  at all. **This one is the maintainer's and nothing unblocks it but a
  decision.**
- **A getting-started path that works for a stranger**, verified by someone who
  did not build it.
- **Somewhere for people to report things** — issues, a channel, an address.

The data adapter used to head this list as the most likely thing to move the
date. [0058](../decisions/0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)
landed it, so the largest known unknown in this phase is now closed.

## Phase 3 — Private alpha, before anything public

**Strongly recommended, and still not scheduled.** Five to ten developers
building something real, for one to two weeks, before a public launch.

The argument: every guarantee in this system is validated by its own tests and
fixtures. Nobody outside this repository has registered a primitive, hit a Gate
refusal they did not expect, or read the docs without already knowing the
answer. The first ten strangers will find things no amount of internal review
would, and finding them in public is far more expensive than finding them in a
private channel.

It costs one to two weeks and it is the cheapest insurance available.

## Phase 4 — Public

**Late September at the earliest**, and only if Phase 2 holds.

## What would move these dates

In order of likelihood:

1. **How many efforts run in parallel.** Phase 1 is four independent surfaces,
   and its length is roughly the number of them running at once. This is the
   largest lever and it is a scheduling choice, not a constraint.
2. **Review latency.** The schedule assumes PRs merge within a day or so. A
   fourteen-PR stack cost four days of visibility once already, and the portal
   spent a day blocked on a document that existed only on a merged branch.
3. **The quality bar.** "Nothing marginal" is a real constraint and the right
   one, but a primitive rejected and rebuilt is a run spent twice.
4. **Licensing.** Not a risk to the schedule so much as a hard gate on Phase 4.

Not on this list: the cost of running the routines. The failure worth guarding
against is a *runaway* — a process that re-arms itself and scales with how long
the maintainer is away, which is what `send_later` chains did in August. Work
that was asked for is not that, and is not rationed.

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
