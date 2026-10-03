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
   * The shape is the argument. It was two and two until 1 October, when the
   * maintainer made the third beat *hook up your preferred AI model* — which is
   * a thing you do rather than a thing that happens, and he was right: wiring a
   * model is real setup work and the band had quietly left it out. So it is
   * three you set up and one that then runs on every visit, and the heading
   * moved with it.
   */
  it("is three things you set up, and one that then keeps happening", () => {
    const steps = stepsOf(home())

    expect(steps.map((step) => step.props["state"])).toEqual([
      "done",
      "done",
      "done",
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
   * Step one is the reassurance and step four is the governance claim, and both
   * are a sentence somebody could tidy away without any check noticing.
   *
   * **These assert the claim rather than the wording**, which they did not on
   * 30 September and which cost this suite two failures when the maintainer
   * rewrote the band into plain language on 1 October. A test that pins
   * *"never writes code"* fails on *"does not write code"* while the page is
   * saying exactly the same thing, and a test that fails for that reason
   * teaches the next run to write around it.
   */
  it("promises you keep your own components, and does not claim to write code", () => {
    const [first] = stepsOf(home())

    expect(first).toBeDefined()

    const body = String(first?.props["body"]).toLowerCase()

    expect(body).toMatch(/\b(does not|never|doesn't)\b[^.]*\bwrite[s]? code\b/)
  })

  /**
   * The last beat, and what it may and may not be quietly reduced to.
   *
   * It carries three claims now, and they are the maintainer's of 1 October:
   * **the policy is defined up front**, **only changes already approved are
   * made**, and **a rejection comes with a reason**. The last of those is the
   * one that separates this from every tool that merely refuses.
   *
   * It no longer carries *written down* and *reversible*. That is deliberate
   * rather than a loss: both moved up into the definition band's plain-words
   * line and are still on the page, which the test below holds. Crowding all
   * five claims into one step is what made this sentence unreadable in the
   * first place.
   */
  it("ends on the policy, the approval and the reason for a refusal", () => {
    const steps = stepsOf(home())
    const last = steps[steps.length - 1]

    expect(last).toBeDefined()
    expect(String(last?.props["title"])).toContain("your rules")

    const body = String(last?.props["body"]).toLowerCase()

    expect(body).toContain("policy")
    expect(body).toContain("approved")
    expect(body).toMatch(/reject(ed)?/)
    expect(body).toContain("why")
  })

  /**
   * The record and the undo are the recorded differentiator
   * (`docs/rollout.md`: *the differentiator is not adaptation, it is the
   * record*), so they may move around the page but may not leave it. Asserted
   * over the whole front door rather than over one band, because which band
   * carries them is a layout decision and this is not.
   */
  it("still promises the record and the undo, somewhere on the front door", () => {
    const words = textOf(home().root).toLowerCase()

    expect(words).toMatch(/see every change|see everything/)
    expect(words).toMatch(/undo|put .* back/)
  })

  /**
   * Step three is the one claim in the band that is about somebody else's
   * software, so it is the one a reader could catch us overstating. It is true:
   * `modelInterpreter` takes a `ModelClient`, and the Anthropic adapter is the
   * only file in the runtime that knows a vendor exists — behind its own entry
   * point, so a host bringing its own model never loads it.
   */
  it("does not name a vendor in the step about choosing one", () => {
    const steps = stepsOf(home())
    const said = steps.map((step) => `${step.props["title"]} ${step.props["body"]}`).join(" ")

    for (const vendor of ["Anthropic", "OpenAI", "Claude", "GPT", "Gemini"]) {
      expect(said, vendor).not.toContain(vendor)
    }
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
