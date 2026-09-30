import type { ElementNode, LoomNode, LoomTree } from "@jam-overture/loom"
import { describe, expect, it } from "vitest"

import { BAND } from "../bands"
import { treeFor } from "../render"
import { HOME, SITE_THEME_NAMES, type SiteThemeName } from "../site"

/**
 * The band that says what you would do, which the front door did not have.
 *
 * Every other band of this page is a claim about the world, a list of what goes
 * wrong without this, a number, a question, or the product changing itself in
 * front of the reader. None of them answers *what would I do* — so a visitor
 * could watch the demonstration work and still not know whether adopting it
 * means rewriting their components.
 *
 * What is asserted here is the part that would rot quietly. The band renders
 * and the page is green whatever the steps say, so the assertions are about
 * the claims rather than the markup: that the two halves stay two and two, that
 * the reassurance in step one survives an edit, and that the last step still
 * carries the record rather than ending on adaptation.
 */

const ORIGIN = "https://loom.example"

const elementsOf = (node: LoomNode): readonly ElementNode[] =>
  node.kind === "text"
    ? []
    : [...(node.kind === "element" ? [node] : []), ...node.children.flatMap(elementsOf)]

const bandOf = (page: LoomTree): ElementNode | undefined =>
  elementsOf(page.root).find(
    (element) => element.type === "loom.section" && element.props["eyebrow"] === BAND.usingIt
  )

const stepsOf = (page: LoomTree): readonly ElementNode[] => {
  const band = bandOf(page)

  return band === undefined
    ? []
    : elementsOf(band).filter((element) => element.type === "loom.milestone")
}

const home = (theme: SiteThemeName = "minimal"): LoomTree =>
  treeFor(HOME, { origin: ORIGIN, theme })

const textOf = (node: LoomNode): string =>
  node.kind === "text"
    ? node.value
    : node.children.map(textOf).join(" ")

describe("the band that says what you would do", () => {
  it("is on the front door, and is a band a request could find", () => {
    /**
     * By its eyebrow rather than by its position: `asks.ts` finds the band a
     * request is about by the same string, so a band that renders but carries
     * no eyebrow is a band this site's own demonstration cannot address.
     */
    expect(bandOf(home())).toBeDefined()
  })

  it("is four steps, in order, each numbered", () => {
    const steps = stepsOf(home())

    expect(steps.map((step) => step.props["marker"])).toEqual(["1", "2", "3", "4"])
  })

  /**
   * The load-bearing assertion, and the reason this file exists.
   *
   * The shape is the argument: **two things you do, then two that keep
   * happening.** A fifth step, or a third thing marked `done`, would be the
   * band quietly becoming a list of chores — which is the one reading the
   * heading promises it is not.
   */
  it("divides two and two: what you do once, and what then runs", () => {
    const steps = stepsOf(home())

    expect(steps.map((step) => step.props["state"])).toEqual([
      "done",
      "done",
      "current",
      "current",
    ])
  })

  it("every step says something, which is what separates it from the waiting panel", () => {
    const steps = stepsOf(home())

    expect(steps.length).toBeGreaterThan(0)

    for (const step of steps) {
      expect(typeof step.props["title"], JSON.stringify(step.props)).toBe("string")
      expect(typeof step.props["body"], JSON.stringify(step.props)).toBe("string")
    }
  })

  /**
   * Step one is the reassurance and step four is the differentiator, and both
   * are a sentence somebody could tidy away without any check noticing.
   *
   * `docs/rollout.md` records the positioning these hold: *the differentiator
   * is not adaptation, it is the record.* A fourth step ending on "the page
   * adapts" would sell the half a competitor can also claim, so what is
   * asserted is that the undo is still in it.
   */
  it("promises you keep your own components, and does not claim to write code", () => {
    const [first] = stepsOf(home())

    expect(first).toBeDefined()
    expect(String(first?.props["body"])).toContain("never writes code")
  })

  it("ends on what is kept about the change, not on the change", () => {
    const steps = stepsOf(home())
    const last = steps[steps.length - 1]

    expect(last).toBeDefined()
    expect(String(last?.props["body"])).toContain("undo")
  })

  /**
   * Nothing in this band may reach for the vocabulary the brief keeps off the
   * front door. A stranger has no context at all, and this is the band they are
   * most likely to read first now that it sits directly under the opening.
   */
  it("says none of the words a stranger would not know", () => {
    const band = bandOf(home())

    expect(band).toBeDefined()

    const words = band === undefined ? "" : textOf(band).toLowerCase()
    const props = stepsOf(home())
      .flatMap((step) => [step.props["title"], step.props["body"]])
      .join(" ")
      .toLowerCase()
    const said = `${words} ${props}`

    for (const term of ["treedelta", "disposition", "the gate", "primitive", "registry"]) {
      expect(said, term).not.toContain(term)
    }
  })

  it("says the same thing under every palette", () => {
    for (const theme of SITE_THEME_NAMES) {
      expect(
        stepsOf(home(theme)).map((step) => step.props["title"]),
        theme
      ).toEqual(stepsOf(home()).map((step) => step.props["title"]))
    }
  })
})
