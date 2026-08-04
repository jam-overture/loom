import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { buildIntent } from "../testing/doubles.js"
import { sampleTree } from "../testing/fixtures.js"

import { fixedPolicy, type PolicyContext } from "./policy-source.js"
import { defaultGatePolicy, gatePolicySchema } from "./policy.js"

const ids = sequentialIdFactory("ps")

const contextFor = (): PolicyContext => {
  const { tree } = sampleTree()

  return {
    tree,
    intent: buildIntent(ids, { treeId: tree.treeId, baseRevision: tree.revision }),
  }
}

describe("fixedPolicy", () => {
  it("answers with the same policy whatever it is asked about", () => {
    const policy = gatePolicySchema.parse({ policyId: "storefront", minimumConfidence: 0.9 })
    const source = fixedPolicy(policy)

    expect(source.resolve(contextFor())).toBe(policy)
    expect(source.resolve(contextFor())).toBe(policy)
  })

  it("carries the policy's own name through, rather than inventing one", () => {
    expect(fixedPolicy(defaultGatePolicy).resolve(contextFor()).policyId).toBe("default")
  })
})

/**
 * The seam is only worth having if a host can actually branch on the ask. These
 * are the two branches a host reaches for first — who asked, and about what.
 */
describe("a host-written source", () => {
  const strict = gatePolicySchema.parse({ policyId: "strict", minimumConfidence: 0.95 })
  const relaxed = gatePolicySchema.parse({ policyId: "relaxed", minimumConfidence: 0.4 })

  it("can vary the policy by who is asking", () => {
    const source = {
      resolve: ({ intent }: PolicyContext) =>
        intent.origin === "developer" ? relaxed : strict,
    }

    const context = contextFor()

    expect(source.resolve(context).policyId).toBe("strict")
    expect(
      source.resolve({ ...context, intent: { ...context.intent, origin: "developer" } }).policyId
    ).toBe("relaxed")
  })

  it("can vary the policy by which tree is being changed", () => {
    const context = contextFor()
    const elsewhere: PolicyContext = {
      ...context,
      tree: { ...context.tree, treeId: ids.treeId() },
    }

    const source = {
      resolve: ({ tree }: PolicyContext) => (tree.treeId === context.tree.treeId ? strict : relaxed),
    }

    expect(source.resolve(context).policyId).toBe("strict")
    expect(source.resolve(elsewhere).policyId).toBe("relaxed")
  })
})
