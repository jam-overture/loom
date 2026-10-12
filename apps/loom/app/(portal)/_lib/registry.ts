import { createThemeRegistry, type ThemeRegistry } from "@jam-overture/loom"
import { createStarterPrimitiveRegistry } from "@jam-overture/loom/primitives"
import { describeRegistryError, type PrimitiveRegistry } from "@jam-overture/loom/sdk"

/**
 * What this deployment may draw, and what it draws it in.
 *
 * ## This used to be four primitives of its own, and they are gone
 *
 * Until 11 October the portal registered four primitives it had written itself
 * — `loom.page`, `loom.card`, `loom.heading`, `loom.prose` — each a few lines of
 * Tailwind. They were scaffolding from before the library existed, and they had
 * become the one thing standing between this portal and the pages this
 * deployment actually serves: the marketing surface builds its trees from
 * `createStarterPrimitiveRegistry()`, so a page of its parts arriving in this
 * store was a page of parts the portal could not draw
 * ([0259](../../../../../decisions/0259-a-surface-the-portal-governs-renders-from-the-store-and-a-page-built-at-render-time-is-not-one.md),
 * condition 2).
 *
 * **They shared three names with starter primitives and none of their schemas**,
 * which is why exchanging one registry for the other was a unit of work rather
 * than a line:
 *
 * | type | what the portal's took | what the library's takes |
 * | --- | --- | --- |
 * | `loom.page` | nothing | `width`, `fills` |
 * | `loom.card` | `variant: plain \| outlined` | `tone`, `padding`, `href`, `elevation` |
 * | `loom.heading` | `level?: 1 \| 2 \| 3` | `level` **required**, 1–6, plus `align`, `balance` |
 * | `loom.prose` | `tone: normal \| muted` | `size`, `align`, `tone: default \| muted`, `measured` |
 *
 * Both are `.strict()`, so every one of those differences is a refusal rather
 * than a silently ignored key. The maintainer's instruction on 11 October was to
 * *"replace them with the actual starter primitives and discard the old ones"*,
 * and discarding them is what makes the collision a migration with an end rather
 * than two vocabularies to keep in step for ever.
 *
 * ## The theme is new here, and the library is why
 *
 * The four wrote Tailwind classes, so nothing in this portal had ever needed a
 * `ThemeRegistry`. A library primitive does not: it reads colours, families and
 * sizes off the theme the tree names, and a render with no `themes` option
 * resolves none of them — the markup is right and every variable behind it is
 * undefined, which is a page that renders and looks broken rather than an error
 * anybody is told about.
 *
 * So the portal now supplies one, and it is the library's own: the same
 * `createThemeRegistry()` with no argument that `(marketing)` wires, which is
 * the starter palettes, font packs and style presets. **This deployment bounds
 * what a proposal may name** (0049) and it bounds it to the library, which is
 * the same answer this file now gives for primitives.
 */

const built = createStarterPrimitiveRegistry()

if (!built.ok) {
  throw new Error(`loom: the primitive registry was refused — ${describeRegistryError(built.error)}`)
}

export const portalRegistry: PrimitiveRegistry = built.value

/**
 * The palettes, font packs and style presets a tree in this store may name.
 *
 * Passed on every render this portal makes — the thumbnail, the excerpt, the
 * preview and the marked-up proposal — because a theme resolved on one of them
 * and not the others is the same page in two liveries on one screen.
 */
export const portalThemes: ThemeRegistry = createThemeRegistry()
