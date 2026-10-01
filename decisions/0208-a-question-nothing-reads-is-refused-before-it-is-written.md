# 0208. A question nothing reads is refused before it is written

**Status:** Accepted
**Date:** 2026-09-30
**Section:** §2

> **Why this number.** `0207` is the highest record on `main`. The three open
> pull requests — #456, #457, #458 — each add none, so `0208` is free
> everywhere.
>
> **Why `Accepted`.** It contradicts no `Accepted` record and completes one:
> [0181](0181-a-primitive-declares-the-binding-names-it-reads-and-saying-nothing-is-not-saying-none.md)
> shipped the declaration and reported the mismatch after the fact, and the
> entry it left open asked for exactly this. Neither the tree schema nor the
> delta model moves, no built code migrates, and a deployment that hands no
> reader keeps the behaviour it has byte for byte. What it adds is one fact in
> the analysis, one stake factor and one optional seam on the composition root —
> the route [0064](0064-a-primitive-says-whether-it-is-a-target-and-the-gate-derives-the-nesting.md)
> established, and which [0173](0173-a-change-may-not-add-a-node-the-deployment-cannot-draw.md)
> and [0179](0179-what-a-primitive-accepts-is-a-vocabulary-the-write-path-is-handed-not-a-field-on-a-policy.md)
> have each taken since.

## Context

A binding is a question the tree asks under a *name*, and the name is how the
primitive reading the answer finds it (0058). There are four ways that
declaration can be wrong, and by 19 September three of them were refused before
a delta ever landed: an unregistered source and an undeclared param are refused
at the data seam, and a `loom:data` that does not parse never becomes a
question at all.

The fourth is the one that resolves perfectly. A node asks
`catalogue.services` under `rows`; the source is registered, the params are
fine, the answer comes back — and the primitive drawing that node looks under
`entries`. The page renders. Nothing is missing from the markup. The host pays a
round trip to its own data on every request, the region shows its empty state,
and the only party told about it is whoever is reading render diagnostics.

0181 built the half that makes it visible: a primitive declares `reads`, and the
walk reports `data-unread`. The 19 September finding had asked for something
stronger — that an invented binding name be *"as refusable as an invented source
id"* — and 0181's own entry recorded plainly that a diagnostic is not that:

> The route that would make it a refusal is the one `0179` opened on #360 — a
> fact in `ChangeAnalysis`, a factor in the stakes, an ordinary `rejected`
> disposition the repairer is offered.

That entry also named the condition for building it, and the condition is why
this record exists today rather than a week ago or a month from now:

> a refusal built before any primitive declares would refuse nothing, and a
> refusal built after several declare is one that starts refusing changes that
> used to commit. It belongs in the same run as the second or third
> declaration, not the tenth.

0179 is on `main`. **Two** primitives now declare `reads` — `loom.feed` and
`loom.tally` — so the window the entry described is open, and it closes a little
further with every declaration that lands.

## Decision

**A binding name no primitive reads is a fact in `ChangeAnalysis`, a `critical`
stake factor, and therefore an ordinary refusal at the default floor.** The
write path is handed a `BindingReader`; a host that hands none is unaffected.

Four parts, each the smallest thing that could carry it:

| | |
| --- | --- |
| `unreadBindingsIn(node, reads)` | every element in a subtree asking under a name its own primitive says it does not read |
| `ChangeAnalysis.unreadBindings` | the ones the delta *introduced*, measured between the two trees |
| `unread-binding` | a `critical` stake factor naming each node, the name, and the type that does not read it |
| `CompositionRuntime.bindingReader` | optional, absent by default |

### The vocabulary is the renderer's own `BindingReader`

Not a fourth shape built for this side. It is the move
[0203](0203-a-props-vocabulary-is-handed-the-props-a-primitive-is-handed.md) made
with `PropsVerdict` and for the identical reason: what the walk reports as
`data-unread` is then, by construction, what the write path declines to write,
rather than two implementations somebody reads side by side and agrees look
alike. A test runs both over one tree and one registry and requires the answers
to match.

It also means there is nothing to wire and nothing that can go missing. An SDK
registry satisfies `BindingReader` structurally — the same detection
`FrameResolver` and `BehaviourResolver` get — so a host hands the *same object*
to both seams. There is deliberately no `bindingReaderFor(registry)` beside
`propsVocabularyFor`: a registry already **is** one, and a helper wrapping it
would only be somewhere for the two to disagree.

### Handed to the write path, never declared on the policy

0179's rule, and this is the second thing it covers. A reader is behaviour; a
policy is data with a fingerprint, compared against the one that decided
yesterday. A policy carrying a function is a policy that cannot be compared.

### Measured on both trees, and keyed by node *and* name

Both-trees like `invalidProps` and unlike `unknownPrimitives`, and here the
reason is stronger than it is for props. A `configure` can put `loom:data` on a
node that had none, and — because a declaration may name the *prop* that names
the binding (0184) — a `configure` that touches no binding at all can orphan
one by renaming that prop. No walk over the operations sees either.

The key is where this parts company with `invalidProps`, which keys by node
alone. That factor's argument is that a page has one hole at a node however many
ways its props are wrong, so a node already failing counts as inherited
whatever changes about it. This harm does not aggregate that way: a node asking
three questions nothing reads is three round trips, and a change that adds the
third is answerable for the third. `repointing.ts` keys the same pair the same
way, for the same reason — a name means nothing without the node asking it.

### `critical`, and the argument is not the one the other two floors make

`unknown-primitive` and `invalid-props` are `critical` because the damage is
identical — `renderElement` returns `null`, a reader meets a hole — and a level
separating them would rank the explanation rather than the harm.

**This harm is a different thing, and it is worth saying so rather than filing
it under a family resemblance.** The page draws. Every node is registered, every
schema is satisfied, the markup is what the model meant. What is wrong is that
the region shows its empty state while the host pays for an answer nobody opens.

It is ranked with them because of the **available answer**:

- The repair is *one string*. The declaration holds the correct name, so the
  refusal can say `loom.feed reads entries, and this node asked under rows` —
  close to the most actionable thing a model can be told.
- Confirmation is the wrong rung, for the reason it is wrong for invalid props:
  it puts a change to a person whose only sensible answer is no, and the one
  thing it cannot tell them is what to do instead.

So the level is the damage everywhere else in `stakes.ts` and is the disposition
here. That is an inconsistency, it is deliberate, and the alternative — a `high`
factor plus a fifth Gate rung reading "never auto-apply" — is rejected below.

### No new Gate rung, and not `UNDRAWABLE`

`critical` plus the default refusal floor is the whole mechanism; the refusal is
`stakes-at-refusal-floor`, which is what 0173 and 0179 both land on. The
portal's `UNDRAWABLE` list is **not** extended: that list is the factors
describing a change nobody can carry out, and this change draws.

### Nothing is reported unless a host asked

`NOTHING_DECLARED` answers `undefined` for every type, which is 0181's own
bargain rather than a second judgement: absence and emptiness are different
answers, and a reader answering `[]` would claim every primitive reads no
binding and refuse every bound node on every deployment that has not opted in.
The seam is opt-in twice over — a host that hands no reader is untouched, and a
primitive whose author has declared nothing is reported on by nothing even on a
host that did.

## Consequences

- A deployment that hands its registry to the write path **starts refusing
  changes that used to commit**, wherever a primitive declares `reads` and a
  delta asks under a different name. That is the point, it is what the 22
  September entry warned would be true, and it is why the seam is opt-in.
- Two plain-language tables outside this lane gain a line, because
  `StakeFactorCode` is a closed set and both are `Record`s over it:
  `app/(portal)/_lib/vocabulary.ts` and `app/(marketing)/_lib/adapt/record.ts`.
  Added in each surface's own voice and filed in `FINDINGS.md` for its owner to
  review rather than discover.
- The one case this ranks too high is a node left asking ahead of a primitive
  that will read it next week. That change is honestly refusable today: the
  round trip is real now and the reader nobody wrote is not. A host that
  disagrees hands no reader, which is 0002's answer and the default.
- `analyzeDelta` now takes **four** optional trailing vocabularies, and is at
  the end of that shape. Collecting them into one record is a breaking change to
  a published function that two lesson transcripts call by hand, so it belongs
  in a run that can rewrite those transcripts too. Filed rather than left
  implicit.

## Alternatives considered

**A `report` on the render context, so the primitive raises it itself.** Not
applicable here and worth recording as already answered: 0206 rejected it for
the render seam because a component body runs after `renderLoomTree` has
returned. At the write path there is no component at all, so the question does
not arise — the fact is derived from the declaration and the tree.

**`high` plus a fifth Gate rung.** The shape 0035 established for discarded
work, and the one `redirected-submission` and `repointed-binding` both take: a
level cannot say *never auto-apply* while ceilings are per origin. It is the
honest way to rank this by damage and still refuse it. Rejected because those
two rungs exist for changes somebody may legitimately want — splitting a mailing
list repoints forms, splitting a catalogue repoints bindings — and the right
answer there is *a person decides*. Nobody wants a question nothing reads. A
rung would offer a hold to a change whose only correct answer is no, and would
cost the repairer the string that fixes it.

**Refuse at the data seam instead, beside the unregistered source.** Where the
19 September finding pointed, and it cannot reach: that seam sees a tree and a
source registry, and whether a name is read is a fact about the *primitive*
registry. Putting it there would mean the data seam holding both, which is more
coupling than the whole check is worth.

**Measure it on the operations, like `unknownPrimitives`.** Cheaper, and wrong
in two ways that both bite: a `configure` introduces a binding on a node that
had none, and a `configure` renaming the prop that names a binding (0184)
orphans one without touching `loom:data`. Neither is visible from an operation.

**Key by node alone, like `invalidProps`.** Consistent with the factor
immediately above it in `FACTORS`, and it would swallow the second unread name on
a node that already had one — which is a second round trip nobody asked for, and
the commonest way this gets worse.

**Report the answer that was fetched and dropped.** Rejected on 0206's line: a
diagnostic may carry counts and never row values, because a row is the host's
data. Here it is stronger still — nothing has been fetched, because nothing has
been asked. This seam runs before any source does.

**A fifth vocabulary for what a primitive reads, mirroring `PropsVocabulary`'s
`(type, props) => verdict` shape.** It would fold the prop-named resolution
(0184) behind one call instead of leaving `unreadBindings` to do it. Rejected
because that resolution is already written once, in `render/reads.ts`, and is
the thing both seams must agree about — a second function taking the same two
arguments and answering the same question is the drift 0203 was written to
prevent.
