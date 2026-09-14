# 0155. The catalogue's public surface is the list and the lookup, not every band by name

**Status:** Accepted
**Date:** 2026-09-14
**Section:** §4b

> **Why this number.** `0151`–`0154` are left free deliberately, which
> [0097](0097-a-hole-in-the-numbering-is-reported-and-a-clash-is-fatal.md)
> permits: several lanes have branches open that can each claim the next free
> number without seeing the others, a clash is fatal to every lane's
> `pnpm verify`, and a hole costs one line in the index.
>
> **Why `Accepted`.** It narrows one package's published exports and changes no
> schema, no tree, no delta, and no behaviour any page can observe. It refines
> no `Accepted` record.

## Context

`docs/primitive-gap-inventory.md` put the route to the maintainer's 250 in
starting compositions rather than in primitives, and the catalogue grew from
nine bands to seventeen on 13 September. The eighteenth would not build.

`app/(docs)/_lib/search/build.test.ts` caps the docs search index at 200,000
characters, and the catalogue had walked it to the edge:

| | entries, raw | headroom |
| --- | --- | --- |
| before the new bands | 199,114 | 886 |
| seventeen bands | 199,778 | **222** |
| nineteen bands | 200,118 | **−118, red** |

**A band cost about 163 characters of index**, and the repository had room for
one more in any lane. That test's own comment forbids raising the number and
names the remedy — *split the index* — which is `Loom docs`' architecture. So it
was filed, two finished bands were held back, and the week's plan stopped.

Then the measurement was taken one layer down, and the cost turned out not to be
the bands at all.

**Primitives are not individually exported.** `src/primitives/index.ts` names
ninety-three primitives in `STARTER_PRIMITIVES` and exports **none** of them by
name; a consumer reaches one through the registry. **Compositions were**, and
`export * from "./compositions/index.js"` carried all nineteen names out to the
package root. Removing them from the *package's* surface:

| | exports | entries, raw | headroom |
| --- | --- | --- | --- |
| nineteen bands, each exported | 996 | 200,118 | −118 |
| nineteen bands, none exported | 977 | **197,010** | **2,990** |

Nineteen names cost **2,768 characters** of index. The bands themselves cost
nothing: seventeen bands and nineteen bands now measure *identically*, because
what the index counts is published names and `STARTER_COMPOSITIONS` is one name
however many members it has.

## Decision

**The catalogue's public API is `STARTER_COMPOSITIONS`, `compositionById`, the
`Composition` types and the planning functions. Individual bands are not
exported from the package.**

`src/primitives/index.ts` re-exports that list explicitly instead of
`export *`. Three things are part of the decision.

**It is the shape primitives already had, and the asymmetry was an accident
rather than a design.** Ninety-three primitives are reachable by id through a
registry; nineteen bands were reachable by id through `compositionById` *and*
by nineteen names nobody used. `compositionById`'s own doc comment says why the
lookup is the real route: *"the id a surface holds arrives from a URL or a click
and is a `string` by the time it gets here."* An import name cannot serve that
caller.

**The names survive inside the package.** `compositions/index.ts` still exports
each band, so `src/`'s own modules and `lessons/24-silence.md` — which imports
`metricsBand` from the module path to demonstrate building a subtree — are
untouched. What changed is only which names cross the package boundary, which is
the only thing the index counts.

**A catalogue that grows for free is the point, not a side effect.** The reason
this is worth a record rather than a commit message is that it converts the
catalogue's growth from linear in the index to flat. The next fifty bands cost
what the last two did: nothing.

## Consequences

- **The blocker filed for `Loom docs` on 13 September is no longer blocking**,
  and the two held bands (`changelog`, `credentials`) shipped. The finding stays
  open, downgraded, because the observation under it is still true: the raw cap
  had 0.4% headroom this morning and the growth that filled it was not the
  growth anybody was watching.
- **The gzip cap was never close** — 17,773 against 20,000, and it moved by 173
  characters across the whole change. The binding cap was the raw one, and near
  identical export entries are exactly what compresses. Whether the raw cap is
  measuring the right thing for this kind of growth is `Loom docs`' call and is
  left with them.
- **Removing a public export is a breaking change**, and this is the moment to
  take it: nothing in the repository imported a band from the package root, and
  the library is pre-1.0. After a release it would want a deprecation rather than
  a deletion.
- **`export *` is how this happened.** It re-exported every name a module
  happened to have, so the published surface grew whenever the catalogue did,
  without anybody choosing it. The explicit list is what makes the next addition
  a decision rather than a consequence.
- **A host wanting one band composes it from the lookup**, not an import:
  `compositionById("hero")`. A host wanting a subset filters
  `STARTER_COMPOSITIONS` — the same affordance gap filed for primitives on
  13 September, now with a second consumer, which strengthens that finding
  rather than resolving it.

## Alternatives considered

**Split the docs search index.** The remedy that test names, and the right one
for the general problem. Rejected *here* because it is `Loom docs`' architecture
and because it would have been spent on a cost this lane was creating
unnecessarily — the index would have been split to make room for nineteen names
nobody imports.

**Raise the cap.** Forbidden by the test's own comment, and it would have hidden
the fact that the published surface was growing by nineteen names for no reader.

**Ship fewer bands.** What 13 September actually did, and it is what a budget is
for — but it was the wrong trade once the cost turned out to be removable.

**Export the bands and not `STARTER_COMPOSITIONS`.** Inverts the same total and
loses the list, which is the one thing a surface offering a menu actually needs.
