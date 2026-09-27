import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { parseTree, primitiveTypeSchema } from "@jam-overture/loom"
import { renderRequest } from "@jam-overture/loom/react"
import { auditRegistry } from "@jam-overture/loom/sdk"
import { memoryTreeStore, treeSourceFromStore } from "@jam-overture/loom/store"

import { portalRegistry } from "./registry"
import { seedTree } from "./seed"

/**
 * The portal is the framework's first host (0018), so these are the checks any
 * host should run: the registry it built is sound, the primitives it registered
 * are addressable, and the tree it seeded actually renders.
 */

describe("portalRegistry", () => {
  it("registers every primitive the seed uses", () => {
    const types = ["loom.page", "loom.card", "loom.heading", "loom.prose"]

    for (const type of types) {
      expect(portalRegistry.resolve(primitiveTypeSchema.parse(type))).not.toBeUndefined()
    }
  })

  /**
   * 0012 made conformance reported rather than enforced, so registration would
   * have succeeded with an undecorated primitive. This is the check that makes
   * the portal's own primitives addressable in fact rather than by intention.
   */
  it("passes its own conformance audit", () => {
    const audit = auditRegistry(portalRegistry)

    expect(audit.notDecorated).toEqual([])
    expect(audit.notProbeable).toEqual([])
  })

  /**
   * **Every primitive says which of its settings a reader reads.**
   *
   * `copyIn` distinguishes *shows no words of its own* from *nobody has said*
   * and reports only the second (0122), and the review queue says the second
   * out loud: an undeclared type makes a deletion read *"Loom can't list the
   * words in 3 parts of this"*. All four of these hold their words as children,
   * so `[]` is true of them and the queue stays quiet.
   *
   * Enumerated from the registry rather than from a list, so a fifth primitive
   * registered without a declaration fails here — which is the moment somebody
   * still has the schema in front of them and can answer. Without it, the first
   * report would be a caveat on a reviewer's screen about a silence of ours.
   */
  it("has been told, for every primitive it registers, which settings are words", () => {
    const undeclared = portalRegistry.primitives
      .map((primitive) => primitive.type)
      .filter((type) => portalRegistry.copyFor(type) === undefined)

    expect(undeclared).toEqual([])
  })

  /**
   * Guards the guard. An empty registry, or a `copyFor` that answered `[]` for
   * everything including types it has never heard of, would pass the rule above
   * over nothing.
   */
  it("answers nothing for a type it does not know, so the rule above cannot pass over an empty set", () => {
    expect(portalRegistry.primitives.length).toBeGreaterThan(3)
    expect(portalRegistry.copyFor(primitiveTypeSchema.parse("acme.nowhere"))).toBeUndefined()
  })
})

describe("seedTree", () => {
  it("produces a tree the boundary parser accepts", () => {
    expect(parseTree(seedTree()).ok).toBe(true)
  })

  it("starts at revision 0", () => {
    expect(seedTree().revision).toBe(0)
  })

  /**
   * Deliberately stable: the factory is seeded, so the seed tree keeps the same
   * id across calls and across restarts. That is what makes its URL survive the
   * process dying, which an in-memory store otherwise would not give.
   */
  it("keeps the same id across calls, so its URL is stable", () => {
    expect(seedTree().treeId).toBe(seedTree().treeId)
  })
})

describe("the seed through the render path", () => {
  it("renders its text, and decorates every element in edit mode", async () => {
    const tree = seedTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: true },
      {
        source: treeSourceFromStore(store),
        resolver: portalRegistry,
        validator: portalRegistry,
      }
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    const markup = renderToStaticMarkup(rendered.value.element)

    expect(markup).toContain("Loom")
    expect(markup).toContain("Every change is a delta")
    expect(markup).toContain("data-loom-node")
    expect(markup).toContain(`data-loom-tree="${tree.treeId}"`)
  })

  /** A prop the primitives declare must survive to the element that reads it. */
  it("honours a declared prop rather than dropping it", async () => {
    const tree = seedTree()
    const store = memoryTreeStore()
    await store.create(tree)

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      { source: treeSourceFromStore(store), resolver: portalRegistry, validator: portalRegistry }
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    const markup = renderToStaticMarkup(rendered.value.element)

    /** `variant: "outlined"` on the card, and `level: 1` on the first heading. */
    expect(markup).toContain("border")
    expect(markup).toContain("<h1")
    expect(rendered.value.diagnostics).toEqual([])
  })
})
