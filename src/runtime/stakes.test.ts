import { describe, expect, it } from "vitest"

import { nodeIdSchema } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { endpointIdSchema } from "../submit/endpoint.js"

import type { ChangeAnalysis } from "./analysis.js"
import { defaultGatePolicy, gatePolicySchema } from "./policy.js"
import type { DiscardedWork } from "./proposal.js"
import { assessStakes, stakeFactor, type StakeAssessment } from "./stakes.js"

const analysisOf = (overrides: Partial<ChangeAnalysis> = {}): ChangeAnalysis => ({
  operationCount: 1,
  insertedNodeCount: 0,
  removedNodeCount: 0,
  movedNodeCount: 0,
  configuredNodeCount: 1,
  relocatedNodeCount: 0,
  affectedNodeIds: [],
  touchedPrimitiveTypes: [],
  removedPrimitiveTypes: [],
  relocatedPrimitiveTypes: [],
  configuredPropKeys: [],
  nestedTargets: [],
  redirectedSubmissions: [],
  shallowestAffectedDepth: 5,
  ...overrides,
})

/**
 * The shape-only case: a delta assessed with nothing declared about what it
 * writes over, which is every proposal a model makes.
 */
const stakesOf = (analysis: ChangeAnalysis, policy = defaultGatePolicy): StakeAssessment =>
  assessStakes({ analysis, discards: [] }, policy)

const codesOf = (analysis: ChangeAnalysis, policy = defaultGatePolicy) =>
  stakesOf(analysis, policy).factors.map((factor) => factor.code)

describe("assessStakes baseline", () => {
  it("treats an ordinary deep prop tweak as low stakes with no factors", () => {
    const assessment = stakesOf(analysisOf(), defaultGatePolicy)

    expect(assessment.level).toBe("low")
    expect(assessment.factors).toEqual([])
  })
})

describe("structural factors", () => {
  it("escalates a removal past the medium threshold", () => {
    const assessment = stakesOf(analysisOf({ removedNodeCount: 3 }), defaultGatePolicy)

    expect(assessment.level).toBe("medium")
    expect(assessment.factors[0]?.code).toBe("large-removal")
    expect(assessment.factors[0]?.detail).toContain("3 nodes")
  })

  it("escalates a removal past the high threshold", () => {
    expect(stakesOf(analysisOf({ removedNodeCount: 12 }), defaultGatePolicy).level).toBe("high")
  })

  it("leaves a small removal alone", () => {
    expect(codesOf(analysisOf({ removedNodeCount: 2 }))).toEqual([])
  })

  it("escalates a change that touches many nodes at once", () => {
    const analysis = analysisOf({
      affectedNodeIds: Array.from({ length: 8 }, (_, index) => `n_b${index}` as never),
    })

    expect(codesOf(analysis)).toContain("broad-change")
  })

  it("escalates a structural change near the root", () => {
    const analysis = analysisOf({ movedNodeCount: 1, shallowestAffectedDepth: 1 })

    expect(codesOf(analysis)).toContain("shallow-structural-change")
  })

  it("does not treat a shallow prop tweak as restructuring", () => {
    const analysis = analysisOf({ configuredNodeCount: 1, shallowestAffectedDepth: 0 })

    expect(codesOf(analysis)).toEqual([])
  })
})

describe("vocabulary factors", () => {
  const policy = gatePolicySchema.parse({
    protectedPrimitiveTypes: ["commerce.cart"],
    outOfTreeEffectTypes: ["commerce.checkout"],
    protectedPropKeys: ["href"],
  })

  it("escalates a touched protected primitive to high", () => {
    const analysis = analysisOf({
      touchedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.cart")],
    })

    expect(stakesOf(analysis, policy).level).toBe("high")
  })

  it("escalates a configured protected prop key to high", () => {
    const analysis = analysisOf({ configuredPropKeys: ["href"] })
    const assessment = stakesOf(analysis, policy)

    expect(assessment.level).toBe("high")
    expect(assessment.factors[0]?.detail).toContain("href")
  })

  it("escalates destroying a protected primitive to critical", () => {
    const analysis = analysisOf({
      removedNodeCount: 1,
      touchedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.cart")],
      removedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.cart")],
    })

    expect(stakesOf(analysis, policy).level).toBe("critical")
  })

  it("escalates a relocated protected primitive to high", () => {
    const analysis = analysisOf({
      movedNodeCount: 1,
      relocatedNodeCount: 3,
      relocatedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.cart")],
    })
    const assessment = stakesOf(analysis, policy)

    expect(assessment.level).toBe("high")
    expect(stakeFactor(assessment, "protected-type-relocated")?.detail).toBe(
      "relocates protected commerce.cart"
    )
  })

  it("says relocated rather than touched when a move is all that happened", () => {
    const analysis = analysisOf({
      movedNodeCount: 1,
      relocatedNodeCount: 1,
      relocatedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.cart")],
    })

    expect(codesOf(analysis, policy)).not.toContain("protected-type-touched")
  })

  it("ranks relocating a protected primitive below destroying one", () => {
    const cart = primitiveTypeSchema.parse("commerce.cart")
    const relocated = stakesOf(analysisOf({ relocatedPrimitiveTypes: [cart] }), policy)
    const removed = stakesOf(
      analysisOf({ touchedPrimitiveTypes: [cart], removedPrimitiveTypes: [cart] }),
      policy
    )

    expect(relocated.level).toBe("high")
    expect(removed.level).toBe("critical")
  })

  it("does not raise stakes for an out-of-tree-effect type, which is a reversibility concern", () => {
    const analysis = analysisOf({
      touchedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.checkout")],
    })

    expect(stakesOf(analysis, policy).level).toBe("low")
  })

  it("ignores primitives the host has not declared", () => {
    const analysis = analysisOf({
      touchedPrimitiveTypes: [primitiveTypeSchema.parse("layout.stack")],
    })

    expect(stakesOf(analysis, policy).level).toBe("low")
  })
})

describe("declared discards", () => {
  const node = nodeIdSchema.parse("n_body")
  const other = nodeIdSchema.parse("n_headline")

  const withDiscards = (discards: readonly DiscardedWork[]): StakeAssessment =>
    assessStakes({ analysis: analysisOf(), discards }, defaultGatePolicy)

  it("raises an otherwise unremarkable change to high", () => {
    const assessment = withDiscards([{ revision: 4, nodeIds: [node] }])

    expect(assessment.level).toBe("high")
    expect(assessment.factors.map((factor) => factor.code)).toEqual(["discards-later-work"])
  })

  /**
   * `high` and not `critical` on purpose: critical is where the refusal floor
   * sits, and this is a change a person should get to decide about.
   */
  it("stays below the default refusal floor", () => {
    expect(withDiscards([{ revision: 4, nodeIds: [node] }]).level).not.toBe("critical")
  })

  it("names every revision and counts the distinct nodes", () => {
    const assessment = withDiscards([
      { revision: 4, nodeIds: [node] },
      { revision: 6, nodeIds: [node, other] },
    ])

    expect(stakeFactor(assessment, "discards-later-work")?.detail).toBe(
      "discards work from revisions 4, 6 at 2 nodes"
    )
  })

  it("reads as singular for one revision at one node", () => {
    expect(
      stakeFactor(withDiscards([{ revision: 4, nodeIds: [node] }]), "discards-later-work")?.detail
    ).toBe("discards work from revision 4 at 1 node")
  })

  /** Nothing declared is the ordinary case, and it must cost nothing. */
  it("adds no factor when nothing was declared", () => {
    expect(withDiscards([]).factors).toEqual([])
    expect(stakeFactor(withDiscards([]), "discards-later-work")).toBeUndefined()
  })

  it("is host-independent, so no vocabulary knob suppresses it", () => {
    const permissive = gatePolicySchema.parse({
      protectedPrimitiveTypes: [],
      removalThresholds: { medium: 100, high: 200 },
      breadthThreshold: 100,
    })

    expect(
      assessStakes(
        { analysis: analysisOf(), discards: [{ revision: 2, nodeIds: [node] }] },
        permissive
      ).level
    ).toBe("high")
  })
})

describe("factor aggregation", () => {
  it("takes the highest level while keeping every reason", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["commerce.cart"] })
    const analysis = analysisOf({
      removedNodeCount: 4,
      movedNodeCount: 1,
      shallowestAffectedDepth: 0,
      touchedPrimitiveTypes: [primitiveTypeSchema.parse("commerce.cart")],
    })

    const assessment = stakesOf(analysis, policy)

    expect(assessment.level).toBe("high")
    expect(assessment.factors.map((factor) => factor.code)).toEqual([
      "protected-type-touched",
      "large-removal",
      "shallow-structural-change",
    ])
  })

  it("separates destroying a protected primitive from merely touching one", () => {
    const policy = gatePolicySchema.parse({ protectedPrimitiveTypes: ["commerce.cart"] })
    const cart = primitiveTypeSchema.parse("commerce.cart")

    const touched = stakesOf(analysisOf({ touchedPrimitiveTypes: [cart] }), policy)
    const removed = stakesOf(
      analysisOf({ touchedPrimitiveTypes: [cart], removedPrimitiveTypes: [cart] }),
      policy
    )

    expect(touched.level).toBe("high")
    expect(removed.level).toBe("critical")
  })
})

describe("assessStakes on a nested target", () => {
  const nested = (count: number) =>
    Array.from({ length: count }, (_unused, index) => ({
      nodeId: nodeIdSchema.parse(`n_inner${index}`),
      type: primitiveTypeSchema.parse("loom.action"),
      ancestorId: nodeIdSchema.parse(`n_card${index}`),
      ancestorType: primitiveTypeSchema.parse("loom.card"),
    }))

  it("is critical, which under the default floor is a refusal rather than a question", () => {
    const assessment = stakesOf(analysisOf({ nestedTargets: nested(1) }), defaultGatePolicy)

    expect(assessment.level).toBe("critical")
    expect(stakeFactor(assessment, "nested-target")?.detail).toBe(
      "nests a target inside another: loom.action n_inner0 inside loom.card n_card0"
    )
  })

  it("names every pair, because a reviewer fixes nodes and not a count", () => {
    const assessment = stakesOf(analysisOf({ nestedTargets: nested(2) }), defaultGatePolicy)

    expect(stakeFactor(assessment, "nested-target")?.detail).toBe(
      "nests 2 targets inside another: loom.action n_inner0 inside loom.card n_card0; loom.action n_inner1 inside loom.card n_card1"
    )
  })

  it("says nothing about a change that nests none", () => {
    expect(stakeFactor(stakesOf(analysisOf(), defaultGatePolicy), "nested-target")).toBeUndefined()
  })
})

describe("assessStakes on a redirected submission", () => {
  const redirected = (count: number) =>
    Array.from({ length: count }, (_unused, index) => ({
      nodeId: nodeIdSchema.parse(`n_form${index}`),
      from: endpointIdSchema.parse("newsletter.subscribe"),
      to: endpointIdSchema.parse(`contact.enquiry${index}`),
    }))

  it("is high, not critical: moving a form is a change somebody may legitimately want", () => {
    const assessment = stakesOf(analysisOf({ redirectedSubmissions: redirected(1) }))

    expect(assessment.level).toBe("high")
    expect(stakeFactor(assessment, "redirected-submission")?.detail).toBe(
      "redirects a submission: n_form0 from newsletter.subscribe to contact.enquiry0"
    )
  })

  it("names every form that moved, and both of its ends", () => {
    const assessment = stakesOf(analysisOf({ redirectedSubmissions: redirected(2) }))

    expect(stakeFactor(assessment, "redirected-submission")?.detail).toBe(
      "redirects 2 submissions: n_form0 from newsletter.subscribe to contact.enquiry0; n_form1 from newsletter.subscribe to contact.enquiry1"
    )
  })

  it("says nothing about a change that moves none", () => {
    expect(stakeFactor(stakesOf(analysisOf()), "redirected-submission")).toBeUndefined()
  })

  it("needs no host vocabulary, unlike every protected list", () => {
    const silent = gatePolicySchema.parse({})

    expect(codesOf(analysisOf({ redirectedSubmissions: redirected(1) }), silent)).toContain(
      "redirected-submission"
    )
  })

  it("does not outrank a nested target, which is the one that is simply wrong", () => {
    const assessment = stakesOf(
      analysisOf({
        redirectedSubmissions: redirected(1),
        nestedTargets: [
          {
            nodeId: nodeIdSchema.parse("n_inner"),
            type: primitiveTypeSchema.parse("loom.action"),
            ancestorId: nodeIdSchema.parse("n_card"),
            ancestorType: primitiveTypeSchema.parse("loom.card"),
          },
        ],
      })
    )

    expect(assessment.level).toBe("critical")
  })
})
