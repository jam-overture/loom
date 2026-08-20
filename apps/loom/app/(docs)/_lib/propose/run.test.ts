import { sequentialIdFactory } from "@loom/runtime"
import { describe, expect, it } from "vitest"

import { docsExamples } from "../examples/catalogue"

import { docsGatePolicy, DOCS_POLICY_ID } from "./policy"
import { availableDocsPresets, DOCS_PRESETS, docsPresetById } from "./presets"
import {
  confirmDocsChange,
  docsChangeNamespace,
  heldProposal,
  proposeDocsChange,
  treeAfter,
} from "./run"

/**
 * What the propose-a-change box promises, held to it.
 *
 * §4c settles that every example has a working box beside it, and "working"
 * here means something specific: the change a reader asks for goes through the
 * runtime's own pipeline and the verdict on the page is the Gate's, not a
 * caption. So these tests assert the *verdicts*, and they assert them from the
 * same functions the component calls — a page that showed "requires
 * confirmation" beside a change the Gate accepts would be the worst kind of
 * documentation, and there is no way to notice that by looking at it.
 */

const exampleTree = (id: string) => {
  const example = docsExamples.get(id)
  if (example === undefined) throw new Error(`no example is registered as "${id}"`)

  return example.build()
}

const propose = (exampleId: string, presetId: string, step = 1) => {
  const preset = docsPresetById(presetId)
  if (preset === undefined) throw new Error(`no preset is registered as "${presetId}"`)

  return proposeDocsChange({ exampleId, tree: exampleTree(exampleId), preset, step })
}

describe("the documentation's Gate policy", () => {
  it("names itself, so a disposition can say what judged it", () => {
    expect(docsGatePolicy.policyId).toBe(DOCS_POLICY_ID)
  })

  it("protects the primitive the pages say it protects", () => {
    expect(docsGatePolicy.protectedPrimitiveTypes).toContain("loom.heading")
  })

  /**
   * The point of deriving it. A hand-written map would still contain
   * `loom.card` on the day the library gave a second primitive an `href`, and
   * nothing would say so.
   */
  it("derives its interactive vocabulary from what the primitives declared", () => {
    expect(docsGatePolicy.interactiveTypes["loom.action"]).toBe("always")
    expect(docsGatePolicy.interactiveTypes["loom.card"]).toEqual({ whenProps: ["href"] })
  })
})

describe("a change the Gate is happy with", () => {
  it("applies, and the tree it returns has one more revision", async () => {
    const before = exampleTree("first-tree")
    const proposal = await propose("first-tree", "add-a-sentence")

    expect(proposal.outcome.kind).toBe("applied")
    expect(treeAfter(before, proposal).revision).toBe(before.revision + 1)
  })

  it("says which policy judged it and who authored the proposal", async () => {
    const proposal = await propose("first-tree", "retheme")

    if (proposal.outcome.kind !== "applied") throw new Error(proposal.outcome.kind)

    expect(proposal.outcome.disposition.policyId).toBe(DOCS_POLICY_ID)
    expect(proposal.outcome.assessment.proposal.provenance.authoredBy).toBe("runtime")
  })

  /**
   * The claim the site makes about themes, checked rather than asserted in
   * prose: re-theming is one node, one prop, and the whole page moves.
   */
  it("re-themes the page by configuring exactly one node", async () => {
    const proposal = await propose("first-tree", "retheme")

    if (proposal.outcome.kind !== "applied") throw new Error(proposal.outcome.kind)

    const { analysis } = proposal.outcome.assessment

    expect(analysis.configuredNodeCount).toBe(1)
    expect(analysis.insertedNodeCount + analysis.removedNodeCount + analysis.movedNodeCount).toBe(0)
  })

  it("carries the inverse the runtime would undo it with", async () => {
    const proposal = await propose("first-tree", "add-a-sentence")

    if (proposal.outcome.kind !== "applied") throw new Error(proposal.outcome.kind)

    expect(proposal.outcome.inverse.operations.length).toBeGreaterThan(0)
  })
})

describe("a change that touches what this deployment protects", () => {
  it("is held for a person rather than applied", async () => {
    const proposal = await propose("first-tree", "demote-the-heading")

    expect(proposal.outcome.kind).toBe("awaiting-confirmation")

    if (proposal.outcome.kind !== "awaiting-confirmation") return

    expect(proposal.outcome.disposition.reason.code).toBe("stakes-above-ceiling")
    expect(proposal.outcome.assessment.stakes.factors.map((factor) => factor.code)).toContain(
      "protected-type-touched"
    )
  })

  it("applies when the reader answers the hold", async () => {
    const before = exampleTree("first-tree")
    const proposal = await propose("first-tree", "demote-the-heading")
    const held = heldProposal(proposal)

    if (held === undefined) throw new Error("nothing was held")

    const confirmed = confirmDocsChange({
      exampleId: "first-tree",
      tree: before,
      proposal,
      held,
    })

    expect(confirmed.outcome.kind).toBe("applied")
    expect(treeAfter(before, confirmed).revision).toBe(before.revision + 1)
  })

  /**
   * Both halves of the run are kept, because the page shows the reader what
   * they answered as well as what happened next.
   */
  it("keeps the events from before the hold as well as after it", async () => {
    const before = exampleTree("first-tree")
    const proposal = await propose("first-tree", "demote-the-heading")
    const held = heldProposal(proposal)

    if (held === undefined) throw new Error("nothing was held")

    const confirmed = confirmDocsChange({ exampleId: "first-tree", tree: before, proposal, held })

    expect(confirmed.events.length).toBeGreaterThan(proposal.events.length)
  })
})

describe("a change the Gate refuses outright", () => {
  it("refuses to destroy a protected primitive, and says why", async () => {
    const proposal = await propose("first-tree", "remove-the-heading")

    expect(proposal.outcome.kind).toBe("rejected")

    if (proposal.outcome.kind !== "rejected") return

    expect(proposal.outcome.disposition.reason.code).toBe("stakes-at-refusal-floor")
    expect(proposal.outcome.assessment.stakes.factors.map((factor) => factor.code)).toContain(
      "protected-type-removed"
    )
  })

  /**
   * The interesting refusal: the operation names the card and the damage is at
   * the button three nodes below it. Nothing but the resulting tree shows it.
   */
  it("refuses a configure that would leave a target inside a target", async () => {
    const proposal = await propose("a-card-and-a-control", "link-the-card")

    expect(proposal.outcome.kind).toBe("rejected")

    if (proposal.outcome.kind !== "rejected") return

    const { analysis, stakes } = proposal.outcome.assessment

    expect(analysis.configuredNodeCount).toBe(1)
    expect(analysis.nestedTargets.length).toBe(1)
    expect(stakes.factors.map((factor) => factor.code)).toContain("nested-target")
  })

  it("leaves the tree exactly as it was", async () => {
    const before = exampleTree("first-tree")
    const proposal = await propose("first-tree", "remove-the-heading")

    expect(treeAfter(before, proposal)).toBe(before)
  })
})

describe("a preset with nothing to do", () => {
  /**
   * Never offered rather than offered and declining. A button whose only
   * outcome is "nothing changed" teaches a reader that the Gate is arbitrary.
   */
  it("is not among the chips a tree is offered", () => {
    const tree = exampleTree("first-tree")
    const offered = availableDocsPresets(tree, sequentialIdFactory("probe"))

    expect(offered).not.toContain("link-the-card")
    expect(offered).toContain("add-a-sentence")
  })

  it("is offered on the tree that gives it something to do", () => {
    const tree = exampleTree("a-card-and-a-control")
    const offered = availableDocsPresets(tree, sequentialIdFactory("probe"))

    expect(offered).toContain("link-the-card")
  })
})

describe("the ids a change mints", () => {
  it("cannot collide with the ids the example already used", () => {
    expect(docsChangeNamespace("first-tree", 1)).toBe("firsttreec1")
    expect(docsChangeNamespace("a-container-and-its-children", 2)).toBe("acontainerandits" + "c2")
  })

  it("fits the id grammar, which is stricter than it looks", () => {
    for (const example of docsExamples.values()) {
      for (const step of [1, 9, 99]) {
        expect(`n_${docsChangeNamespace(example.id, step)}1`).toMatch(/^n_[0-9a-z]{1,32}$/)
      }
    }
  })
})

describe("every preset", () => {
  it("plans against at least one documented example", () => {
    for (const preset of DOCS_PRESETS) {
      const planned = [...docsExamples.values()].some(
        (example) => (preset.plan(example.build(), sequentialIdFactory("probe")) ?? []).length > 0
      )

      expect(planned, `no example gives "${preset.id}" anything to do`).toBe(true)
    }
  })

  /**
   * The property that separates this from a script beside the runtime: the
   * second click is planned against the page as it is, not as it was.
   */
  it("re-plans against the tree it is handed", async () => {
    const first = await propose("first-tree", "add-a-sentence", 1)
    const after = treeAfter(exampleTree("first-tree"), first)

    const preset = docsPresetById("add-a-sentence")
    if (preset === undefined) throw new Error("missing preset")

    const second = await proposeDocsChange({
      exampleId: "first-tree",
      tree: after,
      preset,
      step: 2,
    })

    if (second.outcome.kind !== "applied") throw new Error(second.outcome.kind)

    expect(second.outcome.assessment.proposal.delta.baseRevision).toBe(after.revision)
    expect(second.outcome.tree.root.children.length).toBe(after.root.children.length + 1)
  })
})
