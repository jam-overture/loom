import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { buildProposal } from "../testing/doubles.js"
import {
  boundTree,
  formTree,
  sampleTree,
  type BoundTree,
  type FormTree,
  type SampleTree,
} from "../testing/fixtures.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"

import { assessChange, type ChangeAssessment } from "./assessment.js"
import { dispositionReasonCodeSchema } from "./disposition.js"
import { ESCALATION_LADDER, gate } from "./gate.js"
import type { IntentOrigin } from "./intent.js"
import type { DiscardedWork } from "./proposal.js"
import { policyFingerprintOf } from "./policy-fingerprint.js"
import { defaultGatePolicy, gatePolicySchema, type GatePolicy } from "./policy.js"

const spare = sequentialIdFactory("gate")

type Scenario = {
  readonly build: (ids: SampleTree["ids"]) => TreeOperation[]
  readonly policy?: GatePolicy
  readonly origin?: IntentOrigin
  readonly confidence?: number
  /** What the proposal declares it writes over — only an in-runtime interpreter sets this. */
  readonly discards?: (ids: SampleTree["ids"]) => readonly DiscardedWork[]
}

const assessmentFor = (scenario: Scenario): ChangeAssessment => {
  const { tree, ids } = sampleTree()

  const delta: TreeDelta = {
    deltaId: spare.deltaId(),
    treeId: tree.treeId,
    baseRevision: tree.revision,
    operations: scenario.build(ids),
  }

  const declared = buildProposal(spare, {
    intentId: spare.intentId(),
    delta,
    ...(scenario.origin ? { origin: scenario.origin } : {}),
    ...(scenario.confidence === undefined ? {} : { confidence: scenario.confidence }),
  })

  const proposal =
    scenario.discards === undefined ? declared : { ...declared, discards: scenario.discards(ids) }

  const assessed = assessChange(tree, proposal, scenario.policy ?? defaultGatePolicy, spare.deltaId())
  if (!assessed.ok) throw new Error(assessed.error.code)

  return assessed.value
}

const decide = (scenario: Scenario) =>
  gate(assessmentFor(scenario), scenario.policy ?? defaultGatePolicy)

/** A deep, small, fully reversible prop tweak — the uncontroversial baseline. */
const tweak = (ids: SampleTree["ids"]): TreeOperation[] => [
  { op: "configure", nodeId: ids.body, set: { value: "Rewritten" }, unset: [] },
]

describe("acceptance", () => {
  it("accepts a low-stakes, reversible, confident change", () => {
    const disposition = decide({ build: tweak })

    expect(disposition.kind).toBe("accepted")
    expect(disposition.reason.code).toBe("within-policy")
    expect(disposition.stakes).toBe("low")
    expect(disposition.reversible).toBe(true)
  })

  it("carries the inputs it decided on into the disposition", () => {
    const disposition = decide({ build: tweak, confidence: 0.95 })

    expect(disposition.confidence).toBe(0.95)
  })
})

describe("confidence rules", () => {
  it("refuses a change the interpreter is barely guessing at", () => {
    const disposition = decide({ build: tweak, confidence: 0.1 })

    expect(disposition.kind).toBe("rejected")
    expect(disposition.reason.code).toBe("confidence-below-floor")
  })

  it("asks for confirmation when confidence is merely low", () => {
    const disposition = decide({ build: tweak, confidence: 0.5 })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("confidence-below-minimum")
  })

  it("accepts at exactly the minimum", () => {
    expect(decide({ build: tweak, confidence: 0.7 }).kind).toBe("accepted")
  })
})

describe("stakes rules", () => {
  it("asks for confirmation when stakes exceed the origin's ceiling", () => {
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.main }],
      origin: "system-signal",
    })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("stakes-above-ceiling")
    expect(disposition.stakes).toBe("medium")
  })

  it("auto-applies the same change when a human asked for it explicitly", () => {
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.main }],
      origin: "user-instruction",
    })

    expect(disposition.kind).toBe("accepted")
  })

  it("refuses outright at the refusal floor, whoever asked", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"] })
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.card }],
      policy,
      origin: "user-instruction",
    })

    expect(disposition.kind).toBe("rejected")
    expect(disposition.reason.code).toBe("stakes-at-refusal-floor")
    expect(disposition.stakes).toBe("critical")
  })

  it("decides the same relocation the same way however the delta phrased it", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"] })
    const byCard = decide({
      build: (ids) => [{ op: "move", nodeId: ids.card, parentId: ids.header, index: 0 }],
      policy,
      origin: "system-signal",
    })
    const bySlot = decide({
      build: (ids) => [{ op: "move", nodeId: ids.main, parentId: ids.header, index: 0 }],
      policy,
      origin: "system-signal",
    })

    expect(byCard.stakes).toBe("high")
    expect(bySlot.stakes).toBe("high")
    expect(bySlot.reason.detail).toContain("relocates protected loom.card")
  })

  it("explains a refusal with the factors that caused it", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"], refusalFloor: "high" })
    const disposition = decide({
      build: (ids) => [{ op: "configure", nodeId: ids.card, set: { variant: "x" }, unset: [] }],
      policy,
    })

    expect(disposition.reason.detail).toContain("loom.card")
  })
})

describe("reversibility rules", () => {
  it("escalates an irreversible change even when it is small, low-stakes, and confident", () => {
    const policy = gatePolicySchema.parse({ outOfTreeEffectTypes: ["loom.card"] })

    const disposition = decide({
      build: (ids) => [{ op: "configure", nodeId: ids.card, set: { variant: "x" }, unset: [] }],
      policy,
      origin: "user-instruction",
    })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("irreversible")
    expect(disposition.reversible).toBe(false)
    expect(disposition.stakes).toBe("low")
  })

  it("escalates a change whose undo would exceed the retention budget", () => {
    const policy = gatePolicySchema.parse({ inverseRetentionBudget: 1 })
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.main }],
      policy,
      origin: "user-instruction",
    })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("irreversible")
  })
})

/**
 * A change can write over work already in the log without its delta showing it
 * (0035). The declaration reaches the Gate as a stakes factor; these are the
 * rules that make the declaration mean something.
 */
describe("discarded work", () => {
  const overOneRevision = (ids: SampleTree["ids"]): readonly DiscardedWork[] => [
    { revision: 4, nodeIds: [ids.body] },
  ]

  it("holds a change that discards later work, and says so", () => {
    const disposition = decide({ build: tweak, discards: overOneRevision })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("discards-later-work")
    expect(disposition.reason.detail).toContain("revision 4")
    expect(disposition.stakes).toBe("high")
  })

  /**
   * The rule this one exists for. A `high` factor is above the `medium` ceiling
   * a user instruction gets and *at* the one a developer gets, so the ceiling
   * alone would auto-apply exactly the same change for the wider origin.
   */
  it("holds it for an origin whose ceiling would otherwise allow it", () => {
    const disposition = decide({ build: tweak, origin: "developer", discards: overOneRevision })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("discards-later-work")
  })

  it("holds it for a policy that trusts every origin completely", () => {
    const trusting = gatePolicySchema.parse({
      autoApplyCeiling: { developer: "critical", "user-instruction": "critical" },
    })

    const disposition = decide({
      build: tweak,
      policy: trusting,
      origin: "developer",
      discards: overOneRevision,
    })

    expect(disposition.kind).toBe("requires-confirmation")
  })

  it("leaves a change that declares nothing exactly where it was", () => {
    expect(decide({ build: tweak }).kind).toBe("accepted")
  })

  /** The floor stays sovereign: a host may declare this much damage refusable. */
  it("refuses rather than holds when the host's floor reaches it", () => {
    const strict = gatePolicySchema.parse({ refusalFloor: "high" })
    const disposition = decide({ build: tweak, policy: strict, discards: overOneRevision })

    expect(disposition.kind).toBe("rejected")
    expect(disposition.reason.code).toBe("stakes-at-refusal-floor")
    expect(disposition.reason.detail).toContain("discards work from revision 4")
  })

  it("is refused outright when the interpreter was barely guessing", () => {
    const disposition = decide({ build: tweak, confidence: 0.1, discards: overOneRevision })

    expect(disposition.reason.code).toBe("confidence-below-floor")
  })
})

describe("rule precedence", () => {
  it("refuses rather than asks when both would fire", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["loom.card"] })
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.card }],
      policy,
      confidence: 0.1,
    })

    expect(disposition.kind).toBe("rejected")
    expect(disposition.reason.code).toBe("confidence-below-floor")
  })

  it("reports irreversibility ahead of an exceeded stakes ceiling", () => {
    const policy = gatePolicySchema.parse({ inverseRetentionBudget: 1 })
    const disposition = decide({
      build: (ids) => [{ op: "remove", nodeId: ids.main }],
      policy,
      origin: "system-signal",
    })

    expect(disposition.reason.code).toBe("irreversible")
  })

  /**
   * Both hold, so the order only chooses the wording — and "this cannot be
   * undone" is the graver of the two things to tell someone.
   */
  it("reports irreversibility ahead of discarded work", () => {
    const policy = gatePolicySchema.parse({ outOfTreeEffectTypes: ["loom.card"] })
    const disposition = decide({
      build: (ids) => [{ op: "configure", nodeId: ids.card, set: { variant: "x" }, unset: [] }],
      policy,
      discards: (ids) => [{ revision: 4, nodeIds: [ids.card] }],
    })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("irreversible")
  })
})

/**
 * A disposition that cannot say what it was decided under is a verdict with no
 * standard behind it — reproducible only if the reader already knows which
 * policy was in force, which is exactly what they are asking.
 */
describe("attribution", () => {
  it("names the policy on every verdict it can reach", () => {
    const named = gatePolicySchema.parse({
      policyId: "storefront",
      protectedPrimitiveTypes: ["loom.card"],
      refusalFloor: "high",
      minimumConfidence: 0.9,
    })

    const verdicts = [
      decide({ build: tweak, policy: named }),
      decide({ build: tweak, policy: named, confidence: 0.5 }),
      decide({ build: (ids) => [{ op: "remove", nodeId: ids.card }], policy: named }),
    ]

    expect(verdicts.map((verdict) => verdict.kind)).toEqual([
      "accepted",
      "requires-confirmation",
      "rejected",
    ])
    expect(verdicts.every((verdict) => verdict.policyId === "storefront")).toBe(true)
  })

  it("names the policy that decided, not the one the assessment was made under", () => {
    const assessment = assessmentFor({ build: tweak })
    const other = gatePolicySchema.parse({ policyId: "elsewhere" })

    expect(gate(assessment, other).policyId).toBe("elsewhere")
  })

  /**
   * The name is what a host can look up; the fingerprint is what proves the name
   * still means what it meant when the verdict was written (0048). Both are
   * stamped in the same place, for the same reason: a caller could supply either
   * one and name a standard the rules did not consult.
   */
  it("fingerprints the policy on every verdict it can reach", () => {
    const named = gatePolicySchema.parse({ policyId: "storefront", refusalFloor: "high" })
    const expected = policyFingerprintOf(named)

    const verdicts = [
      decide({ build: tweak, policy: named }),
      decide({ build: tweak, policy: named, confidence: 0.5 }),
      decide({ build: (ids) => [{ op: "remove", nodeId: ids.card }], policy: named }),
    ]

    expect(verdicts.every((verdict) => verdict.policyFingerprint === expected)).toBe(true)
  })

  it("tells two policies sharing a name apart by what they contain", () => {
    const assessment = assessmentFor({ build: tweak })
    const before = gatePolicySchema.parse({ policyId: "storefront", breadthThreshold: 8 })
    const edited = gatePolicySchema.parse({ policyId: "storefront", breadthThreshold: 40 })

    const [first, second] = [gate(assessment, before), gate(assessment, edited)]

    expect(first.policyId).toBe(second.policyId)
    expect(first.policyFingerprint).not.toBe(second.policyFingerprint)
  })

  it("gives one policy under two names the same fingerprint, so a rename is not an edit", () => {
    const assessment = assessmentFor({ build: tweak })
    const before = gatePolicySchema.parse({ policyId: "storefront", minimumConfidence: 0.8 })
    const renamed = gatePolicySchema.parse({ policyId: "storefront-v2", minimumConfidence: 0.8 })

    expect(gate(assessment, renamed).policyFingerprint).toBe(
      gate(assessment, before).policyFingerprint
    )
  })
})

describe("purity", () => {
  it("returns the same disposition for the same inputs", () => {
    const assessment = assessmentFor({ build: tweak })

    expect(gate(assessment, defaultGatePolicy)).toEqual(gate(assessment, defaultGatePolicy))
  })
})

/**
 * A form's destination is the one prop whose meaning is where a stranger's data
 * goes, so the rule that holds it is the one 0035 established for discarded
 * work: a level cannot say "never auto-apply" while ceilings are per origin.
 */
describe("a change of destination", () => {
  type FormScenario = {
    readonly policy?: GatePolicy
    readonly origin?: IntentOrigin
    readonly build: (ids: FormTree["ids"]) => TreeOperation[]
  }

  const decideOnForm = (scenario: FormScenario) => {
    const { tree, ids } = formTree()
    const policy = scenario.policy ?? defaultGatePolicy

    const proposal = buildProposal(spare, {
      intentId: spare.intentId(),
      delta: {
        deltaId: spare.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: scenario.build(ids),
      },
      ...(scenario.origin ? { origin: scenario.origin } : {}),
    })

    const assessed = assessChange(tree, proposal, policy, spare.deltaId())
    if (!assessed.ok) throw new Error(assessed.error.code)

    return gate(assessed.value, policy)
  }

  const repoint = (ids: FormTree["ids"]): TreeOperation[] => [
    {
      op: "configure",
      nodeId: ids.form,
      set: { "loom:submit": { to: "contact.enquiry" } },
      unset: [],
    },
  ]

  it("holds a change that moves where a form posts, and names both ends", () => {
    const disposition = decideOnForm({ build: repoint })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("redirected-submission")
    expect(disposition.reason.detail).toContain("newsletter.subscribe")
    expect(disposition.reason.detail).toContain("contact.enquiry")
    expect(disposition.stakes).toBe("high")
  })

  it("holds it for an origin whose ceiling would otherwise allow it", () => {
    const disposition = decideOnForm({ build: repoint, origin: "developer" })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("redirected-submission")
  })

  it("holds it for a policy that trusts every origin completely", () => {
    const trusting = gatePolicySchema.parse({
      autoApplyCeiling: { developer: "critical", "user-instruction": "critical" },
    })

    expect(decideOnForm({ build: repoint, policy: trusting, origin: "developer" }).kind).toBe(
      "requires-confirmation"
    )
  })

  /** The floor stays sovereign, exactly as it does for discarded work. */
  it("refuses rather than holds when the host's floor reaches it", () => {
    const strict = gatePolicySchema.parse({ refusalFloor: "high" })
    const disposition = decideOnForm({ build: repoint, policy: strict })

    expect(disposition.kind).toBe("rejected")
    expect(disposition.reason.code).toBe("stakes-at-refusal-floor")
  })

  it("accepts a form that gains a destination, which is a new form and not a moved one", () => {
    const disposition = decideOnForm({
      build: (ids) => [
        {
          op: "configure",
          nodeId: ids.aside,
          set: { "loom:submit": { to: "contact.enquiry" } },
          unset: [],
        },
      ],
    })

    expect(disposition.kind).toBe("accepted")
  })

  it("leaves a change that touches no destination exactly where it was", () => {
    const disposition = decideOnForm({
      build: (ids) => [{ op: "configure", nodeId: ids.form, set: { legend: "Sign up" }, unset: [] }],
    })

    expect(disposition.kind).toBe("accepted")
  })
})

/**
 * The same rule at the other end of the same pipe: a binding decides which of a
 * host's data reaches a public page, so moving one is held for a person for
 * every reason moving a destination is (0163).
 */
describe("a change of what is asked for", () => {
  type BoundScenario = {
    readonly policy?: GatePolicy
    readonly origin?: IntentOrigin
    readonly build: (ids: BoundTree["ids"]) => TreeOperation[]
  }

  const decideOnBinding = (scenario: BoundScenario) => {
    const { tree, ids } = boundTree()
    const policy = scenario.policy ?? defaultGatePolicy

    const proposal = buildProposal(spare, {
      intentId: spare.intentId(),
      delta: {
        deltaId: spare.deltaId(),
        treeId: tree.treeId,
        baseRevision: tree.revision,
        operations: scenario.build(ids),
      },
      ...(scenario.origin ? { origin: scenario.origin } : {}),
    })

    const assessed = assessChange(tree, proposal, policy, spare.deltaId())
    if (!assessed.ok) throw new Error(assessed.error.code)

    return gate(assessed.value, policy)
  }

  const rebind = (ids: BoundTree["ids"]): TreeOperation[] => [
    {
      op: "configure",
      nodeId: ids.bound,
      set: { "loom:data": { items: { source: "orders.mine", params: {} } } },
      unset: [],
    },
  ]

  it("holds a change that moves what a region reads, and names both ends", () => {
    const disposition = decideOnBinding({ build: rebind })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("repointed-binding")
    expect(disposition.reason.detail).toContain("catalogue.services")
    expect(disposition.reason.detail).toContain("orders.mine")
    expect(disposition.stakes).toBe("high")
  })

  it("holds it for an origin whose ceiling would otherwise allow it", () => {
    const disposition = decideOnBinding({ build: rebind, origin: "developer" })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("repointed-binding")
  })

  it("holds it for a policy that trusts every origin completely", () => {
    const trusting = gatePolicySchema.parse({
      autoApplyCeiling: { developer: "critical", "user-instruction": "critical" },
    })

    expect(decideOnBinding({ build: rebind, policy: trusting, origin: "developer" }).kind).toBe(
      "requires-confirmation"
    )
  })

  /** The floor stays sovereign, exactly as it does for a moved destination. */
  it("refuses rather than holds when the host's floor reaches it", () => {
    const strict = gatePolicySchema.parse({ refusalFloor: "high" })
    const disposition = decideOnBinding({ build: rebind, policy: strict })

    expect(disposition.kind).toBe("rejected")
    expect(disposition.reason.code).toBe("stakes-at-refusal-floor")
  })

  /**
   * The case the finding was filed about: before this rule, the workaround was
   * for a host to put `loom:data` in `protectedPropKeys`, which no default
   * deployment does. It still works, and it is no longer the only thing between
   * a repointed binding and a silent apply.
   */
  it("holds it without the host protecting the prop key, which is the point", () => {
    const silent = gatePolicySchema.parse({})
    const disposition = decideOnBinding({ build: rebind, policy: silent })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("repointed-binding")
  })

  it("holds a change that asks the same source for something else", () => {
    const disposition = decideOnBinding({
      build: (ids) => [
        {
          op: "configure",
          nodeId: ids.bound,
          set: { "loom:data": { items: { source: "catalogue.services", params: { limit: 6 } } } },
          unset: [],
        },
      ],
    })

    expect(disposition.kind).toBe("requires-confirmation")
    expect(disposition.reason.code).toBe("repointed-binding")
    expect(disposition.reason.detail).toContain("for something else")
  })

  it("accepts a region that gains a binding, which shows something new and moves nothing", () => {
    const disposition = decideOnBinding({
      build: (ids) => [
        {
          op: "configure",
          nodeId: ids.aside,
          set: { "loom:data": { items: { source: "orders.mine", params: {} } } },
          unset: [],
        },
      ],
    })

    expect(disposition.kind).toBe("accepted")
  })

  it("leaves a change that touches no binding exactly where it was", () => {
    const disposition = decideOnBinding({
      build: (ids) => [
        { op: "configure", nodeId: ids.bound, set: { title: "Our services" }, unset: [] },
      ],
    })

    expect(disposition.kind).toBe("accepted")
  })
})

/**
 * The ladder as a published list, which is what four surfaces describe in prose.
 *
 * A record states how many rungs there are, a lesson teaches them in order, a
 * documentation page names them and a portal shows a reader which one fired.
 * Each of those was a count taken by reading this file, and a count taken by
 * reading a file is wrong from the first time the file changes — which has now
 * happened twice, once unnoticed for a week.
 */
describe("the escalation ladder, published", () => {
  it("is the rules themselves, in the order they are consulted", () => {
    expect(ESCALATION_LADDER).toEqual([
      "confidence-below-floor",
      "stakes-at-refusal-floor",
      "irreversible",
      "discards-later-work",
      "redirected-submission",
      "repointed-binding",
      "stakes-above-ceiling",
      "confidence-below-minimum",
    ])
  })

  /**
   * The check that would have caught the stale count: every reason code the
   * schema declares is either a rung or the acceptance, and every rung appears
   * once. A rule added without a code, or a code added without a rule, fails
   * here rather than a week later in somebody's lesson.
   */
  it("accounts for every reason code a disposition can carry", () => {
    expect([...ESCALATION_LADDER].sort()).toEqual(
      dispositionReasonCodeSchema.options.filter((code) => code !== "within-policy").sort()
    )
  })

  it("names each rung once", () => {
    expect(new Set(ESCALATION_LADDER).size).toBe(ESCALATION_LADDER.length)
  })
})
