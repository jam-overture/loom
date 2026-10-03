import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { defaultGatePolicy } from "@jam-overture/loom"

import { leversFor, type Addressed } from "@/app/(portal)/_lib/levers"
import { runtimeWordsIn } from "@/app/(portal)/_test/plain-language"
import { recordOf, surfaceOf } from "@/app/(portal)/_test/rendered"

import { PolicyPatch } from "./policy-patch"

const patch = (params: Addressed = {}) =>
  render(<PolicyPatch levers={leversFor(defaultGatePolicy, params)} />)

describe("what to put in your own project", () => {
  /**
   * Nothing to copy until something has been asked. A block of code offering
   * the settings somebody already has is an instruction to change nothing,
   * printed in the one place a reader is most likely to paste without reading.
   */
  it("draws nothing while no dial has moved", () => {
    expect(patch().container.textContent).toBe("")
  })

  it("prints only the settings that moved", () => {
    const { container } = patch({ "sure-to-act": "0.5" })

    expect(container.querySelector("pre")?.textContent).toBe("minimumConfidence: 0.5")
  })

  it("prints a level as something a project could compile", () => {
    const { container } = patch({ never: "high" })

    expect(container.querySelector("pre")?.textContent).toBe('refusalFloor: "high"')
  })

  /**
   * The sentence that has to survive every rewrite of this screen: a
   * simulation does not change a policy, and the reason it does not is that a
   * policy belongs in the host's repository where changes are reviewed.
   */
  it("says plainly that nothing above has changed anything", () => {
    expect(surfaceOf(patch({ "sure-to-act": "0.5" }).container)).toContain(
      "Nothing above has changed anything"
    )
  })

  it("reads plainly, with the field names in the record rather than the sentence", () => {
    const { container } = patch({ "allow-visitor": "high" })

    expect(runtimeWordsIn(surfaceOf(container).replace(/autoApplyCeiling\S*/gu, ""))).toEqual([])
    expect(recordOf(container)).toContain("GatePolicy")
  })

  it("offers nothing to press", () => {
    const { container } = patch({ "sure-to-act": "0.5" })

    expect(container.querySelectorAll("button")).toHaveLength(0)
    expect(container.querySelectorAll("form")).toHaveLength(0)
  })
})
