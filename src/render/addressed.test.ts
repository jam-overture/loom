// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"

import { sampleTree } from "../testing/fixtures.js"
import { testPrimitiveResolver } from "../testing/primitives.js"

import {
  addressedRootIn,
  LOOM_NODE_ATTRIBUTE,
  LOOM_REVISION_ATTRIBUTE,
  LOOM_TREE_ATTRIBUTE,
  LOOM_TYPE_ATTRIBUTE,
} from "./addressed.js"
import { renderLoomTree } from "./render.js"

/**
 * The door a browser-side host uses to find the page, against a real DOM.
 *
 * Most of these render a tree through the seam rather than writing the markup
 * by hand, which is the point of the file: what this door publishes has to be
 * what the renderer actually writes, and a test against a literal would still
 * pass on the day the renderer changed its mind.
 */

const addressedMarkup = (): string =>
  renderToStaticMarkup(
    renderLoomTree(sampleTree().tree, { resolver: testPrimitiveResolver, addressed: true }).element
  )

const plainMarkup = (): string =>
  renderToStaticMarkup(renderLoomTree(sampleTree().tree, { resolver: testPrimitiveResolver }).element)

const containerWith = (markup: string): Element => {
  const container = document.createElement("div")
  container.innerHTML = markup
  document.body.append(container)
  return container
}

afterEach(() => {
  document.body.innerHTML = ""
})

describe("the names a render writes on a published page", () => {
  it("are the four the renderer puts on an addressed page", () => {
    const markup = addressedMarkup()

    for (const attribute of [LOOM_NODE_ATTRIBUTE, LOOM_TYPE_ATTRIBUTE, LOOM_TREE_ATTRIBUTE, LOOM_REVISION_ATTRIBUTE]) {
      expect(markup).toContain(`${attribute}=`)
    }
  })

  it("are absent from a page that did not ask to be addressed, which is what makes them worth finding", () => {
    expect(plainMarkup()).not.toContain(LOOM_TREE_ATTRIBUTE)
  })
})

describe("addressedRootIn", () => {
  it("finds the element the renderer put the tree's own address on", () => {
    document.body.innerHTML = addressedMarkup()

    const root = addressedRootIn(document)

    expect(root).toBe(document.body.firstElementChild)
    expect(root?.hasAttribute(LOOM_REVISION_ATTRIBUTE)).toBe(true)
  })

  it("answers undefined for a document holding no addressed page", () => {
    document.body.innerHTML = plainMarkup()

    expect(addressedRootIn(document)).toBeUndefined()
  })

  it("answers undefined for an empty document rather than reaching for the body", () => {
    expect(addressedRootIn(document)).toBeUndefined()
  })

  it("searches within a container, so a page that holds other things can still be asked", () => {
    const container = containerWith(addressedMarkup())
    containerWith(addressedMarkup())

    expect(addressedRootIn(container)).toBe(container.firstElementChild)
  })

  it("counts the scope as its own answer, so feeding it its own result returns that result", () => {
    document.body.innerHTML = addressedMarkup()
    const root = addressedRootIn(document)

    expect(root).toBeDefined()
    expect(addressedRootIn(root as Element)).toBe(root)
  })

  it("takes the first in document order when a scope holds two trees", () => {
    const container = document.createElement("div")
    container.innerHTML = `${addressedMarkup()}${addressedMarkup()}`
    document.body.append(container)

    expect(container.children).toHaveLength(2)
    expect(addressedRootIn(container)).toBe(container.firstElementChild)
  })

  it("answers undefined within a container whose subtree holds no addressed page", () => {
    const container = containerWith(plainMarkup())

    expect(addressedRootIn(container)).toBeUndefined()
  })

  it("finds the page rather than the first addressed element, which is not the same element", () => {
    document.body.innerHTML = addressedMarkup()
    const root = document.body.firstElementChild as Element
    root.removeAttribute(LOOM_TREE_ATTRIBUTE)

    expect(root.hasAttribute(LOOM_NODE_ATTRIBUTE)).toBe(true)
    expect(addressedRootIn(document)).toBeUndefined()
  })

  it("works on a document that is not the one it is running in", () => {
    const parsed = new DOMParser().parseFromString(`<body>${addressedMarkup()}</body>`, "text/html")
    const scope = parsed.body.firstElementChild as Element

    expect(scope.ownerDocument).not.toBe(document)
    expect(addressedRootIn(scope)).toBe(scope)
    expect(addressedRootIn(parsed)).toBe(scope)
  })

  /**
   * An iframe is a realm of its own, so its elements are not instances of this
   * realm's `Element`. That is the case the node-type guard is written for, and
   * the first assertion here is what makes the test about it rather than about
   * iframes: were the guard an `instanceof`, the two that follow would fail.
   */
  it("works on an element from another realm, which an instanceof check would refuse", () => {
    const frame = document.createElement("iframe")
    document.body.append(frame)
    const inner = frame.contentDocument as Document
    inner.body.innerHTML = addressedMarkup()
    const scope = inner.body.firstElementChild as Element

    expect(scope instanceof Element).toBe(false)
    expect(addressedRootIn(scope)).toBe(scope)
    expect(addressedRootIn(inner)).toBe(scope)
  })

  it("answers with a fragment's own root, which is what a parsed snippet is", () => {
    const template = document.createElement("template")
    template.innerHTML = addressedMarkup()

    expect(addressedRootIn(template.content)).toBe(template.content.firstElementChild)
  })
})
