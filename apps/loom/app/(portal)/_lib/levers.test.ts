import { describe, expect, it } from "vitest"

import { ceilingFor, defaultGatePolicy, type GatePolicy } from "@jam-overture/loom"

import {
  hrefWith,
  isMoved,
  leversFor,
  movedLevers,
  patchLines,
  policyFrom,
  WHAT_IF_NAME,
  WHAT_IF_PATH,
  type Addressed,
  type Lever,
  type LeverId,
} from "./levers"
import { runtimeWordsIn } from "../_test/plain-language"

const policy: GatePolicy = defaultGatePolicy

const at = (params: Addressed = {}): readonly Lever[] => leversFor(policy, params)

const find = (levers: readonly Lever[], id: LeverId): Lever => {
  const lever = levers.find((entry) => entry.id === id)
  if (lever === undefined) throw new Error(`no lever ${id}`)

  return lever
}

describe("the dials this screen offers", () => {
  it("offers the seven settings a replay can honour and no others", () => {
    expect(at().map((lever) => lever.id)).toEqual([
      "sure-to-act",
      "sure-to-ask",
      "never",
      "allow-visitor",
      "allow-you",
      "allow-site",
      "allow-schedule",
    ])
  })

  /**
   * The whole honesty of the screen, stated as a property: a dial it cannot
   * replay must not exist. `removalThresholds` and the rest decide how risky a
   * change is *measured* to be, and the measurement is a function of the page
   * as it stood — so offering one would answer every question with "nothing
   * would change", which is a lie shaped like a result.
   */
  it("offers nothing that decides how risky a change is measured to be", () => {
    const fields = at().map((lever) => lever.field)

    expect(fields).not.toContain("removalThresholds.medium")
    expect(fields).not.toContain("breadthThreshold")
    expect(fields).not.toContain("shallowDepthThreshold")
    expect(fields).not.toContain("protectedPrimitiveTypes")
    expect(fields).not.toContain("protectedPropKeys")
  })

  it("starts every dial where this deployment really is", () => {
    expect(at().every((lever) => lever.chosen === lever.now)).toBe(true)
    expect(find(at(), "sure-to-act").now).toBe(String(policy.minimumConfidence))
    expect(find(at(), "allow-visitor").now).toBe(ceilingFor(policy, "user-instruction"))
  })

  /**
   * A ceiling the policy has not named is still a ceiling the Gate applies, so
   * the dial has to show the runtime's answer rather than a blank. Taken from
   * `ceilingFor` for the same reason `rules-view.ts` takes it from there: a
   * default guessed in the portal is a claim about what is allowed on somebody's
   * pages that nothing in the runtime made.
   */
  it("shows the runtime's own answer for an origin the policy never named", () => {
    const silent: GatePolicy = { ...policy, autoApplyCeiling: {} }

    expect(find(leversFor(silent, {}), "allow-you").now).toBe("low")
  })

  it("always offers a position for the value this deployment actually has", () => {
    const odd: GatePolicy = { ...policy, minimumConfidence: 0.42 }
    const lever = find(leversFor(odd, {}), "sure-to-act")

    expect(lever.choices.map((choice) => choice.value)).toContain("0.42")
    expect(lever.chosen).toBe("0.42")
  })

  it("reads a position out of the address", () => {
    const lever = find(at({ "sure-to-act": "0.5" }), "sure-to-act")

    expect(lever.chosen).toBe("0.5")
    expect(isMoved(lever)).toBe(true)
  })

  it("ignores a position it does not offer rather than failing", () => {
    expect(find(at({ "sure-to-act": "0.43" }), "sure-to-act").chosen).toBe(
      String(policy.minimumConfidence)
    )
    expect(find(at({ never: "catastrophic" }), "never").chosen).toBe(policy.refusalFloor)
  })

  it("ignores a parameter given twice, rather than taking one of them", () => {
    expect(find(at({ "sure-to-act": ["0.5", "0.9"] }), "sure-to-act").chosen).toBe(
      String(policy.minimumConfidence)
    )
  })

  it("counts only the dials that have moved", () => {
    expect(movedLevers(at())).toEqual([])
    expect(movedLevers(at({ "sure-to-act": "0.5", never: "high" })).map((lever) => lever.id)).toEqual(
      ["sure-to-act", "never"]
    )
  })
})

describe("the policy the dials describe", () => {
  it("is this deployment's policy with nothing else touched", () => {
    expect(policyFrom(policy, at())).toEqual(policy)
  })

  /**
   * Built from the deployment's own policy rather than from the framework's
   * default. A simulation that quietly reverted the ten fields it does not
   * offer would be comparing the record against a policy nobody has ever run.
   */
  it("keeps every field it does not offer", () => {
    const theirs: GatePolicy = {
      ...policy,
      protectedPropKeys: ["href"],
      breadthThreshold: 3,
      policyId: "theirs",
    }

    const asked = policyFrom(theirs, leversFor(theirs, { "sure-to-act": "0.5" }))

    expect(asked.protectedPropKeys).toEqual(["href"])
    expect(asked.breadthThreshold).toBe(3)
    expect(asked.policyId).toBe("theirs")
    expect(asked.minimumConfidence).toBe(0.5)
  })

  it("moves a ceiling for one asker without moving the other three", () => {
    const asked = policyFrom(policy, at({ "allow-visitor": "high" }))

    expect(ceilingFor(asked, "user-instruction")).toBe("high")
    expect(ceilingFor(asked, "developer")).toBe(ceilingFor(policy, "developer"))
    expect(ceilingFor(asked, "system-signal")).toBe(ceilingFor(policy, "system-signal"))
    expect(ceilingFor(asked, "scheduled-adaptation")).toBe(
      ceilingFor(policy, "scheduled-adaptation")
    )
  })

  /**
   * An origin the host left unset gets written out explicitly, which is a real
   * difference and is the right one: the question being asked is *what if this
   * asker's ceiling were X*, and leaving it unset would ask a different
   * question whose answer only happens to match today.
   */
  it("names every asker's ceiling, including the ones the policy left unset", () => {
    const silent: GatePolicy = { ...policy, autoApplyCeiling: {} }
    const asked = policyFrom(silent, leversFor(silent, {}))

    expect(asked.autoApplyCeiling).toEqual({
      "user-instruction": "low",
      developer: "low",
      "system-signal": "low",
      "scheduled-adaptation": "low",
    })
  })
})

describe("the address a dial links to", () => {
  it("is the bare screen while nothing has moved", () => {
    expect(hrefWith(at(), "sure-to-act", String(policy.minimumConfidence))).toBe(WHAT_IF_PATH)
  })

  it("carries the dial being moved", () => {
    expect(hrefWith(at(), "sure-to-act", "0.5")).toBe(`${WHAT_IF_PATH}?sure-to-act=0.5`)
  })

  it("carries the dials already moved alongside it", () => {
    const href = hrefWith(at({ never: "high" }), "sure-to-act", "0.5")

    expect(href).toContain("never=high")
    expect(href).toContain("sure-to-act=0.5")
  })

  /**
   * A position equal to the deployment's own is dropped, so the address only
   * ever names what differs. A parameter restating a current value would read,
   * to anybody the link is sent to, as a proposal to change something.
   */
  it("drops a dial put back where this deployment has it", () => {
    const href = hrefWith(at({ "sure-to-act": "0.5" }), "sure-to-act", String(policy.minimumConfidence))

    expect(href).toBe(WHAT_IF_PATH)
  })

  it("round-trips: the address a dial offers produces the position it offered", () => {
    const href = hrefWith(at(), "allow-visitor", "high")
    const params = Object.fromEntries(new URL(href, "https://example.test").searchParams)

    expect(find(leversFor(policy, params), "allow-visitor").chosen).toBe("high")
  })
})

describe("what to put in your own project", () => {
  it("prints nothing while nothing has moved", () => {
    expect(patchLines(at())).toEqual([])
  })

  it("prints only the fields that moved", () => {
    expect(patchLines(at({ "sure-to-act": "0.5" }))).toEqual(["minimumConfidence: 0.5"])
  })

  it("quotes a level and does not quote a number", () => {
    expect(patchLines(at({ never: "high", "sure-to-ask": "0.5" }))).toEqual([
      "confidenceFloor: 0.5",
      'refusalFloor: "high"',
    ])
  })

  it("names a ceiling by the origin it belongs to", () => {
    expect(patchLines(at({ "allow-schedule": "medium" }))).toEqual([
      'autoApplyCeiling.scheduled-adaptation: "medium"',
    ])
  })
})

describe("the words a reader meets", () => {
  it.each(at().map((lever) => [lever.id, lever.question]))(
    "asks %s as a question rather than as a field name",
    (_id, question) => {
      expect(runtimeWordsIn(question)).toEqual([])
      expect(question.endsWith("?")).toBe(true)
      expect(question.slice(0, 1)).toBe(question.slice(0, 1).toUpperCase())
    }
  )

  it.each(at().map((lever) => [lever.id, lever.reading]))(
    "explains %s without the runtime's vocabulary",
    (_id, reading) => {
      expect(runtimeWordsIn(reading)).toEqual([])
    }
  )

  it("keeps the field names out of everything a reader meets unasked", () => {
    for (const lever of at()) {
      expect(lever.question).not.toContain(lever.field)
      expect(lever.reading).not.toContain(lever.field)
    }
  })

  it("names the screen in a person's words, once", () => {
    expect(runtimeWordsIn(WHAT_IF_NAME)).toEqual([])
    expect(WHAT_IF_NAME.slice(0, 1)).toBe(WHAT_IF_NAME.slice(0, 1).toUpperCase())
  })
})
