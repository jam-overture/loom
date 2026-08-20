import {
  fontPackSchema,
  paletteSchema,
  stylePresetSchema,
  type FontPack,
  type Palette,
  type StylePreset,
} from "./theme.js"

/**
 * The starter vocabulary, ported from the Hermes registry.
 *
 * Two palettes rather than one, deliberately: a single palette cannot show
 * whether a primitive reads its colours from the slots or hard-codes them, and
 * the port of the remaining twenty-seven is only safe once something proves a
 * primitive survives being re-themed.
 *
 * A third arrived on 19 August, and it is the first not ported from Hermes:
 * `minimal` / `minimal-sans` / `precise` is a house theme the maintainer
 * specified, and it is registered here rather than in a surface because all four
 * surfaces build their registry with `createThemeRegistry()` and no arguments.
 * One entry in this list is what makes it reachable from every one of them.
 */

export const editorialPalette: Palette = paletteSchema.parse({
  id: "editorial",
  name: "Editorial",
  description: "Restrained, high-contrast magazine palette with a single muted accent.",
  slots: {
    "bg-canvas": "#fafaf7",
    "bg-surface": "#ffffff",
    "bg-surface-muted": "#f0eee9",
    "bg-overlay": "#ffffff",
    "fg-default": "#0a0a0a",
    "fg-muted": "#525252",
    /** Third step of the ink ramp, and it still has to be readable (0072). */
    "fg-subtle": "#6a6a6a",
    "fg-on-accent": "#ffffff",
    accent: "#4a5b78",
    "accent-strong": "#34425a",
    "accent-subtle": "#e6ebf2",
    "brand-secondary": "#4a5b78",
    "brand-secondary-strong": "#34425a",
    "border-default": "#e5e5e5",
    "border-strong": "#0a0a0a",
    "border-subtle": "#efefe9",
    "border-accent": "#4a5b78",
  },
})

export const boldPalette: Palette = paletteSchema.parse({
  id: "bold",
  name: "Bold",
  description: "Black canvas with bright yellow and red accents. High-energy, graphic.",
  slots: {
    "bg-canvas": "#0a0a0a",
    "bg-surface": "#1a1a1a",
    "bg-surface-muted": "#0f0f0f",
    "bg-overlay": "#1a1a1a",
    "fg-default": "#f5f5f5",
    "fg-muted": "#a3a3a3",
    /** Third step of the ink ramp, and it still has to be readable (0072). */
    "fg-subtle": "#8a8a8a",
    "fg-on-accent": "#0a0a0a",
    accent: "#ffd400",
    "accent-strong": "#e0b800",
    "accent-subtle": "#3a3000",
    "brand-secondary": "#ff3344",
    "brand-secondary-strong": "#d81f2f",
    "border-default": "#2a2a2a",
    "border-strong": "#f5f5f5",
    "border-subtle": "#1f1f1f",
    "border-accent": "#ffd400",
  },
})

/**
 * Families are declared with their own fallback stacks and no loader. Loom does
 * not fetch fonts: a host that wants a webfont links it, and a primitive renders
 * correctly in the fallback until it arrives. Hermes emitted a Google Fonts URL
 * here, which put a network dependency inside a pure function.
 */
export const editorialSerifFontPack: FontPack = fontPackSchema.parse({
  id: "editorial-serif",
  name: "Editorial Serif",
  description: "Serif headlines over a humanist sans body. Reads as considered rather than loud.",
  headingFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  bodyFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headingWeight: 600,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 24, 32, 48, 72],
})

export const boldSansFontPack: FontPack = fontPackSchema.parse({
  id: "bold-sans",
  name: "Bold Sans",
  description: "Compressed display headlines over a clean body. Leans on weight rather than ornament.",
  headingFamily: 'Impact, "Haettenschweiler", "Arial Narrow Bold", sans-serif',
  bodyFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  headingWeight: 400,
  bodyWeight: 400,
  scaleRamp: [12, 14, 16, 18, 24, 32, 56, 88],
})

export const comfortableStylePreset: StylePreset = stylePresetSchema.parse({
  id: "comfortable",
  name: "Comfortable",
  description: "Moderate radii and generous spacing. The safe default for reading-led pages.",
  radii: { sm: 6, md: 12, lg: 24, full: 9999 },
  spacingScale: [4, 8, 12, 20, 32, 48, 64, 96],
  motion: { fast: 150, medium: 250, slow: 400 },
  density: "comfortable",
})

export const airyModernStylePreset: StylePreset = stylePresetSchema.parse({
  id: "airy-modern",
  name: "Airy Modern",
  description: "Larger radii and looser spacing. Pairs with vibrant palettes.",
  radii: { sm: 8, md: 16, lg: 32, full: 9999 },
  spacingScale: [4, 8, 14, 22, 32, 48, 72, 96],
  motion: { fast: 180, medium: 280, slow: 450 },
  density: "comfortable",
})

/**
 * The third palette, and the first one specified by the maintainer rather than
 * ported: white paper, black ink, and one green.
 *
 * The green is **Hyperion's**, taken from the one colour that codebase holds
 * constant. Every other token in Hyperion changes with its six themes; the
 * positive-action button does not:
 *
 * ```css
 * --btn-positive-bg:   #72e3ad;
 * --btn-positive-text: #0d3d26;
 * ```
 *
 * Those two are the same hue at two lightnesses — H 151.2° and 151.3°, S 65%
 * and 67%, L 14.5% and 67% — so they are not two greens, they are two stops of
 * one ramp. The stops between them here are computed on that hue and
 * saturation, which is why this palette can fill every slot without inventing a
 * second green.
 *
 * **Where each stop lands is decided by how the library reads the slot, not by
 * how the colour looks in isolation**, and getting that backwards is the whole
 * trap. `accent` is read as *text* far more often than as a fill — a section's
 * eyebrow, an article's kicker, a disclosure marker, the current page in a nav —
 * and the mint at 1.58:1 on white is unreadable at every one of them. So the
 * mint cannot be `accent`, however much it is the colour someone pictures. It
 * goes to `border-accent`, where a hairline, a pill's ring, a quote's rule and a
 * featured tier's border are exactly the "subtle highlight" the brief asks for
 * and where 1.58:1 is a soft mark rather than a failure.
 *
 * **`accent` is black, and that is the maintainer's call after seeing it green.**
 * The first cut gave it the deep stop, `#0d3d26`, on the reasoning that a
 * near-black button with a green cast was the restrained reading. Rendered, it
 * was neither: too dark to read as green and too green to read as black — the
 * review called it "dark hunter green black", which is exactly what it looked
 * like. The brief names three colours, whites, black *and* green, and a black
 * button is the one that leaves the green to be a highlight rather than the
 * largest element on the page.
 *
 * So the green now lives entirely in the places a highlight belongs:
 * `border-accent` for hairlines and rings, `accent-subtle` for a tinted tile,
 * and `accent-strong` — a mid stop rather than the darkest — for the glyph or
 * label sitting on that tile, where being *visibly* green matters more than
 * maximising contrast it already has in hand at 5.91:1.
 */
export const minimalPalette: Palette = paletteSchema.parse({
  id: "minimal",
  name: "Minimal",
  description:
    "White paper, black ink, one green. Components are outlined rather than filled; the green appears only as rules, rings and tinted marks.",
  slots: {
    /**
     * **`bg-surface` is the canvas white, and that is the whole outline-first
     * decision.** It is the fill behind a card, a nav, a footer, a hero panel
     * and a `tone: "surface"` section — so setting it to the page colour means
     * every one of those is defined by its border instead of by a change of
     * background, without a single primitive being touched. The instruction was
     * to prefer outlined components and use fills sparingly; this is the one
     * slot that turns the entire library over.
     *
     * It also means `border-subtle` is now load-bearing rather than decorative,
     * which is why it is a step darker here than the palettes that back their
     * borders with a fill.
     */
    "bg-canvas": "#ffffff",
    "bg-surface": "#ffffff",
    /**
     * The one fill left, and it stays a real one because it is *functional*
     * rather than structural: the well behind an image that has not loaded, a
     * person's monogram, a neutral badge. Nine primitives read it, and a
     * placeholder the same colour as the page is a placeholder nobody can see.
     */
    "bg-surface-muted": "#f4f4f5",
    "bg-overlay": "#ffffff",
    /** Never pure black. #000 on #fff is a glare a printed page never produces. */
    "fg-default": "#0a0a0a",
    "fg-muted": "#52525b",
    /** Third step of the ink ramp, keeping this palette's cool cast (0072). */
    "fg-subtle": "#6e6e78",
    "fg-on-accent": "#ffffff",
    /** Black, so the green is a highlight and not the biggest thing on the page. */
    accent: "#0a0a0a",
    /** A mid stop on Hyperion's ramp: the glyph on a tinted tile, visibly green at 5.91:1. */
    "accent-strong": "#176e44",
    "accent-subtle": "#effbf5",
    "brand-secondary": "#72e3ad",
    "brand-secondary-strong": "#1f985e",
    /** Carrying structure now, so a step darker than a fill-backed palette needs. */
    "border-default": "#d4d4d9",
    "border-strong": "#0a0a0a",
    "border-subtle": "#e6e6ea",
    /** Hyperion's `--btn-positive-bg`, exactly. The green you actually see. */
    "border-accent": "#72e3ad",
  },
})

/**
 * One grotesque at two weights, which is the typographic half of minimalism.
 *
 * `editorial-serif` pairs two families and `bold-sans` pairs two more, because
 * contrast between headline and body is how most pages establish hierarchy.
 * This one refuses that: heading and body are the same family, and the only
 * difference is weight and size. It is what the reference the maintainer gave —
 * `nextjs.org` — does, and it is why that page reads as a single object rather
 * than as a document with a masthead.
 *
 * **Geist is named first and is not loaded here.** Loom does not fetch fonts
 * (see the note above `editorialSerifFontPack`), so this renders in the system
 * grotesque until a surface links Geist itself, and the stack is ordered so that
 * the fallback is a near-neighbour rather than a lurch — `ui-sans-serif` and the
 * platform faces are all neo-grotesques of the same temperature. A page that
 * never loads Geist still looks like this palette's page.
 */
export const minimalSansFontPack: FontPack = fontPackSchema.parse({
  id: "minimal-sans",
  name: "Minimal Sans",
  description:
    "One neo-grotesque for headings and body, separated by weight alone. Prefers Geist; falls back to the system grotesque.",
  headingFamily:
    'Geist, "Geist Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  bodyFamily:
    'Geist, "Geist Sans", ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headingWeight: 700,
  bodyWeight: 400,
  /**
   * A gentle middle and a decisive top. Steps 1–5 are the reading sizes and move
   * in small increments; 6–8 are display sizes and jump, because a headline that
   * is merely larger than its body copy reads as emphasis rather than as a
   * headline.
   *
   * Step 8 is 72 and not more. `loom.heading` maps level 1 to the top step and
   * `loom.hero` holds its text to a 44rem measure, so an ambitious top step does
   * not produce a bigger headline — it produces the same headline on four lines.
   * Tuned against a render rather than against the numbers.
   */
  scaleRamp: [12, 14, 16, 20, 26, 32, 44, 72],
})

/**
 * Small radii, wide gutters, quick motion.
 *
 * The other two presets vary radius and spacing together on the assumption that
 * a softer page is also a looser one. Minimalism separates them: corners get
 * *tighter* than either existing preset while spacing gets **wider** than both.
 * Space is what does the work when there is no ornament, and a 24px radius is
 * ornament.
 *
 * `full` stays 9999 and is not a style choice — `loom.person`'s avatar and
 * `loom.milestone`'s rail dot are circles, and a preset that set it to a real
 * length would turn them into squircles in every theme that used it.
 */
export const preciseStylePreset: StylePreset = stylePresetSchema.parse({
  id: "precise",
  name: "Precise",
  description: "Tight radii and wide gutters. Space does the work where ornament is not wanted.",
  radii: { sm: 4, md: 8, lg: 12, full: 9999 },
  spacingScale: [4, 8, 12, 20, 32, 48, 72, 112],
  /** Faster than either other preset. Restraint applies to duration as well. */
  motion: { fast: 120, medium: 200, slow: 320 },
  density: "comfortable",
})

export const STARTER_PALETTES: readonly Palette[] = [editorialPalette, boldPalette, minimalPalette]
export const STARTER_FONT_PACKS: readonly FontPack[] = [
  editorialSerifFontPack,
  boldSansFontPack,
  minimalSansFontPack,
]
export const STARTER_STYLE_PRESETS: readonly StylePreset[] = [
  comfortableStylePreset,
  airyModernStylePreset,
  preciseStylePreset,
]
