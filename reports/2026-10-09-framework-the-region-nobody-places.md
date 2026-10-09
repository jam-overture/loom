# The region nobody places

**Routine:** `Loom daily build` · **Date:** 2026-10-09 · **Section:** §3, the
render seam · **Branch:** `framework-60-the-region-nobody-places`

## What was completed

A tree can put content in a named region of a primitive that has no such
region. Until today the content was rendered, handed over under a name nothing
read, and dropped with its whole subtree — and `diagnostics` was empty. The page
looked finished and the author saw no error.

The render seam now reports it. `slot-unplaced` carries the node, the primitive
type and the region's name, which is `data-unread`'s shape and for the same
reason: the registry holds the name the tree should have written, so the repair
is one string and the diagnostic should say which one.

That is the whole of the change in behaviour. Nothing on any surface moves, no
page renders differently, and the markup before and after is byte-identical —
which is the point, and is what the transcript beside this report shows:

```
a resolver that cannot say what a primitive places — a plain map, and yesterday's answer for every host
  markup      <main><dialog><header>Book a call<button>×</button></header><div></div></dialog></main>
  diagnostics []

the same tree, resolved against a registry
  markup      <main><dialog><header>Book a call<button>×</button></header><div></div></dialog></main>
  diagnostics
              slot-unplaced
              node n_3 fills the region "body" and "loom.dialog" places no region of that name, so the content and everything under it was dropped
```

The two renders are of one tree — the exact tree `Loom primitives` filed on
7 October, a `loom.dialog` whose body is in a slot. The first is a host
resolving from a plain map, which has registered nothing that could declare a
region; it is also, exactly, what every host got yesterday. The paragraph is
gone from both. Only the second can say so.

The pieces:

- **`src/render/slots.ts`** — the seam and the comparison. `SlotPlacer` answers
  `slotsPlacedBy(type)`, detected structurally the way `BindingReader` is, so an
  SDK registry satisfies it and there is nothing for a host to wire.
  `unplacedSlots` is the pure comparison, deduplicating and sorting.
- **`src/render/diagnostics.ts`** — `slot-unplaced` in the published union, with
  its sentence.
- **`src/render/render.ts`** — the report, read off the node's own slot children
  before the subtree is walked.
- **`src/sdk/registry.ts`** — `slotsPlacedBy`, answering a registered
  primitive's declaration and `undefined` for a type it does not hold.

## Decisions that were not specified, and why

**A primitive that declares no regions says it places none, and the region a
tree fills on it is reported.** This is the judgement in the unit and 0247
records it. The conservative reading — treat an empty `slots` as *nobody has
said*, the way `reads` and `copy` are treated — would have excused almost every
case the finding is about: the primitives that lose content this way are exactly
the ones that declare nothing. It would also contradict what the declaration has
meant since §4. `definePrimitive` has normalised `slots ?? []` from the start,
the catalogue publishes the list as what a model may compose into, and the
conformance probe reads it as complete. `copy` and `reads` distinguish absence
from emptiness because they were added to a library already written without
them; `slots` was never in that position. The place to change that is
`definition.ts`, in a record of its own.

**Read the names off the node's children, not off the regions the walk builds.**
The two lists are identical by construction. The children are available before
the subtree is walked, so the node's own fault is collected ahead of its
descendants' — the order every other report in this walk arrives in. A test pins
it, because a planted defect that moved the call three lines later was otherwise
green.

**Silent where the subtree is already gone.** An unknown primitive and props its
own schema refuses both omit the node and say why. A second sentence about a
region inside a hole is two sentences about one hole.

**The write-path twin was deliberately not built.** `data-unread` has one —
`unreadBindingsIn`, handed to `analyzeDelta` as a vocabulary, so what the
renderer reports is by construction what the write path refuses. The same twin
for regions needs nothing new, about forty lines, and a fifth optional trailing
parameter on `analyzeDelta` — whose own comment says four is as far as that
shape goes, and that collecting them edits two published lesson transcripts.
That is a second unit crossing a lane, so it is filed rather than smuggled in.
Said plainly: **the render half shipped and the write half did not.**

**The diagnostic is named `slot-unplaced`, which the conformance probe already
uses for the opposite fault**, and the collision is deliberate rather than
missed. The probe's *unplaced* is a region the primitive declared and no probed
configuration drew — addressed to whoever wrote the component. This one is a
region the tree filled that the component never declared — addressed to whoever
wrote the tree. They are two directions of one relationship and *unplaced* is
the true word for both; the alternative was a worse word for one of them. Both
doc comments say which is which and name the other.

## Records

**0247 — A region the primitive does not place is a diagnostic, and the
declaration is the promise.** Accepted. §3. It records the empty-declaration
judgement above, the four alternatives rejected (stay silent; report from the
primitive; render the content into `children` instead of dropping it; refuse the
node), and the deferred write-path half. Nothing superseded.

**It took 0247 and not 0244.** `main` ends at 0243, and 0244, 0245 and 0246 are
each claimed by an open branch — 0244 by two of them. The number was chosen by
listing the record numbers on every open branch and taking the first one free.
Filed as a finding, below.

## Findings

**Closed one.** `Loom primitives`' 7 October entry — *a slot handed to a
primitive that declares none is dropped with its whole subtree, and nothing
anywhere says so*. The dated note on it says what the seam reports, what was
decided rather than assumed, and the one half that is deferred. Their
`named-controls.test.ts` was written to characterise the loss without asserting
the silence was correct, and it is still green with nothing edited — the test did
exactly what it was built to do.

**Filed three.**

1. *A region nobody places is now reported at render and still written without
   complaint* — mine, blocked on `analyzeDelta`'s parameter list, with the
   blocking half for `Loom lessons`. It is the second consumer of the
   30 September entry about that signature; the collection now unblocks two
   things rather than one.
2. *Record 0244 is claimed by two open pull requests again, three days after
   the last one* — for `Loom merge`. #555 and #556 both hold it, and one of the
   two is this lane's own branch from yesterday. The entry carries the loop that
   finds a free number.
3. *A primitive may read a region it never declared, and the probe that checks
   the other direction cannot see it* — for `Loom primitives`. Zero instances
   across the 107 entries in `STARTER_PRIMITIVES`, counted today; the cost if
   one appeared is that the new diagnostic names the right component and gives
   the wrong reason.

## Cross-lane edit

**`apps/loom/app/(docs)/_lib/api/reference.generated.json`**, regenerated with
`pnpm --filter @loom/app docs:api`. It is `Loom docs`' file and it is generated
from this lane's doc comments, so two of their tests went red on the new exports
— *the generated reference is what the generator produces right now* and *every
published door hands back exactly what its page says it does*. Regenerated with
the repo's own tooling and nothing else in that directory touched.

## Test numbers

`pnpm verify` green on the final tree. Real counts from the run:

| Gate | Result |
| --- | --- |
| `pnpm build` | passed |
| `pnpm typecheck` | passed |
| `pnpm test` (package) | **196 files, 4352 tests passed, 0 failed** |
| `pnpm findings:check` | 1077 findings, 0 malformed |
| `@loom/app verify` | **412 files, 7385 tests passed, 0 failed** |
| `pnpm prerender:check` | 128 prerendered pages, 1588 text junctions, 0 run together |

**+18 tests**, all in `src/render/slots.test.ts`; the package suite went from 195
files and 4334 tests to 196 and 4352. Nothing was skipped and no existing test
was weakened or edited to accommodate the change.

**One test failed on the way and it was mine.** `src/documentation.test.ts`
caught two doc comments that made a record number part of a published sentence —
the maintainer's rule that a casual reader does not know what "(0051)" is. Both
were rewritten so the number sits in a parenthetical the site can lift. That is
the instrument working, not a defect shipped.

**Ten planted defects, ten red.** Each was planted alone and the two render
suites run against it:

| Defect | Result |
| --- | --- |
| report nothing at all | red |
| never detect the seam on the resolver | red |
| report after the body is built, not before | red |
| drop the deduplication | red |
| drop the sort | red |
| read `undefined` as "places none" | red |
| registry rounds an unregistered type to `[]` | red |
| hoist nested slots into the report | red |
| report before the props verdict | red |
| let the decorative copy report too | red |

Two of those were green on the first pass and both were real gaps in the tests
rather than in the code: the ordering claim was in a doc comment with nothing
pinning it, and the decorative-copy test inspected the element instead of
mounting it, so the lazy copy was never made. Both tests were fixed and the
whole matrix re-run. The restores were done from a saved copy rather than with
`git checkout`, which is the trap the 16 September entry describes.

## Open questions

**Should the write path refuse a region nobody places?** My view is yes, and
that it should arrive with the parameter collection rather than before it. Every
other diagnostic of this shape has both halves, and the asymmetry is the kind
that gets explained once and then forgotten.

**Should `definition.ts` distinguish an absent `slots` from an empty one?** I
think not, and 0247 says why — but it is a question about the declaration rather
than about this seam, and if the answer ever becomes yes, this diagnostic is one
of the two things that would have to change with it.

**Is `slot-unplaced` the name to live with, given the probe uses *unplaced* for
the opposite fault?** I kept it and documented both directions. The alternative
was `slot-undeclared`, which collides differently — `props-undeclared` already
means *the registry has no declaration*, which is a composition-root fault and
not a tree's.
