import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { themeGround } from "@jam-overture/loom/react"
import { describe, expect, it } from "vitest"

import {
  CHROME_DEPARTURES,
  CHROME_OWN,
  CHROME_SLOTS,
  chromeFaults,
  coloursIn,
  DARK_SELECTOR,
  describeChromeFault,
  HOUSE_THEME,
  housePalette,
  LIGHT_SELECTOR,
  siteChromeSituation,
  type ChromeSituation,
} from "./chrome-palette"
import { selectorDeclarations } from "./chrome-css"
import { docsThemes } from "./loom/registry"

/**
 * The furniture's colours, against the palette they are copies of.
 *
 * `chrome-palette.ts` is the argument. These are the claims, and they are in
 * two halves on purpose: the ones about **this** site, which are the ones that
 * go red the day the palette moves, and the ones about the rule itself, put to
 * a stylesheet and a palette this site does not have.
 *
 * The second half is not thoroughness. The real answer here is the empty list,
 * and a decision that reports nothing satisfies every assertion over it — which
 * this lane paid for on 2 November, when two mutations to the plain-language
 * rule went through forty-six tests without failing one.
 */

const globals = (): string => readFileSync(fileURLToPath(new URL("../globals.css", import.meta.url)), "utf8")

const lightColours = (): ReadonlyMap<string, string> => coloursIn(selectorDeclarations(globals(), LIGHT_SELECTOR))
const darkColours = (): ReadonlyMap<string, string> => coloursIn(selectorDeclarations(globals(), DARK_SELECTOR))

describe("the colours this site's furniture is painted in", () => {
  /**
   * The whole unit in one assertion. Everything else here is either a property
   * this one cannot state or a case it would pass vacuously.
   */
  it("are the registered palette's own values, every one of them", () => {
    const faults = chromeFaults(siteChromeSituation(globals()))

    expect(faults.map(describeChromeFault)).toEqual([])
  })

  /**
   * The property that stops this module from quietly covering less of the
   * sheet than it did. A colour added to `globals.css` and to no table is a
   * decision nobody wrote down, and without this it would simply not be read.
   */
  it("are all three accounted for, with nothing left over on either side", () => {
    const claimed = CHROME_SLOTS.length + CHROME_DEPARTURES.length + CHROME_OWN.length

    expect(claimed).toBe(lightColours().size)
  })

  it("name slots the palette actually has", () => {
    for (const entry of [...CHROME_SLOTS, ...CHROME_DEPARTURES]) {
      expect(housePalette.slots[entry.slot], `${entry.variable} names "${entry.slot}"`).toBeTypeOf("string")
    }
  })

  /**
   * Every entry in the site's own list says why, because the list is the one
   * place a reader can be told that minimal has no colour for a refusal.
   */
  it("says why for each colour the palette does not supply", () => {
    for (const entry of CHROME_OWN) {
      expect(entry.reason.length, `${entry.variable} gives no reason`).toBeGreaterThan(20)
    }
  })

  /**
   * The one claim the stylesheet makes about two of its own families, turned
   * into a check: a caution and a hold are the same note, so the warning
   * family is the held family and not a fourth set of values to keep in step.
   */
  it("paints a caution and a hold identically, in both themes", () => {
    for (const colours of [lightColours(), darkColours()]) {
      for (const part of ["surface", "edge", "ink"]) {
        expect(colours.get(`--warning-${part}`)).toBe(colours.get(`--verdict-held-${part}`))
      }
    }
  })
})

describe("the dark theme, which no palette backs", () => {
  /**
   * The absence the stylesheet's comment asserts in prose, measured. If
   * somebody registers a dark minimal, this is the test that says the dark
   * block has a palette to be a copy of now — which is the day that comment
   * stops being true, and it should not be the day a reader finds out.
   */
  it("is this site's own inversion, because the registry has no dark minimal", () => {
    expect(docsThemes.resolve({ ...HOUSE_THEME, palette: "minimal-dark" }).ok).toBe(false)
    expect(docsThemes.resolve(HOUSE_THEME).ok).toBe(true)
  })

  /**
   * A colour declared in one block and not the other is not a missing colour.
   * It is the light value serving a dark page, which renders and looks almost
   * right, and is the one failure in this file nothing else could see.
   */
  it("declares the same colours by name as the light theme", () => {
    expect([...darkColours().keys()].sort()).toEqual([...lightColours().keys()].sort())
  })

  it("is actually an inversion, rather than a second copy of the light theme", () => {
    expect(darkColours().get("--surface-page")).not.toBe(lightColours().get("--surface-page"))
    expect(darkColours().get("--ink")).not.toBe(lightColours().get("--ink"))
  })
})

describe("the color-scheme the document carries", () => {
  /**
   * 0334's boundary, from the side this surface is on. A tree ends at the
   * element the root primitive renders, so the scrollbar, the canvas past a
   * short page and an unstyled form control belong to the document element and
   * no tree reaches them — which is why this declaration is on `:root` here and
   * is correct. What was silent is the **value**: it was the word `light`,
   * typed, and `themeGround` is the published function that answers it.
   */
  it("is the one the palette's own ground reports", () => {
    const resolved = docsThemes.resolve(HOUSE_THEME)

    if (!resolved.ok) throw new Error("the house theme does not resolve, so the site has no ground to read")

    expect(selectorDeclarations(globals(), LIGHT_SELECTOR).get("color-scheme")).toBe(
      themeGround(resolved.value)?.colorScheme
    )
  })

  /**
   * The dark block's is this site's own, for the dark theme's reason, and it is
   * asserted rather than left out so that a block without one is a failure.
   */
  it("is dark under the dark theme, which no palette can be read for", () => {
    expect(selectorDeclarations(globals(), DARK_SELECTOR).get("color-scheme")).toBe("dark")
  })
})

/**
 * The rules, put to situations this site does not have.
 *
 * Every case below fails if the corresponding rule is deleted, which is what
 * the real assertion — the empty list — cannot do for any of them.
 */
describe("a stylesheet and a palette this site does not have", () => {
  const situation = (over: Partial<ChromeSituation>): ChromeSituation => ({
    declared: new Map([["--ink", "#0a0a0a"]]),
    slots: { "fg-default": "#0a0a0a" },
    transcriptions: [{ variable: "--ink", slot: "fg-default" }],
    departures: [],
    own: [],
    ...over,
  })

  it("passes a copy that is equal to the slot it copies", () => {
    expect(chromeFaults(situation({}))).toEqual([])
  })

  it("reports a copy the palette has moved away from", () => {
    const faults = chromeFaults(situation({ slots: { "fg-default": "#111111" } }))

    expect(faults).toEqual([
      { kind: "drifted", variable: "--ink", slot: "fg-default", declared: "#0a0a0a", palette: "#111111" },
    ])
    expect(describeChromeFault(faults[0]!)).toContain("which is now #111111")
  })

  it("reads a copy case-insensitively, because a hex is a value and not a spelling", () => {
    expect(chromeFaults(situation({ declared: new Map([["--ink", "#0A0A0A"]]) }))).toEqual([])
  })

  it("reports an entry naming a slot the palette no longer has", () => {
    expect(chromeFaults(situation({ slots: { "fg-body": "#0a0a0a" } }))).toEqual([
      { kind: "no-such-slot", variable: "--ink", slot: "fg-default" },
    ])
  })

  it("reports an entry naming a colour the stylesheet does not declare", () => {
    const faults = chromeFaults(situation({ declared: new Map([["--other", "#0a0a0a"]]) }))

    expect(faults).toEqual([
      { kind: "undeclared", variable: "--ink" },
      { kind: "unclassified", variable: "--other", declared: "#0a0a0a" },
    ])
  })

  it("reports a colour no table accounts for", () => {
    const declared = new Map([
      ["--ink", "#0a0a0a"],
      ["--surprise", "#ff00ff"],
    ])

    expect(chromeFaults(situation({ declared }))).toEqual([
      { kind: "unclassified", variable: "--surprise", declared: "#ff00ff" },
    ])
  })

  it("reports a colour two tables both claim", () => {
    const faults = chromeFaults(situation({ own: [{ variable: "--ink", reason: "and also this site's own, somehow" }] }))

    expect(faults).toEqual([{ kind: "classified-twice", variable: "--ink" }])
  })

  /**
   * The rule that makes an exemption a claim. A departure equal to its slot
   * reads as a deliberate difference and is a copy nothing checks — which is
   * precisely the state `--ink-faint` was in for ten weeks, one hex digit away
   * from the palette it said it was departing from.
   */
  it("reports a departure that is equal to the slot it departs from", () => {
    const faults = chromeFaults(
      situation({
        transcriptions: [],
        departures: [{ variable: "--ink", slot: "fg-default", reason: "the palette's grey misses AA" }],
      })
    )

    expect(faults).toEqual([
      { kind: "vacuous-departure", variable: "--ink", slot: "fg-default", value: "#0a0a0a" },
    ])
  })

  it("passes a departure that is a real difference", () => {
    const faults = chromeFaults(
      situation({
        declared: new Map([["--ink", "#6f6f7a"]]),
        slots: { "fg-default": "#8a8a94" },
        transcriptions: [],
        departures: [{ variable: "--ink", slot: "fg-default", reason: "the palette's grey misses AA at 3.42:1" }],
      })
    )

    expect(faults).toEqual([])
  })

  /** A length or a keyword in the same block is not a colour and is not read. */
  it("reads only the declarations that are colours", () => {
    const block = new Map([
      ["--ink", "#0a0a0a"],
      ["--chrome-header", "3.5rem"],
      ["color-scheme", "light"],
    ])

    expect([...coloursIn(block).keys()]).toEqual(["--ink"])
  })
})
