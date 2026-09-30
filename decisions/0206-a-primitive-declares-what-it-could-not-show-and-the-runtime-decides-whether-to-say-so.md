# 0206. A primitive declares what it could not show, and the runtime decides whether to say so

**Status:** Accepted
**Date:** 2026-09-30
**Section:** §3

> **Why this number.** `0204` is the highest record on `main`. `0205` is claimed
> **twice** among the open pull requests — by #451, this lane's, and by #454,
> `Loom primitives`' — so it is not free and is not this record's to take. The
> collision is filed in `FINDINGS.md` for `Loom merge`, whose renumbering rule
> handles it. `0206` is free everywhere.
>
> **Why `Accepted`.** It contradicts no `Accepted` record. It touches neither the
> tree schema nor the delta model, so no built code migrates. Every field it adds
> is optional and every primitive that declares nothing behaves exactly as it
> does today — including all ninety-nine in the starter library, none of which
> this change edits.

## Context

`Loom primitives` filed a finding on 22 September, found by writing the sentence
`loom.feed` shows when it has skipped a row.

Three of the four ways a binding can be wrong are visible from outside the
primitive that reads it, and the render walk reports all three: an unregistered
source or an adapter that could not answer is `data-unavailable`, a malformed
`loom:data` is `data-misdeclared`, and a name the primitive says it does not read
is `data-unread` (0181, 0184).

The fourth is not visible from outside, and until this record there was nowhere
for it to go. A source can answer perfectly, under a name the primitive reads,
with rows the primitive then declines one at a time — because each row has a
shape only the primitive knows. `loom.feed` parses every row against its own
schema, keeps the ones that pass, and draws them.

It does tell somebody. 0175 says a listing skips the row it cannot read **and
names it**, and the feed draws *"Some entries could not be shown."* on the page,
deliberately carrying no count, because a number there is a plural this library
cannot form in every language it may be served in.

**The count is not useless. It is useful to exactly one person, and that person
is not the reader.** The author whose source started returning a column under a
new name wants to know that eleven of twelve rows stopped reading. That is what
every other finding of this kind in the walk is for — a diagnostic, collected
beside the element and read by whoever is looking at diagnostics rather than at
the page.

A component could not raise one. `LoomRenderContext` carries `slots`, `data`,
`text`, `behaviours`, `submit`, `frames`, `anchor` and `decorative`, and nothing
that reaches the walk's `collect`. So a primitive holding something its author
needs had two choices: say it to the reader, or say it to nobody.

The finding named the smallest thing that could work — *a read-only `report` on
the context, restricted to a diagnostic code the runtime already knows* — and
named the reason to think twice: it lets a registered component write into the
walk's output, which nothing outside the runtime does today.

**That reason is decisive, and not for the reason the finding gave.** It is not
mainly a matter of taste about who may write where. A `report` on the context
does not work:

- **A component body runs after the walk has finished.** `renderLoomTree`
  returns `{ element, diagnostics }`, and the component functions are called
  later — by `renderToStaticMarkup`, by a browser mounting, by an image renderer,
  or never. Every caller in this repository reads `diagnostics` off that return
  value, and some read it before rendering the element at all. A diagnostic
  pushed from a component body lands in an array its reader may have already
  finished with.
- **React decides how many times.** `StrictMode` renders twice; a re-render on
  state renders again. A count reported from a render body is reported as many
  times as React feels like calling it, which for a diagnostic is worse than
  silence.
- **Reporting in render is a side effect in render**, which React asks
  components not to do, and this package has no business publishing a seam whose
  only correct use breaks that rule.

## Decision

**A primitive declares a pure function that reads its own answers. The walk calls
it. The runtime decides which of its readings is worth a diagnostic.** Nothing
hands a component a way to write into the walk's output.

Four pieces.

**1. `unshown` on a primitive's definition.**

```ts
readonly unshown?: (props: JsonObject, data: NodeData) => readonly UnshownReading[]
```

where a reading is `{ name, given, shown }` — the binding name an answer arrived
under, the rows the primitive found in it, and the rows it placed.

It is handed exactly what the component is handed of those same two things, so
it can be **the same function the component calls**. That is the only
construction under which the count and the page cannot disagree, and it is
available because a primitive that skips rows already contains the code that
decides which — it had to, in order to skip them.

**2. `unshownBy(type)` on the registry**, detected structurally the way
`BindingReader`, `FrameResolver` and `BehaviourResolver` are. A host resolving
from a plain map has registered nothing that could have declared one, so there is
nothing to wire and nothing that can go missing.

**3. `data-unshown`**, carrying node, type, binding name, `given` and `shown`.
Reported only where `shown < given`.

**4. `unshown-unreadable`**, carrying the node, the type and the fault, for a
declaration that threw or returned a reading that cannot describe an answer.

Five things follow, each of which is a decision rather than an implementation
detail.

### A function, where every other declaration is data

`type`, `slots`, `text`, `frames`, `behaviours`, `role`, `copy` and `reads` are
all data. `unshown` is not, and the asymmetry is the honest one rather than a
shortcut.

`reads` is a list of **names**, and a name is data — which is exactly why 0184
could answer the prop-named case with a `{ fromProp, default }` form instead of a
callback. How many rows survived a shape is not data about a primitive. It is the
primitive reading an answer. There is no data form of it that would not be a
number somebody maintains by hand beside the code that makes it true.

### Both counts, and never the rows

`given` and `shown` rather than the difference, because the sentence the author
needs is *eleven of twelve* and a lone `11` cannot say it.

Numbers and never the rows themselves, which is the line `data-unavailable`
already holds: it names the source that could not answer and not what it
answered. A diagnostic is logged, and a row is the host's data.

### The primitive reports every answer; the runtime reports the ones that differ

A declaration returns a reading for each answer it read, the ones it read whole
included. Whether `shown === given` is worth saying out loud is the walk's call,
and the walk's answer is no: an answer read whole is the ordinary case, and
reporting it would put one line per bound region into every log on every page.

Put in the runtime rather than asked of each primitive because it is the walk that
owns the diagnostic vocabulary (0181), and because a rule each of ninety-nine
authors implements separately is a rule that holds ninety-eight times.

### Absence is not emptiness, again

A primitive whose author has declared nothing is reported on by nothing. This is
the same bargain `reads` and `copy` make and it is what lets the change ship
additively: it is not a claim that every primitive shows everything it is given,
because no author made that claim.

Unlike `copy` and `reads`, there is no `[]` to distinguish from absence here — a
reading is made per answer at render time, so a declaration that reports nothing
and no declaration at all are the same answer, and the registry says `undefined`
for both.

### The declaration is guarded, and rendering stays total

A declaration is another author's code called inside a walk whose entire contract
is that it always returns an element. So:

- **A throw is caught** and becomes `unshown-unreadable`. A page lost to a
  primitive's own bookkeeping would be the worst trade available in this package.
  The node renders exactly as it would have, because a count is bookkeeping about
  an answer rather than part of drawing one.
- **A reading that cannot describe an answer is refused**, not clamped. *Thirteen
  of twelve* sends the author hunting a defect that is in the primitive telling
  them about it.
- **The whole batch is refused, not the offending reading.** A declaration that
  miscounted one answer has not earned belief about the others, and a partial
  report is indistinguishable from a complete one once it is in a log.
- **What the type promises is checked anyway** — that the return value is an
  array, and that each member is an object. The point of a guard is that the code
  on the other side of it is somebody else's, and a host's JavaScript need not
  agree with this package's types.

`unshown-unreadable` is the one member of `RenderDiagnostic` that neither a tree
nor a deployment can cause. It is addressed to whoever wrote the component.

## Consequences

- **`loom.feed` can close its half**, which is `Loom primitives`' to do and is
  filed for that lane: declare `unshown` as the `readAnswer` it already has, and
  the count reaches the author while the reader goes on being told without one.
  Nothing in `src/primitives/` is touched by this record.
- **A second consumer exists already.** Any primitive that reads rows against a
  schema has the same exposure. This is the seam for all of them, and the
  registry answers `undefined` until each says otherwise.
- **The diagnostic surface grows by two codes.** `describeRenderDiagnostic` is
  exhaustive over `assertNever`, so both are forced; the four screens in
  `apps/loom` that print diagnostics print these the same way they print the rest,
  with no per-code branching to update.
- **The cost on a page that declares none is one map read per bound node**, which
  is what `reads` already costs beside it.
- **A declaration can be wrong in a way nothing catches**: one that returns
  `{ given: 12, shown: 12 }` where the component drew eleven is silent and
  believable. The construction that makes it unlikely is the primitive declaring
  the function it already calls, and nothing here can enforce that. It is the same
  exposure `copy`, `interactive` and `submits` carry, and unlike those it costs a
  diagnostic rather than a decision.

## Alternatives considered

**`report` on the render context**, as the finding proposed. Rejected on the
ordering argument above: a component body runs after `renderLoomTree` has returned
the array, an unknown number of times, and in some media not at all. It is not a
matter of who may write where — the shape does not work.

**A mutable diagnostics array the caller reads after rendering.** This is the
same idea with the contract written down: *read `diagnostics` only after you have
rendered the element.* Rejected because it makes every existing caller wrong
retroactively, gives a different answer under `StrictMode` than in production, and
cannot be honoured at all by a caller that renders the element somewhere the
runtime does not control.

**Have the walk read the rows itself**, against a schema the primitive declares.
This keeps everything data — the primitive declares a row schema, the walk parses.
Rejected because it either duplicates the primitive's parse or replaces it, and
both are worse than calling the primitive's own function: duplicated, the two can
drift and the diagnostic starts lying; replaced, the walk is deciding what a
primitive draws, which is the one thing a render seam must not do.

**A count on the reader-facing text instead.** Rejected by 0175 already, and the
reasoning stands: the library cannot form a plural in every language it may be
served in, and the reader is not the person who can act on the number anyway.

**Hand the primitive its own reading back on the context**, so the row parse
happens once instead of twice. Attractive, and rejected as a separate question
with its own answer — it would put a value on the context whose shape is the
primitive's rather than the runtime's, and the saving is a second parse of rows a
page is about to draw. Filed as an open question in the report rather than decided
here.

**Report every reading, including whole ones, and let the consumer filter.**
Rejected: it is one line per bound region in every log on every page, and the
filter would be written independently by each of them.
