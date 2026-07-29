# 2026-07-29 (day 6) — The primitive registration contract

**Build order section:** §4 — Framework SDK (the registration contract; CLI scaffolding still open)

**Visual:** [2026-07-29-day-06-primitive-registration.svg](2026-07-29-day-06-primitive-registration.svg)

**Branch:** `day-06-primitive-registration`, off `day-05-key-diagnosis` (PR #7, still open)

This is the third run of 2026-07-29 — day 5 landed §3 in the morning, the key
diagnosis went out at midday as PR #7, and this is the evening run.

---

## Review feedback

**None outstanding.** PR #7 has had no reply yet — it was opened about eight hours
ago and its only comment is my own. Nothing on #6 was left unaddressed when it
merged. So this run is a new unit of work rather than a response, and I did not
touch #7's branch beyond building on top of it.

One thing has not changed and is still the only thing I need from you: the key.
See **Open questions**, item 1 — short version, `LOOM_ANTHROPIC_API_KEY` is still
not set, so the live smoke test skipped for the fourth run in a row.

---

## What was completed

**A primitive can now declare what a tree may set on it, and the renderer holds
it to that.** `src/sdk/` is §4's registration contract, and it discharges both
obligations §3 recorded against this section.

**The declaration** (`src/sdk/definition.ts`). `definePrimitive` takes five
things: the `type` a tree addresses it by, a one-line `description`, the Zod
`props` schema it accepts, the `slots` it projects, and the `component`. The
generic parameter is inferred from the schema, so an author who reads `props.titel`
finds out at the declaration rather than at a render. It returns an entry with the
prop type erased, which is what a heterogeneous registry can hold — and that
erasure is the one narrowing cast in the SDK, in the one place that still has both
the schema and the component type in hand.

Declaring a schema is **mandatory**. A primitive that takes no props says
`z.object({})`, which is a claim; the alternative was a silence that reads as
"trust whatever a model set".

**The registry** (`src/sdk/registry.ts`) satisfies two renderer-facing interfaces
in one object: `PrimitiveResolver` from §3, and the new `PropsValidator`. It
refuses to be built on a bad primitive identifier, a bad slot name, or a duplicate
type — last-wins registration would make a tree's meaning depend on module
evaluation order, which is not a thing anyone should debug from a rendered page.
Lookup is a `Map`, so a primitive legitimately named `constructor` is an ordinary
key rather than a reach into `Object.prototype` (the same hazard day 5 found in
the static resolver, closed by construction this time).

**Validation at the render seam** (`src/render/props.ts` + `render.ts`). A node
whose props fail its primitive's declared schema is omitted along with its
subtree, and one `invalid-props` diagnostic records each failing path. That is
exactly what §3 already does for an unknown primitive, for the same reason:
rendering is total, and one bad node must not blank a page.

Two decisions inside that are worth stating plainly:

- **Validation is a predicate, not a codec.** The parse output is discarded. A
  primitive receives the tree's props unchanged — no defaults, no coercion —
  because a schema that supplied values would make the rendered page a function
  of the deployment's schema version as well as the tree. Two deployments
  rendering one revision differently would break the property everything else
  rests on: that the tree *is* the page. There is a test that a `.default()` in a
  schema never reaches the markup.
- **A validator that does not recognise a type the resolver resolved is
  reported**, not silently trusted (`props-undeclared`). The node still renders —
  the resolver did know it — but "these props went unchecked" is now a fact in
  the diagnostics rather than an assumption.

The security-relevant consequence: 0009 made `dangerouslySetInnerHTML` in a tree
*inert*; a strict schema now makes it *refused*, one step earlier, with a
diagnostic naming the prop. Tested.

**The conformance probe** (`src/sdk/conformance.ts`, `audit.ts`). 0010 asked §4 to
catch a primitive that ignores `loom.editable` — it renders fine and is invisible
to the portal, with no error anywhere. `probeEditableDecoration` calls a component
once with a synthetic context and looks through the elements it returned for the
decoration it supplied, following `children` and recognising the runtime's own
object by identity when it is handed down to another component. Three verdicts:
`decorates`, `not-decorated`, and `not-probeable` for a component that cannot be
called outside a renderer at all.

`auditRegistry` runs it over a whole registry. It **reports and does not decide** —
nothing refuses to run over a non-conforming primitive, because whether that
matters depends on whether the deployment has a portal, which the SDK cannot
know. `notDecorated` is a list a host asserts empty in its own test.

**The catalogue** (`src/catalogue.ts`, `sdk/catalogue.ts`, and the prompt).
`catalogueOf(registry)` projects the registry into plain data — type, description,
prop names with optionality, slot names — and `modelInterpreter` can be given it,
in which case it leads the user message:

```
Primitives this deployment has registered. A prop marked with "?" is optional; …

- loom.page — The page shell; everything else lives inside it. props: subtitle?, title slots: main
- loom.card — A bounded block of related content. props: elevation?, variant

Insert only primitives from that list — a type that is not on it has nothing to render it…
```

Before this, a model's only source of primitive types was the tree outline, so
"add a buy button" left it inventing a type name and hoping. The catalogue is
optional and absent by default: a host that wires none gets exactly §2's
behaviour, and nothing is invented to fill the gap.

It is also part of the prompt, therefore part of the prompt hash in provenance —
so two deployments with different registries cannot produce identical provenance
for the same utterance. That is tested, and it means "which primitives were
available when this was proposed" is answerable from the record.

---

## Decisions I made that weren't specified

1. **`PropsValidator` is a separate interface rather than an optional method on
   `PrimitiveResolver`.** Day 4's precedent, applied: a renderer handed no
   validator *cannot* validate, so "this deployment checks AI-authored props" is
   a visible choice at the composition root. A registry implements both, so the
   ordinary wiring is the same object twice.

2. **Invalid props omit the subtree rather than rendering the node anyway.**
   Rendering it hands a primitive a bag its own types say cannot occur, which
   pushes an unchecked cast into every author's lap and moves the failure away
   from the seam that knows what went wrong. Argued in 0011.

3. **`JsonObjectView` in `json.ts`** — an object type whose *present* values are
   JSON values. `{ title: string; subtitle?: string }` is not a `JsonObject`
   (`string | undefined` is not a `JsonValue`), but it is exactly what a schema
   with an optional prop produces, and an absent key in a stored object reads
   that way. The value space is unchanged: `undefined` never survives
   serialisation, so it can never be a stored prop.

4. **The catalogue carries prop names and optionality, not prop types.**
   Describing arbitrary Zod to a model means maintaining a second schema
   language, and the model already sees concrete prop values in the tree outline.
   A schema whose keys cannot be enumerated projects `not declared`, which is
   deliberately distinct from `none`.

5. **`auditRegistry` is a function a host calls, not something registration
   does.** Probing means calling every registered component; doing that while a
   module graph is evaluating runs someone else's render as a side effect of an
   import, and a hook-using primitive would fail registration for a reason
   unrelated to the contract. This is a small, deliberate deviation from 0010's
   wording ("at registration"), and 0012 records it as such rather than quietly
   reinterpreting it.

6. **Registry construction reports the first error, not all of them.** Consistent
   with `TreeError` and `RegistryError` elsewhere; a build-time failure that names
   one problem at a time is annoying but not misleading.

7. **The test fixtures gained `src/testing/definitions.ts`** — the same components
   as `testPrimitives`, declared through the real contract, so registry and
   renderer tests run against real declarations. `loom.card` is strict and
   `loom.page` is not, because both are legitimate author choices and the seam has
   to behave for each.

8. **No model work, so no model id decision.** §4 does not call a model. The
   interpreter default stays `claude-opus-5` at effort `high` from 0005,
   unchanged and unverified against the live API — see the open question.

---

## Decision records

| #    | Title                                                              | Status   |
| ---- | ------------------------------------------------------------------ | -------- |
| 0011 | A primitive declares its props, and the render seam enforces them  | Accepted |
| 0012 | Conformance is probed and reported, never enforced by registration | Accepted |
| 0013 | The registry is what the model is told it may build                | Accepted |

Nothing superseded, no `Accepted` record contradicted.

**No ARCHITECTURAL escalation.** Neither the tree schema nor the delta model was
touched — §4 reads props and writes nothing. The changes to existing files are all
additive: `RenderOptions` and `RenderDependencies` gained an optional `validator`;
`RenderDiagnostic` gained two variants; `LoomPrimitiveProps` gained a defaulted
generic parameter, so every existing usage still typechecks; `buildUserMessage`
and `buildRepairMessage` gained an optional third parameter;
`ModelInterpreterConfig` gained an optional `catalogue`. Nothing migrated.

0011 and 0013 each place an obligation on a later section — §6 must treat
`PropsIssue.message` as content rather than a safe constant (Zod can quote a
rejected value), and §5 will read the same `PrimitiveCatalogue` for an insert
menu. 0012 hands §5 the undecorated-primitive case as a supported condition to
degrade over rather than a bug to be surprised by.

---

## Test coverage / status

```
Test files  39 passed | 1 skipped
Tests       371 passed | 1 skipped
Statements  99.25%   Branches 94.06%   Functions 99.01%
```

`pnpm verify` is green. New this session: **60 tests** across six files.
`src/sdk` is at 100% statements and functions (96.47% branches); the uncovered
branches are two defensive guards in the probe's element walk and one in
`declaredPropsOf`.

What the new tests pin down, rather than merely exercise:

- a valid tree renders unchanged with a registry wired as both seams
- a card with `variant: "glowing"` is omitted with its subtree, and the diagnostic
  names `variant`
- `dangerouslySetInnerHTML` on a strict primitive is refused at the seam, not
  merely inert in the bag
- a `.default()` in a declared schema never reaches the markup — the primitive
  gets `{}` because that is what the tree says
- no validator wired ⇒ no validation and no diagnostics (§3's behaviour is intact)
- a validator that knows fewer types than the resolver produces
  `props-undeclared` and still renders the node
- validation reaches every element, not only the root, and reaches through
  `renderRequest`
- a duplicate type, a bad primitive identifier, and a bad slot name each refuse
  the registry; `constructor` is a registrable type and an unregistered one
  resolves to nothing
- the probe passes a primitive that decorates its root, one that decorates below
  its root, and one that delegates its root to another component; fails one that
  ignores the decoration and one that renders nothing; and declines to judge a
  hook-using component, a class component, and a non-component
- the one known false negative is asserted, not hidden: a primitive that hands a
  *copy* of the decoration to another component reads as `not-decorated`
- the catalogue holds nothing that cannot be serialised, keeps registration
  order, and distinguishes "cannot enumerate" from "declares none"
- the catalogue leads the user message, is absent for an empty registry rather
  than becoming an empty heading, reaches a repair, and changes the prompt hash

Two caveats, unchanged and stated rather than hidden:

- **The skipped test is the live smoke test.** Neither `LOOM_ANTHROPIC_API_KEY`
  nor `ANTHROPIC_API_KEY` is present to the test process in this container.
- `runtime/interpreter.ts`, `runtime/disposition.ts`, `interpretation/client.ts`,
  and now `catalogue.ts` and `render/props.ts` report 0%: type-only modules that
  emit no JavaScript. Left visible rather than excluded.

---

## Open questions for the next session

1. **The key still is not reaching the test process — fourth run, and the fix
   from PR #7 is waiting on you.** This session confirmed the same picture as
   midday: `ANTHROPIC_API_KEY` is absent from the shell every tool command runs
   in (only `ANTHROPIC_BASE_URL` is there), and `LOOM_ANTHROPIC_API_KEY` — the
   name #7 added, which nothing reserves — is not set anywhere. The action is one
   line: set `LOOM_ANTHROPIC_API_KEY` to the same value, in the same place, and
   merge #7. Until then, what stays unproven is whether a real model accepts the
   JSON Schema we generate, and now also whether it uses the catalogue sensibly.

2. **§4 is not finished: CLI scaffolding is still open.** The build order names
   "primitive registration contract, CLI scaffolding" and this run did the first.
   Next run does the second — `loom init` for a project and `loom add primitive`
   for a declaration stub that already satisfies the contract, plus a conformance
   check wired into a generated test so `auditRegistry` is run rather than merely
   available. I did not start §5.

3. **Prompt size is now pushed from two directions.** Large trees already outgrow
   the prompt (carried from day 3); a large registry now does too. Same pressure,
   probably the same answer — scope or retrieve rather than send everything — and
   worth designing once rather than twice. Recorded in 0013's consequences.

4. **Node-level provenance.** (Carried from day 1.) Untouched. Still leaning side
   table, still not forced.

5. **Should `props-undeclared` be a refusal in a strict deployment?** Today it
   always renders. A host that considers an unchecked node unacceptable has no way
   to say so except by not mixing seams. If that turns out to matter, the honest
   shape is a render option rather than a change to the diagnostic — flagging it
   now rather than guessing.

Next up, unless you redirect me: **finish §4 with the CLI**, then §5.
