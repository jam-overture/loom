# 0357. A primitive declares the shape of answer it reads, and the rows inside it stay its own

**Status:** Accepted
**Date:** 2026-11-06
**Section:** §4e

> **Why this number.** `0354` is the highest on `main`. `0353` is claimed by the
> open #778 and `0355` by the open #780; `0356` is this branch's own, renumbered
> from `0355` earlier today for that clash. So `0357` is the next free one
> everywhere.
>
> **Why `Accepted`.** It adds one optional declaration to `definePrimitive` and
> one reason to a closed union. It changes no tree schema, no delta, and nothing
> about how a page is stored or composed; a primitive that declares nothing
> renders exactly as it did. It is the half of
> [0058](0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md)'s
> authoring gap that `0181` and `0184` left, and it supersedes nothing.

## Context

0058 built the data seam on 15 August and ended by naming what it had not
built: *a primitive declaring which binding names it reads, so the catalogue can
tell a model that `loom.services` wants a `services` binding.* It called that
the next unit.

It was not the next unit. `Loom docs` filed it on 12 September, after writing
the site's page on `loom:data` and finding that the honest answer to *so which
primitive do I put this on?* was **none of them**. That finding named two
missing things and asked for one field to settle both:

1. **Which binding names a primitive reads.** Shipped, as `reads`
   ([0181](0181-a-primitive-declares-the-binding-names-it-reads-and-saying-nothing-is-not-saying-none.md),
   [0184](0184-a-primitive-may-read-under-whichever-name-a-prop-gives.md)).
2. **What shape it expects back.** Not shipped, and this is it.

Meanwhile
[0180](0180-a-primitive-that-draws-an-answer-declares-the-shape-it-can-draw.md)
built the library's first two bound primitives and decided, in its clause 2,
that *the primitive declares the shape of answer it can draw*. That decision is
right and is not being revisited. What it could not do was put the declaration
anywhere the framework could see it: `definePrimitive` had no field for one, and
0180 says so in its own consequences and files it. So the schema went where it
could — inside the component. `loom.feed` holds a private `entrySchema` and an
`entriesSchema` and re-parses every answer by hand; `loom.tally` holds a private
`figureSchema` and does the same.

**The consequence is the one mistake at this seam that nothing catches.** Three
of the four ways a binding can be wrong are refused before a page is served: an
unregistered source, a param the source did not declare, and — since 0181 — a
name nothing reads. The fourth is a source that answers *correctly, by its own
schema*, under a name the primitive *does* read, in a shape that primitive
cannot draw. A list of services bound to a node that draws a figure resolves
cleanly, costs a round trip, is handed over, and is refused inside a component
where the only report of it is whatever that component chose to draw. The source
schema cannot catch it, because a source schema is a claim about a host's
database and says nothing about what can go on a page.

## Decision

### 1. A primitive may declare the shape of answer it reads, per name

`definePrimitive` takes `expects`: a map from binding name to a schema for the
answer under it.

```ts
reads: [{ fromProp: "binding", default: "entries" }],
expects: { entries: z.array(z.unknown()) },
```

Optional, and **absence is not a claim** — the same bargain `reads` makes, for
the same reason: every bound primitive written before this existed declared
nothing, and reading that as *this primitive reads any shape* would be a claim
no author made. Unlike `reads` and `copy` there is no emptiness to tell apart
from absence, because a name with no expectation is handed its answer unchecked
either way; `{}` and leaving it out say the same thing and nothing reads them
differently.

Keyed by the name as **declared** — the string, or a prop-named declaration's
`default`. A node that renames the binding it draws from has not changed the
shape the primitive draws, so the expectation belongs to the declaration and the
walk resolves one name to the other.

### 2. The top-level shape is the framework's question; each row stays the primitive's

An expectation answers *is this the kind of answer I asked for* and never *is
every row in it drawable*.

This is the load-bearing line of the record, and it is
[0175](0175-a-listing-skips-the-row-it-cannot-read-and-fails-the-one-it-cannot-place.md)
and [0206](0206-a-primitive-declares-what-it-could-not-show-and-the-runtime-decides-whether-to-say-so.md)
reaching here unchanged. A row's shape is the one thing only the component
knows, one row written by a schema this build is older than must not take the
whole band off the page, and what a primitive dropped is reported with a count
by `unshown`. A framework that validated rows would have to decide what to do
with the eleventh of twelve, and every answer to that is one of those two
records' to give.

So `loom.feed`'s `entriesSchema` is what moves onto the declaration and its
`entrySchema` is what does not. The division is not a compromise: it puts each
half where the truth about it can be told.

### 3. A refused answer is the named absence of an answer

An answer the primitive declared it cannot read becomes
`{ status: "unavailable", unavailable: { reason: "unreadable-answer", … } }`
before the component is called.

0058 is explicit that a binding either has an answer or has a **named reason**
it does not, and that "you have no services yet" and "we could not reach your
services" are different sentences. A primitive handed rows it declared it cannot
read has no answer in every sense that matters to the page, and what it draws is
the rendering 0180 clause 3 already designed for exactly this state — a declared
line, announced — rather than whatever a hand-written parse happened to fall
through to.

**The answer the primitive receives is the one the source gave.** The parse
output is discarded, which is the bargain `verdictFor` already makes with props
and is load-bearing for the same reason: 0180 is explicit that unknown keys on a
row are stripped and not refused, and a page assembled from whatever this
schema happened to keep would be a function of this deployment's schema version
rather than of the answer. An expectation is a gate, not a transform.

### 4. It is reported as `data-unavailable`, with a reason of its own

Not a diagnostic code of its own. The binding has no value, which is what
`data-unavailable` means; the reason is what says whose schema refused it.
`invalid-answer` is the source's own declaration refusing, fixed by whoever owns
the data. `unreadable-answer` is the primitive's, fixed by whoever bound this
node to that source. A reader holding either knows which file to open, and
anything counting bindings that went unanswered still reads one code.

The source id on that diagnostic comes from the node's own `loom:data`, parsed
again in the walk. It costs a parse on the one path where an answer was refused
and nothing on every other node — the plan's copy would have to travel through
the resolution to reach here, and a resolution is asked about a node id and
deliberately knows nothing about what the node declared.

### 5. An expectation naming a binding the primitive does not read is refused at registration

The drift `frames`, `copy` and `names` are each checked for, one seam over: a
declaration naming something the thing it describes does not have, left pointing
at nothing by a rename. A binding renamed in `reads` would otherwise leave an
expectation here checking nothing, for ever and silently.

Checked against `reads` rather than against the props schema, because a binding
name is not a prop name. A primitive that declared expectations and no `reads`
at all fails on its first one, which is right: it has said what shape an answer
would be without ever saying it reads one.

## Consequences

- **The seam can now be told the mistake it was built around.** A list bound to
  a figure is reported before anything draws, against the source that answered
  and the name it answered under.
- **No primitive in the library declares one yet**, so nothing in this
  repository changes behaviour today. `src/primitives/` is `Loom primitives`',
  and moving `loom.feed`'s `entriesSchema` and `loom.tally`'s `figureSchema` onto
  their declarations is that lane's. **Filed.** This is the same shape 0180 was
  in when it filed `reads`, and it is worth saying plainly: until that lane
  adopts it, this is a declaration nothing in the library makes.
- **`DataUnavailable` has an eighth reason**, and the docs lane's deliberate
  tripwire fired on it — `CAUSED_BY` in `(docs)/_lib/data/answers.ts` is an
  exhaustive `Record` over the union whose own comment says *"a seventh reason
  added to `DataUnavailable` fails to compile here, naming itself"*. One row
  added, mapped to `nothing one page can do`, which is literally true while no
  registered primitive declares an expectation. A cross-lane line, named in the
  report.
- **The catalogue is unchanged, and that is not the finding's whole ask.** The
  12 September finding asked for the shape to be *projected into the catalogue
  beside `props`*, so a model is told what `loom.feed` wants. `catalogue.ts`
  states, deliberately, that it is shallower than the schemas it comes from
  because *a structural description of arbitrary Zod is a second schema language
  to maintain*. Projecting an answer shape means either accepting that cost or
  inventing a small closed vocabulary for the outermost layer, and choosing
  between those is not a thing to do in passing. **Raised as an open question
  rather than decided.**
- **No diagnostic code was added**, so the docs site's code catalogue is
  untouched. A code there carries a recipe that has to render it, and no
  registered primitive can produce this one yet; a code with no picture, in
  another lane's exhaustive table, is worse than the reason that reads correctly
  today. Worth revisiting the day a primitive declares an expectation.
- **A primitive adopting this keeps its own row reading.** `unshown` still
  counts what it dropped and `loom.data` still arrives as `JsonValue`. What goes
  away is the top-level parse and the exit for *this is not even the right kind
  of thing*, which is one of the three the documented example carries.

## Alternatives considered

**Checking the primitive's expectation against the source's declared `answers`
schema, before anything is served.** What the finding actually wants — the
mistake caught at compose time rather than at render. Rejected because deciding
whether one Zod schema's outputs satisfy another's inputs is schema subtyping,
and there is no sound way to do it through Zod's public surface. The tractable
approximation is to project both into a structural description and compare, which
is the second schema language `catalogue.ts` rejects by name, and an unsound
approximation at this seam is worse than none: it would refuse honest bindings
and pass the dishonest ones that happen to project the same. Left open, and the
honest statement is that a render-time gate is what can be built soundly today.

**A `data` field replacing `reads`, holding the name and the shape together**,
which is the finding's own wording. Rejected because `reads` shipped fourteen
months of decisions ago in this project's time and is read by the catalogue, the
walk, the audit and `unreadBindingsIn`; replacing it would be a breaking change
to all four to save one field. The two declarations are also read by different
things — a name is data a model is told, a schema is a function the walk calls —
and `BindingDeclaration` is in the catalogue's published type, where a Zod schema
could not go without making the catalogue unserialisable.

**Validating rows and handing the primitive only the ones that passed.** The
tidier-looking shape, and it would delete the per-row parse from both bound
primitives. Rejected: it decides what to do with the eleventh of twelve rows,
which is 0175's to decide and which it decided the other way — skip the row,
keep the band, say so visibly. It would also make the page a function of this
deployment's schema version, which clause 3 rejects.

**Reporting the refusal and handing the answer over anyway**, leaving the
primitive to cope as it does now. Rejected because it makes the declaration
advisory: every bound primitive would still carry the defensive parse it carries
today, and the field would buy a diagnostic rather than a contract. 0058's
`unavailable`-with-a-reason already exists to express this exact state.

**A diagnostic code of its own, `data-unreadable`.** The more precise report,
and the one a sibling of `data-unshown` would be. Rejected for now on the
grounds in the consequences: it cannot be rendered by anything today, and its
home is an exhaustive table in another lane.

**Requiring an expectation from every primitive that declares `reads`.** It
would make the gap impossible to reintroduce. Rejected for the reason 0181 gives
about its own absence: the two bound primitives in the library predate this
field, and a required declaration would make the registry refuse them until
another lane's run adopted it — a framework change that takes the library's
bound primitives off every page until somebody else ships.
