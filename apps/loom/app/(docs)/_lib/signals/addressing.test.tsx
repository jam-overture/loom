import { renderLoomTree } from "@jam-overture/loom/react"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { docsRegistry, docsThemes } from "@/app/(docs)/_lib/loom/registry"

import { addressingSubject, produceAddressedMarkup } from "./markup"

/**
 * The claim *What your readers do* makes about `addressed: true`, rendered.
 *
 * The page's block is produced from `editableAttributes`, which is the function
 * that decides what addressing writes — and that is the right source for *what*
 * it writes. It cannot answer the other half: whether anything **else** moved.
 * A renderer that had started wrapping addressed elements in a `div` to carry
 * the attributes would leave that producer saying exactly what it says today,
 * and would quietly change what every CSS selector on a host's page matches.
 *
 * 0010 promises it does not. This is that promise, rendered both ways in a
 * document and compared. It lives in a `.test.tsx` because that is the half of
 * this suite with a DOM in it — the page itself has no way to do this, since
 * Next refuses `react-dom/server` in a Server Component.
 */

const markupOf = (addressed: boolean): string => {
  const rendered = renderLoomTree(addressingSubject(), {
    resolver: docsRegistry,
    validator: docsRegistry,
    themes: docsThemes,
    ...(addressed ? { addressed: true } : {}),
  })

  expect(rendered.diagnostics, "the example rendered with diagnostics").toEqual([])

  return render(rendered.element).container.innerHTML
}

const ATTRIBUTES = /\sdata-loom-(?:node|type|tree|revision)="[^"]*"/g

describe("rendering the page with addressing on", () => {
  const plain = markupOf(false)
  const addressed = markupOf(true)

  it("changes nothing but the attributes", () => {
    expect(addressed.replace(ATTRIBUTES, "")).toBe(plain)
  })

  it("writes nothing at all with addressing off", () => {
    expect(plain).not.toContain("data-loom-")
  })

  it("addresses as many elements as the producer says it does", () => {
    const produced = produceAddressedMarkup()
    const stamped = [...addressed.matchAll(/data-loom-node="/g)].length

    expect(stamped).toBe(produced.addressedElements)
  })

  it("puts the tree and the revision on the root and nowhere else", () => {
    expect([...addressed.matchAll(/data-loom-tree="/g)].length).toBe(1)
    expect([...addressed.matchAll(/data-loom-revision="/g)].length).toBe(1)
  })

  /**
   * The bytes the page quotes, checked against a real document rather than
   * against the arithmetic that produced them.
   */
  it("costs what the page says it costs, within a byte of rounding", () => {
    const produced = produceAddressedMarkup()

    expect(Math.abs(addressed.length - plain.length - produced.bytesAdded)).toBeLessThanOrEqual(1)
  })
})
