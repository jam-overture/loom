import { stylePresetSchema, type StylePreset } from "./theme.js"

/**
 * The seven style presets the starter library ships beyond the first three, and
 * the reason there are seven rather than seventeen.
 *
 * A preset is four radii, eight spacing steps, three durations and a density
 * word. That is a small space, and past about ten entries the differences stop
 * being differences: two presets whose spacing ramps differ by two pixels
 * render pages nobody can tell apart, and a model choosing between them is
 * choosing noise it will be graded on. Ten is where this library stops, and the
 * axes below are what the ten actually vary — each preset moves on at least one
 * of them by an amount a person can see.
 *
 * | axis | range |
 * | --- | --- |
 * | **spacing** | tight (a dense application) → generous (a landing page) |
 * | **radius** | square → soft → pill |
 * | **motion** | brisk (~120ms) → calm (~500ms) |
 *
 * ## What the numbers actually do
 *
 * **The spacing ramp is not linear, and should not be.** Steps 1–4 are the
 * distances inside a component — a gap between a label and its input, the
 * padding in a button — and steps 5–8 are the distances between them: a card's
 * interior, the space under a band, the gap between sections. A ramp that
 * doubles evenly gives a page where a paragraph and a section are separated by
 * the same rhythm, which reads as a wireframe. Every ramp here grows slowly at
 * the bottom and quickly at the top.
 *
 * **`full` is a pill, not a circle.** `loom.action`, `loom.button` and
 * `loom.badge` read `--loom-radius-full` for their own shape, so a preset that
 * set it to `0` would square off every control on the page. The square-cornered
 * presets below do exactly that on purpose — it is the whole of their look —
 * and it is worth knowing that is what the number reaches.
 *
 * **Motion is read by the stylesheet the primitives emit** (0055), and `slow`
 * is multiplied: `loom.hero`'s entrance runs at `slow × 1.6` and its aurora
 * drifts at `slow × 40`. A preset with a 600ms `slow` gives a hero that takes
 * most of a second to arrive, which is stately at the top of a landing page and
 * unbearable on a page a reader is working in. Anything under ~150ms reads as
 * an instant cut rather than as motion — deliberate for the two brisk presets.
 * Reduced motion removes all of it regardless.
 *
 * `density` is emitted as `--loom-density` and nothing in this library reads
 * it: it is there for a host's own components to key off the same choice the
 * tree made. Set honestly anyway, since something downstream will trust it.
 */

export const editorialPrintStylePreset: StylePreset = stylePresetSchema.parse({
  id: "editorial-print",
  name: "Editorial Print",
  description:
    "Square corners, generous spacing, and almost no motion. A page that behaves like paper.",
  radii: { sm: 0, md: 0, lg: 0, full: 0 },
  spacingScale: [4, 8, 14, 22, 36, 56, 80, 120],
  motion: { fast: 120, medium: 200, slow: 320 },
  density: "spacious",
})

export const brutalistStylePreset: StylePreset = stylePresetSchema.parse({
  id: "brutalist",
  name: "Brutalist",
  description:
    "Square corners, tight spacing, and motion fast enough to read as a cut. Nothing is softened.",
  radii: { sm: 0, md: 0, lg: 0, full: 0 },
  spacingScale: [4, 8, 12, 16, 24, 36, 52, 72],
  motion: { fast: 80, medium: 120, slow: 180 },
  density: "compact",
})

export const softStylePreset: StylePreset = stylePresetSchema.parse({
  id: "soft",
  name: "Soft",
  description:
    "Large radii, roomy spacing and calm motion. Everything is rounded and nothing is in a hurry.",
  radii: { sm: 10, md: 18, lg: 32, full: 9999 },
  spacingScale: [4, 10, 16, 24, 38, 58, 84, 124],
  motion: { fast: 200, medium: 320, slow: 500 },
  density: "spacious",
})

export const compactStylePreset: StylePreset = stylePresetSchema.parse({
  id: "compact",
  name: "Compact",
  description:
    "Small radii, tight spacing, brisk motion. The density of a tool someone uses all day.",
  radii: { sm: 4, md: 6, lg: 10, full: 9999 },
  spacingScale: [2, 6, 10, 14, 20, 30, 44, 64],
  motion: { fast: 100, medium: 160, slow: 240 },
  density: "compact",
})

export const technicalStylePreset: StylePreset = stylePresetSchema.parse({
  id: "technical",
  name: "Technical",
  description:
    "Barely-there radii on a strict four-pixel grid, with quick motion. Documentation and dashboards.",
  radii: { sm: 2, md: 4, lg: 8, full: 9999 },
  spacingScale: [4, 8, 12, 16, 24, 32, 48, 72],
  motion: { fast: 110, medium: 180, slow: 260 },
  density: "compact",
})

export const showcaseStylePreset: StylePreset = stylePresetSchema.parse({
  id: "showcase",
  name: "Showcase",
  description:
    "The widest spacing here, medium radii and slow motion. Built for a landing page with room to breathe.",
  radii: { sm: 8, md: 14, lg: 28, full: 9999 },
  spacingScale: [4, 10, 18, 28, 48, 76, 112, 168],
  motion: { fast: 180, medium: 300, slow: 460 },
  density: "spacious",
})

export const cardStylePreset: StylePreset = stylePresetSchema.parse({
  id: "card",
  name: "Card",
  description:
    "Even spacing and one consistent radius everywhere. The neutral middle, when nothing should draw attention.",
  radii: { sm: 8, md: 12, lg: 16, full: 9999 },
  spacingScale: [4, 8, 12, 20, 32, 48, 68, 96],
  motion: { fast: 150, medium: 240, slow: 380 },
  density: "comfortable",
})

/**
 * In catalogue order, from the most neutral to the most committed: a model
 * reading down the list meets `card` and `technical` before `brutalist`.
 */
export const ADDITIONAL_STYLE_PRESETS: readonly StylePreset[] = [
  cardStylePreset,
  technicalStylePreset,
  compactStylePreset,
  showcaseStylePreset,
  softStylePreset,
  editorialPrintStylePreset,
  brutalistStylePreset,
]
