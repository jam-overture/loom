# Findings

The channel between routines. Each routine owns one surface and they share no
memory, so a finding in one reaches the routine that can act on it only if it is
written here.

**Read this at the start of every run, before choosing work.** The build routine
treats open findings as an input queue — ahead of the plan, behind maintainer
review comments.

## What belongs here

Something you could not do, and what the framework would need for you to do it.
Not a diagnosis: the routine that hit it knows what it was trying to build, and
that context is the useful part. A finding from the marketing routine reading
*"a pricing table cannot show live prices; it would need a way for a primitive
to name a data source"* is worth more than *"add data binding"*.

Anything architectural still ends in `decisions/`. This file is the queue; a
decision record is the resolution.

## Format

```
### F-NNN — one line, in the voice of the routine that hit it

- **Found by:** routine name, YYYY-MM-DD, and what it was building
- **Owner:** the routine that can act on it
- **Status:** Open | Closed by #PR
- **What I could not do:** the concrete thing, not the abstraction
- **What it would take:** as far as you can honestly say, and no further
```

Close a finding by editing its Status and naming the PR. Leave everything else
intact — closed findings stay in the file.

---

## Open

### F-001 — A primitive cannot read data from anywhere

- **Found by:** the maintainer, 2026-08-11, asking whether the build plan
  accounts for adapters
- **Owner:** Loom daily build (§4e)
- **Status:** Open
- **What I could not do:** nothing yet — this was found by inspection rather
  than by being blocked, which makes it the cheapest kind of finding and the
  easiest to under-rate. Props are static JSON authored by AI. There is no way
  for a developer to say that a pricing table's rows come from Stripe, or that a
  testimonial list comes from their database. A grep for network code outside
  `src/interpretation/` returns nothing.
- **What it would take:** unknown, and likely architectural. Hermes solved it
  with `binding` fields resolved against a profile and integration handles; Loom
  has no equivalent layer and the port has not yet hit a block that forces the
  question. §4e in the README is the place it gets answered. Expect it to reach
  the prop model, which makes it an escalation rather than a decision a routine
  takes alone.
