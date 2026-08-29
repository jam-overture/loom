# 0096. The `loom.` namespace is the framework's, and the CLI will not write in it

**Status:** Accepted
**Date:** 2026-08-29
**Section:** §4 (CLI), §4c

## Context

`Loom docs` filed it on 29 August, from the position a stranger is actually in:

> `loom init` writes one starter primitive and its type is **`loom.page`**.
> `@loom/runtime/primitives` also registers a `loom.page` — it is the primitive
> that mounts a theme, and every example on the documentation site is rooted at
> it. They are two different components with one name.

The registry is right about this and always was.
[0015](0015-the-registry-is-generated-and-a-filename-is-a-type.md) makes a
module's name its type, and `createPrimitiveRegistry` refuses two definitions
that claim one type rather than letting either win. Nothing here is a bug in the
runtime.

What was wrong is the **order a reader meets the two in**, which is the
documentation site's own reading order:

1. *Installation* — install the package.
2. *Scaffolding a project* — run `loom init`; you now own a `loom.page`.
3. *Rendering a tree* — build a registry with `createStarterPrimitiveRegistry()`.

Follow those three pages, combine what each one hands you, and the registry is
refused — with a `duplicate-primitive-type` naming a type the reader never
chose. §4c's exit condition is that a stranger can install Loom, register a
primitive and get a proposal accepted working only from the site. This sat on
that exact path, at first contact.

The scaffold's own name was the collision, so every host was the host it
happened to.

## Decision

**`loom` and everything under it belongs to the framework.** The CLI refuses to
write a primitive whose type is in that namespace, and scaffolds `app.page`
instead of `loom.page`.

Three parts, and the middle one is the whole of it:

- **The refusal is a namespace, not a list.** `loom.anything` is refused whether
  or not the starter library answers to it today. A list of taken names would
  have to be maintained against a library that has grown every week this month,
  and the run that registered the seventy-sixth primitive would retroactively
  break a scaffold written before it existed. A namespace cannot go stale.
- **It is refused where a malformed type is refused** — in argument parsing,
  before a directory is read. Whether a name belongs to the framework is a
  property of the string and of nothing else.
- **The refusal offers a replacement.** `loom.card` is answered with
  `app.card` — the name that was typed, re-namespaced. Telling somebody a
  namespace is taken and leaving them to invent a substitute is a worse answer
  than handing them one.

`app.` is what the CLI writes instead, and the choice is not arbitrary: it reads
as *yours*, which is the lesson the scaffolded file exists to teach. The
primitive in it is a component the host owns and edits, not a piece of the
framework that happens to live in their repository.

The rule binds the CLI, not the registry. `createPrimitiveRegistry` cannot
enforce it — the starter primitives are themselves `loom.*`, so a registry has
no way to tell a framework definition from a host's. The CLI can, because
everything the CLI writes is a host's by construction. That asymmetry is why
this lands in one place rather than in the seam it protects.

## Consequences

- **A host can no longer name a primitive `loom.card`.** There was never a
  working reason to: the registry would have refused it the moment the starter
  library was in scope, and the failure landed later and read worse.
- **The scaffold's module is `app.page.ts` and its export is `appPage`.** The
  committed fixture in `src/cli/scaffold-fixture/` moved with it, and
  `scaffold-fixture.test.ts` — which compiles and runs that fixture on every
  `pnpm verify` — is what keeps them together.
- **The two halves of the promise are checked against each other.**
  `starter-collision.test.ts` asserts that every type
  `createStarterPrimitiveRegistry()` registers is one the CLI refuses. The rule
  is a namespace and the library is a list, so they can drift in exactly one
  direction: a starter primitive registered *outside* `loom.` would be a name
  the CLI writes and a registry then rejects. That test is the only thing in the
  repository that would notice, and it fails in the lane that caused it.
- **A registry built from the scaffold *and* the starter library is asserted to
  build** — the three documentation pages above, combined, as a test.
- **Anything already named `loom.*` by a host keeps working.** This constrains
  what the CLI writes; it does not reach into a registry a deployment already
  has. There is nothing to migrate.
- The documentation site's new *Scaffolding a project* page carries a callout
  describing the collision. It is now describing something that was fixed, and
  is `Loom docs`' to delete — filed back to that lane.

## Alternatives considered

**Rename the scaffolded type and stop there**, which is what the finding asked
for and costs one string. Rejected as insufficient rather than wrong: it fixes
`loom.page` and leaves `loom add primitive loom.card` scaffolding a file that is
dead on arrival, and the CLI's own usage text was at that moment offering
`loom.card` as the example of a well-formed type. The class is one line wider
than the instance and closing it costs a predicate.

**Leave the type and have the scaffold's comment say it shadows a starter
primitive**, the finding's second shape. Rejected: it keeps a broken default and
asks every reader to notice a comment in order to avoid it. A scaffold that has
to be repaired before it composes teaches the wrong thing about the contract at
the one moment somebody is paying attention to it.

**Refuse the collision in `createPrimitiveRegistry` instead.** Not possible, per
the asymmetry above — the starter library's own primitives are `loom.*`, so the
registry cannot distinguish the framework's definitions from a host's without
being told, and telling it is a second contract for no gain.

**Reserve `loom.` for the type grammar itself**, in `primitiveTypeSchema`.
Rejected as too wide: that grammar also names data sources and submission
endpoints, and a deployment naming a data source `loom.orders` collides with
nothing. The reservation is about a registry the framework populates, not about
every name a tree can hold.

**A different host namespace than `app.`** — `my.`, `site.`, the directory's
own name. `app.` was taken because it is the shortest word that reads as the
thing being built rather than as the person building it, and because a scaffold
is read far more often than it is chosen. Nothing depends on the choice: it is
one constant in `src/cli/namespace.ts`.
