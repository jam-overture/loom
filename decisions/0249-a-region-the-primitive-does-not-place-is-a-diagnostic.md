# 0249 — A region the primitive does not place is a diagnostic, and the declaration is the promise

**Status:** Accepted
**Date:** 2026-10-09
**Section:** §3 (render seam)

> **Renumbered on 2026-10-09**, from 0247, when this branch (#559) was merged.
> `main` had meanwhile accepted a different 0247 — *a readership comparison is
> built from two floored maps, and the mix is the only figure that survives
> having no window* (#558, opened six minutes before this one) — and two records
> sharing a number is fatal (0097). This record was written on 9 October and
> nothing in it changed but its number; the references to it on this branch were
> updated with it. Taking 0247 over 0244 was still the right call: it turned a
> three-way clash into a two-way one.

## Context

[0051](0051-a-slot-is-a-region-the-primitive-places.md) made a declared slot
mean something: an element's `slot` children are handed to its primitive as
named regions on `loom.slots`, and they are no longer in `children`. The same
record states the cost of that in one line — *a primitive that does not place a
region renders nothing for it* — and leaves it at the cost, with a pointer to an
open question about probing for it.

The probe arrived and answers the other direction. `auditRegistry` reports a
region a primitive **declared** and no probed configuration drew, which is
addressed to whoever wrote the component. Nothing was ever addressed to whoever
wrote the tree. So a tree that puts a dialog's body in a region the dialog does
not place renders the dialog, renders its plate and its bar and its cross, and
draws **nothing** where the paragraph was, with `diagnostics` empty.

`Loom primitives` filed it on 7 October, from `loom.dialog`, and the filing is
what makes it general rather than one component's: any primitive declaring no
regions — `loom.popover`, `loom.menu`, `loom.stack` and most of the arrangements
— loses authored content the same way. Its last paragraph is the argument for
this record. Every other *something arrived and was not drawn* in this seam has
a code for exactly that shape: `data-unread` for an answer nothing reads,
`data-unshown` for rows a primitive did not draw, `frame-refused`,
`anchor-unusable`, `submit-unresolved`. A dropped region had none, which made it
the one way to lose authored content in a Loom page that is **invisible from
both ends** — the reader sees a page that looks finished, and the author sees no
error.

Two things had to be settled to report it, and only one of them is mechanical.

## Decision

**A region a tree fills on a primitive that places no region of that name is a
render diagnostic, `slot-unplaced`, and a primitive's declared `slots` is the
complete list of what it places.**

- **The code carries the node, the type and the name**, which is `data-unread`'s
  shape exactly, and for its reason: the declaration holds the correct names, so
  the repair is one string and a repairer should be told which one.
- **One diagnostic per name, name-sorted.** Two slot children sharing a name are
  both placed (0051), so they are lost together by one mistake; a list that said
  it twice would make the count a function of how many times the tree spelled it.
- **Read off the node's own slot children**, not off the regions the walk has
  just built. The two lists are the same by construction, and the children are
  available before the subtree is walked — so the node's fault is collected
  ahead of its descendants', which is the order every other report in this walk
  arrives in.
- **Not reported where the subtree is already gone.** An unknown primitive and
  props its own schema refuses both omit the node and say why; a second sentence
  about a region inside a hole is two sentences about one hole.
- **Nested slots are not reported.** Only direct slot children are routed, so a
  slot inside another slot's fallback renders where it sits and is nobody's
  region to place.
- **A declared `slots: []` — or no `slots` at all — is a primitive saying it
  places none**, and the region a tree fills on it is reported. This is the
  second half of the decision and the one that is a judgement rather than
  plumbing. `slots` is the declaration where leaving it out and declaring it
  empty are the **same** claim: `definePrimitive` has normalised `slots ?? []`
  since §4, the catalogue publishes the list as what a model may compose into
  (0013), and the conformance probe reads it as complete. `copy` and `reads` are
  the two declarations where absence and emptiness differ (0181), and they
  differ because they were added to a library that had already been written
  without them. `slots` was never in that position.
- **The seam is `SlotPlacer`, detected structurally**, the way `BindingReader`
  and `FrameResolver` are: an SDK registry satisfies it, and a host resolving
  from a plain map has registered nothing that could declare a region. So
  `undefined` means *this resolver cannot say* — a plain map, or a type no
  registry holds — and nothing is reported for it. There is nothing here for a
  host to wire and nothing that can go missing.

## Consequences

- The loss 0051 accepted is now visible from the authoring end. It is the
  cheapest diagnostic in the union to act on: the registry already holds the
  names the tree should have written.
- **`slot-unplaced` is a new member of a published union.** A consumer that
  switches exhaustively over `RenderDiagnostic` gains a case. That is the same
  cost every diagnostic since 0009 has had, and §6 is the consumer it is shaped
  for.
- A deployment that resolves primitives from a plain map gets no new
  diagnostics, which keeps `staticPrimitiveResolver` exactly as honest as it
  was: it has never been able to say what a primitive places.
- **The write path does not refuse it yet, and this record does not decide that
  it should.** `data-unread` has a write-path twin — `unreadBindingsIn`, handed
  to `analyzeDelta` as a vocabulary, so what the renderer reports is by
  construction what the write path declines to write. The same twin for regions
  is the natural next step and is blocked on something unrelated:
  `analyzeDelta` carries four optional trailing vocabularies and its own comment
  says that is as far as the shape goes, and collecting them into a record edits
  two published lesson transcripts. Filed rather than built, so the render
  diagnostic lands without a cross-lane change riding on it.
- A primitive that reads `loom.slots.aside` without declaring `aside` now has
  every such region on every node reported against it. That is a primitive
  breaking 0051's promise, the registry is the only thing that could ever have
  known, and the report names the type — which is the right address for it.
  Nothing in the starter library does this: the full suite was green on the
  change with no test edited.

## Alternatives considered

**Treat an empty `slots` as *nobody has said* and stay silent.** The
conservative reading, and the one `reads` and `copy` take. Rejected because it
would make the diagnostic fire for almost nothing: the primitives that lose
content this way are exactly the ones that declare no regions, so a rule that
excused them would report only the typo'd region on a primitive that already
places two. It would also contradict what the declaration has meant since §4
— the catalogue, the probe and 0051 all read the list as complete — and the
place to change that is `definition.ts`, in a record of its own, not here.

**Report it from the primitive.** A primitive cannot see its own dropped
regions: it is handed a map and reads the keys it knows, and a key it does not
know is indistinguishable from a key nobody sent. This is the filing's own
argument for why it could not be fixed in `src/primitives/`.

**Render the unplaced region's content into `children` instead of dropping
it.** Content would stop disappearing, which is tempting and is the one option
here that changes what a reader sees. Rejected as 0051 rejected it for the
reverse case: a primitive that placed a region *and* rendered `children` emits
the content twice under one `data-loom-node` id, and a seam that decided for the
primitive where its content goes takes back the thing a region is for. The page
is a projection of the tree, and the tree said *put this in `body`*; the honest
answer to a primitive with no `body` is to say so, not to invent a location.

**Refuse the node, the way `invalid-props` does.** A region nothing places is
not a reason to delete the dialog. The node's props are its own and are valid,
the primitive draws correctly, and blanking a working component over content it
was never handed is a bigger hole than the one being reported.

**A fifth vocabulary on `analyzeDelta`, so the write path refuses it too.**
Wanted, and deferred — the parameter shape is at its stated limit and the run
that collects it is the run that can also rewrite the two lesson transcripts
that call it by hand. The consequence section says so; the finding is in
`FINDINGS.md`.
