import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { LOOM_NODE_ATTRIBUTE } from "./editable.js"
import { staticPrimitiveResolver, type LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"

/**
 * A band that says its children twice — the arrangement `decorative.ts` exists
 * for, reduced to the two elements that make the hazard visible.
 */
const echoing = ({ loom, children }: LoomPrimitiveProps): ReactNode =>
  createElement(
    "div",
    { ...loom.editable },
    createElement("div", { key: "run" }, children),
    createElement("div", { key: "echo", "aria-hidden": true }, loom.decorative())
  )

/** A child that reports whether it was told it can be edited. */
const branching = ({ loom, children }: LoomPrimitiveProps): ReactNode =>
  createElement(
    "span",
    { ...loom.editable, "data-editing": loom.editable === undefined ? "no" : "yes" },
    children
  )

const resolver = staticPrimitiveResolver({
  "loom.marquee": echoing,
  "loom.logo": branching,
})

const echoingTree = () => {
  const idFactory = sequentialIdFactory()
  const logo = buildElement(idFactory, {
    type: "loom.logo",
    children: [buildText(idFactory, "Acme")],
  })
  const root = buildElement(idFactory, { type: "loom.marquee", children: [logo] })

  return { tree: createTree(root, idFactory), logoId: logo.id }
}

const markupOf = (editMode: boolean): string => {
  const { tree } = echoingTree()

  return renderToStaticMarkup(renderLoomTree(tree, { resolver, editMode }).element)
}

const occurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1

describe("loom.decorative", () => {
  it("renders the same content as the children beside it", () => {
    expect(occurrences(markupOf(false), "Acme")).toBe(2)
    expect(occurrences(markupOf(true), "Acme")).toBe(2)
  })

  it("puts no node id on the copy, so nothing in it resolves to a node", () => {
    const { tree, logoId } = echoingTree()

    const markup = renderToStaticMarkup(
      renderLoomTree(tree, { resolver, editMode: true }).element
    )

    expect(markup).toContain(`${LOOM_NODE_ATTRIBUTE}="${logoId}"`)
    expect(occurrences(markup, `${LOOM_NODE_ATTRIBUTE}="${logoId}"`)).toBe(1)
  })

  it("leaves no node id on two elements anywhere in the render", () => {
    const markup = markupOf(true)
    const ids = [...markup.matchAll(/data-loom-node="([^"]+)"/g)].map((match) => match[1])

    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("does not tell a descendant of the copy that it can be edited", () => {
    const markup = markupOf(true)

    expect(occurrences(markup, 'data-editing="yes"')).toBe(1)
    expect(occurrences(markup, 'data-editing="no"')).toBe(1)
  })

  it("returns the same elements when a primitive asks twice", () => {
    let seen: readonly [ReactNode, ReactNode] | undefined

    const asking = ({ loom }: LoomPrimitiveProps): ReactNode => {
      seen = [loom.decorative(), loom.decorative()]
      return null
    }

    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.marquee",
      children: [buildText(idFactory, "once")],
    })

    renderToStaticMarkup(
      renderLoomTree(createTree(root, idFactory), {
        resolver: staticPrimitiveResolver({ "loom.marquee": asking }),
      }).element
    )

    expect(seen?.[0]).toBe(seen?.[1])
  })

  it("answers a node with no children with nothing to place", () => {
    let copy: ReactNode = "unset"

    const asking = ({ loom }: LoomPrimitiveProps): ReactNode => {
      copy = loom.decorative()
      return null
    }

    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, { type: "loom.marquee" })

    renderToStaticMarkup(
      renderLoomTree(createTree(root, idFactory), {
        resolver: staticPrimitiveResolver({ "loom.marquee": asking }),
      }).element
    )

    expect(copy).toBeNull()
  })

  it("reports a subtree's diagnostics once, however many copies are placed", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.marquee",
      children: [buildElement(idFactory, { type: "loom.unregistered" })],
    })

    const { element, diagnostics } = renderLoomTree(createTree(root, idFactory), {
      resolver,
      editMode: true,
    })

    renderToStaticMarkup(element)

    expect(diagnostics.filter((entry) => entry.code === "unknown-primitive")).toHaveLength(1)
  })
})
