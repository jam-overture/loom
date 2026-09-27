# @jam-overture/loom-primitives

The starter primitive library for [Loom](https://github.com/jam-overture/loom) —
**98 registered primitives** and **44 starting compositions**, themed entirely
from the palette, rendered on the server, with no stylesheet to import and no
build step of its own.

```bash
npm install @jam-overture/loom-primitives @jam-overture/loom
```

`@jam-overture/loom` is a peer dependency. There must be exactly one copy of it in
your tree; two would mean two registries that reject each other's entries.

## What this is

Loom adapts a page by proposing **deltas against a tree** — insert, remove,
move, configure — rather than by generating code. That only works if the
vocabulary a proposal can reach for is wide enough to say what somebody meant.
This is that vocabulary.

```ts
import { createStarterPrimitiveRegistry } from "@jam-overture/loom-primitives"
import { renderLoomTree } from "@jam-overture/loom/react"
import { createThemeRegistry } from "@jam-overture/loom"

const registry = createStarterPrimitiveRegistry()
if (!registry.ok) throw new Error("registry refused")

const { element } = renderLoomTree(tree, {
  resolver: registry.value,
  validator: registry.value,
  themes: createThemeRegistry(),
})
```

Register a slice rather than all of it when you only want part — the library is
a set to choose from, and a smaller registry is a smaller prompt on every
request:

```ts
import { STARTER_PRIMITIVES } from "@jam-overture/loom-primitives"
import { selectPrimitives } from "@jam-overture/loom/sdk"

const chosen = selectPrimitives(STARTER_PRIMITIVES, ["loom.hero", "loom.feature-grid", "loom.feature"])
```

## Starting compositions

A primitive is a word; a composition is a sentence. `@jam-overture/loom-primitives/compositions`
holds 44 **band designs** — a hero, a pricing table, a bento grid, a works-with
orbit, a footer — each a pure function from an id factory to a subtree:

```ts
import { STARTER_COMPOSITIONS, PAGE_SEQUENCE, compositionsForPart } from "@jam-overture/loom-primitives/compositions"

const hero = STARTER_COMPOSITIONS.find((band) => band.id === "hero")
const subtree = hero.build(ids)          // one `insert` drops the whole thing in
const heroes = compositionsForPart("hero") // every design of that part
```

`PAGE_SEQUENCE` is the ordered subset that assembles **one complete landing
page** — 22 parts, nothing missing and nothing repeated. It is what a surface
offering to *start a page* should offer.

A composition carries a whole subtree in a single reviewable operation, and
what it drops in is ordinary structure: rearrange it afterwards with the same
four operations as anything else.

## What is in it

| | |
| --- | --- |
| **Structure** | `page`, `section`, `split`, `stack`, `grid`, `mosaic`, `card`, `frame`, `hero`, `backdrop`, `halo` |
| **Leaves** | `heading`, `prose`, `badge`, `icon`, `avatar`, `kbd`, `code-span`, `link`, `action`, `divider`, `logo`, `pin` |
| **Bands** | pricing tiers, comparison tables, testimonials, timelines, FAQs, feeds, galleries, nav, footer, orbit, marquee |
| **Data-shaped** | `tally`, `meter`, `stat`, `stat-chart`, `table`, `feed`, `waiting-state` — bindable through the runtime's data seam |
| **Forms** | `form`, `field`, `option`, `button` — posting to endpoints the host registers |

Every one of them:

- **draws from the palette and never from a literal.** Re-theming a page is one
  `configure` on the root; no primitive learns which palette is mounted.
- **renders as a server component** unless it genuinely cannot, and emits its
  own motion as a static stylesheet rather than as inline animation.
- **holds still while a page is being edited**, where holding still is what
  makes a thing editable.
- **degrades honestly.** A portrait with no photograph draws initials; a frame
  with no picture reserves no space for one; a figure that did not arrive is
  quiet rather than loud.

## Versioning

Pre-1.0. `@jam-overture/loom-primitives` and `@jam-overture/loom` are released as a pair and their
versions move together — the peer range is `~`, deliberately narrow, because the
library is compiled against a specific runtime's types and a host that upgrades
one without the other is the case neither is tested in.

**Before 1.0, a minor release may break.** What will break, when it does, is a
prop or a region on a primitive; the four operations and the shape of a tree are
the runtime's promise, not this package's.

## License

See `LICENSE`.
