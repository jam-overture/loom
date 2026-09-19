# 0172 — What a deployment can offer a model is one value, and three more vocabularies go in it

**Status:** Accepted
**Date:** 2026-09-19
**Section:** §2 — Composition Runtime (interpretation), reaching §4d, §5 and §6

## Context

[0013](0013-the-registry-is-what-the-model-is-told-it-may-build.md) settled the
principle for primitives: a model may name what a deployment registered, and it
is told what that is. Every seam built since has been shaped to the same
principle, and each one built the projection that implements it —

| seam | projection | record |
| --- | --- | --- |
| primitives | `catalogueOf` | 0013 |
| themes | `ThemeRegistry.catalogue` | [0049](0049-a-theme-is-three-ids-in-the-tree.md) |
| data sources | `dataCatalogue` | [0058](0058-a-binding-is-a-question-the-tree-asks-answered-before-the-walk.md) |
| submission endpoints | `submissionCatalogue` | [0065](0065-a-submission-names-a-destination-and-never-carries-one.md) |
| framable origins | `frameCatalogue` | [0095](0095-a-frame-carries-its-url-and-the-deployment-carries-the-origins.md) |

**Two of those five reached a prompt.** The other three were written, tested,
documented in their own module comments, and called by nothing.
`Loom docs` filed the data half on 12 September, while writing *Where the content
comes from*, and quoted 0058 back at it: *"a source a model was never told about
is one it can only guess at."* The other two were found by looking for the same
shape beside it.

The consequence is one thing said three ways. A model asked to put somebody's
services on a page had no way to know `catalogue.services` exists, so a binding
it proposed was one it invented, and `resolveDataPlan` refused it as
`no-such-source` — the right refusal for a guess nobody gave it the information
to avoid. A model asked for a contact form could not name an endpoint, so it
could not point one anywhere. A model asked for the product video picked a host
at random, and `resolveFramePlan` rendered a refusal where the document should
have been.

Each of those three is a *silent* failure of exactly the kind the projections
were built to prevent: the seam behaves correctly, the page is wrong, and
nothing in the repository connects the two.

## Decision

**The five vocabularies are one value.** `PromptVocabularies` has one optional
field per projection, `ModelInterpreterConfig` composes it rather than restating
it, and `buildUserMessage`, `measurePrompt`, `buildRepairMessage` and
`measureRepairPrompt` take it in place of the two trailing positional optionals
they had.

Each vocabulary renders a block on the same three rules the primitive and theme
blocks already follow: **absent when the host wired none**, ahead of the tree
where a cache can hold it, and closed by the instruction that makes the list
actionable — because the standing prompt tells the model to set only props a
primitive declares, and `loom:data` and `loom:submit` are keys no primitive
declares.

The three instructions are not interchangeable, and the differences are the
decision rather than the wording:

- **Sources.** A binding is `{"loom:data":{"<name>":{"source":"<id>","params":{…}}}}`.
  The block says *do not invent a binding name*. Two of this seam's three
  refusals are loud — an unregistered source is `no-such-source`, a bad param is
  refused by the source's own schema — and the third is silent: a binding name
  nothing reads resolves cleanly and is then read by nobody. The catalogue
  cannot enumerate the legal names, because a name belongs to the primitive that
  reads the answer rather than to the source that gives it.
- **Endpoints.** An id and a line, and the block says `to` is the only key the
  declaration accepts and that an address never appears in the tree. 0065's
  strictness is the reason: a declaration carrying `action` is refused outright
  rather than quietly stripped, so a model that has not been told will be wrong
  loudly.
- **Origins.** The block says out loud that the list is origins **rather than
  addresses**. This is the one vocabulary that is not the whole of what the
  model may write: which video belongs on a page is a content decision and the
  URL stays in the tree (0095). A model shown three lists and no word about
  which kind each one is would reasonably read the third as the only values it
  may write, and stop choosing the video — which is the one decision in that
  seam that is the model's to make.

`PromptMeasurement` gains `sources`, `endpoints` and `frames`, so the cost of
each block is a number on the same terms as the two that already had one
([0108](0108-a-repair-restates-the-request-and-the-runtime-measures-it.md), and 0170,
which is claimed on an open branch as this is written).

## Consequences

**A deployment that wired none of them pays nothing.** The blocks are absent
rather than empty, so the request is byte-identical to what §2 sent. Measured on
the sample tree with the starter library and the starter themes registered:

| wired | primitives | themes | sources | endpoints | frames | total |
| --- | --- | --- | --- | --- | --- | --- |
| nothing | 0 | 0 | 0 | 0 | 0 | **3,124** |
| library + themes (today) | 16,718 | 6,155 | 0 | 0 | 0 | **25,997** |
| + 1 source, 1 endpoint, 1 origin | 16,718 | 6,155 | 773 | 441 | 364 | **27,575** |
| + 8 sources, 4 endpoints, 3 origins | 16,718 | 6,155 | 1,375 | 588 | 466 | **28,426** |

The instruction dominates and the entries are cheap — 86 characters for another
source, 49 for another endpoint, 51 for another origin — which is the shape 0170
priced for primitives arriving again here. A deployment with data pays about 6%
more for a request and stops guessing; one without pays nothing.

**Nothing in this repository wires any of the three yet**, so the seam is
exercised by tests and by nothing that runs. `(docs)` registers endpoints and a
source, `(marketing)` registers framable origins, and neither passes them to an
interpreter. Both are filed for their owners; each is one line.

**Three call sites in other lanes changed** — `(docs)/_lib/prompt/request.ts`,
its test, and `(marketing)/_lib/pages/what-you-run.ts` — mechanically, from two
positional arguments to one object. Filed for their owners.

**A host on the old signature has to change one call.** Pre-production alpha, and
the alternative was worse; see below.

## Alternatives considered

**A fifth, sixth and seventh positional parameter.** Rejected on the call it
produces: `buildUserMessage(intent, tree, undefined, undefined, sources)` cannot
be read, and a call site that means something different when an argument is
inserted in the middle is a defect waiting for the eighth vocabulary. This is
what forced an options object rather than any grander argument about API design.

**A second spelling for the keys** — `primitives`, `themes`, `sources`,
`endpoints`, `frames` on the prompt side, against `catalogue`, `themeCatalogue`
and the rest on the config. Prettier, and rejected: it needs a mapping function
between two shapes that have to stay in step, and that function is precisely
where a sixth vocabulary would be forgotten. `ModelInterpreterConfig` composing
`PromptVocabularies` means a field added once arrives in a host's wiring and in
the prompt in the same change. The block names inside `PromptMeasurement` stay
short, because they name blocks rather than fields.

**Leaving the framing block out.** It was tempting, because it is the odd one:
the other two are allowlists of everything the model may say, and this is a
constraint on a value the model still chooses. Rejected because the odd one is
the one that fails most visibly — a refused frame is a hole in the page — and
because the difference is one sentence in the block rather than a reason to
carry a projection nothing sends for another month.

**Declaring which binding names each primitive reads, so the data block could
name them.** This is the honest fix for the silent third refusal and it is a
change to `CataloguedPrimitive` and to every primitive that would declare one.
Not taken here: the block warns instead, which costs a sentence, and the
declaration is worth doing when a primitive in `src/primitives/` actually reads
a binding — none does today, which is filed separately and is not this lane's.

**Wiring one of the surfaces so the seam has a live caller.** Rejected on lanes,
not on merit. `(docs)` and `(marketing)` own their composition roots, and a
migration PR that also changes another surface's behaviour is the thing
[0067](0067-the-four-surfaces-are-one-application.md)'s migration was careful not
to be. Filed for both owners with the line they need.
