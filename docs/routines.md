# Routines

Loom is built by scheduled sessions. Each runs on its own schedule, as a fresh
session with no memory of the last one: **the repository and the open pull
requests are the only continuity.** This document is what binds them.

> **Provenance, and its limits.** Every routine brief names this file as
> *read first, every run*, and it did not exist — filed as an open finding by the
> portal routine on 15 August 2026 and written the same day by the framework
> routine, which is the finding's owner.
>
> It is a **transcription, not an invention**. Everything below is stated in a
> routine brief: the framework brief in full, and the portal brief as that
> routine reported it on #72. Nothing has been added that a brief does not say.
> Where a brief and this file disagree, **the brief wins and this file is
> wrong** — say so in a report rather than following it.
>
> `docs/rollout.md` was the other missing document. It **now exists**, added by
> the maintainer on 16 August: it had been written a day earlier and pushed to a
> branch whose pull request had already merged, so it never reached `main`. The
> finding is closed. The portal routine's reasoning for why it could not fix that
> itself was right and is worth keeping — a routine cannot write the governance it
> is bound by, or the plan it is meant to find its position in.

## Token discipline

**This is the maintainer's top priority and it outranks thoroughness.**

**Never schedule a follow-up or a self-check-in. Run, report, exit.**

On **9 August 2026**, four self-armed `send_later` chains polled the open pull
requests roughly hourly and re-armed themselves each time. That is about **96
cloud sessions a day** against the routines' three. One pull request was checked
**sixty-nine consecutive times over 72 hours** with nothing changing between
checks. It consumed a week's allowance while the maintainer was away from the
project.

So:

- **Do not poll for review.** A pull request waiting costs nothing. A poller
  waiting costs everything.
- **No chains.** If a check genuinely must be scheduled, it is **one shot with a
  hard give-up** — never something that re-arms itself.
- **No self-check-ins**, on any cadence, for any reason.

The test to apply: *the maintainer must be able to step away for days without
the bill moving.* A run that ends with something scheduled fails it.

## Lanes

Each routine owns one part of the repository and does not edit another's.

| Routine | Owns |
| --- | --- |
| Framework (`Loom daily build`) | `src/` **except `src/primitives/`**, and the application shell |
| Primitives (`Loom primitives`) | `src/primitives/` — breadth and quality of the library |
| Portal (`Loom portal`) | `apps/loom/app/(portal)/` |
| Documentation (`Loom docs`) | `apps/loom/app/(docs)/` |
| Marketing (`Loom marketing`) | `apps/loom/app/(marketing)/` |
| Lessons (`Loom lessons`) | `apps/loom/app/(lessons)/` and `lessons/` |
| Demo (`Loom demo`) | `apps/loom/app/(demo)/` |

`Loom primitives` was split out of the framework routine on 16 August, once
[0052](../decisions/0052-a-repeated-item-is-a-node-and-a-fixed-field-is-a-prop.md)
settled how a Hermes block becomes nodes. The two routines share a directory
boundary and nothing else, so the framework routine must **stop adding
primitives** rather than race for the same files.

The four surfaces became **one application** on 18 August
([0067](../decisions/0067-the-four-surfaces-are-one-application.md)), so a lane
is now a **route group** rather than a directory. The property that matters is
unchanged: a PR touches one surface and is reviewable on its own.

Two rules follow from sharing an application, and they are what keep it safe:

- **No surface may grow its own component library.** Marketing, docs and
  lessons compose registered Loom primitives; a missing primitive is a finding
  for `Loom primitives`, never a local component. The portal is the stated
  exception (0067) because it is a tool rather than content.
- **`pnpm verify` green is the merge gate for everyone**, because one broken
  build now blocks four surfaces rather than one.

`apps/loom` exists as of 19 August 2026: `apps/portal`, `apps/docs` and
`apps/marketing` were retired into `(portal)`, `(docs)` and `(marketing)`, and
`(lessons)` has since been filled by its owner. Each lane is that one
directory and everything under it — a surface's components and its non-route code
live inside its own route group, so `app/(docs)/_lib/nav.ts` is the documentation
routine's and nobody else has to be told so.

**Where the framework forces a file to sit at the application root, the lane
follows the content and not the location.** The MDX pipeline is the case that
established this: `apps/loom/next.config.ts` and `apps/loom/mdx-components.tsx`
must be at the root because Next requires them there, and everything they say is
about how a `(docs)` page is parsed and rendered. They belong to `Loom docs`,
along with the dependency lines in `apps/loom/package.json` that only `(docs)`
imports. Three consecutive documentation runs produced a diff crossing the lane
boundary at those files and explained it each time; this is that explanation,
written down once. Added by the framework routine on 25 August at the
maintainer's instruction on #154, after the documentation routine filed it three
times.

The rule generalises and the exception does not: a file is another lane's
because of what it *decides*, not where the framework makes it live. It does not
license editing a surface's routes or components from outside its lane, and a
cross-lane diff of this kind still gets a line in the report saying which file
and why.

`Loom demo` was split out of the framework routine on 20 August. The demo had
been built by the routine that owns the runtime, which judged it done because by
its own standard it was — the pipeline runs, the record is complete, the tests
pass. The maintainer's verdict was that it was clunky and did not make sense.
A demo is judged by whether it lands, not by whether it is correct, and those are
different objectives that pull in different directions.

Its first task is moving the demo off `/portal/demo`, where public code sat at
the one path that reads as private, onto a public `/demo` of its own.

Work that belongs to another lane is **filed in `FINDINGS.md` for its owner**,
not done.

## Read first, every run

- **`FINDINGS.md`** — before choosing work. It is the channel between routines:
  what one could not do, for the one that can. Open findings owned by you are an
  input queue, ahead of the plan and behind maintainer review comments. Close one
  by editing its Status and naming the pull request.
- **`docs/routines.md`** — this file.
- **`README.md`**, the build-order sections for your lane — the plan, the quality
  bar, and what is still open.
- **`decisions/README.md`** — skim the index. It is the fastest way to learn which
  constraints are deliberate.
- **The most recent report in `reports/`.**

## Procedure

1. Read the above. List the open pull requests and read the comments on any of
   them.
2. **Maintainer comments outrank everything**, including the plan and the
   findings queue. Address them first and say how in the report.
3. **Branch off `main`. Never stack** one branch on another — a stack once cost
   four days of visibility. **Never merge to `main` yourself.**
4. Build **one coherent unit**, with tests.
5. `pnpm install && pnpm verify`. **Never open a pull request on red**; say so
   rather than weakening a test to get green.
6. Record decisions, regenerate the index with `pnpm decisions:index`. Close or
   file findings in `FINDINGS.md`.
7. Report to `reports/YYYY-MM-DD-<slug>.md`, with a visual alongside. **Never
   overwrite an existing report.** Cover, in plain language: what was completed,
   the section, decisions taken that were not specified and why, records added or
   superseded, findings filed or closed, open questions, and **real test numbers**
   — saying plainly if anything failed or was skipped.
8. Open the pull request against `main`, described clearly.
9. Comment on it starting `@jonathanbravecredit`: a short summary, then
   `## Needs your input` with a recommendation for each question, or an explicit
   "nothing blocking". Keep it short — detail belongs in the report.

From the first rendered primitive onward, **include the deployed preview URL**,
and a screenshot once there is a page worth looking at.

## Standards

TypeScript, strict, no `any`. Functional — pure functions, immutability, no
classes without genuine stateful identity. SOLID at the seams. No dead code, no
commented-out blocks, no unresolved TODOs. Every unit ships with tests.

## Decision records

Write one when a decision would be expensive to reverse, or when it defines what
Loom is. Format and the rules for superseding are in
[`decisions/README.md`](../decisions/README.md). **Never edit a record to change
direction** — mark it `Superseded by NNNN` and write a new one.

## Escalation

Anything that touches the tree schema or the delta model in a way that would
require migrating built code, or that contradicts an `Accepted` record, is
**ARCHITECTURAL — needs review**. Write the record as `Proposed`, do not
supersede anything, build what does not depend on it, and say in the report what
was left out.

## Network access

`.claude/settings.json` is committed and carries the network policy every run
inherits. **Do not delete it as stray configuration.** Added by the maintainer
on 19 August 2026 after repeated egress failures reaching third-party sites.

Two separate mechanisms gate the network, and a domain usually needs both:

- **`sandbox.network.allowedDomains`** governs *Bash* — `git`, `gh`, `pnpm`.
  Nothing is allowed by default.
- **`permissions.allow` with `WebFetch(domain:…)`** governs the *WebFetch tool*,
  which is in-process and does **not** consult the sandbox allowlist. A headless
  run has nobody to approve a prompt, so an unlisted domain simply fails.

Currently allowed: `21st.dev` and `nextjs.org` (the visual and structural
references the primitives, marketing and docs briefs tell you to consult),
GitHub, and the npm registry.

**Needing a domain that is not listed is a finding, not a fix.** File it in
`FINDINGS.md` and say what you were trying to reach. Widening egress is the
security-relevant half of the sandbox — it is what stops a compromised command
sending `ANTHROPIC_API_KEY` or the database credentials somewhere — so the list
stays narrow and deliberate.

## Credentials

`ANTHROPIC_API_KEY` is in the environment. Read it from `process.env`. **Never
commit it, and never echo it into logs, a report or a pull request body.** Unit
tests use fixtures and pass with no key; live tests skip cleanly without one. Do
not hardcode a model id from memory.
