import { type Palette, type PaletteSlot, type ResolvedTheme } from "@jam-overture/loom"
import { themeGround, type ThemeGround } from "@jam-overture/loom/react"

import { DEMO_STARTING_THEME } from "./page-tree"
import { demoThemes } from "./registry"

/**
 * What the page on the stage is painted on, read off the page's own theme.
 *
 * **The demo's one structural claim is that the page is data**, and the rail
 * says so in as many words: *every color and typeface on the page changes at
 * once.* Two places in this lane drew the page anyway and held a copy of what
 * it looks like, and on 26 September `DEMO_STARTING_THEME` moved from
 * `editorial` to `midnight` and both copies became wrong in the same instant:
 *
 * - **The excerpt inside a question** (`part-in-question.tsx`) took its ground
 *   from `--surface-stage`, the demo chrome's white, and its ink from the
 *   page's theme. On a dark page that is `#f3f4f7` on `#ffffff` — **1.10:1**,
 *   which is not low contrast but no contrast. The one picture whose whole job
 *   is to show a stranger what they are about to lose had nothing legible in
 *   it, at the moment they were being asked to decide.
 * - **The share card** (`share-card.tsx`) named `editorialPalette` directly,
 *   with a comment saying it was doing so because that is what the tree names.
 *   It was, and then it was not. A link unfurled to a cream page with navy
 *   figures and landed on a navy page with cyan ones.
 *
 * Neither was a wrong color. Both were a **second copy of a decision that has
 * one home** — the three registered ids on the tree's root node (0049) — and
 * the copy is the defect whether or not it currently agrees. `chrome.ts` has
 * had exactly this discipline on the rail's half from the start: it holds a
 * subset of `globals.css` in a form `ImageResponse` can read, and
 * `chrome.test.ts` fails when the two disagree. This file is the same
 * discipline on the page's half, with the advantage that nothing has to be
 * transcribed at all — the palette is resolved from the id the tree carries.
 */

/**
 * The palette the demo's tree names on arrival, resolved through the same
 * registry the page render uses.
 *
 * At module scope and not in a function: a selection that does not resolve is a
 * deployment that cannot draw its own page, and the registry is the demo's own
 * (`registry.ts`), so this throws for the same reason and at the same moment
 * `demoRegistry` does.
 */
const startingTheme = ((): ResolvedTheme => {
  const resolved = demoThemes.resolve(DEMO_STARTING_THEME)
  if (!resolved.ok) {
    throw new Error(`loom: the demo's starting theme was refused — ${resolved.error.code}`)
  }

  return resolved.value
})()

export const demoPagePalette: Palette = startingTheme.palette

/**
 * One of the page's own colors, for something that has to draw the page
 * without a cascade to read it through.
 *
 * `ImageResponse` resolves no custom properties, so the share card cannot say
 * `var(--loom-bg-canvas)` and has to be handed the value. Everything on a real
 * screen reads the variable and never calls this.
 */
export const pageColor = (slot: PaletteSlot): string => {
  const color = demoPagePalette.slots[slot]
  if (color === undefined) throw new Error(`loom: the demo's palette has no ${slot}`)

  return color
}

/**
 * The ground and the ink a frame standing in for the page must paint.
 *
 * **`themeGround` is the runtime's now**, and this is the one line of demo left
 * around it. The derivation was written here on 26 September, filed the same day
 * because it is not demo-specific, and landed in `src/render/theme.ts` on the
 * 27th — so what survives here is the demo's own signature, which takes the
 * `ResolvedTheme | undefined` a render hands back rather than the `ResolvedTheme`
 * the runtime asks for.
 *
 * Undefined when the tree names no theme, which is the case the renderer has no
 * fallback for either (`theme.ts`: there is no default theme, deliberately). An
 * unthemed excerpt then inherits the same nothing an unthemed stage does.
 */
export type PageGround = ThemeGround

export const pageGround = (theme: ResolvedTheme | undefined): PageGround | undefined =>
  theme === undefined ? undefined : themeGround(theme)
