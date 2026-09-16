# 0164 — A resolution that cannot answer is not a node that did not ask

**Status:** Accepted
**Date:** 2026-09-16
**Section:** §2 — Composition Runtime

## Context

Two seams resolve a tree's questions before the render walk begins, and they are
built to the same shape: `loom:data` asks a host about its own data, `loom:submit`
asks it where a form posts. Each plans from the tree, resolves once, and hands the
walk a resolution with two lookups — one for answers, one for named problems.

Each also publishes a constant for the resolution of a plan that asks nothing:
`EMPTY_DATA_RESOLUTION` and `EMPTY_SUBMISSION_RESOLUTION`. They exist so
`resolveDataPlan` and `resolveSubmissionPlan` can short-circuit an empty plan, and
for that they are exactly right.

`Loom lessons` filed the consequence on 14 September, found while writing an
exercise for lesson 18. There are three ways to hand a bound tree a render with no
answers, and they produced three different amounts of noise:

| what the caller passes as `data` | the node renders | diagnostics |
| --- | --- | --- |
| nothing at all | `unbound` | 1 — `data-unresolved` |
| `EMPTY_DATA_RESOLUTION` | `unbound` | **0** |
| `buildDataResolution(plan, new Map())` | `unavailable` | 1 — `data-unavailable`, `not-resolved` |

All three are one mistake — a page asking questions nobody answered — and the
middle one said nothing at all. It is reachable by the most ordinary route there
is: a host writing a composition root that has no data reaches for a neutral
"no data" value, and this is the one with the obvious name. Its `lookup` then
answers `NO_DATA` for every node, and `NO_DATA`'s own contract read *"Always
answers; a node with no bindings gets `NO_DATA`"* — true of the constant's
intended caller and false of any other.

What it then does is the thing `resolution.ts` says in a comment it is arranged to
prevent: *a page silently missing the data it asked for is the failure mode this
whole module is arranged to prevent.* `not-resolved` was split out of
`no-such-source` on 12 September precisely so that a binding nothing answered
would name itself and send the right person to the composition root. This route
reached the same state and sent nobody.

**The submit seam has the identical hole, and nobody had looked.** Found while
fixing the first: `EMPTY_SUBMISSION_RESOLUTION` answers `undefined` for every
node, `undefined` is also how the seam says *this node declared no submission*,
and a form whose target went missing that way rendered a submit button pointing
nowhere with nothing said about it. That is the failure
`src/submit/resolution.ts`'s own header names — *"a shape that cannot tell them
apart guarantees it eventually shows a submit button that quietly goes nowhere."*

## Decision

**An absence in a resolution's lookup means the node asked for nothing. It is
never a way to say "I have no answer for you", and the walk reports any node that
asked and was answered neither a value nor a reason.**

`NO_DATA` for a node that declares bindings, and `undefined` for a node that
declares `loom:submit`, are now diagnosed rather than rendered. Both existing
codes carry which of the two routes it was:

```ts
export type UnresolvedResolution = "absent" | "unrelated"
```

`absent` is a render given no resolution at all; `unrelated` is one built from a
different tree's plan. One code with a discriminator rather than a new code
because the fix is the same edit by the same person in the same file — a
composition root — and what differs is only which line of it.

**The check lives in the walk, because the walk is the only place the two halves
meet.** A resolution is asked about a node id and has no way to know the node
declared anything; the tree knows what was declared and nothing about what was
resolved. Neither can see this alone.

**The walk still does not parse.** Whether a declaration asked for anything is a
shape test — a non-empty object — not a `parseBindings` call, so the invariant
`nodeDataFor` states in its own comment holds exactly as before and the happy path
costs one property loop over a bag the walk already had in hand. A malformed
declaration counts as having asked: it did ask, and the plan is the thing that
judges how well.

**Nothing is reported twice.** A resolution that already named a problem for the
node has spoken, so the walk stays quiet — a misdeclared binding reports
`data-misdeclared` and not also `data-unresolved`.

## Consequences

A host that passes either empty constant to a tree that binds now gets one
diagnostic per bound node where it got silence. That is the point, and it is the
only behaviour change: what a primitive receives is unchanged, and so is every
rendered page. Nothing in this repository passed either constant to a bound tree,
which is why the defect survived to be found by someone writing a lesson.

`EMPTY_DATA_RESOLUTION` stays exported. Un-exporting it was the smaller diff and
it was rejected: it removes the attractive nuisance rather than the hazard, since
a host can still build an empty resolution by hand and would then get the same
silence. Fixing the door covers both, and the constant's own doc comment now says
what it is for and what it is not.

**A resolution that answers some of a node's bindings and not others stays
silent.** `buildDataResolution` cannot produce that state — it gives every planned
binding of a node an outcome — so it needs a hand-written `DataResolution`, and
catching it would mean parsing every bound node's declaration on every render to
learn the names. The walk's contract is that it does not parse, and the cost is
paid on every page to catch a state the framework's own builder cannot reach. It
is recorded here rather than fixed, and it is the first thing to revisit if a host
implementing the interface ever hits it.

## Alternatives considered

**Give the constants a third answer** — a resolution that reports *"I was not
built from this plan"* for any node it does not know. The most honest shape, and
rejected as the most invasive: `DataResolution` is an interface a host may
implement, so a third answer is a new obligation on every implementor to fix a
mistake only two shipped constants make.

**Fill the bag with `not-resolved` outcomes**, making the `EMPTY_DATA_RESOLUTION`
route byte-identical to the third row above in what it renders as well as what it
reports. Rejected on scope, not on merit — it is the better invariant and the
report says so. It changes what a primitive is handed, and the matching change in
the submit seam needs a `not-resolved` reason that `SubmissionUnavailable` does not
have. Adding one widens a published union whose five members a `(docs)` page
enumerates, counts and prints as prose: the exhaustive `Record` in
`(docs)/_lib/submit/claims.test.ts` fails to compile, and the page that says *"Five
reasons"* and produces exactly five rows has to grow a sixth. That is surface
content in another lane, filed for `Loom docs` rather than written here.

**A new diagnostic code** for the `unrelated` route. Rejected because a reader
acts on both the same way, and because a code is the unit other lanes enumerate —
`lessons/14-rendering.md` keeps a table of every code that degrades — where a
field is read only by whoever branches on it.
