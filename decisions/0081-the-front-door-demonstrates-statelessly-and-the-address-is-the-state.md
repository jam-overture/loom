# 0081. The front door demonstrates statelessly, and the address is the whole of the state

**Status:** Accepted
**Date:** 2026-08-21
**Section:** §4d

## Context

The marketing site has spent five runs making one claim: *ask for a change in
your own words and the page rearranges itself, and every change keeps a record of
who asked, what moved and how to put it back.* Everything on the site is an
argument for that sentence, and until this run nothing on the site was the
sentence being true.

Its own brief names the strongest version — *the site rewriting itself as a
visitor interacts, with the telemetry visible while it happens* — and names why
it is worth reaching for: plenty of things change a page with AI, and the second
half is the half nobody else can put on a landing page.

There was already a demonstration in the repository. The portal's demo
([0056](0056-the-demo-is-public-and-shares-nothing-but-the-deployment.md)) gives
a visitor a page, a free-text box and a row of chips, and keeps a session per
visitor: one tree in memory, a hold store, a list of records, a model-call
budget, and eviction when an instance has seen too many people. That is the right
shape for what it does — a visitor builds up a *sequence* of changes there and
can revert any one of them — and it is the wrong shape for a landing page.

A landing page is the most-loaded, least-trusted, most-robot-crawled surface the
project has. A session per visitor on it is a memory leak with a marketing
budget: every crawler gets a tree, every scroll-past costs an eviction, and two
people sharing a link cannot be shown the same thing.

## Decision

**The front door's demonstration keeps nothing. The page a visitor sees is a
pure function of its address.**

`/?ask=costs` *is* the front door with the plans lifted under the headline.
`/?ask=costs&approve=1` is that change after the visitor has answered the hold
their rules raised. Both are rebuilt from scratch on every request, and both are
the same page a week later.

Four consequences follow, and each is a property rather than an accident:

- **A rearranged page can be copied, shared and bookmarked.** The state is in the
  address, so sending someone the page you made is sending them a link.
- **Two visitors cannot move the site under each other**, and no instance holds
  anything that recycling could lose.
- **There is nothing to fill up.** No session table, no budget, no eviction, no
  rate limit — because there is nothing per-visitor to exhaust.
- **"Put it back" is a link home.** Undo on a stateless page is not an operation;
  it is the absence of a parameter.

Every choice is a real request through the whole sequence — interpreted,
measured, weighed, applied or held or refused, and reversible — using a
deterministic interpreter, which is
[0057](0057-a-preset-is-a-deterministic-interpreter.md) applied to the surface it
named in as many words. No key is needed and none is spent.

**The site's own rules are a real set of rules, not a set arranged to look
good.** `front-door` protects two things from being taken away: what the site
charges, and the way out of it. That is what an ordinary business would write,
and it is enough on its own to produce all three answers a set of rules can give
— most requests land, moving something protected stops and asks a person, and
destroying something protected is refused outright with no button to override it.

### The record is rendered by a second pass, deliberately

The panel that reports the change is part of the page the change is made to, so
the page has to be built before the change can be worked out, and the change has
to be worked out before the panel can be written.

The front door resolves that by running the sequence **twice**: once against a
page whose panel is still empty, purely to learn what happens, and again against
the page with that answer written in. What a visitor reads is therefore the
record of the change that produced the exact page in front of them, rather than a
record of a slightly different page nobody ever saw.

The two runs agree because nothing the rules weigh is a function of how large the
page is — breadth, removal size and depth are all counted absolutely. That is
true of today's rules rather than true by law, so **it is asserted**: a stake
factor that began measuring a *fraction* of the page would break this, and it
would break in a test rather than on the landing page.

## Consequences

The front door cannot demonstrate a **sequence** of changes, and should not try.
One change, its record, and the way back is the whole of what this band claims;
anything more is the portal's demo, which has a session precisely because it
needs one. A run that finds itself wanting a second change on top of the first
should send the visitor to the demo rather than grow a session here.

Free text is not offered here either, and its absence is a positioning question
rather than a technical one. A box on the front door that reached a model would
be a model call per visitor per idle curiosity, on the surface with the highest
traffic and the least intent — and the record it produced would say
`authoredBy: "model"` where these say `"runtime"`, which is a difference the
rules do not care about and a reader might. If the maintainer wants the model on
the front door, it wants a budget and a decision of its own.

**The panel says which wrote the change, on the page, in plain words.** That the
rules cannot tell the difference is the more interesting fact and it is stated
rather than hidden: they weigh the change, never its author.

## Amendment, 2026-08-21 — what `front-door` protects

**Status is unchanged and this is not a change of direction**, which is why it is
a note rather than a superseding record: the decision above is the stateless
shape, and none of it moves.

What moves is one illustration inside it. When this was written, `front-door`
protected **what the site charges and the way out of it**, and the pricing band
was where the first of those lived. Hours later the maintainer took pricing off
the front door — the marketplace is a long way out and how to position it is
undecided — so the thing being protected had to be something the page still has.

It is now **what the site says it is for**: the band of problems Loom exists to
solve, which the same conversation named as the core of this site. Everything the
record argues survives intact, including the part that mattered — that a single
rule an ordinary business would actually write produces all three answers with
nothing staged. Moving that band still asks a person; destroying it is still
refused outright.

The choice got better for the change. A business protecting its price list is
ordinary; a business refusing to let a machine delete the statement of what it
does for people is the same instinct pointed at something that matters more.

The list also stopped being written twice. What a visitor is told the site
protects is now derived from the rules themselves — the phrases and the count
both — because for one commit the page said *"what it charges"* while the rules
had stopped saying anything of the kind.
