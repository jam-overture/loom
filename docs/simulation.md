# The simulation — readers we wrote, a loop we can run in an afternoon

**Status: S1 built; the rest is a plan.** Decided in shape by
[0384](../decisions/0384-a-simulation-runs-looms-own-loop-in-one-process-on-a-clock-it-moves-and-its-readers-never-reach-a-real-project.md)
(Accepted 13 November 2026). Each milestone below is one pull request, and none starts before the
one above it is on `main`.

## Why

The maintainer, on 12 November 2026, asked for three things: a simulation of
several personas using a site in meaningfully different ways, a small model of
our own to propose changes, and the two hooked together so that signals go out,
the model proposes, the site updates, and an update is kept if it helped.

Everything the loop needs already exists, one piece at a time. The door counts
what readers did (`/api/reader-signals`). Loom proposes one change per page from
it (0329), toward a goal (0352), paid with the project's own key (0332). The
Gate holds it, a person accepts it, it goes live on the site's next pull (0358,
`@jam-overture/loom/live`), and *Page history* says *Helped*, *Hurt*,
*No clear change* or *Too early* (`measuring.ts`).

What nothing has done is **run all of it, many times, and count how often it was
right.** On a real site that is slow: a verdict needs 14 days after a change and
1,000 page views a side, so loomjs.org would produce a handful of verdicts a
quarter. A simulation produces hundreds in an afternoon.

## What a simulation can and cannot tell us

Said first, because it decides the order of everything below.

**It can tell us whether the machinery works and how often each part is right.**
Because we write the readers, we know the *true* effect of every change: how
much more or less often a persona would press the goal on the new page than on
the old one. So for every verdict we can say whether it was correct. That is two
numbers nothing else can give us:

1. **How often the proposer's changes really help** — the baseline any custom
   model has to beat.
2. **How often the verdict is right** — including how often a change that does
   nothing is called *Helped* (it should be about 1 in 40 at a 95% two-sided
   test), and how often traffic drift between the before and after windows
   fools it.

**It cannot tell us what real readers want.** Simulated readers behave by rules
we wrote. A model that learns to win in the simulation has learned our rules,
not people. So simulated outcomes are for testing the pipeline, the measuring
and the training mechanics; they are not the data a model worth shipping is
trained on. That data is real projects' accepted changes and their verdicts,
which raises its own question for the maintainer (*Calls*, 5).

## The shape

```
 seeded world ──► personas walk the live page ──► ReaderSignalBatch[] ──► the real door
      ▲                                                                     │ (clock = virtual)
      │                                                                     ▼
 pull the live pages ◄── Accept (as a "Simulation" member) ◄── Gate ◄── proposer ◄── counters
      │                                                                     ▲
      └────────── after 14 virtual days: the real measuring.ts verdict ─────┘
                       compared with the world's true effect
```

Everything in that picture is Loom's own production code except the left-hand
column, which is new and lives in `tools/simulate/`, outside the package and
the app, so none of it ships.

### It runs in one process, on a clock it moves

Every piece the loop passes through already takes its clock as an argument: the
door's intake has `now` (`receive.ts`), collection and expiry take `clock`, the
interpreter takes `clock`, and the measuring is a pure function of instants. The
pull takes its own `fetch` (`src/live/pull.ts`), so it can be pointed at the
read door's handler in the same process. The database is PGlite
(`tools/pglite`), the same in-process Postgres the tests use.

So a simulation sets the clock, delivers a day of readers, moves the clock on a
day, and repeats. Fourteen days take as long as computing them does. **No rule
is changed to make this fast**: 14 days and 1,000 views a side stay exactly the
maintainer's numbers, and the verdicts are the real code's.

### It never reaches a real project

Its readers go to a project that exists only in its own PGlite database. It holds
no production credential and posts nothing to loomjs.org. A run against a
deployed portal is a separate question (*Calls*, 4) and not part of this plan.

### No reader identity, still

0262 holds: Loom never learns who a reader is, and a simulated reader is no
exception. A persona sends exactly what a browser sends (page-view key, reach,
dwell, presses, disclosures, completions) and nothing else. A persona's traits
(phone or desktop, from search or direct, returning or new) reach Loom only the
way a real reader's do: the simulated site sorts it into a segment by 0371's
rules, and Loom sees the `aud_` id.

## The world and its personas

A **world** is a seeded set of personas and the rules they follow. Given a seed,
a world, a page and a day, the readers it produces are always the same, so a
surprising run can be replayed exactly. It is a pure function:
`readersOf(world, seed, page, day) → ReaderSignalBatch[]`.

A **persona** is a kind of reader with a share of the traffic, traits a segment
rule can sort on, how far it tends to read, what it came for, and what on a page
changes whether it gets it. The first world has five:

| Persona | Share | Traits | Reads | Presses the goal when |
| --- | --- | --- | --- | --- |
| Hurried phone reader | 35% | phone, from social | the first screen or two | the goal's control is in the first two bands |
| Developer comparing | 20% | desktop, from search | deep, opens code and disclosures | the page shows code before it asks |
| Pricing checker | 15% | either, direct | jumps to prices | a price is visible above the control |
| Returning user | 15% | returning | barely, heads for sign-in | sign-in is easy to find; ignores the rest |
| Skimmer from search | 15% | from search | headings only | a heading near the top says what they searched |

Each rule is a probability, not a certainty, and each has noise, so the same
page never gives the same count twice. The rules read the tree the site serves:
where the goal's part sits in reading order, how many words come before it, how
many other controls compete with it, and what the headings say. A change that
moves the goal up, cuts words, or rewrites a heading changes the probabilities,
and because the rules are ours, **the true effect of any change is computed
exactly** from the old and new tree, before a single reader is simulated.

**Drift is part of the world.** Traffic shares move with the day of the week and
slowly over weeks, because the verdict compares a before window with a later
after window, not two halves of one audience, and the simulation should show how
often that ordering fools it.

**More than one world.** Tuning a prompt until it wins in one world teaches the
prompt that world. At least two worlds with different rules are kept, and one is
held out: nobody looks at its results while changing the proposer.

## Milestones

Each is one pull request. The first two use no model and spend nothing.

| # | Milestone | What it proves | Needs |
| --- | --- | --- | --- |
| S1 | **The world.** `tools/simulate/world`: personas, seeded randomness, a reader's walk of a tree's reading order into `ReaderSignalBatch`es that parse with `parseReaderSignalBatch`, and the exact true effect of a change between two trees. Pure, tested. **Done** (13 November): `tools/simulate/` has `draw.ts` (a draw named by its path, so no draw shifts another), `page.ts` (bands and the features the rules read), `persona.ts` and `world.ts` (the five personas, weekday and drift, and a held-out world), `readers.ts` (one batch per band, the goal done with exactly the chance the rules add up to) and `effect.ts` (the true effect, with the same days' readers on both pages). | Personas behave differently from one another, and the batches are ones the door accepts. | — |
| S2 | **The loop without a model.** A virtual clock, PGlite, the real door, counters, goals and `measuring.ts`. Changes are planted by hand: one known to help, one known to hurt, one that changes nothing. `pnpm simulate` prints a report. | How often *Helped*, *Hurt* and *No clear change* are right, and what drift does to them. This is useful on its own. | — |
| S3 | **The Claude baseline.** The real proposer (`proposeFor`, the interpreter, the Gate, the answer path, the pull), with a "Simulation" member pressing *Accept* on what the Gate holds. A call budget stops the run before it spends more than it was given. | The share of changes that truly help, the share the verdict calls *Helped*, what the interpreter and the Gate refused, and cost per change. | The maintainer's key and budget (*Calls*, 2), and the sim's accept and revert rules (*Calls*, 3). |
| S4 | **The browser check.** A few personas driven through Playwright on a rendered page, with the real broadcast, compared with S1's synthetic batches for the same page and seed. | S1 sends what a browser sends. | — |
| S5 | **A swappable model.** A second adapter behind `ModelClient` (0005), for any server that speaks the OpenAI-compatible chat API with JSON-schema output (Ollama, llama.cpp, vLLM), as its own entry point. S3 run again with an open model, unchanged otherwise. | How far an untrained open model is from the baseline, at what cost. | Which model and where it runs (*Calls*, 6). |
| S6 | **Training, if S5 says it is worth it.** Export each simulated proposal as (brief, change, true effect, verdict); fine-tune with LoRA (a cheap fine-tune that trains a small add-on to the model rather than the whole thing), first on changes that helped, then on helped-versus-hurt pairs from the same page; evaluate on the held-out world only. | That the training loop works end to end. Not that the model is good for real readers. | Whether real projects' outcomes may ever be training data (*Calls*, 5). |

**Not in this plan:** letting a project choose an open model on *Settings*. That
is a portal change with a table and `pnpm db:push`, and it needs its own record
once S5 shows an open model is worth offering.

### Rough sizes

- **S2:** a change needs 1,000 page views on its page on each side of 14 days,
  so about 2,000 for the page and more for the rest of the site in the same
  weeks: tens of thousands of simulated page views per run of a few changes.
  In-process that should be minutes, not hours, but S2 will measure it rather
  than this plan guessing.
- **S3:** one model call per proposal, two when the first is refused and
  repaired (0006). Fifty changes is fifty to a hundred calls. The budget is a
  number of calls, set before the run, and the report says what was spent.
- **The smallest effect a verdict can see:** at 1,000 page views a side and a 5%
  goal rate, a change has to move the rate by roughly three points (more than
  half of itself) before the test calls it *Helped* or *Hurt* most of the time. So S1's worlds should contain
  changes that big, and S2 will show what smaller ones come to.

## Calls for the maintainer

None of these blocks S1 or S2.

1. **The order and the shape** in 0384: simulation first, in one process on a
   virtual clock, before any model work. *Recommended.*
2. **The S3 budget.** Which key pays (recommended: a key of yours in the
   simulation's own environment variable, `LOOM_SIM_ANTHROPIC_API_KEY`, never a
   project's sealed key), and a ceiling on calls per run.
3. **What the simulation's reviewer does.** Recommended: accept everything the
   Gate holds, so the run measures the proposer rather than a reviewer, and
   propose a revert of every change the verdict calls *Hurt*, as a person would
   from *Page history*. Both are the simulation's own behaviour and change
   nothing for a real project.
4. **Whether a simulation project may ever exist on the production portal.**
   Recommended: not now. Everything above runs without it, and a simulated
   project on the real database is one wrong key away from mixing into real
   numbers.
5. **Whether real projects' outcomes may train a shared model.** Not needed
   until S6, and only then if S5 says training is worth it. Each project's
   changes are its own, and a model trained on them and offered to other
   projects carries what one customer's readers did to another. This is a
   policy decision before it is a technical one.
6. **Which open model, and where it runs.** Recommended: start with a 7–14
   billion parameter instruction-tuned model that supports JSON-schema output
   (the Qwen, Llama, Mistral and Gemma families all have one), served by Ollama
   on your own machine for S5, and a rented GPU with vLLM only if S6 goes
   ahead. Which exact model is chosen at S5, against what is current then.
