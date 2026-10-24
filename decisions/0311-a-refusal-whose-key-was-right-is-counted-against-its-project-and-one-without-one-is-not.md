# 0311. A refusal whose key was right is counted against its project, and one without one is not

**Status:** Proposed
**Date:** 2026-10-24
**Section:** §5 (portal), §4c (reader signals)

> **Why it is raised.** Unit 5 of [`docs/portal.md`](../docs/portal.md) shipped
> *without refusals*: the door refuses before it writes, so *Signals* said
> *not counted* rather than drawing a nought, and the plan named counting the
> refusals that name a project as *a table and a record of its own*. This is
> that record. The maintainer met the gap on 21 October, when his marketing
> site's deliveries were being refused and the screen he was looking at could
> only say that nothing had arrived.

## Context

[0298](0298-a-projects-ingest-key-is-public-and-names-its-application-and-the-door-files-nothing-it-cannot-name.md)
made the door file a delivery under the application its key names and refuse
everything else. Refusals fall into two kinds:

- **Ones that name a project.** The key was issued and is current, and the
  door refused anyway: the project names its site and the delivery came from
  another (or from none), the project is closed (0289), or the body could not
  be read.
- **Ones that name nobody.** No key, a key nobody issued or that was
  replaced, and every refusal the gate makes before the key is read: too
  large, too often, intake switched off.

Only the first kind has a project to be counted against. The second has
nowhere to be kept, and reading the key early to find one would spend the
database on exactly the caller the gate exists to stop.

## Decision

1. **The door counts a refusal whose key was right**, against the key's
   application, under one of three reasons: `wrong-site`, `closed`,
   `unreadable`. Nothing else is counted.

2. **One row per application and reason**, in `loom_reader_refusals`: how
   many, when the newest was, and the origin the newest came from. The table
   grows with projects and never with traffic, so a stranger holding a
   project's public key can move a number on its screen and cannot make the
   table longer.

3. **The origin is kept as `URL` parses it**, or not at all. It is the
   sender's header, and what reaches a screen is what the parser made of it.
   It is kept because for `wrong-site` it is the whole answer: *from
   `https://loomjs.org`* beside a project that names `www.loomjs.org`.

4. **Counting is best-effort.** A counter that cannot answer changes nothing
   the sender is told, and the delivery is refused either way.

5. **The counter is scoped at construction**, like every store the door files
   into, so a refusal cannot be counted against the wrong project by passing
   the wrong id.

6. ***Signals* shows the total and one sentence per reason**, each saying what
   to do, and shows them even when nothing has arrived, because *nothing
   arrived* and *everything was turned away* are otherwise the same screen.
   A failure to read the table costs that figure alone.

## Alternatives considered

- **Count every refusal, keyed by the key that was sent.** Rejected: a key
  nobody issued is a string anyone can invent, so the table would grow with
  whatever a stranger typed.
- **A log of refusals rather than a count.** Rejected: it grows with traffic,
  and what a person needs is *how many, why, and the latest*, which a row
  holds.
- **Count in memory and show it until the instance restarts.** Rejected: a
  serverless deployment runs many short-lived instances, so the number would
  be one instance's share and would fall to nought whenever it was recycled,
  which reads as *the problem went away*.
- **Read refusals from the hosting provider's request logs.** Rejected: they
  belong to whoever runs the deployment, not to the project's owner, and say
  nothing about which project a key named.

## Consequences

- A deployment runs `pnpm db:push` once for the new table. Until it does, the
  door refuses exactly as before and *Signals* says it could not read what it
  turned away.
- Refusals the gate makes before a key is read stay uncounted, and the screen
  says nothing about them.
