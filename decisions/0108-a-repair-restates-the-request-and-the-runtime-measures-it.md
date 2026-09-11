# 0108. A repair restates the request, and the runtime measures it rather than making it cheaper

**Status:** Accepted
**Date:** 2026-09-04
**Section:** §2

## Context

`buildRepairMessage` embeds `buildUserMessage` whole, then appends the refused
delta, the reasoning offered for it, and the Gate's objection. A refused-then-
repaired intent therefore sends the entire page **twice**.

That was filed against this lane on 22 August, after
[0083](0083-a-scoped-request-sends-the-scope.md) made prompt cost countable, and
left alone deliberately: the obvious saving is not obviously safe, and the
finding said so. It has sat open since, and the reason it sat is that nobody had
put a number on it — the doc comment on `PromptMeasurement` said a repaired
intent "costs about twice what this reports", which is a multiplier quoted from
reading the code rather than from measuring it.

Measured, on synthetic pages of one section and one text node each, with the
starter primitive and theme catalogues wired, in characters:

| sections | scope | proposal | repair | episode | episode ÷ proposal |
| --- | --- | --- | --- | --- | --- |
| 5 | whole tree | 20,943 | 21,248 | 42,191 | 2.015 |
| 5 | scoped | 20,692 | 20,997 | 41,689 | 2.015 |
| 50 | whole tree | 25,255 | 25,560 | 50,815 | 2.012 |
| 50 | scoped | 20,694 | 20,999 | 41,693 | 2.015 |
| 500 | whole tree | 70,157 | 70,462 | 140,619 | 2.004 |
| 500 | scoped | 20,696 | 21,001 | 41,697 | **2.015** |

**Two things in that table were not what the finding assumed**, and both are
worth stating because they change what, if anything, is a problem.

**The ratio does not widen. It is flat at about 2.01 and drifts *towards* 2 as
the page grows**, because the three blocks a repair adds are a fixed 305
characters that matter less the larger everything else is. The finding said the
gap between the scoped and unscoped paths "widens with page size rather than
staying proportional"; proportionally it does not move at all.

**What widens is the absolute gap, and it widens hard.** The difference between
repairing a scoped intent and repairing an unscoped one on the same page is 502
characters at five sections, 9,122 at fifty, and **98,922 at five hundred**. So
the finding's concern was right and its arithmetic was not: a scope is worth
twice as much on the repair path as on the proposal path, because both requests
are bounded by it.

## Decision

**A repair restates the whole request, and the package measures that rather than
trying to avoid it.** `measureRepairPrompt` reports the repair block by block —
the restated proposal as a full `PromptMeasurement`, the refused delta and its
reasoning, the objection, the closing instruction, the wire total, and `episode`,
which is both requests together.

**The restatement stays.** [0005](0005-model-access-is-an-optional-adapter.md)
makes model access one narrow seam: `repair` takes a request and a tree and
returns a result. There is no conversation to append to, and a runtime that
elided the tree on the second request would be asserting that some provider
somewhere still has the first one. That is a claim about a provider, not about
Loom.

**`buildRepairMessage` is now assembled from named parts**, as
`buildUserMessage` already was, so the measurement and the message read from one
place. A measurement that rebuilt the blocks itself would be a second assembly to
keep in step, and the first thing to go stale — the same reasoning that put
`UserMessageParts` there, applied to the path that was left out. The bytes are
unchanged; this is a decomposition, and a test holds the two paths byte-identical
by holding the measurement against `buildRepairMessage(…).length`.

## Consequences

**The repeated block is byte-identical and sits at the front**, which is exactly
the shape a provider's prompt cache is built to hold. So the honest saving on a
repair is caching, and caching belongs to the adapter that talks to a provider —
not to a prompt builder whose whole job is that the bytes sent are a value a test
can assert on. This record is what stops that being rediscovered as a defect for
a third time.

**A scope is now worth naming on the repair path in particular.** `episode` on a
five-hundred-section page is 140,619 characters unscoped and 41,697 scoped. The
lever exists, nothing sets it automatically, and 0083's reasoning about who
should — whoever composes the intent and knows what the user pointed at — is
unchanged.

**`episode` is a number a surface can show.** "What did being refused cost" is
answerable without sending anything, which is the same property `measurePrompt`
gave "what did registering all of this cost".

**A repair is never cheaper than the proposal it revises**, and that is now a
property the type states rather than a thing to work out: `total` contains
`proposal.total` by construction.

**The doc comment that said "about twice" is gone.** It was a reasonable reading
and it was quoted in a report; anyone who wants the number now calls the
function.

## Alternatives considered

**Send the tree once and refer back to it across a multi-turn exchange.** The
saving the finding named, and rejected for the reason it named: it assumes a
provider holds conversation state, and 0005's seam has no turn to hold. Adopting
it would mean widening the adapter interface for every host in order to make one
path cheaper on some providers and identical on others.

**Send only what changed between the two requests.** Rejected because nothing
changed. The tree is the same tree at the same revision — that is what makes a
repair a repair — so the diff is empty and the repeat is byte-for-byte the first
message. There is nothing to compress that a cache does not already compress
better.

**Drop the catalogues from the repair, on the grounds that the model has just
seen them.** Rejected on the same "just seen them" fallacy, and worse than the
tree version: the catalogue is the list of what the model may propose, so a
repair without it is a repair permitted to invent primitives. It is also the
block a cache holds most easily, so it is the least worth cutting.

**Refuse to repair above a size budget.** Rejected. It makes a second go a
privilege of small pages, decided by a constant nobody chose, and it fails in the
direction that loses a user's change rather than the direction that costs money.

**Leave the finding open and the comment as it was.** Defensible for another day
— nothing is broken, and the runtime sends what it should. Rejected because the
comment was quoting a multiplier that is right by accident: it says a repair
costs about twice a *proposal*, which is true, and it was being read as saying
the cost of a repair scales worse than a proposal, which is false. A number that
is measured is cheaper to keep honest than a sentence that is inferred.
