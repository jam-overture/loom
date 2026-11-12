import { isValidElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { testPrimitiveResolver } from "../testing/primitives.js"
import { buildElement, buildText } from "../tree/builders.js"
import type { ElementNode, LoomNode } from "../tree/node.js"
import { createTree } from "../tree/tree.js"

import { renderLoomTree } from "./render.js"

/**
 * **A page's depth is data, and rendering one is the path every surface takes**
 * (0380).
 *
 * Until these existed, `renderNode` and `renderChildren` recursed per level, so
 * a page a thousand elements deep threw `RangeError: Maximum call stack size
 * exceeded` on every render — the shallowest bound anything in the framework
 * had, and shallower than the two thousand `materializeDelta` stopped at.
 *
 * **React was not the reason that bound existed**, which is what the finding
 * this closes assumed and what measuring it disproved: `renderToStaticMarkup`
 * walks fifty thousand levels of host elements in 45 ms and fifty thousand
 * function components in 135 ms.
 *
 * What is counted is **Loom's own output** rather than the markup, because
 * `renderToStaticMarkup` drops elements from a deep chain of function
 * components on the first call in a fresh process and not on the second — with
 * no Loom in the tree at all. That is filed rather than worked around, and it
 * is why these assert the element tree and only ask of React that it render it.
 *
 * The figures are `src/tree/shape.test.ts`', so the repository holds one pair.
 */
const DEEP = 10_000
const WIDE = 60_000

const ids = sequentialIdFactory("sh")

/** A chain of pages: one child per node, a text leaf at the bottom. */
const deepTree = (depth: number) => {
  let node: LoomNode = buildText(ids, "bottom")

  for (let level = 1; level < depth; level += 1) {
    node = buildElement(ids, { type: "loom.page", children: [node] })
  }

  return createTree(node as ElementNode, ids)
}

const wideTree = (width: number) =>
  createTree(
    buildElement(ids, {
      type: "loom.page",
      children: Array.from({ length: width }, (_, index) => buildText(ids, `t${index}`)),
    }),
    ids
  )

const render = (tree: ReturnType<typeof deepTree>) =>
  renderLoomTree(tree, { resolver: testPrimitiveResolver })

/** Every element in the rendered tree, counted with a stack for the same reason. */
const elementsIn = (root: ReactNode): number => {
  let counted = 0
  const pending: ReactNode[] = [root]

  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    if (Array.isArray(next)) {
      for (const item of next as readonly ReactNode[]) pending.push(item)
      continue
    }

    if (!isValidElement(next)) continue
    counted += 1

    const { children } = next.props as { readonly children?: ReactNode }
    if (children !== undefined) pending.push(children)
  }

  return counted
}

describe("renderLoomTree on a shape a page is allowed to have", () => {
  it(`renders a page ${DEEP.toLocaleString("en")} deep`, () => {
    const output = render(deepTree(DEEP))

    expect(output.diagnostics).toEqual([])
    expect(elementsIn(output.element)).toBe(DEEP - 1)
  })

  it(`renders a page ${WIDE.toLocaleString("en")} wide`, () => {
    const output = render(wideTree(WIDE))

    expect(output.diagnostics).toEqual([])
    expect(elementsIn(output.element)).toBe(1)
  })

  /** React is asked only to accept it, for the reason in the note above. */
  it("hands a deep page to React, which reaches the leaf", () => {
    expect(renderToStaticMarkup(render(deepTree(DEEP)).element)).toContain("bottom")
  })
})
