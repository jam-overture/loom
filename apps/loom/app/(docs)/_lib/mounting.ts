import {
  contrastRatio,
  createTree,
  sequentialIdFactory,
  STARTER_PALETTES,
  TEXT_CONTRAST_MINIMUM,
  type JsonObject,
  type LoomTree,
  type Palette,
  type ResolvedTheme,
} from "@jam-overture/loom"
import { compositionById } from "@jam-overture/loom/primitives"
import {
  resolveTheme,
  themeGround,
  themeStyle,
  THEME_PROP_KEY,
  type ThemeGround,
} from "@jam-overture/loom/react"
import type { CSSProperties } from "react"

import { docsThemes } from "./loom/registry"

/**
 * What a host actually does with a resolved theme, worked out rather than
 * described.
 *
 * **The plain version.** A Loom page paints itself: the root primitive takes the
 * three registered ids off the tree and mounts them, so an application drawing
 * whole pages calls nothing. An application drawing *part* of a tree — one band,
 * inside its own layout — has no root primitive above the excerpt, so the two
 * jobs that primitive was doing fall to the frame the host draws. `themeStyle`
 * is the first and `themeGround` is the second.
 *
 * The page that teaches theming had never named either function. This module is
 * the half of the fix that can be checked: every figure the section states is
 * computed here, from the registry the site's own examples use, and
 * `mounting.test.ts` recomputes each one a second way.
 *
 * **The demonstration is a reproduction, not a diagram.** 0197 records a frame
 * that carried a ground as a constant while the tree's palette moved under it,
 * and the result was body copy at **1.10:1** on a screen whose whole job was to
 * be read. The two frames below are that, staged out of two registered palettes
 * so the number comes back the same on every build and under either theme the
 * reader has chosen: the host's chrome holds the house palette's canvas, the
 * excerpt wears a dark one, and `contrastRatio` is asked what that costs.
 */

/**
 * A palette by id, or a loud failure.
 *
 * The starter set is what `createThemeRegistry()` registers, so a palette
 * missing here is a palette the examples on this page could not have named
 * either — a broken build is the honest outcome, not a section that quietly
 * renders half its argument.
 */
const paletteNamed = (id: string): Palette => {
  const palette = STARTER_PALETTES.find((candidate) => candidate.id === id)

  if (palette === undefined) {
    throw new Error(`loom: the theming page's mounting section names "${id}", which is not a registered palette`)
  }

  return palette
}

/**
 * The theme the excerpt wears: a dark one, deliberately.
 *
 * Everything on this site is built from `minimal`, which is light. A dark
 * palette is what makes the frame's job visible at all — under two light
 * palettes a frame that paints the wrong ground looks very nearly right, which
 * is how the original defect survived three weeks.
 */
export const MOUNTED_SELECTION: JsonObject = {
  palette: "midnight",
  fontPack: "grotesque",
  stylePreset: "technical",
}

/**
 * Resolved through the public path a host uses, not by reaching into the
 * library.
 *
 * `resolveTheme` is the function `render.ts` itself calls, given the same
 * reserved-prop bag a root node carries. Going through it means the section
 * cannot demonstrate a mounting the runtime would not have performed.
 */
const resolution = resolveTheme({ [THEME_PROP_KEY]: MOUNTED_SELECTION }, docsThemes)

if (resolution.outcome !== "themed") {
  throw new Error(`loom: the theming page's mounted theme did not resolve — ${resolution.outcome}`)
}

export const mountedTheme: ResolvedTheme = resolution.theme

/** Every `--loom-*` property a primitive under the frame may read. */
export const mountedStyle: CSSProperties = themeStyle(mountedTheme)

/** How many of them there are. The page never says the number; this does. */
export const mountedVariableCount: number = Object.keys(mountedStyle).length

/**
 * The three declarations a frame standing in for the page applies.
 *
 * `undefined` is a real return — a palette whose body-copy pair cannot be read
 * gets no ground rather than a guessed one — and it cannot happen for a
 * registered palette, so the section refuses to render rather than printing
 * three blanks and claiming they are the answer.
 */
const ground = themeGround(mountedTheme)

if (ground === undefined) {
  throw new Error("loom: the theming page's mounted theme has no ground, so the frame section cannot be built")
}

export const mountedGround: ThemeGround = ground

/**
 * What the host's own chrome is painted, held as the constant a stylesheet
 * would hold it as.
 *
 * It is this site's house palette, which is the honest choice: the frame in the
 * demonstration is the documentation site's frame, and the documentation site is
 * built from `minimal`. Taking it from the registry rather than typing the hex
 * keeps this lane's rule — nothing here names a color — while still being a
 * constant in the sense that matters, which is that it was decided somewhere the
 * tree's palette cannot reach.
 */
export const HOUSE_PALETTE_ID = "minimal"

const houseCanvas = paletteNamed(HOUSE_PALETTE_ID).slots["bg-canvas"]

if (houseCanvas === undefined) {
  throw new Error(`loom: the "${HOUSE_PALETTE_ID}" palette declares no bg-canvas, so the frame section has no ground`)
}

/** The ground the frame paints when nobody told it the palette had moved. */
export const houseGround: string = houseCanvas

/**
 * What the excerpt's body copy is set in — the tree's ink, in both frames.
 *
 * This is the point of the whole section: `themeStyle` is applied to *both*
 * frames, so the ink is the tree's either way. Only the paper differs.
 */
const excerptInk = mountedGround.color

export const CONTRAST_BAR = TEXT_CONTRAST_MINIMUM

/**
 * The ratio, measured with the same function the palette audit further up this
 * page runs.
 *
 * Both ends are hex out of registered palettes, which `contrastRatio` reads, so
 * `undefined` here would mean a palette had changed shape underneath the page —
 * worth throwing over rather than rendering an em dash.
 */
const ratioOf = (ink: string, paper: string): number => {
  const ratio = contrastRatio(ink, paper)

  if (ratio === undefined) {
    throw new Error(`loom: the theming page could not measure ${ink} on ${paper}`)
  }

  return ratio
}

/** What the excerpt reads at when the frame kept the host's ground. */
export const ratioOnHouseGround: number = ratioOf(excerptInk, houseGround)

/** What it reads at when the frame took its ground from the theme. */
export const ratioOnThemeGround: number = ratioOf(excerptInk, mountedGround.backgroundColor)

/** One decimal place, which is how the audit above prints a ratio. */
export const CONTRAST_PLACES = 1

export const printRatio = (ratio: number): string => `${ratio.toFixed(CONTRAST_PLACES)}:1`

/**
 * The excerpt: one band out of the starter library, and no page around it.
 *
 * A composition rather than a tree written here, for the reason the bands page
 * gives — a hand-built stand-in of the same shape would pass every check and
 * stop being evidence. `steps` is the one chosen on two counts, and the second
 * was measured rather than assumed.
 *
 * It declares no `tone`, so it paints no surface of its own and sits directly on
 * whatever ground the frame provides — a band that painted its own surface would
 * hide the very thing the section is about.
 *
 * And **its headline is set in the ink the ratio is measured against.** The logo
 * wall was tried first and is the better-looking band: it is short, it fits two
 * abreast, and it sets every word it has in `fg-muted`. So the picture showed
 * six names a reader could read perfectly well, over a caption saying the text
 * failed at 1.1:1 — a true number about an ink that was not on the screen. A
 * demonstration whose measurement is of something other than what it is showing
 * is worse than no demonstration, because it is the one a reader believes.
 *
 * `createTree` at the band, deliberately: this is a subtree standing on its own,
 * which is the case 0121 covers and the case `themeGround` exists for.
 */
export const EXCERPT_PART = "steps"

/**
 * The namespace the excerpt's ids are minted under.
 *
 * Exported so the test can build the same band a second time and compare node
 * for node. A factory is deterministic, so two builds under one namespace are
 * byte-identical — which is what makes *is this the library's band, or a copy
 * of it?* a question a test can answer at all.
 */
export const EXCERPT_IDS = "mountexcerpt"

export const buildExcerpt = (): LoomTree => {
  const composition = compositionById(EXCERPT_PART)

  if (composition === undefined) {
    throw new Error(`loom: "${EXCERPT_PART}" is not a band in the starter library, so the frame section has no excerpt`)
  }

  const ids = sequentialIdFactory(EXCERPT_IDS)

  return createTree(composition.build(ids), ids)
}
