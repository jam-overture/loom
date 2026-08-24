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

  it("holds the ramp to exactly the grounds children land on, bar the filled ones", () => {
    expect(derived.childGrounds.map((ground) => ground.ground)).toEqual([
      ...PALETTE_TEXT_GROUNDS,
      ...derived.groundsOutsideTheRamp.map((ground) => ground.ground),
    ].sort())
    expect(derived.groundsOutsideTheRamp.map((ground) => ground.ground)).toEqual(["accent"])
  })
})
