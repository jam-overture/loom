import {
  relativeLuminance,
  type Palette,
  type PaletteSlot,
  type ResolvedTheme,
} from "@loom/runtime"

import { DEMO_STARTING_THEME } from "./page-tree"
import { demoThemes } from "./registry"

/**
 * What the page on the stage is painted on, read off the page's own theme.
 *
 * **The demo's one structural claim is that the page is data**, and the rail
 * says so in as many words: *every colour and typeface on the page changes at
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
 * Neither was a wrong colour. Both were a **second copy of a decision that has
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
 * One of the page's own colours, for something that has to draw the page
 * without a cascade to read it through.
 *
 * `ImageResponse` resolves no custom properties, so the share card cannot say
 * `var(--loom-bg-canvas)` and has to be handed the value. Everything on a real
 * screen reads the variable and never calls this.
 */
export const pageColour = (slot: PaletteSlot): string => {
  const colour = demoPagePalette.slots[slot]
  if (colour === undefined) throw new Error(`loom: the demo's palette has no ${slot}`)

  return colour
}

/**
 * The ground and the ink a frame standing in for the page must paint.
 *
 * `bg-canvas` rather than `bg-surface` because that is what the root primitive
 * paints and therefore what is behind any band excerpted out of the page; a
 * band that paints a surface of its own paints it over this, exactly as it does
 * out on the stage.
 *
 * `color` is here as well as `backgroundColor` because a frame that set only
 * the ground would leave anything inheriting its colour reading the *rail's*
 * ink — Loom's voice, on the clinic's page. The page's primitives already read
 * `--loom-fg-default` for their own text, so this changes nothing they draw and
 * catches everything they do not.
 */
export type PageGround = {
  readonly backgroundColor: string
  readonly color: string
  /**
   * Absent when either end of the pair is a colour `channelsOf` cannot read, in
   * which case the stylesheet's own `color-scheme` stands rather than this file
   * guessing. Every registered palette declares both as hex and resolves.
   */
  readonly colorScheme?: "light" | "dark"
}

/**
 * Which way round the palette is, without a threshold.
 *
 * A luminance ceiling would be a number this file had to defend — and the one
 * the runtime has (`SCRIM_DARK_CEILING`) is about whether a wash darkens what
 * is under it, which is a different question. Comparing the palette's own ink
 * to its own canvas asks the only question `color-scheme` answers: is text on
 * this ground light-on-dark, or dark-on-light. Measured across all twenty-one
 * registered palettes the two groups are canvases at L > 0.9 and L < 0.02, so
 * nothing sits near the line.
 */
const schemeOf = (palette: Palette): "light" | "dark" | undefined => {
  const canvas = palette.slots["bg-canvas"]
  const ink = palette.slots["fg-default"]
  if (canvas === undefined || ink === undefined) return undefined

  const canvasLuminance = relativeLuminance(canvas)
  const inkLuminance = relativeLuminance(ink)
  if (canvasLuminance === undefined || inkLuminance === undefined) return undefined

  return inkLuminance > canvasLuminance ? "dark" : "light"
}

/**
 * Undefined when the tree names no theme, which is the case the renderer has no
 * fallback for either (`theme.ts`: there is no default theme, deliberately). An
 * unthemed excerpt then inherits the same nothing an unthemed stage does.
 */
export const pageGround = (theme: ResolvedTheme | undefined): PageGround | undefined => {
  if (theme === undefined) return undefined

  const backgroundColor = theme.palette.slots["bg-canvas"]
  const color = theme.palette.slots["fg-default"]
  if (backgroundColor === undefined || color === undefined) return undefined

  const colorScheme = schemeOf(theme.palette)

  return { backgroundColor, color, ...(colorScheme === undefined ? {} : { colorScheme }) }
}
