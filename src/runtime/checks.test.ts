import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import type { BindingReader } from "../render/reads.js"
import { buildProposal } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"
import type { TreeDelta } from "../tree/delta.js"

import { assessChange, type ChangeAssessment } from "./assessment.js"
import {
  canonicalChecksOf,
  checksContinuityOf,
  describeWiredChecks,
  wiredChecksOf,
  writeCheckSchema,
  WRITE_CHECKS,
  type WriteCheck,
} from "./checks.js"
import { dispositionSchema, type Disposition } from "./disposition.js"
import { gate } from "./gate.js"
import type { CompositionRuntime } from "./pipeline.js"
import { policyFingerprintOf, rulesetContinuityOf } from "./policy-fingerprint.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./policy.js"
import { EVERY_TYPE_UNDECLARED, type PropsVocabulary } from "./vocabulary.js"

const spare = sequentialIdFactory("checks")

const everythingValid: PropsVocabulary = () => ({ outcome: "valid" })
const readsNothingNamed: BindingReader = { bindingsReadBy: () => [] }

/** The optional fields of a type, as a union of their keys. */
type OptionalKeysOf<T> = {
  readonly [K in keyof T]-?: object extends Pick<T, K> ? K : never
}[keyof T]

/**
 * The optional fields of a composition runtime that are not checks. One entry,
 * and it has to be written down for the mapped type below to mean anything.
 *
 * A repairer is the field a reader most expects to find on the other list, and
 * 0248 says why it is here: wiring one moves a deployment's refusal rate
 * considerably and changes no single judgment, because it adds an attempt rather
 * than deciding one. A disposition naming an input that did not take part in it
 * would be recording the wrong thing.
 */
type NotACheck = "repairer"

/**
 * A check for every seam a composition root can hand over, asserted from the
 * runtime's own side.
 *
 * This is the guard rail that `checks.ts` cannot hold for itself. It reads
 * `CompositionRuntime`'s optional fields rather than `WriteCheckSeams`', so a
 * seam added to the runtime is a compile error here until somebody either names
 * the check it performs or says above that it is not one — and a seam renamed or
 * removed is a compile error for the same reason. `SEAM_OF` guards the other
 * direction, so between them there is no way to add either and have the record
 * quietly stay the same size.
 */
const CHECK_OF: {
  readonly [K in Exclude<OptionalKeysOf<CompositionRuntime>, NotACheck>]: WriteCheck
} = {
  propsVocabulary: "props",
  bindingReader: "bindings",
}

describe("the vocabulary", () => {
  it("names one check per seam, and no check without a seam", () => {
    expect([...Object.values(CHECK_OF)].sort()).toEqual([...WRITE_CHECKS].sort())
  })

  it("publishes the checks in the order a composition root meets them", () => {
    expect(WRITE_CHECKS).toEqual(["props", "bindings"])
  })

  it("parses its own members and refuses anything else", () => {
    for (const check of WRITE_CHECKS) expect(writeCheckSchema.parse(check)).toBe(check)

    expect(writeCheckSchema.safeParse("primitive-types").success).toBe(false)
  })
})

describe("wiredChecksOf", () => {
  it("reports nothing for a runtime that wired neither seam", () => {
    expect(wiredChecksOf({})).toEqual([])
  })

  it("reports each seam on its own", () => {
    expect(wiredChecksOf({ propsVocabulary: everythingValid })).toEqual(["props"])
    expect(wiredChecksOf({ bindingReader: readsNothingNamed })).toEqual(["bindings"])
  })

  it("reports both in canonical order however the runtime was written", () => {
    expect(
      wiredChecksOf({ bindingReader: readsNothingNamed, propsVocabulary: everythingValid })
    ).toEqual(["props", "bindings"])
  })

  it("treats a key present and undefined as a seam nobody handed over", () => {
    expect(wiredChecksOf({ propsVocabulary: undefined, bindingReader: undefined })).toEqual([])
  })

  /**
   * Presence and never behaviour. The sentinel declares nothing, so this records
   * a check that will find nothing to object to — which is the honest reading of
   * what the record says, because the runtime cannot read a function and the
   * alternative was to recognise one no-op and believe every other.
   */
  it("records the no-op sentinel as a wired check, because it was handed over", () => {
    expect(wiredChecksOf({ propsVocabulary: EVERY_TYPE_UNDECLARED })).toEqual(["props"])
  })
})

describe("canonicalChecksOf", () => {
  it("puts a list into canonical order", () => {
    expect(canonicalChecksOf(["bindings", "props"])).toEqual(["props", "bindings"])
  })

  it("drops a repeat, because which checks were in place is a membership test", () => {
    expect(canonicalChecksOf(["props", "props"])).toEqual(["props"])
  })

  it("leaves the empty list empty rather than filling it in", () => {
    expect(canonicalChecksOf([])).toEqual([])
  })
})

describe("checksContinuityOf", () => {
  it("says unrecorded when no judgment carried a list", () => {
    expect(checksContinuityOf([])).toBe("unrecorded")
  })

  it("says single when one set of checks judged all of them", () => {
    expect(checksContinuityOf([["props"], ["props"]])).toBe("single")
  })

  it("says single for a run that consistently wired nothing", () => {
    expect(checksContinuityOf([[], [], []])).toBe("single")
  })

  it("reads two spellings of one set as one set", () => {
    expect(checksContinuityOf([["props", "bindings"], ["bindings", "props"]])).toBe("single")
  })

  /** The seam arriving is the case the whole module exists for. */
  it("says changed when a check arrived part way through a run", () => {
    expect(checksContinuityOf([[], ["props"]])).toBe("changed")
  })

  it("says changed when a check was withdrawn", () => {
    expect(checksContinuityOf([["props", "bindings"], ["props"]])).toBe("changed")
  })

  /**
   * No shape half, which is the one way this differs from `rulesetContinuityOf`,
   * and this is the property that makes one unnecessary: what gets compared is
   * the names themselves, so nothing about the version that wrote a list reaches
   * the comparison. A fingerprint carries its shape in front of the colon
   * precisely because it cannot do this.
   */
  it("compares the names themselves, with nothing about the version that wrote them", () => {
    expect(canonicalChecksOf(["props"]).join(",")).toBe("props")
    expect(policyFingerprintOf(defaultGatePolicy)).toContain(":")
  })
})

describe("describeWiredChecks", () => {
  it("gives the empty list a word, so a row does not read as missing data", () => {
    expect(describeWiredChecks([])).toBe("none")
  })

  it("names the checks in canonical order", () => {
    expect(describeWiredChecks(["bindings", "props"])).toBe("props, bindings")
  })
})

const judgedUnder = (
  policy: GatePolicy,
  checkProps?: PropsVocabulary,
  reads?: BindingReader
): { readonly assessment: ChangeAssessment } => {
  const { tree, ids } = sampleTree()

  const delta: TreeDelta = {
    deltaId: spare.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: [{ op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] }],
  }

  const assessed = assessChange(
    tree,
    buildProposal(spare, { intentId: spare.intentId(), delta }),
    policy,
    spare.deltaId(),
    checkProps,
    reads
  )
  if (!assessed.ok) throw new Error(assessed.error.code)

  expect(assessed.value.wiredChecks).toEqual(
    wiredChecksOf({ propsVocabulary: checkProps, bindingReader: reads })
  )

  return { assessment: assessed.value }
}

const judgedWith = (checkProps?: PropsVocabulary, reads?: BindingReader): Disposition =>
  gate(judgedUnder(defaultGatePolicy, checkProps, reads).assessment, defaultGatePolicy)

describe("what a judgment records", () => {
  it("stamps nothing wired as the empty list rather than leaving the field out", () => {
    expect(judgedWith().wiredChecks).toEqual([])
  })

  it("stamps the checks the assessment was handed, on an accepted judgment", () => {
    const disposition = judgedWith(everythingValid, readsNothingNamed)

    expect(disposition.kind).toBe("accepted")
    expect(disposition.wiredChecks).toEqual(["props", "bindings"])
  })

  it("survives the schema a stored judgment is read back through", () => {
    const parsed = dispositionSchema.parse(judgedWith(everythingValid))

    expect(parsed.wiredChecks).toEqual(["props"])
  })

  /**
   * Absent rather than defaulted, which is `policyFingerprint`'s bargain and not
   * `policyId`'s: there is no honest stand-in for *what was wired*, and an empty
   * list here would claim a deployment checked nothing when the truth is that
   * nobody wrote it down.
   */
  it("leaves the field absent on a record written before it existed", () => {
    const { wiredChecks, ...before } = judgedWith(everythingValid)

    expect(wiredChecks).toBeDefined()
    expect(dispositionSchema.parse(before)).not.toHaveProperty("wiredChecks")
  })

  it("refuses a stored list naming a check this version does not have", () => {
    const judgment = { ...judgedWith(), wiredChecks: ["primitive-types"] }

    expect(dispositionSchema.safeParse(judgment).success).toBe(false)
  })
})

/**
 * The argument for the unit, as a test.
 *
 * Two judgments, one policy, one fingerprint — and a props vocabulary wired
 * between them. `rulesetContinuityOf` is right to say the rules held, and on its
 * own it is the whole of what a reader hears.
 */
describe("the week somebody wired a registry in", () => {
  it("reads as one unchanged ruleset, judged by two different write paths", () => {
    const monday = judgedWith()
    const wednesday = judgedWith(everythingValid)

    expect(monday.policyFingerprint).toBe(wednesday.policyFingerprint)
    expect(rulesetContinuityOf([monday, wednesday].map((d) => d.policyFingerprint ?? ""))).toBe(
      "single"
    )

    expect(checksContinuityOf([monday, wednesday].map((d) => d.wiredChecks ?? []))).toBe("changed")
  })

  /**
   * And the two axes stay independent in both directions, which is why this is a
   * second record beside the fingerprint rather than something folded into it.
   */
  it("moves the fingerprint for an edited policy and the list for a rewired runtime, never the other way", () => {
    const stricter = gatePolicySchema.parse({ minimumConfidence: 0.99 })
    const underStricterRules = gate(
      judgedUnder(defaultGatePolicy, everythingValid).assessment,
      stricter
    )
    const sameRulesRewired = judgedWith(everythingValid, readsNothingNamed)
    const sameRulesBare = judgedWith()

    expect(underStricterRules.policyFingerprint).not.toBe(sameRulesBare.policyFingerprint)
    expect(underStricterRules.wiredChecks).toEqual(["props"])

    expect(sameRulesRewired.policyFingerprint).toBe(sameRulesBare.policyFingerprint)
    expect(sameRulesRewired.wiredChecks).not.toEqual(sameRulesBare.wiredChecks)
  })
})
