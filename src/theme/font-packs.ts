import { fontPackSchema, type FontPack } from "./theme.js"

/**
 * The seventeen font packs the starter library ships beyond the first three.
 *
 * **Loom does not fetch fonts, and that is the fact to hold while reading these.**
 * A pack names a literal family stack and nothing loads it; a host that wants a
 * webface links it, and until it arrives — or forever, if it never does — the
 * page renders the next family in the stack. Nothing warns. That failure is
 * silent and looks entirely deliberate, which is why the packs below are
 * divided into two kinds and each says which it is:
 *
 * - **Stack packs** name only faces a mainstream operating system already has,
 *   so they render as designed with nothing to install and no network at all.
 *   Thirteen of the seventeen are these, deliberately: a starter library whose
 *   typography depends on a third party is fine until the day it is not, and
 *   this repository has already met a blocked CDN twice.
 * - **Served packs** name a webface *first* and a real stack behind it. They
 *   are marked in their description, because the host has to serve the face for
 *   them to mean anything. `minimal-sans` set the precedent by naming Geist,
 *   and the four surfaces link it.
 *
 * Every stack ends in a generic family — `serif`, `sans-serif`, `monospace`,
 * `system-ui` — so there is always a last resort that exists everywhere.
 *
 * ## What actually distinguishes a pack
 *
 * Two families, two weights, and a ramp of eight sizes. The **ramp is where the
 * feel lives**, and it is the half people skip: a pack whose top step is 96px
 * makes a hero that shouts, and one whose top step is 40px makes a page that
 * reads as an application. Three shapes recur below and are named in each
 * description:
 *
 * | shape | ramp | reads as |
 * | --- | --- | --- |
 * | **dramatic** | wide, 12 → 88 or more | a landing page, a poster |
 * | **editorial** | even, 12 → 64 | a magazine, a long read |
 * | **functional** | tight, 12 → 40 | a product, a dashboard |
 *
 * The steps are px and the primitives read them through `--loom-scale-1…8`;
 * step 3 is body copy in every pack here, so a ramp that starts elsewhere would
 * re-size every paragraph in the library.
 */

/** The generic tails every stack in this file ends with. */
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const SERIF = "'Times New Roman', Times, serif"
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

export const grotesqueFontPack: FontPack = fontPackSchema.parse({
  id: "grotesque",
  name: "Grotesque",
  description:
    "One neutral sans at two weights, on a functional ramp. The typography of a product rather than a document.",
  headingFamily: `'Helvetica Neue', Helvetica, Arial, ${SANS}`,
  bodyFamily: `'Helvetica Neue', Helvetica, Arial, ${SANS}`,
  headingWeight: 700,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 22, 28, 34, 44],
})

export const transitionalFontPack: FontPack = fontPackSchema.parse({
  id: "transitional",
  name: "Transitional",
  description:
    "A book serif over a humanist sans, on an editorial ramp. The pairing a long read wants.",
  headingFamily: `Charter, 'Bitstream Charter', 'Sitka Text', Cambria, ${SERIF}`,
  bodyFamily: `'Segoe UI', Roboto, ${SANS}`,
  headingWeight: 600,
  bodyWeight: 400,
  scaleRamp: [12, 14, 17, 19, 24, 32, 44, 64],
})

export const didoneFontPack: FontPack = fontPackSchema.parse({
  id: "didone",
  name: "Didone",
  description:
    "High-contrast display serif over a quiet sans, on a dramatic ramp. A fashion masthead.",
  headingFamily: `'Playfair Display', 'Bodoni MT', Didot, 'Didot LT STD', 'Hoefler Text', Garamond, ${SERIF}`,
  bodyFamily: `Avenir, 'Avenir Next', ${SANS}`,
  headingWeight: 700,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 19, 26, 38, 60, 96],
})

export const humanistFontPack: FontPack = fontPackSchema.parse({
  id: "humanist",
  name: "Humanist",
  description:
    "A warm sans at two weights, on an editorial ramp. Approachable without being soft.",
  headingFamily: `'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', ${SANS}`,
  bodyFamily: `'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', ${SANS}`,
  headingWeight: 600,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 24, 32, 46, 66],
})

export const slabFontPack: FontPack = fontPackSchema.parse({
  id: "slab",
  name: "Slab",
  description: "A slab serif over a plain sans, on a dramatic ramp. Sturdy, and a little loud.",
  headingFamily: `Rockwell, 'Rockwell Nova', 'Roboto Slab', 'DejaVu Serif', 'Sitka Small', ${SERIF}`,
  bodyFamily: `Verdana, Geneva, ${SANS}`,
  headingWeight: 700,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 19, 25, 34, 52, 80],
})

export const monoFontPack: FontPack = fontPackSchema.parse({
  id: "mono",
  name: "Mono",
  description:
    "Monospace throughout, on a functional ramp. Everything on the page sits on the same grid.",
  headingFamily: MONO,
  bodyFamily: MONO,
  headingWeight: 600,
  bodyWeight: 400,
  scaleRamp: [12, 13, 15, 17, 21, 26, 33, 42],
})

export const monoDisplayFontPack: FontPack = fontPackSchema.parse({
  id: "mono-display",
  name: "Mono Display",
  description:
    "Monospace headlines over a readable sans, on a dramatic ramp. Technical, and still a long read.",
  headingFamily: MONO,
  bodyFamily: `'Segoe UI', Roboto, ${SANS}`,
  headingWeight: 700,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 24, 34, 52, 76],
})

export const geometricFontPack: FontPack = fontPackSchema.parse({
  id: "geometric",
  name: "Geometric",
  description: "Circular geometric sans at two weights, on a dramatic ramp. Confident and modern.",
  headingFamily: `'Century Gothic', 'Futura', 'Avenir Next', 'Trebuchet MS', ${SANS}`,
  bodyFamily: `Avenir, 'Avenir Next', 'Segoe UI', ${SANS}`,
  headingWeight: 700,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 19, 25, 36, 56, 88],
})

export const classicalFontPack: FontPack = fontPackSchema.parse({
  id: "classical",
  name: "Classical",
  description: "Old-style serif throughout, on an editorial ramp. A page that looks printed.",
  headingFamily: `Garamond, 'EB Garamond', 'Apple Garamond', 'Palatino Linotype', Palatino, ${SERIF}`,
  bodyFamily: `Georgia, 'Iowan Old Style', Palatino, ${SERIF}`,
  headingWeight: 600,
  bodyWeight: 400,
  scaleRamp: [13, 15, 18, 20, 26, 34, 48, 68],
})

export const condensedFontPack: FontPack = fontPackSchema.parse({
  id: "condensed",
  name: "Condensed",
  description:
    "A narrow sans for headlines over a normal one for text, on a dramatic ramp. Fits more, shouts louder.",
  headingFamily: `'Haettenschweiler', 'Arial Narrow', 'Roboto Condensed', Impact, ${SANS}`,
  bodyFamily: `Roboto, 'Segoe UI', ${SANS}`,
  headingWeight: 700,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 26, 40, 64, 104],
})

export const roundedFontPack: FontPack = fontPackSchema.parse({
  id: "rounded",
  name: "Rounded",
  description: "A soft-cornered sans at two weights, on a functional ramp. Friendly, for a product.",
  headingFamily: `'SF Pro Rounded', 'Varela Round', 'Nunito', 'Trebuchet MS', ${SANS}`,
  bodyFamily: `'SF Pro Rounded', 'Varela Round', 'Nunito', 'Trebuchet MS', ${SANS}`,
  headingWeight: 700,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 22, 28, 38, 52],
})

export const nativeFontPack: FontPack = fontPackSchema.parse({
  id: "native",
  name: "Native",
  description:
    "The reader's own system face at two weights, on a functional ramp. Nothing to load, and it looks native everywhere.",
  headingFamily: `system-ui, ${SANS}`,
  bodyFamily: `system-ui, ${SANS}`,
  headingWeight: 600,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 22, 28, 36, 48],
})

export const typewriterFontPack: FontPack = fontPackSchema.parse({
  id: "typewriter",
  name: "Typewriter",
  description:
    "Monospace headlines over an old-style serif, on an editorial ramp. A manuscript rather than a terminal.",
  headingFamily: `'Courier New', Courier, ${MONO}`,
  bodyFamily: `Georgia, 'Iowan Old Style', ${SERIF}`,
  headingWeight: 700,
  bodyWeight: 400,
  scaleRamp: [13, 15, 17, 19, 24, 31, 44, 62],
})

export const interUiFontPack: FontPack = fontPackSchema.parse({
  id: "inter-ui",
  name: "Inter UI",
  description:
    "Inter at two weights, on a functional ramp. **The host must serve Inter**; without it this is the system sans.",
  headingFamily: `Inter, system-ui, ${SANS}`,
  bodyFamily: `Inter, system-ui, ${SANS}`,
  headingWeight: 650,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 22, 28, 38, 52],
})

export const displaySerifFontPack: FontPack = fontPackSchema.parse({
  id: "display-serif",
  name: "Display Serif",
  description:
    "Fraunces headlines over a system sans, on a dramatic ramp. **The host must serve Fraunces**; without it this is Georgia.",
  headingFamily: `Fraunces, 'Playfair Display', Georgia, ${SERIF}`,
  bodyFamily: `system-ui, ${SANS}`,
  headingWeight: 700,
  bodyWeight: 400,
  scaleRamp: [12, 14, 17, 19, 26, 38, 58, 92],
})

export const spaceFontPack: FontPack = fontPackSchema.parse({
  id: "space",
  name: "Space",
  description:
    "Space Grotesk headlines over its mono, on a dramatic ramp. **The host must serve both**; without them, system sans over system mono.",
  headingFamily: `'Space Grotesk', system-ui, ${SANS}`,
  bodyFamily: `'Space Mono', ${MONO}`,
  headingWeight: 700,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 24, 34, 54, 84],
})

export const workhorseFontPack: FontPack = fontPackSchema.parse({
  id: "workhorse",
  name: "Workhorse",
  description:
    "Source Sans over Source Serif, on an editorial ramp. **The host must serve both**; without them, system sans over Georgia.",
  headingFamily: `'Source Sans 3', 'Source Sans Pro', system-ui, ${SANS}`,
  bodyFamily: `'Source Serif 4', 'Source Serif Pro', Georgia, ${SERIF}`,
  headingWeight: 600,
  bodyWeight: 400,
  scaleRamp: [12, 14, 17, 19, 24, 32, 44, 62],
})

/**
 * In catalogue order: the stack packs first, then the four that need a host to
 * serve a face. A model reading down the list meets something that always works
 * before something that depends on a deployment it cannot see.
 */
export const ADDITIONAL_FONT_PACKS: readonly FontPack[] = [
  nativeFontPack,
  grotesqueFontPack,
  humanistFontPack,
  geometricFontPack,
  roundedFontPack,
  condensedFontPack,
  transitionalFontPack,
  classicalFontPack,
  didoneFontPack,
  slabFontPack,
  monoFontPack,
  monoDisplayFontPack,
  typewriterFontPack,
  interUiFontPack,
  displaySerifFontPack,
  spaceFontPack,
  workhorseFontPack,
]
