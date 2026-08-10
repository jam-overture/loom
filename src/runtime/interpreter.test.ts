import { describe, expect, it } from "vitest"

import {
  describeInterpretationError,
  interpretationFault,
  type InterpretationError,
  type InterpretationFault,
} from "./interpreter.js"

/**
 * A record rather than a list, because the compiler then refuses a code that is
 * added to the union and forgotten here. That is the property worth holding: a
 * new failure mode must be classified deliberately rather than falling into
 * someone else's bucket.
 */
const FAULT_OF: Readonly<Record<InterpretationError["code"], InterpretationFault>> = {
  "not-understood": "asker",
  "no-change-needed": "asker",
  refused: "model",
  "malformed-proposal": "model",
  "interpreter-unavailable": "provider",
  "interpreter-misconfigured": "deployment",
  "interpreter-request-rejected": "runtime",
}

const CODES = Object.keys(FAULT_OF) as readonly InterpretationError["code"][]

const errorOf = (code: InterpretationError["code"]): InterpretationError =>
  ({ code, detail: "what the service said" }) as InterpretationError

describe("interpretationFault", () => {
  it.each(CODES)("names who must act on %s", (code) => {
    expect(interpretationFault(errorOf(code))).toBe(FAULT_OF[code])
  })

  /**
   * The distinction day 37 exists to make. Before it, both of these were the
   * same code, and a host could not tell a retry that might work from one that
   * never will.
   */
  it("separates a service that may answer later from a request it will always refuse", () => {
    expect(interpretationFault(errorOf("interpreter-unavailable"))).toBe("provider")
    expect(interpretationFault(errorOf("interpreter-request-rejected"))).toBe("runtime")
  })

  it("blames the deployment, not the provider, when there is no model to reach", () => {
    expect(interpretationFault(errorOf("interpreter-misconfigured"))).toBe("deployment")
  })
})

describe("describeInterpretationError", () => {
  it.each(CODES)("says what happens next for %s, and carries the detail", (code) => {
    const sentence = describeInterpretationError(errorOf(code))

    expect(sentence).toContain("what the service said")
    expect(sentence.length).toBeGreaterThan("what the service said".length)
  })

  it("gives each code its own sentence, so two failures never read alike", () => {
    const sentences = CODES.map((code) => describeInterpretationError(errorOf(code)))

    expect(new Set(sentences).size).toBe(CODES.length)
  })

  it("tells an operator that a misconfiguration will not clear on its own", () => {
    expect(describeInterpretationError(errorOf("interpreter-misconfigured"))).toContain("operator")
  })

  it("tells a caller that an unavailable model may answer later", () => {
    expect(describeInterpretationError(errorOf("interpreter-unavailable"))).toContain("later")
  })

  it("tells a caller that repeating a rejected request would change nothing", () => {
    expect(describeInterpretationError(errorOf("interpreter-request-rejected"))).toContain("unchanged")
  })
})
