# 0015 — The registry is generated from the directory, and a module's name is its type

**Status:** Accepted
**Date:** 2026-07-30
**Section:** §4 — Framework SDK (CLI)

## Context

`createPrimitiveRegistry` takes an array of definitions, so something has to
assemble that array. Three ways a host could do it, and the CLI has to pick one
because `loom add primitive` either maintains that list or leaves the author to:

1. A hand-maintained module the author edits on every addition.
2. A runtime glob over a directory.
3. A generated module the CLI rewrites from the directory's contents.

The choice is not purely internal. Whichever it is becomes the shape of every
Loom project, and changing it later means asking hosts to move files.

## Decision

**The registry module is generated, and `loom add primitive` regenerates it from
the directory's contents.** It says so at the top of the file, and the author's
edits go in the definitions beside it.

**A primitive's module is named after its type, verbatim** —
`commerce.product-card.ts`, dots included. That is what makes regeneration
possible: the type is recovered from the filename exactly.

**Two type names are reserved**, `registry` and `registry.test`, because both are
valid primitive types and a primitive named either one would be written over the
file that registers it. The CLI refuses them at parse time.

## Consequences

- Adding a primitive is one command and no edit to a shared file, so two people
  adding primitives on separate branches do not conflict in a registration list.
  They can still collide on the generated file, but that conflict resolves by
  regenerating rather than by merging by hand.
- The registry stays an explicit list of imports, so a bundler can see it, tree
  shaking works, and there is no runtime directory read — which a glob would have
  required and which does not exist on an edge runtime.
- A host that hand-edits the generated file loses those edits on the next
  `add primitive`. The header says so; nothing enforces it.
- Filenames contain dots, which is unusual to look at and entirely legal. A slug
  (`commerce-product-card.ts`) would read better and cannot round-trip: nothing
  can tell whether it was `commerce.product-card` or `commerce-product.card`.
- The reserved list is a small, closed set today. It grows only if generated
  modules are added, and 0014's neighbour in `architecture.md` — hermes's
  `RESERVED_HANDLES` — is the cautionary example of a reserved list that is easy
  to forget to extend. A test asserts every reserved name is one the tree schema
  would otherwise accept, so an entry that does not need reserving is caught.

## Alternatives considered

**A hand-maintained registry the CLI does not touch.** Rejected: it makes
`add primitive` a scaffolder that leaves the job half-done, and the failure —
a primitive that exists but was never registered — surfaces as an
`unknown-primitive` diagnostic at render time, a long way from the omission.

**A runtime glob.** Rejected. It needs a filesystem at request time, which the
edge and RSC targets §3 was built for do not have, and it defeats static
analysis: a bundler cannot see which primitives are reachable, so nothing can be
tree-shaken and a typo becomes a runtime miss instead of a build error.

**A manifest file (`primitives.json`) listing types.** Rejected as a second
source of truth for something the directory already states. It also has to be
kept in sync by the same command that writes the modules, so it adds a file
without removing a failure mode.

**Slugged filenames with a manifest to recover the type.** Rejected: it is the
previous option with extra steps, taken only to avoid dots in filenames.
