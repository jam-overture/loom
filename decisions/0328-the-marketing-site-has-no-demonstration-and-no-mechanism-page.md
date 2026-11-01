# 0328. The marketing site has no demonstration and no mechanism page

**Status:** Accepted — supersedes 0081
**Date:** 2026-10-31
**Section:** §4d
**Supersedes:** [0081](0081-the-front-door-demonstrates-statelessly-and-the-address-is-the-state.md)

## Context

The maintainer, on 31 October 2026, in full:

> *"The marketing site is looking a lot better. Please remove the Demo
> page/link, and How it works page/link. Make sure to add this decision so it
> does not get dropped."*

This record exists because he asked for it by name. The removal spans four
lanes and only one of them is `Loom marketing`'s, so a decision carried in a
pull request comment would be executed in one route group and forgotten in the
other three. That is the failure this file is written against.

### What the two things are

**`/how-it-works`** is a `(marketing)` page. It carried the five-step journey,
the five governance bands — *Your rules*, *The record*, *When the answer is
no*, *Putting it back*, *Who is asking* — and **the demonstration**: a band
where a visitor picks one of five pre-written requests, the page rearranges
itself, and a panel beside it shows the proposal, the verdict and the
revision.

**`/demo`** is the `(demo)` route group: a separate, larger surface where a
visitor asks a fictional physiotherapy clinic's page to rearrange itself in
their own words.

### Why this is not a surprise

`docs/positioning.md` records his direction of 24 October — *"Don't worry
about the controls. That is the stuff under the hood. The building part and
why this build is better than traditional methods is preferred."* — and names
`/how-it-works` as the page that is **entirely** the under-the-hood story:

> *"`/how-it-works` is entirely it. Five steps, then *Your rules*, *The
> record*, *When the answer is no*, *Putting it back*, *Who is asking*."*

That file also recorded, from the same conversation, that the demonstration
**stayed** — *"We can leave the demo for now until we get a video up and
running."* Today's instruction replaces that. `positioning.md`'s own third
rule covers exactly this case: *"Where this file and a maintainer comment
disagree, the comment wins and this file is wrong."*

## Decision

**The marketing site has no demonstration and no mechanism page. `/demo` is
removed as a surface.**

Four parts, and the fourth is the one most likely to be dropped:

1. **`/how-it-works` is deleted**, with the five governance bands and the
   journey, and no page inherits them. Nothing on the site links to it.
2. **The demonstration goes with it.** It was that page's band
   (`ASKED_ROUTE`), and this site is explicit that there is exactly one of
   them. It is not moved to the front door: the front door is within a hundred
   words of its ceiling and `positioning.md` records him moving governance
   *down* that page rather than up it.
3. **The `Demo` link comes out of the marketing menu, the footer and the
   surface list**, so no page of the marketing site points at `/demo`.
4. **The `(demo)` route group is deleted**, and `(docs)`, `(portal)`,
   `src/primitives/` and `tools/` stop referring to `/demo`. **This part is
   outstanding** — see *What is outstanding*, below.

### Why the demonstration is removed rather than moved

Three readings of *remove the How it works page* were available, and this is
the one taken.

- **Move the demonstration to the front door.** Rejected: it is the band he
  has twice moved governance away from, the front door is at 1,404 of a
  1,500-word ceiling, and the demonstration is the single heaviest thing the
  site renders.
- **Keep the page and strip it to the demonstration.** Rejected: he named the
  page, not its contents, and a page whose only reason to exist is the band
  he is trimming is the same decision taken twice.
- **Remove both.** Taken. It is the plain reading, and `positioning.md`
  already has him saying the page is the wrong story for the reader this site
  is for.

**If he wanted the demonstration kept somewhere, this is the clause to come
back to.** It is recorded as an assumption rather than as something he said.

## Consequences

**The address is no longer a demonstration's state.**
[0081](0081-the-front-door-demonstrates-statelessly-and-the-address-is-the-state.md)
decided that the demonstrated page is a pure function of its address and that
*"both are rebuilt from scratch on every request."* With no demonstration,
that record's subject is gone and it is superseded by this one.

**It is also a performance decision, and that was not why it was taken.** The
four marketing routes are `ƒ` — server-rendered on demand — and the reason is
that each awaits `searchParams` to read the demonstration's address. A page
with nothing to read from an address can be prerendered. This does not by
itself make the site fast: the dominant cost is measured in
`FINDINGS.md` on 31 October and is the library stylesheet being serialised
once per primitive into the RSC payload, which is `src/`'s and not this
record's.

**The record of how a change travels now lives only in `(docs)` and the
decision records.** That is a real loss and it is accepted: a stranger who
wants the mechanism is a reader `positioning.md` says to serve after they
want the product, and `/docs` is where they are served.

**Nothing in `(marketing)` links to `/demo` from this record's date**, while
`/demo` itself keeps answering until part 4 lands. A live page nobody links
to is the honest intermediate state; a dangling link is not.

## What is outstanding

**Part 4 has not been done and is why this record exists.** Deleting the
`(demo)` route group touches four lanes, and `Loom marketing` may not edit
another surface's route group or `src/`. Filed on 31 October 2026 in
`FINDINGS.md` for each owner:

| what | where | owner |
| --- | --- | --- |
| the surface itself | `apps/loom/app/(demo)/` | `Loom demo` / `Loom daily build` |
| a framed `/demo` in the reporting catalogue, and the surface entry | `(docs)/_lib/reporting/catalogue.ts`, `(docs)/_lib/surfaces.ts` | `Loom docs` |
| `/demo` in a state notice and its test | `(portal)/_components/state-notice.test.tsx` | `Loom portal` |
| `href: "/demo"` in two compositions, and the `loom.embed` worked example | `src/primitives/compositions/`, `src/primitives/loom.embed.ts` | `Loom primitives` |
| `/demo` shot lists and the framing argument | `tools/screenshot/`, `tools/specimen/` | `Loom daily build` |

Until every row is done, `/demo` is served and unreferenced by the marketing
site. **A run that closes the last row should come back and mark
[0056](0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md) as
superseded by this record**, which is deferred rather than taken now because
0056 is about where the demo lives and it still lives there.

## Alternatives considered

**Leave `/how-it-works` and merely unlink it.** Rejected. An unlinked page is
still served, still in the sitemap and still in `llms.txt`, and he asked for
the page.

**Delete `(demo)` from this lane anyway.** Rejected, and it is the one worth
recording. `docs/routines.md` gives each routine its route group and the
reason is reviewability: *"A marketing PR that also changes the framework is a
PR nobody can review."* A single pull request deleting a surface and editing
four other lanes' files is exactly that, and two of the five rows above are in
`src/`, which this lane may not touch under any circumstances. The record is
the mechanism that makes the other four rows happen; a pull request comment is
not.

**Keep the five governance bands by folding them into `/what-you-run`.**
Rejected: `positioning.md` already lists `/what-you-run` as *"mostly
reassurance about what leaves your server, which is an answer to a question a
junior developer has not asked yet"*. Moving the under-the-hood story onto the
other under-the-hood page is not a decision, it is a rename.
