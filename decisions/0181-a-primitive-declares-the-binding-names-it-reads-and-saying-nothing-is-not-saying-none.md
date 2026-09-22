# 0181 — A primitive declares the binding names it reads, and saying nothing is not saying none

**Status:** Accepted
**Date:** 2026-09-22
**Section:** §2 — the data seam, reaching the catalogue, the interpreter's prompt and the render walk

## Context

[0058](0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md) made
a binding a question the tree asks: a node's `loom:data` maps a **binding name**
to a registered source and the params to ask it with, and the name is how the
primitive reading the answer finds it — `loom.data.entries`.

Three things can be wrong in that declaration. Two of them are refused:

| what is wrong | what happens |
| --- | --- |
| an unregistered source id | refused, `no-such-source` |
| a param the source did not declare | refused by the source's own schema |
| **a binding name nothing reads** | **resolved cleanly, and then read by nobody** |

The third is silent and it is also the most expensive: the source is asked, the
answer comes back, the round trip is paid for, and the primitive looks under a
different key and draws its empty state. Nothing throws, nothing is reported,
and the page is wrong in the one way a test of either half alone cannot see.

`dataBlock` in the interpreter's prompt had been carrying a workaround for this
since [0172](0172-what-a-deployment-offers-a-model-is-one-value.md), in as many
words:

> Do not invent a binding name: the name is how the primitive reading the
> answer finds it, so repoint or re-param a name already on the node rather
> than adding one of your own.

Its own doc comment said why that was the best it could do — *"a name is not
something the catalogue can enumerate, because it belongs to the primitive
rather than to the source."* A model told *do not invent one* and shown no list
of the ones that exist can only avoid inventing by never binding anything new.

This was filed on **19 September** by this lane, against this lane and
`Loom primitives`, and deliberately not built, for a reason the entry stated
plainly: *a declaration nothing declares is a field on ninety-six definitions
and a projection nobody reads.* It named its own trigger — **the moment the
first primitive reads a binding is the moment to build it.** `loom.feed` and
`loom.tally`, on #361, are that moment.

## Decision

### 1. A primitive declares the binding names it reads

`PrimitiveDefinition.reads?: readonly string[]` — `["entries"]` on a feed. The
registry checks each against `bindingNameSchema` and refuses a declaration that
is not a binding name, with a new `invalid-binding-name` code.

This is the only check available and it is worth making, because it fails in
the worst direction. A declared name no tree could ever write matches no
binding, so the primitive reports **every** binding it is ever given rather than
none — a misdeclaration that makes the new diagnostic maximally noisy instead of
silently absent.

Unlike `frames`, `copy` and `interactive`, there is no second list for it to
drift against: a binding name is not a prop name, so nothing can be renamed out
from under it.

### 2. Absence and emptiness are different answers, and neither is rounded to the other

`undefined` means *nobody has said*. `[]` means *this primitive reads no data*.
There is no default, because a default would be a claim no author made, and it
would be the wrong claim for every bound primitive written before anyone thought
to declare one.

This is [0122](0122-a-primitive-says-which-of-its-props-a-reader-reads.md)'s
bargain, made a second time one seam along, and it is what lets this ship today:
ninety-eight primitives declare nothing, and the seam says nothing about any of
them.

### 3. The catalogue projects it, and the prompt writes absence by writing nothing

`CataloguedPrimitive.reads` carries the three-way answer out to every consumer.
The catalogue *line* a model reads writes only two of the three:

| declared | the line says |
| --- | --- |
| `["entries"]` | ` reads: entries` |
| `[]` | ` reads: none` |
| nothing | *(no clause)* |

That is the opposite of how `props` is rendered, where `props: not declared` is
written out, and the difference is which answer is common. Every primitive
declares a props schema, so *not declared* is the rare line and earns its words.
`reads` is absent on nearly every primitive there is, and a catalogue carrying
`reads: not declared` on ninety-eight consecutive lines would spend real tokens
on every proposal and every repair to say nothing at all. The distinction
survives because the absence of the clause **is** the third answer, and the data
block now teaches how to read it.

The workaround sentence is replaced by one that names where to look.

### 4. The walk reports a binding the primitive says it does not read

A new `data-unread` diagnostic, beside `props-undeclared`, which is the same
shape of fact: the render found a node whose declaration and whose primitive do
not agree, drew the page anyway, and said so.

It is measured on the **answers**, not on the raw declaration. A binding whose
source could not answer is already reported as `data-unavailable`, and reporting
both of the same name is two true things about one mistake in the order they
would be fixed.

### 5. The reader is detected structurally, like every other declaration seam

`BindingReader` is duck-typed off the resolver, the way `FrameResolver` and
`BehaviourResolver` are. A registry built by the SDK satisfies it; a host
resolving from a plain map has registered nothing that could declare a binding
name. **There is nothing for a host to wire and nothing that can go missing.**

## Consequences

- **A model can now be told the names**, so an invented one is a thing it has a
  reason not to write rather than a rule it was asked to obey blindly.
- **Nothing changes for any primitive that has not declared**, which today is
  all of them. This is additive in the strict sense: a deployment that upgrades
  and declares nothing gets byte-identical prompts and an identical diagnostic
  list.
- **The declaring half is `Loom primitives`' and is filed for them.** `loom.feed`
  and `loom.tally` on #361 are the two primitives that should declare first, and
  until they do the seam is built and quiet.
- **It is a diagnostic and not yet a refusal.** The finding asked for a name to
  be *"as refusable as an invented source id"*, and a render diagnostic is one
  layer later than the write path. The route that would make it a refusal is the
  one `0179` opened on #360 — a record that is on that branch and not yet on
  `main`, so it is cited here by number and not linked — a fact in the analysis,
  a factor in the stakes. Building it here would mean stacking on an unmerged
  branch. Filed, with the shape named.
- **A host implementing `PrimitiveResolver` by hand gets nothing**, the same
  deal `frames` and `behaviours` already make.

## Alternatives considered

**Infer the names from the component.** A primitive reads `loom.data["entries"]`,
so in principle a build step could find the string. Rejected: it is a static
analysis of arbitrary JavaScript that has to be right or worse than nothing, and
the one thing it certainly cannot see is a key computed from a prop.

**Default `reads` to `[]`.** One less field on the definition type and the
distinction collapses. Rejected in the same words as 0122: it makes the runtime
assert something no author said, and the assertion is false for every bound
primitive written before the declaration existed. A page would start reporting
bindings that work.

**Put the names on the source instead.** A source could say what name its answer
is filed under. Rejected: it inverts the seam. One source answers many
primitives, each of which reads under whatever name suits it, and 0058's whole
argument is that a binding is the *tree's* question and the source knows nothing
about the page.

**Refuse the binding at render rather than report it.** Dropping an unread
binding from the bag changes nothing a primitive can see — it was not reading it
— and would cost the diagnostic the ability to name what was dropped. A
diagnostic is the whole of the available value.

**A `BindingReader` as a required render option.** Rejected for the reason
`FrameResolver` was: a required seam is one every host must wire and one that
can therefore go missing, and the registry already satisfies it for free.

**Name the check `data-unbound` or `data-ignored`.** Rejected as ambiguous
against `unbound`, which the render seam already uses for a node with no
bindings at all. `unread` says the one true thing: the answer arrived and
nothing looked at it.
