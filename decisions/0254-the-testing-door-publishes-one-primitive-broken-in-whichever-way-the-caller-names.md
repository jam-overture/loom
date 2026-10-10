# 0254 — The testing door publishes one primitive broken in whichever way the caller names, and the fault is named for what the author did

**Status:** Accepted
**Date:** 2026-10-10
**Section:** §1 (process), §3 (render seam)

**Why this number.** `0245` is claimed by #548 and `0252` is held for #566, both
open and unmerged; `0253` landed this morning. `0254` is the next free number on
`main` and on both open branches. This record adds to a published entry point
and supersedes nothing.

## Context

[0206](0206-a-primitive-declares-what-it-could-not-show-and-the-runtime-decides-whether-to-say-so.md)
put the declaration of what a primitive could not show **inside the component**,
and closed with the consequence this record is about:

> `unshown-unreadable` is the one member of `RenderDiagnostic` that neither a
> tree nor a deployment can cause. It is addressed to whoever wrote the
> component.

That is the right place for it and it leaves the diagnostic undemonstrable from
outside a component. Every other code in the union of twenty-four can be
produced by writing a tree or by declining to wire a seam. This one cannot:
nothing a caller does to a correct primitive will make its declaration throw.

And no primitive in the library is incorrect. All five that declare `unshown`
compute the figure from the answer they were handed, which is the whole point of
declaring the function the component already calls (0206) — so there is no
registered primitive that produces the code. Neither did the testing door stand
in for one: `testPrimitives` behave, and `undecoratedPrimitive` breaks the §4
decoration contract rather than a declaration.

So every lane that wanted the diagnostic wrote its own broken component.
**Three have, independently**, which is what makes this a seam rather than a
convenience:

- `src/render/unshown.test.ts` has a private `declaring(type, unshown)` helper,
  because the runtime's own suite needs each refusal path exercised.
- `Loom docs` wrote `bench.broken-reporter` in
  `app/(docs)/_lib/reporting/catalogue.ts` for *What a render reports*, eleven
  lines in a file of thirty-six otherwise honest specimens, with a section on
  the page explaining why one row's component had to be invented.
- `Loom primitives` and `Loom portal` have each asked a version of the same
  question in `FINDINGS.md`, about what a bound primitive's faults look like
  from a host's side.

`Loom docs` filed it on 10 October and scoped it in one sentence:

> **Worth it:** one exported stand-in beside `undecoratedPrimitive` — a
> primitive that breaks the declaration it made, under whichever declaration the
> caller names. **Not worth it:** anything larger. A catalogue of broken
> components in the testing door would be a second library to keep true.

## Decision

**`@jam-overture/loom/testing` publishes `brokenUnshownDefinition(breakage)` — a
single parameterised primitive definition whose `unshown` declaration fails in
the way the caller names, and nothing else about which is wrong.**

Five things follow, each a decision rather than an implementation detail.

### The breakages are named for what the author's code did, not for the fault the runtime reports

`UnshownFault` has two arms: `threw`, and `impossible` carrying a detail. The
parameter has **seven** members, one per refusal `readUnshown` makes — `throws`,
`not-an-array`, `not-a-reading`, `unnamed`, `uncountable-given`,
`uncountable-shown`, `more-shown-than-given`.

Seven rather than two because the kind is not what a lane demonstrating the
diagnostic is showing. `impossible` is the same word for a declaration that
returned a number and one that said it showed thirteen of twelve rows, and those
are different mistakes for a reader to recognise in their own code. The detail
is the sentence; the parameter names the cause of it.

Named for the cause rather than the sentence because the caller is choosing what
to break, not what to read. A lane asking for `more-shown-than-given` is saying
what its fixture does; a lane asking for `showed-2-of-1` would be quoting a
message this package may reword.

### It is the declaration that is broken, and nothing else

It spreads `loom.editable`, places what it is handed, declares its props, and
draws an element. The §4 audit reports it `notDecorated`-clean, probeable, and
dropping no slot, and a test asserts all three.

A fixture with two faults in it is a fixture that cannot be used to isolate
either. A lane whose registry audit went red because it registered the stand-in
would learn something false about its own registry.

### Its props are declared open, where the fixture beside it is strict

A bag the schema refuses omits the node and its subtree (`invalid-props`), which
takes the declaration with it — so a strict empty schema would let any unrelated
prop hand a lane an **empty diagnostic list** in place of the fault it asked for.
`loom.card` in the same file is strict deliberately, because both are choices a
real primitive author makes; this one is not a primitive author's choice but a
fixture's, and a stand-in that can be silenced by a prop is a stand-in that will
be.

### It declares no `reads`, and the absence is load-bearing

A declared name the caller did not answer under adds `data-unread` to the
render, so the diagnostic list a lane asserts would depend on which name it
chose to answer. Silent unless declared is the bargain `reads` makes (0181), and
taking it is what makes the promise above hold whatever the caller does: **one
render, one diagnostic, and it is the one that was asked for.**

### The type carries the breakage

`test.unshown-throws`, `test.unshown-not-an-array`, and so on, so all seven can
be registered in one registry and rendered in one tree. A lane showing the fault
once per shape needs one of each rather than seven of each, which is the whole
difference between this and the component every lane wrote for itself. The type
is read off the returned entry rather than written out by the caller.

## Consequences

`UnshownBreakage` is **read off the list** rather than declared beside it, and
the declaration table is keyed on the type, so a member without a declaration or
a declaration without a member is a typecheck error. The list cannot be
internally incomplete.

**It can be incomplete against the runtime, and nothing here catches that.** A
refusal path added to `readUnshown` with no member added to this list leaves
this door one fault behind the walk it stands in for, silently. There is no
construction that fixes this from the testing door: the refusals are seven
`err(…)` sites in a function, not a table to be iterated. What holds instead is
weaker and worth naming as weaker — every member is refused, no two members
produce the same fault, and each detail is pinned to the exact sentence the
runtime writes, so a message that moves goes red and somebody reads the list.
Stated in the module's own doc comment in those terms.

A new published name is API this package may not silently change (0104). The
cost is bounded by what it is: a fixture whose entire contract is that it is
wrong in a stated way.

**The three hand-written copies are not deleted by this.** `Loom docs` owns
`bench.broken-reporter` and may adopt the export or keep its eleven lines;
`src/render/unshown.test.ts` keeps `declaring`, which takes an arbitrary
declaration and is strictly more general than seven named ones — that file is
testing the walk, and a walk's test that could only break its declaration in
ways the fixtures door blesses would be testing the fixtures.

**The deliberately-broken fixture is now a kind of thing this door holds**, with
`undecoratedPrimitive` as the precedent and this as the second. A third will be
the point at which they want a shared shape rather than two bespoke ones.

## Alternatives considered

**One stand-in with one breakage — a declaration that throws.** What the filing
literally needed, since `describeUnshownFault` writes two sentences and `threw`
is one of them. Rejected because the six `impossible` details are the half a
component's author will actually meet: a declaration that throws is caught by
the first test anybody runs, and a declaration that quietly says *two of one* is
not. One parameter costs a table and buys the half that gets shipped.

**A catalogue of broken components, one per fault in the union.** Refused by the
filing in advance and rightly: a second library to keep true, whose members
would drift from the runtime one at a time instead of together.

**A factory taking the declaration — `brokenDefinition(unshown)`.** The most
general shape, and the one `src/render/unshown.test.ts` already has privately.
Rejected for the published door: it hands every lane the job of writing a
declaration that reaches the refusal it wanted, which is the work this record
exists to stop duplicating, and the lane that gets it subtly wrong gets a clean
render and no diagnostic with nothing to tell it why. The general form stays
where it belongs, inside the suite that tests the guard.

**A component rather than a definition, beside `undecoratedPrimitive` in
`primitives.ts`.** Where the filing pointed. Rejected because `unshown` is a
declaration and declarations live on definitions: a bare `LoomPrimitive` has
nowhere to carry one, and `definitions.ts` says in its own first comment that
`primitives.ts` is the same components *without* declarations. The filing's
"beside `undecoratedPrimitive`" is answered by the entry point, which is the
place a caller actually sees them side by side.

**Leaving it, on the grounds that eleven lines per lane is cheap.** The filing
offered this as a fine answer. Rejected on the count: three lanes have written
it, the union's `data-unshown` family has grown four members since 0176, and the
eleven lines are not the cost — the cost is that each copy is a lane's own guess
at what breaks the guard, and a wrong guess renders clean.
