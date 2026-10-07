import {
  paletteScheme,
  STARTER_PALETTES,
  type JsonObject,
  type PaletteScheme,
  type ResolvedTheme,
} from "@jam-overture/loom"
import { resolveTheme, themeGround, THEME_PROP_KEY } from "@jam-overture/loom/react"

import { docsThemes } from "./loom/registry"

/**
 * The strip of browser above your page, and what a host is allowed to say about
 * it.
 *
 * **The plain version.** The address bar is not part of your page and no
 * stylesheet reaches it. `<meta name="theme-color">` is the one thing that
 * does: you hand the browser a color, and it paints the bar that color. So a
 * dark page under a white bar is not a browser quirk — it is a page that never
 * said anything.
 *
 * **Why this is a module and not a corrected sentence.** The meta was listed on
 * the theming page as a `paletteScheme` case, under the heading *they take the
 * word, and there is nowhere to put a hex*, which is exactly inverted: its
 * `content` is a CSS color and there is nowhere in it to put a word. Moving one
 * bullet would have fixed the categorisation and left the interesting half
 * unsaid, because the meta has a **second form** that genuinely does deal in
 * light and dark:
 *
 * ```html
 * <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
 * <meta name="theme-color" media="(prefers-color-scheme: dark)"  content="#111827">
 * ```
 *
 * That form is the one every article about this recommends, and **it is the
 * wrong one for a Loom host**, because the two sides are keyed on different
 * facts. `prefers-color-scheme` is the reader's machine. A Loom page's palette
 * is named by the tree. A host that writes the pair is telling the browser
 * about the machine while painting the page from the tree, and the bar is right
 * only where those two happen to coincide.
 *
 * That is a claim about a list, and the way to make it is to render the list —
 * which is this module's sibling `scheme.ts`'s rule and the reason both exist.
 * `browser-bar.test.ts` recomputes every figure a second way.
 */

/**
 * The font pack and style preset every row is resolved under.
 *
 * A ground reads two palette slots and nothing else, so these cannot change a
 * single figure below. They are here because `resolveTheme` is the public path
 * a host's theme arrives through and it wants all three ids — going around it
 * to read `palette.slots` directly would make this table a second opinion about
 * `themeGround` rather than a printout of it, which is the one defect a picture
 * of a swatch cannot reveal.
 */
const UNDER = { fontPack: "minimal-sans", stylePreset: "precise" } as const

/** A theme resolved the way the runtime resolves one, or a loud failure. */
const resolvedWith = (paletteId: string): ResolvedTheme => {
  const selection: JsonObject = { palette: paletteId, ...UNDER }
  const resolution = resolveTheme({ [THEME_PROP_KEY]: selection }, docsThemes)

  if (resolution.outcome !== "themed") {
    throw new Error(
      `loom: the browser-bar section named "${paletteId}", which did not resolve — ${resolution.outcome}`
    )
  }

  return resolution.theme
}

/**
 * One palette a tree may name, and the color a host would hand the browser for
 * it.
 *
 * `painted` is `themeGround(theme).backgroundColor` and is deliberately
 * optional: a palette whose body-copy pair cannot be read gets no ground, and
 * the honest thing for a host to do then is emit no meta at all rather than
 * guess a hex. The table prints that case rather than assuming it away.
 */
export type BarRow = {
  readonly id: string
  readonly name: string
  /** What the page paints, as `themeGround` hands it back. */
  readonly painted: string | undefined
  readonly scheme: PaletteScheme | undefined
}

/** Every palette a reader starts with, and the bar color each one asks for. */
export const BAR_ROWS: readonly BarRow[] = STARTER_PALETTES.map((palette) => {
  const ground = themeGround(resolvedWith(palette.id))

  return {
    id: palette.id,
    name: palette.name,
    painted: ground?.backgroundColor,
    scheme: paletteScheme(palette),
  }
})

/**
 * The palettes a host could not emit a meta for.
 *
 * Empty today and printed rather than asserted empty, for the reason
 * `scheme.ts`'s `unreadablePalettes` is: the claim the section makes is that
 * there are no gaps, and a claim about an absence is worth reading off the data
 * so the day it stops being true the page says so without being edited.
 */
export const unpaintableBars: readonly BarRow[] = BAR_ROWS.filter((row) => row.painted === undefined)

/**
 * How many different grounds a list of palettes paints between them.
 *
 * A function rather than the number, because the number is `21` and so is the
 * length of the list, and a mutation reading the length instead survives every
 * test that can be written against a registry whose canvases all differ. Handed
 * a list with a repeat, the two stop agreeing and the difference is testable —
 * which is `noGapsLine`'s reason, applied to a count rather than to a branch.
 */
export const distinctCanvasesIn = (rows: readonly BarRow[]): number =>
  new Set(rows.map((row) => row.painted).filter((painted): painted is string => painted !== undefined)).size

/** How many different canvases the starter palettes hold between them. */
export const distinctCanvases: number = distinctCanvasesIn(BAR_ROWS)

/**
 * The two palettes a host nominates when it writes the media pair.
 *
 * The same two the section above this one stages its contrast demonstration
 * out of, which is the honest choice rather than a convenient one: `minimal` is
 * the palette this whole site is built from, and `midnight` is the dark one a
 * host reaching for a light-and-dark pair would reach for. A host picking any
 * other two gets the same shape of answer with two different rows exempted.
 */
export const PAIR_LIGHT_ID = "minimal"
export const PAIR_DARK_ID = "midnight"

/** What the browser is handed for each setting of the reader's machine. */
export const MACHINE_SETTINGS: readonly PaletteScheme[] = ["light", "dark"]

const nominated = (paletteId: string): string => {
  const ground = themeGround(resolvedWith(paletteId))

  if (ground === undefined) {
    throw new Error(`loom: "${paletteId}" has no ground, so the media pair has nothing to nominate`)
  }

  return ground.backgroundColor
}

/**
 * The pair itself, taken through the same function as every row.
 *
 * Nothing here types a hex. The two colors a host would hard-code into its
 * `<head>` are read out of the registry, so the comparison below is between two
 * things the registry decided rather than between the registry and this file.
 */
export const mediaPairServes: Readonly<Record<PaletteScheme, string>> = {
  light: nominated(PAIR_LIGHT_ID),
  dark: nominated(PAIR_DARK_ID),
}

/**
 * How a combination of *tree* and *machine* comes out.
 *
 * Three outcomes rather than two, and the middle one is the reason the table
 * is worth a reader's time:
 *
 * - `exact` — the bar is the color the page is. Only the two nominated
 *   palettes ever manage this.
 * - `off-by-a-shade` — the bar is the right way round and the wrong color. An
 *   off-white bar over a different off-white page. This is the outcome that
 *   looks like the feature working, and it is the most common of the three.
 * - `inverted` — the bar is the other way round entirely. A white bar over a
 *   near-black page, which is what a reader on a light machine gets from a
 *   tree that named a dark palette.
 */
export const BAR_OUTCOMES = ["exact", "off-by-a-shade", "inverted"] as const

export type BarOutcome = (typeof BAR_OUTCOMES)[number]

export type BarCombination = {
  readonly paletteId: string
  /** What the reader's machine is set to, which is all the media pair can read. */
  readonly machine: PaletteScheme
  /** What the page paints, from the tree. */
  readonly painted: string | undefined
  /** What the media pair hands the browser, from the machine. */
  readonly served: string
  readonly outcome: BarOutcome
}

/**
 * Which of the three a pairing lands in.
 *
 * A palette with no ground is counted `inverted` rather than given a fourth
 * outcome, and that is a judgement worth naming: the media pair serves a color
 * for it regardless, because the pair is two constants in a `<head>` and knows
 * nothing about the tree. So the bar is painted and the page's own ground is
 * unknown, which is the worst of the three and not a fourth case. No registered
 * palette reaches it today.
 */
const outcomeOf = (painted: string | undefined, served: string, scheme: PaletteScheme | undefined, machine: PaletteScheme): BarOutcome => {
  if (painted === served) return "exact"

  return scheme === machine ? "off-by-a-shade" : "inverted"
}

/** Every tree-and-machine pairing, which is every palette under both settings. */
export const BAR_COMBINATIONS: readonly BarCombination[] = BAR_ROWS.flatMap((row) =>
  MACHINE_SETTINGS.map((machine) => {
    const served = mediaPairServes[machine]

    return {
      paletteId: row.id,
      machine,
      painted: row.painted,
      served,
      outcome: outcomeOf(row.painted, served, row.scheme, machine),
    }
  })
)

/** The pairings landing in one outcome, in the order the registry lists them. */
export const combinationsThatAre = (outcome: BarOutcome): readonly BarCombination[] =>
  BAR_COMBINATIONS.filter((combination) => combination.outcome === outcome)

/**
 * The section's one sentence of arithmetic, written from the data.
 *
 * A function rather than a template in the component, for the reason
 * `scheme.ts`'s `noGapsLine` is one: the interesting branch is the one the real
 * list does not take. With every pairing exact this says so, and nothing
 * rendering the real list could tell a component that always printed the
 * failure from one that read it.
 */
export const pairVerdictLine = (combinations: readonly BarCombination[]): string => {
  const exact = combinations.filter((combination) => combination.outcome === "exact").length

  if (exact === combinations.length) {
    return `The pair gets the bar right in all ${combinations.length} of them.`
  }

  const shade = combinations.filter((combination) => combination.outcome === "off-by-a-shade").length
  const inverted = combinations.filter((combination) => combination.outcome === "inverted").length

  return (
    `The pair gets the bar exactly right in ${exact} of ${combinations.length}. ` +
    `In ${shade} it is the right way round and the wrong color, ` +
    `and in ${inverted} it is the wrong way round.`
  )
}

/**
 * The sentence about palettes a host could not emit a meta for.
 *
 * Pulled out of the component for the reason `pairVerdictLine` is: the real
 * list is empty, so a component that printed the no-gap sentence unconditionally
 * is indistinguishable from one that read the list. Handed a list, the branch
 * nobody can reach today is a branch a test can take.
 */
export const noSilentPaletteLine = (unpaintable: readonly BarRow[]): string =>
  unpaintable.length === 0
    ? "Every registered palette has a ground to offer, so there is no palette a host would have to stay silent about."
    : `${unpaintable.length} of them have no ground, so a host emits no meta at all for those: ${unpaintable
        .map((row) => row.id)
        .join(", ")}.`
