import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { treeIdSchema, type TreeId } from "../ids.js"
import { err, ok, type Result } from "../result.js"
import { sampleTree } from "../testing/fixtures.js"
import { testPrimitiveResolver } from "../testing/primitives.js"

import { renderRequest, type RenderRequest, type TreeSource, type TreeSourceError } from "./request.js"

/** Storage hands back whatever it stored — so the double hands back `unknown`. */
const sourceOf = (
  answer: Result<unknown, TreeSourceError>
): TreeSource & { readonly requests: readonly RenderRequest[] } => {
  const requests: RenderRequest[] = []

  return {
    requests,
    load: (request) => {
      requests.push(request)
      return Promise.resolve(answer)
    },
  }
}

const otherTreeId: TreeId = treeIdSchema.parse("t_elsewhere")

describe("renderRequest", () => {
  it("loads, validates, and renders the tree for this request", async () => {
    const { tree } = sampleTree()
    const source = sourceOf(ok(JSON.parse(JSON.stringify(tree))))

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      { source, resolver: testPrimitiveResolver }
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(rendered.value.tree.treeId).toBe(tree.treeId)
    expect(rendered.value.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.value.element)).toContain("Welcome")
  })

  it("passes the host's context through to the source untouched", async () => {
    const { tree } = sampleTree()
    const source = sourceOf(ok(tree))

    await renderRequest(
      { treeId: tree.treeId, editMode: true, context: { audience: "returning" } },
      { source, resolver: testPrimitiveResolver }
    )

    expect(source.requests).toEqual([
      { treeId: tree.treeId, editMode: true, context: { audience: "returning" } },
    ])
  })

  it("decorates when the request asks for edit mode", async () => {
    const { tree } = sampleTree()
    const source = sourceOf(ok(tree))

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: true },
      { source, resolver: testPrimitiveResolver }
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(renderToStaticMarkup(rendered.value.element)).toContain("data-loom-node")
  })

  it("projects the host's slot content", async () => {
    const { tree } = sampleTree()
    const source = sourceOf(ok(tree))

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      {
        source,
        resolver: testPrimitiveResolver,
        slots: { main: createElement("aside", null, "projected") },
      }
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(renderToStaticMarkup(rendered.value.element)).toContain("projected")
  })

  it("reports a source that could not answer", async () => {
    const source = sourceOf(err({ code: "unavailable", detail: "timeout" }))

    const rendered = await renderRequest(
      { treeId: otherTreeId, editMode: false },
      { source, resolver: testPrimitiveResolver }
    )

    expect(rendered).toEqual({
      ok: false,
      error: { code: "source-failed", error: { code: "unavailable", detail: "timeout" } },
    })
  })

  it("refuses a stored document that is not a valid tree", async () => {
    const source = sourceOf(ok({ treeId: "t_1", schemaVersion: 1, revision: 0, root: null }))

    const rendered = await renderRequest(
      { treeId: otherTreeId, editMode: false },
      { source, resolver: testPrimitiveResolver }
    )

    expect(rendered.ok).toBe(false)
    if (rendered.ok) return

    expect(rendered.error.code).toBe("invalid-tree")
  })

  it("refuses a tree that is not the one the request asked for", async () => {
    const { tree } = sampleTree()
    const source = sourceOf(ok(tree))

    const rendered = await renderRequest(
      { treeId: otherTreeId, editMode: false },
      { source, resolver: testPrimitiveResolver }
    )

    expect(rendered).toEqual({
      ok: false,
      error: { code: "tree-id-mismatch", requested: otherTreeId, received: tree.treeId },
    })
  })
})
