import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { parseTree, primitiveTypeSchema } from "@loom/runtime"
import { renderRequest } from "@loom/runtime/react"
import { auditRegistry } from "@loom/runtime/sdk"
import { memoryTreeStore, treeSourceFromStore } from "@loom/runtime/store"

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
