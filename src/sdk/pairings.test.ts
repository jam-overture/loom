import { createElement, type ReactNode } from "react"

import { describe, expect, it } from "vitest"
import { z } from "zod"

import { createStarterPrimitiveRegistry } from "../primitives/index.js"
import { colour } from "../primitives/tokens.js"
import { PALETTE_TEXT_GROUNDS, PALETTE_TEXT_PAIRINGS } from "../theme/contrast.js"
import type { PaletteSlot } from "../theme/theme.js"

import { probeColourPairings } from "./conformance.js"
import { definePrimitive } from "./definition.js"
import { registryPairings } from "./pairings.js"
import { createPrimitiveRegistry, type PrimitiveRegistry } from "./registry.js"

const starterRegistry = (): PrimitiveRegistry => {
  const made = createStarterPrimitiveRegistry()
  if (!made.ok) throw new Error(`the starter registry did not build: ${JSON.stringify(made.error)}`)

  return made.value
}

const registryOf = (...entries: readonly ReturnType<typeof definePrimitive>[]): PrimitiveRegistry => {
  const made = createPrimitiveRegistry(entries)
  if (!made.ok) throw new Error(`registry: ${JSON.stringify(made.error)}`)

  return made.value
}

const painted = (ground: PaletteSlot, ink: PaletteSlot, children: ReactNode): ReactNode =>
  createElement("div", { style: { background: colour(ground) } }, createElement("p", { style: { color: colour(ink) } }, children))

describe("probeColourPairings", () => {
  it("reads an ink under a ground the same primitive painted", () => {
    const verdict = probeColourPairings(() => painted("bg-surface", "fg-muted", null))

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.painted).toEqual([{ foreground: "fg-muted", background: "bg-surface" }])
    expect(verdict.floating).toEqual([])
  })

  it("calls an ink with no ground of its own floating, because its parent decides", () => {
    const verdict = probeColourPairings(() => createElement("p", { style: { color: colour("fg-subtle") } }, "note"))

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.floating).toEqual(["fg-subtle"])
    expect(verdict.painted).toEqual([])
  })

  it("names the ground children land on, which is the nearest one above them", () => {
    const verdict = probeColourPairings(({ children }) =>
      createElement("section", { style: { background: colour("accent-subtle") } }, children)
    )

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.childGrounds).toEqual(["accent-subtle"])
  })

  /**
   * The ground a child inherits is the innermost one painted above it, not the
   * outermost — a card on a canvas hands its children the card.
   */
  it("hands children the innermost ground, not the outermost", () => {
    const verdict = probeColourPairings(({ children }) =>
      createElement(
        "div",
        { style: { background: colour("bg-canvas") } },
        createElement("div", { style: { background: colour("bg-surface") } }, children)
      )
    )

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.childGrounds).toEqual(["bg-surface"])
  })

  it("reads a slot's ground as well as the children's", () => {
    const primitive = definePrimitive({
      type: "loom.probe-slotted",
      description: "Two regions on two grounds, for the probe to tell apart.",
      props: z.object({}),
      slots: ["aside"],
      component: ({ loom, children }) =>
        createElement(
          "div",
          null,
          createElement("div", { style: { background: colour("bg-surface-muted") } }, loom.slots.aside),
          createElement("div", { style: { background: colour("bg-surface") } }, children)
        ),
    })

    const verdict = probeColourPairings(primitive.component, primitive.slots)

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.childGrounds).toEqual(["bg-surface", "bg-surface-muted"])
  })

  /**
   * A guess would be worse than a gap. `contrastRatio` already declines a
   * colour it would have to parse, and a probe that read `linear-gradient(...)`
   * as its first colour would report a pairing the page never renders.
   */
  it("answers nothing for a colour that is not a slot variable", () => {
    const verdict = probeColourPairings(() =>
      createElement(
        "div",
        { style: { background: `linear-gradient(${colour("accent")}, ${colour("bg-canvas")})` } },
        createElement("p", { style: { color: "#336699" } }, "hand-picked")
      )
    )

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.painted).toEqual([])
    expect(verdict.floating).toEqual([])
    expect(verdict.childGrounds).toEqual([])
  })

  /**
   * CSS inherits `color` down the tree and paints a background on the box
   * behind the glyphs, and those are two different walks. An ink declared above
   * a ground declared below is the ordinary way round for a card that tints one
   * of its own regions, and it was invisible until today.
   */
  it("reads an ink inherited from above onto a ground painted below it", () => {
    const verdict = probeColourPairings(() =>
      createElement(
        "article",
        { style: { color: colour("fg-default"), background: colour("bg-surface") } },
        createElement("div", { style: { background: colour("bg-surface-muted") } }, "a tinted well")
      )
    )

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.painted).toEqual([
      { foreground: "fg-default", background: "bg-surface" },
      { foreground: "fg-default", background: "bg-surface-muted" },
    ])
  })

  /**
   * `loom.overlay`'s shape, which is the case that found all of this: the ink
   * on the root, the ground on a scrim in grid cell `1 / 1`, and the words in
   * the same cell one layer up. Read as an ancestor chain the two ends never
   * meet.
   */
  it("reads the ground a sibling stacked under the content painted", () => {
    const verdict = probeColourPairings(({ children }) =>
      createElement(
        "div",
        { style: { display: "grid", color: colour("fg-default") } },
        createElement("div", {
          key: "scrim",
          style: { gridArea: "1 / 1", zIndex: 1, background: colour("bg-overlay") },
        }),
        createElement("div", { key: "content", style: { gridArea: "1 / 1", zIndex: 2 } }, children)
      )
    )

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.painted).toEqual([{ foreground: "fg-default", background: "bg-overlay" }])
    expect(verdict.childGrounds).toEqual(["bg-overlay"])
  })

  /**
   * A scrim over a photograph over a card is three layers and the words sit on
   * the scrim. Taking the bottom of the stack would name a ground no reader
   * sees through.
   *
   * Written out of source order, and with the content's depth as the string
   * React equally accepts — so a rule that fell back on source order, or that
   * read `"2"` as no depth at all, would put the words at the bottom of their
   * own stack and find no ground under them.
   */
  it("takes the nearest ground below in the stack, not the bottom of it", () => {
    const verdict = probeColourPairings(({ children }) =>
      createElement(
        "div",
        { style: { display: "grid", color: colour("fg-default") } },
        createElement("div", { key: "content", style: { gridArea: "1 / 1", zIndex: "2" } }, children),
        createElement("div", { key: "scrim", style: { gridArea: "1 / 1", zIndex: 1, background: colour("bg-overlay") } }),
        createElement("div", { key: "back", style: { gridArea: "1 / 1", zIndex: 0, background: colour("bg-canvas") } })
      )
    )

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.painted).toEqual([{ foreground: "fg-default", background: "bg-overlay" }])
    expect(verdict.childGrounds).toEqual(["bg-overlay"])
  })

  /**
   * Source order decides between two layers that declare no depth, the way
   * `z-index: auto` does — so the later sibling is the one on top and the
   * earlier one is what it sits on.
   */
  it("orders a stack that declares no depth by the order it was written in", () => {
    const verdict = probeColourPairings(({ children }) =>
      createElement(
        "div",
        { style: { display: "grid", color: colour("fg-muted") } },
        createElement("div", { key: "under", style: { gridArea: "a", background: colour("bg-surface-muted") } }),
        createElement("div", { key: "over", style: { gridArea: "a" } }, children)
      )
    )

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.painted).toEqual([{ foreground: "fg-muted", background: "bg-surface-muted" }])
  })

  /**
   * Two boxes side by side in a grid are not a stack, and inferring one would
   * put every row of a table on the ground of the row beside it.
   */
  it("does not stack two siblings that sit in different cells", () => {
    const verdict = probeColourPairings(({ children }) =>
      createElement(
        "div",
        { style: { display: "grid", color: colour("fg-default") } },
        createElement("div", { key: "left", style: { gridArea: "1 / 1", background: colour("bg-overlay") } }),
        createElement("div", { key: "right", style: { gridArea: "1 / 2" } }, children)
      )
    )

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.painted).toEqual([])
    expect(verdict.childGrounds).toEqual([])
  })

  /**
   * `loom.frame` draws its camera notch as an empty `span` filled with
   * `fg-default` and `loom.message` its typing dots with `fg-muted`. Counting
   * those as grounds gives `fg-muted on fg-muted` — 1.00:1 in every palette
   * that will ever be written, for a pair no reader can meet.
   */
  it("does not make a ground of an empty box, because nothing is written on a dot", () => {
    const verdict = probeColourPairings(() =>
      createElement(
        "div",
        { style: { color: colour("fg-default"), background: colour("bg-surface") } },
        createElement("span", { key: "dot", style: { background: colour("fg-muted") } }),
        createElement("span", { key: "spacer", style: { background: colour("fg-subtle") } }, null)
      )
    )

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.painted).toEqual([{ foreground: "fg-default", background: "bg-surface" }])
  })

  /**
   * The other half of that rule, which keeps it from swallowing a real claim:
   * an ink a component *declares* is recorded whether or not it wrapped
   * anything, because the component said it.
   */
  it("still records an ink the component declared on a box with nothing in it", () => {
    const verdict = probeColourPairings(() =>
      createElement(
        "div",
        { style: { background: colour("bg-surface") } },
        createElement("span", { key: "mark", style: { color: colour("accent") } })
      )
    )

    expect(verdict.outcome).toBe("probed")
    if (verdict.outcome !== "probed") return
    expect(verdict.painted).toEqual([{ foreground: "accent", background: "bg-surface" }])
  })

  it("says it could not answer for a component it cannot call", () => {
    const verdict = probeColourPairings(class Legacy {} as never)

    expect(verdict.outcome).toBe("not-probeable")
  })
})

describe("registryPairings", () => {
  it("crosses a floating ink with every ground the ramp is held to", () => {
    const registry = registryOf(
      definePrimitive({
        type: "loom.probe-note",
        description: "An ink with no ground, which is what makes it composed.",
        props: z.object({}),
        component: () => createElement("p", { style: { color: colour("fg-subtle") } }, "note"),
      })
    )

    const derived = registryPairings(registry, ["bg-canvas", "accent-subtle"])

    expect(derived.pairings).toEqual([
      { foreground: "fg-subtle", background: "accent-subtle", basis: "composed", types: ["loom.probe-note"] },
      { foreground: "fg-subtle", background: "bg-canvas", basis: "composed", types: ["loom.probe-note"] },
    ])
  })

  it("names the primitives behind a pairing, so a failure names components", () => {
    const registry = registryOf(
      definePrimitive({
        type: "loom.probe-one",
        description: "One of two primitives painting the same pair.",
        props: z.object({}),
        component: () => painted("bg-surface", "fg-muted", null),
      }),
      definePrimitive({
        type: "loom.probe-two",
        description: "The other of two primitives painting the same pair.",
        props: z.object({}),
        component: () => painted("bg-surface", "fg-muted", null),
      })
    )

    expect(registryPairings(registry, PALETTE_TEXT_GROUNDS).pairings).toEqual([
      {
        foreground: "fg-muted",
        background: "bg-surface",
        basis: "painted",
        types: ["loom.probe-one", "loom.probe-two"],
      },
    ])
  })

  it("reports a ground children land on that the ramp is not held to", () => {
    const registry = registryOf(
      definePrimitive({
        type: "loom.probe-filled",
        description: "A filled control, which answers its own ink and is not a ramp ground.",
        props: z.object({}),
        component: ({ children }) =>
          createElement(
            "button",
            { style: { background: colour("accent"), color: colour("fg-on-accent") } },
            children
          ),
      })
    )

    const derived = registryPairings(registry, PALETTE_TEXT_GROUNDS)

    expect(derived.groundsOutsideTheRamp).toEqual([{ ground: "accent", types: ["loom.probe-filled"] }])
    expect(derived.pairings.map((pairing) => pairing.background)).toEqual(["accent"])
  })

  /**
   * The blind spot, demonstrated rather than asserted about: the same component
   * under a required prop and an optional one, and only one of the two inks is
   * derived. `loom.offering`'s price is this exact shape, and it is what made a
   * painted pairing get declared as the softer composed.
   */
  it("does not see an ink behind an element the primitive draws only when told to", () => {
    const registry = registryOf(
      definePrimitive({
        type: "loom.probe-guarded",
        description: "A card whose price is drawn only when there is one.",
        props: z.object({ price: z.string().optional() }),
        component: ({ props }) =>
          createElement(
            "div",
            { style: { background: colour("bg-surface") } },
            props.price === undefined
              ? null
              : createElement("p", { style: { color: colour("accent-strong") } }, String(props.price))
          ),
      })
    )

    const derived = registryPairings(registry, PALETTE_TEXT_GROUNDS)

    expect(derived.pairings).toEqual([])
    expect(derived.unprobedProps).toEqual([{ type: "loom.probe-guarded", props: ["price"] }])
  })

  /**
   * A prop the probe *can* vary is not a blind spot, which is the difference
   * between this report and a list of every optional prop in the library.
   */
  it("does not count a closed choice as unreachable, because it varies those", () => {
    const registry = registryOf(
      definePrimitive({
        type: "loom.probe-toned",
        description: "A panel with a tone the probe can enumerate.",
        props: z.object({
          tone: z.enum(["plain", "accent"]).optional(),
          label: z.string().optional(),
        }),
        component: () => painted("bg-surface", "fg-muted", null),
      })
    )

    expect(registryPairings(registry, PALETTE_TEXT_GROUNDS).unprobedProps).toEqual([
      { type: "loom.probe-toned", props: ["label"] },
    ])
  })

  /** A required prop's element renders anyway, so its ink is not hidden. */
  it("leaves a primitive out entirely when nothing it declares is out of reach", () => {
    const registry = registryOf(
      definePrimitive({
        type: "loom.probe-plain",
        description: "Everything it declares is required.",
        props: z.object({ heading: z.string() }),
        component: () => painted("bg-surface", "fg-muted", null),
      })
    )

    expect(registryPairings(registry, PALETTE_TEXT_GROUNDS).unprobedProps).toEqual([])
  })

  /**
   * "I cannot enumerate these" is not "there are none", and a schema whose keys
   * cannot be read is the one case where the derivation knows least of all.
   */
  it("says it cannot tell for a schema whose props do not enumerate", () => {
    const registry = registryOf(
      definePrimitive({
        type: "loom.probe-opaque",
        description: "A schema that is not an object schema.",
        props: z.record(z.string()),
        component: () => painted("bg-surface", "fg-muted", null),
      })
    )

    expect(registryPairings(registry, PALETTE_TEXT_GROUNDS).unprobedProps).toEqual([
      { type: "loom.probe-opaque", props: undefined },
    ])
  })
})

/**
 * The assertion this module exists for.
 *
 * `PALETTE_TEXT_PAIRINGS` said of itself that it was read off `src/primitives`,
 * and by 23 August it was nine pairings short — including two that fail. A list
 * a person maintains alongside a library falls behind it silently, and the
 * silence reads exactly like a pass, because an audit reports no failure for a
 * pairing it never measured.
 */
describe("the declared list against the components", () => {
  const derived = registryPairings(starterRegistry(), PALETTE_TEXT_GROUNDS)
  const declared = new Map(
    PALETTE_TEXT_PAIRINGS.map((pairing) => [`${pairing.foreground}|${pairing.background}`, pairing])
  )

  it("probes every primitive Loom ships", () => {
    expect(derived.notProbeable).toEqual([])
  })

  it("declares every pairing the library renders", () => {
    const missing = derived.pairings
      .filter((pairing) => !declared.has(`${pairing.foreground}|${pairing.background}`))
      .map((pairing) => `${pairing.foreground} on ${pairing.background} (${pairing.types.join(", ")})`)

    expect(missing).toEqual([])
  })

  /**
   * The half that keeps the two-tier audit honest. `failures` is asserted empty
   * and `composedFailures` is not, so relabelling a painted pairing as composed
   * would silence a real failure without deleting a row — the edit that would
   * be hardest to catch by reading the diff.
   */
  it("never declares a painted pairing as the softer composed", () => {
    const demoted = derived.pairings
      .filter((pairing) => pairing.basis === "painted")
      .filter((pairing) => declared.get(`${pairing.foreground}|${pairing.background}`)?.basis !== "painted")
      .map((pairing) => `${pairing.foreground} on ${pairing.background}`)

    expect(demoted).toEqual([])
  })

  /**
   * A row nothing renders is a bar chosen for its own sake, which is the fault
   * the list's own comment warns about from the other direction.
   */
  it("declares nothing the library does not render", () => {
    const rendered = new Set(derived.pairings.map((pairing) => `${pairing.foreground}|${pairing.background}`))
    const imagined = [...declared.keys()].filter((at) => !rendered.has(at))

    expect(imagined).toEqual([])
  })

  /**
   * The one row this list carries that the derivation cannot reach, pinned to
   * the reason it cannot. `loom.offering` paints its price in `accent-strong`
   * on the `bg-surface` it drew, and the element exists only under the optional
   * `price` — so the pairing is declared `painted` off the component and the
   * probe can only get to `composed`. If the probe ever grows to open a guarded
   * prop, this fails and the row stops needing a person behind it.
   */
  it("cannot reach loom.offering's price, which is why its pairing is declared by hand", () => {
    expect(derived.unprobedProps).toContainEqual(
      expect.objectContaining({ type: "loom.offering", props: expect.arrayContaining(["price"]) })
    )
    expect(
      derived.pairings.find(
        (pairing) => pairing.foreground === "accent-strong" && pairing.background === "bg-surface"
      )?.basis
    ).toBe("composed")
    expect(declared.get("accent-strong|bg-surface")?.basis).toBe("painted")
  })

  /**
   * The row this run exists for, asserted against the real component rather
   * than a fixture. `loom.overlay` shipped on 15 September and painted
   * `bg-overlay` from its first commit; the slot appeared in no pairing, no
   * child ground and no report until the probe could follow a stacked sibling,
   * so `auditPalette` measured nothing about a surface the library writes on.
   */
  it("derives the overlay's pairing from the overlay, which no ancestor walk could reach", () => {
    const overlay = derived.pairings.find(
      (pairing) => pairing.foreground === "fg-default" && pairing.background === "bg-overlay"
    )

    /**
     * **Four types rather than one, since 1 October.** This assertion was
     * written when `loom.overlay` was the only primitive in the library that
     * painted `bg-overlay`, and the three primitives that present a region —
     * a menu's panel, a popover's panel, a lightbox's plate — now paint it too,
     * for the slot's stated reason: it is the surface a thing drawn *over* the
     * page sits on, and a panel in `bg-surface` laid over a `bg-surface` card
     * has no edge but its hairline under half the starter palettes.
     *
     * The row's own `basis` is what this test is for and it is unchanged: the
     * pairing is `painted` and no ancestor walk reaches it. The list of types is
     * widened rather than loosened, so a fifth primitive quietly starting to
     * paint the page's overlay surface still fails here.
     */
    expect(overlay?.basis).toBe("painted")
    expect(overlay?.types).toEqual(["loom.lightbox", "loom.overlay"])
    expect(derived.childGrounds.find((ground) => ground.ground === "bg-overlay")?.types).toEqual([
      "loom.lightbox",
      "loom.menu",
      "loom.overlay",
      "loom.popover",
    ])
    expect(declared.get("fg-default|bg-overlay")?.basis).toBe("painted")
  })

  it("holds the ramp to exactly the grounds children land on, bar the filled ones", () => {
    expect(derived.childGrounds.map((ground) => ground.ground)).toEqual([
      ...PALETTE_TEXT_GROUNDS,
      ...derived.groundsOutsideTheRamp.map((ground) => ground.ground),
    ].sort())
    expect(derived.groundsOutsideTheRamp.map((ground) => ground.ground)).toEqual(["accent"])
  })
})
