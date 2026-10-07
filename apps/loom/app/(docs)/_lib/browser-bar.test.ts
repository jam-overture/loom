import { relativeLuminance, STARTER_PALETTES, type PaletteScheme } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import {
  BAR_COMBINATIONS,
  BAR_OUTCOMES,
  BAR_ROWS,
  combinationsThatAre,
  distinctCanvases,
  distinctCanvasesIn,
  MACHINE_SETTINGS,
  noSilentPaletteLine,
  mediaPairServes,
  PAIR_DARK_ID,
  PAIR_LIGHT_ID,
  pairVerdictLine,
  unpaintableBars,
  type BarCombination,
  type BarRow,
} from "./browser-bar"

/**
 * Every figure the browser-bar section states, recomputed a second way.
 *
 * `scheme.test.ts`' rule, applied to its sibling. The module reaches its
 * numbers by resolving a theme through `resolveTheme` and asking `themeGround`
 * for a ground; this file reaches the same numbers by reading the palette's own
 * slot off `STARTER_PALETTES` and comparing two luminances here. Neither calls
 * the other's route, which is the only way the agreement means anything.
 */

/** A palette's canvas, read straight off the registry rather than through a ground. */
const canvasOf = (id: string): string | undefined =>
  STARTER_PALETTES.find((palette) => palette.id === id)?.slots["bg-canvas"]

/** Which way round a palette is, worked out without the runtime's measure. */
const schemeHere = (id: string): PaletteScheme | undefined => {
  const palette = STARTER_PALETTES.find((candidate) => candidate.id === id)
  const canvas = palette?.slots["bg-canvas"]
  const ink = palette?.slots["fg-default"]

  if (canvas === undefined || ink === undefined) return undefined

  const paper = relativeLuminance(canvas)
  const letters = relativeLuminance(ink)

  if (paper === undefined || letters === undefined) return undefined

  return letters > paper ? "dark" : "light"
}

describe("the color each palette asks the browser for", () => {
  it("has a row for every palette a reader starts with, in the registry's order", () => {
    expect(STARTER_PALETTES.length).toBeGreaterThan(1)
    expect(BAR_ROWS.map((row) => row.id)).toEqual(STARTER_PALETTES.map((palette) => palette.id))
  })

  /**
   * The point of the whole table: the meta's `content` is the color the page
   * actually paints, which is the canvas and not a word and not the ink.
   */
  it("is the palette's own canvas, read a second way", () => {
    for (const row of BAR_ROWS) {
      expect(row.painted, `${row.id} would paint a bar that is not its canvas`).toBe(canvasOf(row.id))
    }
  })

  it("carries each palette's own name and the way round it is", () => {
    for (const row of BAR_ROWS) {
      const palette = STARTER_PALETTES.find((candidate) => candidate.id === row.id)

      expect(row.name).toBe(palette?.name)
      expect(row.scheme, `${row.id} is reported the wrong way round`).toBe(schemeHere(row.id))
    }
  })

  /**
   * Printed rather than assumed empty. A palette with no readable pair gets no
   * meta at all, and the section's claim is that none of the starters is in
   * that position.
   */
  it("can emit a meta for every registered palette", () => {
    expect(unpaintableBars).toEqual([])
    expect(BAR_ROWS.every((row) => row.painted !== undefined)).toBe(true)
  })

  /**
   * The number the section's argument rests on. Two constants in a `<head>`
   * cannot cover a registry whose palettes each paint a different ground, and
   * *how many different grounds* is the measurement that says so.
   */
  it("counts the distinct canvases the starters hold between them", () => {
    const counted = new Set(STARTER_PALETTES.map((palette) => palette.slots["bg-canvas"])).size

    expect(distinctCanvases).toBe(counted)
    expect(distinctCanvases).toBe(STARTER_PALETTES.length)
  })

  /**
   * The count against a list it does not agree with, which is the only way to
   * tell it apart from the length. Every registered canvas differs today, so
   * `21` and `21` are the same number and a count that had quietly become
   * `rows.length` would survive every assertion made against the real list.
   */
  it("counts grounds rather than palettes, which a repeat is what shows", () => {
    const one: BarRow = { id: "a", name: "A", painted: "#ffffff", scheme: "light" }
    const same: BarRow = { id: "b", name: "B", painted: "#ffffff", scheme: "light" }
    const other: BarRow = { id: "c", name: "C", painted: "#111827", scheme: "dark" }

    expect(distinctCanvasesIn([one, same, other])).toBe(2)
    expect(distinctCanvasesIn([one, same])).toBe(1)
    expect(distinctCanvasesIn([])).toBe(0)
  })

  /** A palette with no ground is not a ground, so it is counted as neither. */
  it("counts no ground for a palette that has none", () => {
    const silent: BarRow = { id: "d", name: "D", painted: undefined, scheme: undefined }

    expect(distinctCanvasesIn([silent])).toBe(0)
  })
})

/** Every pairing for one setting of the reader's machine. */
const combinationsFor = (machine: PaletteScheme): readonly BarCombination[] =>
  BAR_COMBINATIONS.filter((combination) => combination.machine === machine)

describe("the pair a host nominates", () => {
  it("serves each nominated palette's own canvas", () => {
    expect(mediaPairServes.light).toBe(canvasOf(PAIR_LIGHT_ID))
    expect(mediaPairServes.dark).toBe(canvasOf(PAIR_DARK_ID))
  })

  it("nominates one palette of each kind, which is what makes it a pair", () => {
    expect(schemeHere(PAIR_LIGHT_ID)).toBe("light")
    expect(schemeHere(PAIR_DARK_ID)).toBe("dark")
  })

  it("reads the machine, so it serves the same two colors whatever the tree named", () => {
    for (const machine of MACHINE_SETTINGS) {
      const served = new Set(
        combinationsFor(machine).map((combination) => combination.served)
      )

      expect(served.size, `the pair served more than one color on a ${machine} machine`).toBe(1)
    }
  })
})

describe("how a tree and a machine come out together", () => {
  it("pairs every palette with both settings of the machine", () => {
    expect(BAR_COMBINATIONS).toHaveLength(STARTER_PALETTES.length * MACHINE_SETTINGS.length)

    for (const machine of MACHINE_SETTINGS) {
      expect(combinationsFor(machine).map((combination) => combination.paletteId)).toEqual(
        STARTER_PALETTES.map((palette) => palette.id)
      )
    }
  })

  /**
   * The outcome recomputed from the two colors and the two words, by a rule
   * written here. The module's own rule reads a `scheme` it was handed; this
   * one works the scheme out from luminances, so a palette reported the wrong
   * way round would move an outcome here and not there.
   */
  it("lands each pairing in the outcome the two colors say it does", () => {
    for (const combination of BAR_COMBINATIONS) {
      const painted = canvasOf(combination.paletteId)
      const expected =
        painted === combination.served
          ? "exact"
          : schemeHere(combination.paletteId) === combination.machine
            ? "off-by-a-shade"
            : "inverted"

      expect(combination.outcome, `${combination.paletteId} on a ${combination.machine} machine`).toBe(expected)
      expect(combination.painted).toBe(painted)
    }
  })

  it("accounts for every pairing under exactly one of the three outcomes", () => {
    const counted = BAR_OUTCOMES.reduce((total, outcome) => total + combinationsThatAre(outcome).length, 0)

    expect(counted).toBe(BAR_COMBINATIONS.length)
  })

  /**
   * The real figures, written down so that a registry gaining a palette makes
   * this test say so rather than quietly moving a number on the page.
   */
  it("gets the bar exactly right twice in forty-two", () => {
    expect(BAR_COMBINATIONS).toHaveLength(42)
    expect(combinationsThatAre("exact")).toHaveLength(2)
    expect(combinationsThatAre("off-by-a-shade")).toHaveLength(19)
    expect(combinationsThatAre("inverted")).toHaveLength(21)
  })

  /**
   * Which two, and the reason there can be no third: a nominated color is one
   * palette's canvas, every canvas in the registry is different, so each half
   * of the pair is exact for exactly one tree under exactly one machine.
   */
  it("is exact only for the two palettes the host nominated", () => {
    expect(
      combinationsThatAre("exact").map((combination) => [combination.paletteId, combination.machine])
    ).toEqual([
      [PAIR_LIGHT_ID, "light"],
      [PAIR_DARK_ID, "dark"],
    ])
  })

  /**
   * Every palette is the wrong way round under one of the two settings, which
   * is the half of this a reader can predict, and the module is held to it so
   * the count above is not the only thing saying so.
   */
  it("inverts every palette under exactly one setting of the machine", () => {
    for (const palette of STARTER_PALETTES) {
      const inverted = BAR_COMBINATIONS.filter(
        (combination) => combination.paletteId === palette.id && combination.outcome === "inverted"
      )

      expect(inverted, `${palette.id} is not inverted under exactly one setting`).toHaveLength(1)
      expect(inverted[0]?.machine).not.toBe(schemeHere(palette.id))
    }
  })
})

describe("the sentence under the table", () => {
  it("reads the three counts off the list it is given", () => {
    const line = pairVerdictLine(BAR_COMBINATIONS)

    expect(line).toContain("exactly right in 2 of 42")
    expect(line).toContain("In 19 it is the right way round and the wrong color")
    expect(line).toContain("in 21 it is the wrong way round")
  })

  /**
   * The branch the real list cannot take. Without this, a component that always
   * printed the failure would be indistinguishable from one that read the data,
   * which is the mutation `scheme.ts`'s own `noGapsLine` was pulled out for.
   */
  it("says so instead when every pairing is exact", () => {
    const allExact = BAR_COMBINATIONS.filter((combination) => combination.outcome === "exact")

    expect(pairVerdictLine(allExact)).toBe("The pair gets the bar right in all 2 of them.")
    expect(pairVerdictLine(allExact)).not.toContain("wrong")
  })

  it("holds an empty list to the same branch rather than dividing by nothing", () => {
    expect(pairVerdictLine([])).toBe("The pair gets the bar right in all 0 of them.")
  })
})

describe("the sentence about palettes a host must stay silent about", () => {
  /**
   * The branch the real list cannot take, for the same reason `pairVerdictLine`
   * has one: with nothing unpaintable, a component printing the no-gap sentence
   * unconditionally reads exactly like one that looked.
   */
  it("names the palettes that have no ground when there are any", () => {
    const silent: BarRow = { id: "fogbank", name: "Fogbank", painted: undefined, scheme: undefined }

    expect(noSilentPaletteLine([silent])).toBe(
      "1 of them have no ground, so a host emits no meta at all for those: fogbank."
    )
    expect(noSilentPaletteLine([silent, { ...silent, id: "haar" }])).toContain("fogbank, haar")
  })

  it("says there is no such palette when the list is empty", () => {
    expect(noSilentPaletteLine([])).toBe(
      "Every registered palette has a ground to offer, so there is no palette a host would have to stay silent about."
    )
    expect(noSilentPaletteLine(unpaintableBars)).toBe(noSilentPaletteLine([]))
  })
})
