import {
  paletteSchema,
  paletteScheme,
  relativeLuminance,
  STARTER_PALETTES,
  type Palette,
  type PaletteScheme,
  type PaletteSlot,
} from "@jam-overture/loom"

/**
 * Which way round a theme is, asked of every palette a reader starts with.
 *
 * **The plain version.** `themeGround` hands a host colors to paint with.
 * Sometimes the host does not want a color — it wants to *choose* between two
 * things of its own that are not made of Loom's colors at all: one of two logo
 * files, an embed whose options take the word `"light"`, a class name outside
 * the tree. For those, the only useful answer is the word, and
 * `paletteScheme(palette)` is where it comes from.
 *
 * **`<meta name="theme-color">` used to be the third item in that list and it
 * was the wrong list.** Its `content` is a CSS color and there is nowhere in it
 * to put a word, so it is a `themeGround` case and always was. `browser-bar.ts`
 * is the module that works it, and the reason it is worth its own module rather
 * than a corrected clause is that the meta has a second form — a pair of metas
 * keyed on `prefers-color-scheme` — which reads the machine rather than the
 * tree, and is therefore wrong for every host whose palette is named by the
 * tree. A list of examples cannot carry that; a table of what each form answers
 * can.
 *
 * `_lib/mounting.ts` is this module's sibling and does the same job for the
 * section above: every figure the prose states is computed here, from the
 * palettes the reader actually has, and `scheme.test.ts` recomputes each one a
 * second way.
 *
 * **Why the section needs a module at all.** The claim it makes is not *this
 * palette is dark* — it is *this holds for every palette you were given, and
 * there are no gaps in the answer*. That is a claim about a list, and the one
 * way to make it is to render the list.
 */

/** The two slots the measurement reads, and the only two this module touches. */
const CANVAS: PaletteSlot = "bg-canvas"
const INK: PaletteSlot = "fg-default"

/**
 * One registered palette, with the pair the measurement reads and its answer.
 *
 * `canvas` and `ink` are carried rather than looked up again at render time, so
 * the swatches a reader checks the answer against are **the colors the answer
 * was computed from**. A component reaching back into the palette for them
 * could show one pair and print the verdict of another, which is the one defect
 * a picture of this cannot reveal.
 */
export type SchemedPalette = {
  readonly id: string
  readonly name: string
  readonly canvas: string
  readonly ink: string
  readonly scheme: PaletteScheme | undefined
}

/**
 * A slot's color, or a loud failure.
 *
 * Every palette owes every slot — `paletteSchema` refuses one that does not —
 * so an absent canvas here means the shape of a palette changed under this
 * page. Throwing at module scope is the honest outcome: the alternative is a
 * row with an empty swatch beside a confident verdict.
 */
const slotOf = (palette: Palette, slot: PaletteSlot): string => {
  const colour = palette.slots[slot]

  if (colour === undefined) {
    throw new Error(`loom: the "${palette.id}" palette declares no ${slot}, so the scheme section cannot show it`)
  }

  return colour
}

/** Every palette a reader has before they write one, and what each answers. */
export const SCHEMED_PALETTES: readonly SchemedPalette[] = STARTER_PALETTES.map((palette) => ({
  id: palette.id,
  name: palette.name,
  canvas: slotOf(palette, CANVAS),
  ink: slotOf(palette, INK),
  scheme: paletteScheme(palette),
}))

/** The palettes that answer one way, in the order the registry lists them. */
export const palettesAnswering = (answer: PaletteScheme): readonly SchemedPalette[] =>
  SCHEMED_PALETTES.filter((row) => row.scheme === answer)

/**
 * The palettes the measurement could not read.
 *
 * Empty today, and **printed rather than assumed empty**: the section's claim
 * is that there are no gaps, and a claim about an absence is worth stating from
 * the data. The day a registered palette is written in `hsl()` this stops being
 * zero and the page says so without being edited.
 */
export const unreadablePalettes: readonly SchemedPalette[] = SCHEMED_PALETTES.filter(
  (row) => row.scheme === undefined
)

/**
 * The sentence under the two groups, which is the section's one claim about an
 * absence.
 *
 * A function rather than a conditional inside the component, and the reason is
 * a mutation that survived the first pass: with the list empty, *always take
 * the empty branch* and *take the branch the list says* print the same words,
 * so nothing rendering the real list could tell them apart. Pulled out here,
 * the branch nobody can reach today is a branch a test can hand a list to.
 */
export const noGapsLine = (unreadable: readonly SchemedPalette[]): string =>
  unreadable.length === 0
    ? "Every registered palette answers. None of them comes back undefined."
    : `${unreadable.length} of them come back undefined: ${unreadable.map((row) => row.id).join(", ")}.`

/**
 * The same pair of colors, written the ways a palette may be written.
 *
 * This is the half of the section that is not about Loom's own palettes. The
 * third answer `paletteScheme` can give is `undefined`, and a reader meeting it
 * in a type signature has no way to find out when it happens — the reason is in
 * `channelsOf`'s own notes, which are not published prose.
 *
 * So it is demonstrated instead: one pair of colors, six spellings, the
 * registry asked whether each is a legal palette and the measure asked what it
 * makes of it. **The interesting column is the first one.** Four of these
 * register cleanly and answer `undefined`, which means a host can write a
 * perfectly legal palette and lose this measurement with nothing telling them
 * so.
 */
export type ColourForm = {
  /** What a reader would call this spelling. */
  readonly label: string
  readonly canvas: string
  readonly ink: string
  /** Whether a registry accepts a palette whose pair is written this way. */
  readonly registrable: boolean
  readonly scheme: PaletteScheme | undefined
}

/**
 * The palette the forms are variations of.
 *
 * A registered one, so the only thing that differs between the rows is the
 * spelling of two colors — every other slot is a shipped palette's. Taking a
 * hand-built palette instead would make each row's `registrable` a fact about
 * this file's typing rather than about the form being demonstrated.
 */
const FORM_BASIS = "midnight"

const formBasis = STARTER_PALETTES.find((palette) => palette.id === FORM_BASIS)

if (formBasis === undefined) {
  throw new Error(`loom: "${FORM_BASIS}" is not a registered palette, so the color-form table has no basis`)
}

/**
 * The spellings, each one the same dark palette's pair.
 *
 * The values are near-identical colors rather than identical ones, because
 * `hsl()` and a named color cannot express an arbitrary hex exactly and a table
 * claiming they do would be wrong about something a reader can check. What is
 * identical is **which way round the pair is**, which is the only property the
 * measurement is about: every row is a dark canvas under light ink, so every
 * row has one right answer and four of them do not give it.
 */
const FORMS: readonly { readonly label: string; readonly canvas: string; readonly ink: string }[] = [
  { label: "six-digit hex", canvas: "#111827", ink: "#f3f4f7" },
  { label: "three-digit hex", canvas: "#123", ink: "#eef" },
  { label: "hsl()", canvas: "hsl(220 30% 11%)", ink: "hsl(220 25% 95%)" },
  { label: "rgb()", canvas: "rgb(17 24 39)", ink: "rgb(243 244 247)" },
  { label: "a named color", canvas: "midnightblue", ink: "whitesmoke" },
  { label: "hex with an alpha", canvas: "#111827ff", ink: "#f3f4f7ff" },
]

/**
 * A palette wearing one of the spellings.
 *
 * Built here rather than in the table so the registry and the measure are
 * handed the same object — the whole point of the row is that those two
 * disagree about it.
 */
const paletteWearing = (canvas: string, ink: string): Palette => ({
  ...formBasis,
  slots: { ...formBasis.slots, [CANVAS]: canvas, [INK]: ink },
})

export const COLOUR_FORMS: readonly ColourForm[] = FORMS.map(({ label, canvas, ink }) => {
  const candidate = paletteWearing(canvas, ink)

  return {
    label,
    canvas,
    ink,
    registrable: paletteSchema.safeParse(candidate).success,
    scheme: paletteScheme(candidate),
  }
})

/**
 * The forms a palette may be written in that the measurement declines.
 *
 * Read off the table rather than counted by hand, for the reason every number
 * on this site is: the day `channelsOf` learns to read `rgb()`, the sentence
 * naming this figure is right without being edited.
 */
export const declinedForms: readonly ColourForm[] = COLOUR_FORMS.filter((form) => form.scheme === undefined)

/**
 * What the measurement actually compares, for the one row that needs showing.
 *
 * The section says *it compares the palette's own ink to its own canvas and
 * tells you which is lighter*, and that sentence is worth being able to check.
 * `relativeLuminance` is the function `paletteScheme` itself calls, so the two
 * numbers here are the two numbers the comparison was made on — not a second
 * opinion about them.
 */
export type SchemeWorking = {
  readonly id: string
  readonly canvas: string
  readonly ink: string
  readonly canvasLuminance: number
  readonly inkLuminance: number
  readonly scheme: PaletteScheme | undefined
}

/** The working for one palette by id, or a loud failure. */
export const schemeWorkingFor = (id: string): SchemeWorking => {
  const row = SCHEMED_PALETTES.find((candidate) => candidate.id === id)

  if (row === undefined) {
    throw new Error(`loom: the scheme section names "${id}", which is not a registered palette`)
  }

  const canvasLuminance = relativeLuminance(row.canvas)
  const inkLuminance = relativeLuminance(row.ink)

  if (canvasLuminance === undefined || inkLuminance === undefined) {
    throw new Error(`loom: the "${id}" palette's pair cannot be measured, so the scheme section has no working`)
  }

  return { ...row, canvasLuminance, inkLuminance }
}

/** Three places, which is enough to see which of two luminances is larger. */
export const LUMINANCE_PLACES = 3

export const printLuminance = (luminance: number): string => luminance.toFixed(LUMINANCE_PLACES)
