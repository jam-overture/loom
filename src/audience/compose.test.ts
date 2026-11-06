import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { sampleTree } from "../testing/fixtures.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { TreeDelta, TreeOperation } from "../tree/delta.js"
import { findNode } from "../tree/navigation.js"
import { childrenOf } from "../tree/node.js"

import { audienceIdSchema, type AudienceId } from "./audience.js"
import {
  composeTreeForContext,
  describeComposeError,
  type AudienceForm,
  type AudienceOverlay,
} from "./compose.js"
import type { AudienceRule } from "./rule.js"

const spare = sequentialIdFactory("spare")

const audience = (name: string): AudienceId => audienceIdSchema.parse(`aud_${name}`)

const rule = (name: string, key: string, value: string): AudienceRule => ({
  audienceId: audience(name),
  clauses: [{ key, anyOf: [value] }],
})

const form = (
  name: string,
  treeId: TreeDelta["treeId"],
  baseRevision: number,
  operations: readonly TreeOperation[]
): AudienceForm => ({
  audienceId: audience(name),
  delta: { deltaId: spare.deltaId(), treeId, baseRevision, operations },
})

const banner = (text: string) =>
  buildElement(spare, { type: "loom.banner", children: [buildText(spare, text)] })

describe("composeTreeForContext", () => {
  it("serves the base tree unchanged when no rule matches", () => {
    const { tree } = sampleTree()
    const overlay: AudienceOverlay = { rules: [rule("eu", "region", "eu")], forms: [] }

    const composed = composeTreeForContext(tree, overlay, { region: "us" })
    if (!composed.ok) throw new Error(describeComposeError(composed.error))

    expect(composed.value.tree).toBe(tree)
    expect(composed.value.audiences).toEqual([])
  })

  it("serves the base tree when there is no context, which is every deployment today", () => {
    const { tree } = sampleTree()
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu")],
      forms: [form("eu", tree.treeId, tree.revision, [{ op: "remove", nodeId: "nope" as never }])],
    }

    const composed = composeTreeForContext(tree, overlay, undefined)
    if (!composed.ok) throw new Error(describeComposeError(composed.error))

    expect(composed.value.tree).toBe(tree)
  })

  it("applies the delta the matched audience earned", () => {
    const { tree, ids } = sampleTree()
    const sale = banner("Sale")
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu")],
      forms: [
        form("eu", tree.treeId, tree.revision, [
          { op: "insert", parentId: ids.page, index: 0, node: sale },
        ]),
      ],
    }

    const composed = composeTreeForContext(tree, overlay, { region: "eu" })
    if (!composed.ok) throw new Error(describeComposeError(composed.error))

    expect(childrenOf(composed.value.tree.root).map((child) => child.id)[0]).toBe(sale.id)
    expect(composed.value.audiences).toEqual([audience("eu")])
  })

  it("leaves the base tree it was handed alone", () => {
    const { tree, ids } = sampleTree()
    const before = childrenOf(tree.root).length
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu")],
      forms: [
        form("eu", tree.treeId, tree.revision, [
          { op: "insert", parentId: ids.page, index: 0, node: banner("Sale") },
        ]),
      ],
    }

    composeTreeForContext(tree, overlay, { region: "eu" })

    expect(childrenOf(tree.root).length).toBe(before)
  })

  /**
   * The reason composition walks operations rather than chaining `applyDelta`:
   * both of these are authored against the *published* revision, and the second
   * one is one behind the moment the first has been applied.
   */
  it("applies two matched deltas, both authored against the same base revision", () => {
    const { tree, ids } = sampleTree()
    const first = banner("First")
    const second = banner("Second")
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu"), rule("beta", "cohort", "beta")],
      forms: [
        form("eu", tree.treeId, tree.revision, [
          { op: "insert", parentId: ids.page, index: 0, node: first },
        ]),
        form("beta", tree.treeId, tree.revision, [
          { op: "insert", parentId: ids.page, index: 0, node: second },
        ]),
      ],
    }

    const composed = composeTreeForContext(tree, overlay, { region: "eu", cohort: "beta" })
    if (!composed.ok) throw new Error(describeComposeError(composed.error))

    expect(childrenOf(composed.value.tree.root).map((child) => child.id).slice(0, 2)).toEqual([
      second.id,
      first.id,
    ])
    expect(composed.value.audiences).toEqual([audience("eu"), audience("beta")])
  })

  it("applies them in the order the rules gave, so the deployment decides who wins", () => {
    const { tree, ids } = sampleTree()
    const overlay = (rules: readonly AudienceRule[]): AudienceOverlay => ({
      rules,
      forms: [
        form("eu", tree.treeId, tree.revision, [
          { op: "configure", nodeId: ids.card, set: { variant: "filled" }, unset: [] },
        ]),
        form("beta", tree.treeId, tree.revision, [
          { op: "configure", nodeId: ids.card, set: { variant: "ghost" }, unset: [] },
        ]),
      ],
    })
    const context = { region: "eu", cohort: "beta" }
    const euFirst = rule("eu", "region", "eu")
    const betaFirst = rule("beta", "cohort", "beta")

    const lastWins = composeTreeForContext(tree, overlay([euFirst, betaFirst]), context)
    const otherWay = composeTreeForContext(tree, overlay([betaFirst, euFirst]), context)
    if (!lastWins.ok || !otherWay.ok) throw new Error("both compositions should apply")

    const variantOf = (composed: typeof lastWins.value) =>
      (findNode(composed.tree.root, ids.card) as { readonly props: Record<string, unknown> }).props[
        "variant"
      ]

    expect(variantOf(lastWins.value)).toBe("ghost")
    expect(variantOf(otherWay.value)).toBe("filled")
  })

  /**
   * The identity decision, asserted because the measurement rests on it: a
   * composition is a projection of a revision, so the number a signal names is
   * the base's whatever form the reader got (0284).
   */
  it("keeps the base's tree id and revision, because a composition is not a revision", () => {
    const { tree, ids } = sampleTree()
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu")],
      forms: [
        form("eu", tree.treeId, tree.revision, [
          { op: "insert", parentId: ids.page, index: 0, node: banner("Sale") },
        ]),
      ],
    }

    const composed = composeTreeForContext(tree, overlay, { region: "eu" })
    if (!composed.ok) throw new Error(describeComposeError(composed.error))

    expect(composed.value.tree.revision).toBe(tree.revision)
    expect(composed.value.tree.treeId).toBe(tree.treeId)
  })

  it("keeps the base's revision when two deltas applied, not one per delta", () => {
    const { tree, ids } = sampleTree()
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu"), rule("beta", "cohort", "beta")],
      forms: [
        form("eu", tree.treeId, tree.revision, [
          { op: "insert", parentId: ids.page, index: 0, node: banner("One") },
        ]),
        form("beta", tree.treeId, tree.revision, [
          { op: "insert", parentId: ids.page, index: 0, node: banner("Two") },
        ]),
      ],
    }

    const composed = composeTreeForContext(tree, overlay, { region: "eu", cohort: "beta" })
    if (!composed.ok) throw new Error(describeComposeError(composed.error))

    expect(composed.value.tree.revision).toBe(tree.revision)
  })
})

describe("what a composition refuses", () => {
  it("refuses rather than serving the base when a matched audience has no delta", () => {
    const { tree } = sampleTree()
    const overlay: AudienceOverlay = { rules: [rule("eu", "region", "eu")], forms: [] }

    const composed = composeTreeForContext(tree, overlay, { region: "eu" })

    expect(!composed.ok && composed.error).toEqual({ code: "no-form", audienceId: audience("eu") })
  })

  it("refuses a delta authored against a revision the page has moved past", () => {
    const { tree, ids } = sampleTree()
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu")],
      forms: [
        form("eu", tree.treeId, tree.revision - 1, [
          { op: "insert", parentId: ids.page, index: 0, node: banner("Stale") },
        ]),
      ],
    }

    const composed = composeTreeForContext(tree, overlay, { region: "eu" })

    expect(!composed.ok && composed.error).toEqual({
      code: "stale-form",
      audienceId: audience("eu"),
      expected: tree.revision - 1,
      actual: tree.revision,
    })
  })

  it("refuses a delta for another page", () => {
    const { tree, ids } = sampleTree()
    const elsewhere = spare.treeId()
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu")],
      forms: [
        form("eu", elsewhere, tree.revision, [
          { op: "insert", parentId: ids.page, index: 0, node: banner("Wrong page") },
        ]),
      ],
    }

    const composed = composeTreeForContext(tree, overlay, { region: "eu" })

    expect(!composed.ok && composed.error).toEqual({
      code: "form-mismatch",
      audienceId: audience("eu"),
      treeId: elsewhere,
    })
  })

  it("refuses a delta whose operations do not apply", () => {
    const { tree } = sampleTree()
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu")],
      forms: [
        form("eu", tree.treeId, tree.revision, [
          { op: "remove", nodeId: audienceIdSchema.parse("aud_nothing") as never },
        ]),
      ],
    }

    const composed = composeTreeForContext(tree, overlay, { region: "eu" })

    expect(!composed.ok && composed.error.code).toBe("unapplicable")
  })

  /**
   * All-or-nothing per request, asserted on the case that makes it matter: the
   * first delta applies cleanly and the second cannot, and what must not come
   * back is the tree the first one made — a form nobody authored.
   */
  it("serves neither delta when the second of two cannot apply", () => {
    const { tree, ids } = sampleTree()
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu"), rule("beta", "cohort", "beta")],
      forms: [
        form("eu", tree.treeId, tree.revision, [
          { op: "insert", parentId: ids.page, index: 0, node: banner("Applied") },
        ]),
        form("beta", tree.treeId, tree.revision - 1, [
          { op: "insert", parentId: ids.page, index: 0, node: banner("Stale") },
        ]),
      ],
    }

    const composed = composeTreeForContext(tree, overlay, { region: "eu", cohort: "beta" })

    expect(!composed.ok && composed.error.code).toBe("stale-form")
  })

  /**
   * Two deltas each judged against the base, each fine on its own, both
   * inserting the same node. `applyOperation` catches it on the second insert,
   * which is why composition needs no invariant check of its own.
   */
  it("refuses two deltas that both insert the same node id", () => {
    const { tree, ids } = sampleTree()
    const shared = banner("Shared")
    const overlay: AudienceOverlay = {
      rules: [rule("eu", "region", "eu"), rule("beta", "cohort", "beta")],
      forms: [
        form("eu", tree.treeId, tree.revision, [
          { op: "insert", parentId: ids.page, index: 0, node: shared },
        ]),
        form("beta", tree.treeId, tree.revision, [
          { op: "insert", parentId: ids.footer, index: 0, node: shared },
        ]),
      ],
    }

    const composed = composeTreeForContext(tree, overlay, { region: "eu", cohort: "beta" })

    expect(!composed.ok && composed.error.code).toBe("unapplicable")
    expect(!composed.ok && describeComposeError(composed.error)).toContain("duplicate-node-id")
  })
})

describe("describeComposeError", () => {
  it("says which audience and which revision, because that is what somebody acts on", () => {
    expect(
      describeComposeError({
        code: "stale-form",
        audienceId: audience("eu"),
        expected: 3,
        actual: 5,
      })
    ).toBe("aud_eu's delta is against revision 3, the page is at 5")
  })

  it("names the audience in every reason it gives", () => {
    expect(describeComposeError({ code: "no-form", audienceId: audience("eu") })).toContain("aud_eu")
    expect(
      describeComposeError({ code: "form-mismatch", audienceId: audience("eu"), treeId: "tre_x" })
    ).toContain("aud_eu")
    expect(
      describeComposeError({ code: "unapplicable", audienceId: audience("eu"), detail: "node-not-found" })
    ).toContain("aud_eu")
  })
})
