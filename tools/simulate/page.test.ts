import type { NodeId } from "../../src/ids.js"

import { SIGN_IN_GOAL, START_GOAL, STARTS_HIGH, STARTS_LOW } from "./fixtures.js"
import { bandsOf, featuresOf } from "./page.js"

describe("a page as a simulated reader meets it", () => {
  it("is the elements directly under the root, each band with everything inside it", () => {
    const bands = bandsOf(STARTS_LOW)

    expect(bands).toHaveLength(6)
    expect(bands.map((band) => band.elements[0]?.node.type)).toEqual([
      "loom.section",
      "loom.section",
      "loom.section",
      "loom.section",
      "loom.section",
      "loom.footer",
    ])
    expect(
      bands
        .flatMap((band) => band.elements)
        .some((element) => element.node.id === STARTS_LOW.root.id)
    ).toBe(false)
  })

  it("carries each element's addressed ancestry, nearest first", () => {
    const start = bandsOf(STARTS_LOW)
      .flatMap((band) => band.elements)
      .find((element) => element.node.id === START_GOAL.nodeId)

    expect(start?.within.map((above) => above.type)).toEqual(["loom.section", "loom.page"])
  })

  it("says what comes before the goal's part, in reading order", () => {
    expect(featuresOf(bandsOf(STARTS_LOW), START_GOAL)).toEqual({
      bandCount: 6,
      goalBand: 4,
      wordsBeforeGoal: 249,
      controlsBeforeGoal: 2,
      codeBeforeGoal: true,
      priceBeforeGoal: true,
      goalIsSignIn: false,
      topHeadings: "make your web page dynamic with ai and loom what it does",
    })
    expect(featuresOf(bandsOf(STARTS_HIGH), START_GOAL)).toMatchObject({
      goalBand: 1,
      wordsBeforeGoal: 19,
      controlsBeforeGoal: 0,
      codeBeforeGoal: false,
      priceBeforeGoal: false,
    })
  })

  it("knows a way to sign in by its words", () => {
    expect(featuresOf(bandsOf(STARTS_LOW), SIGN_IN_GOAL).goalIsSignIn).toBe(true)
  })

  it("has no goal band when the page does not have the part, and counts the whole page as before it", () => {
    const missing = featuresOf(bandsOf(STARTS_LOW), {
      kind: "activated",
      nodeId: "n_nowhere" as NodeId,
    })

    expect(missing.goalBand).toBeUndefined()
    expect(missing.goalIsSignIn).toBe(false)
    expect(missing.controlsBeforeGoal).toBe(5)
  })
})
