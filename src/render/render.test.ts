import { createElement, Fragment, type ReactElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { sequentialIdFactory } from "../ids.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { sampleTree } from "../testing/fixtures.js"
import { testPrimitiveResolver, testPrimitives } from "../testing/primitives.js"
import { buildElement, buildSlot, buildText } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { NO_SLOTS, staticPrimitiveResolver, type LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"

const markupOf = (tree: ReturnType<typeof sampleTree>["tree"], editMode = false): string =>
  renderToStaticMarkup(renderLoomTree(tree, { resolver: testPrimitiveResolver, editMode }).element)

describe("renderLoomTree", () => {
  it("projects each node kind onto its React counterpart", () => {
    const { tree } = sampleTree()

    const markup = markupOf(tree)

    expect(markup).toContain("<main")
    expect(markup).toContain("<header")
    expect(markup).toContain("Welcome")
    expect(markup).toContain("<article")
    expect(markup).toContain("Body copy")
    expect(markup).toContain("<footer")
  })

  it("renders text as a string, adding no element to carry it", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      children: [buildText(idFactory, "bare")],
    })

    const markup = renderToStaticMarkup(
      renderLoomTree(createTree(root, idFactory), { resolver: testPrimitiveResolver }).element
    )

    expect(markup).toContain(">bare</main>")
  })

  it("uses node ids as React keys, so a moved subtree reconciles as a move", () => {
    const { tree, ids } = sampleTree()

    const element = renderLoomTree(tree, { resolver: testPrimitiveResolver })
      .element as ReactElement<LoomPrimitiveProps>

    expect(element.key).toBe(ids.page)
  })

  it("is a pure function of its inputs", () => {
    const { tree } = sampleTree()
    const options = { resolver: testPrimitiveResolver, editMode: true }

    const first = renderLoomTree(tree, options)
    const second = renderLoomTree(tree, options)

    expect(renderToStaticMarkup(first.element)).toBe(renderToStaticMarkup(second.element))
    expect(first.diagnostics).not.toBe(second.diagnostics)
  })
})

describe("props", () => {
  it("hands props to the primitive in a bag rather than spreading them", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, { type: "loom.page", props: { title: "Home" } })

    const element = renderLoomTree(createTree(root, idFactory), {
      resolver: testPrimitiveResolver,
    }).element as ReactElement<LoomPrimitiveProps>

    expect(Object.keys(element.props).sort()).toEqual(["children", "loom", "props"])
    expect(element.props.props).toEqual({ title: "Home" })
  })

  it("cannot smuggle a React-reserved prop past the primitive", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      props: { dangerouslySetInnerHTML: { __html: "<script>stolen()</script>" } },
    })

    const rendered = renderLoomTree(createTree(root, idFactory), {
      resolver: testPrimitiveResolver,
    })
    const element = rendered.element as ReactElement<LoomPrimitiveProps>

    expect(element.props).not.toHaveProperty("dangerouslySetInnerHTML")
    expect(element.props.props).toHaveProperty("dangerouslySetInnerHTML")
    expect(renderToStaticMarkup(rendered.element)).not.toContain("<script>")
  })
})

describe("slots", () => {
  it("renders a slot's own children when the host projects nothing", () => {
    const { tree } = sampleTree()

    expect(markupOf(tree)).toContain("Body copy")
  })

  it("renders projected content in place of the fallback", () => {
    const { tree } = sampleTree()

    const markup = renderToStaticMarkup(
      renderLoomTree(tree, {
        resolver: testPrimitiveResolver,
        slots: { main: createElement("aside", null, "projected") },
      }).element
    )

    expect(markup).toContain("<aside>projected</aside>")
    expect(markup).not.toContain("Body copy")
  })

  it("projects nothing when the host passes null, without falling back", () => {
    const { tree } = sampleTree()

    const markup = renderToStaticMarkup(
      renderLoomTree(tree, { resolver: testPrimitiveResolver, slots: { main: null } }).element
    )

    expect(markup).not.toContain("Body copy")
    expect(markup).toContain("<footer")
  })

  it("does not read a projection off the prototype of the slot map", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      children: [buildSlot(idFactory, "constructor", [buildText(idFactory, "fallback")])],
    })

    const markup = renderToStaticMarkup(
      renderLoomTree(createTree(root, idFactory), { resolver: testPrimitiveResolver, slots: {} })
        .element
    )

    expect(markup).toContain("fallback")
  })

  it("adds no element of its own for the projection point", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      children: [buildSlot(idFactory, "main", [buildText(idFactory, "fallback")])],
    })

    const markup = renderToStaticMarkup(
      renderLoomTree(createTree(root, idFactory), { resolver: testPrimitiveResolver }).element
    )

    expect(markup).toBe('<main data-props="{}">fallback</main>')
  })
})

describe("slots as named regions", () => {
  const regionOf = (
    tree: ReturnType<typeof sampleTree>["tree"],
    name: string
  ): { children: ReactNode; region: ReactNode } => {
    const element = renderLoomTree(tree, { resolver: testPrimitiveResolver })
      .element as ReactElement<LoomPrimitiveProps>

    return { children: element.props.children, region: element.props.loom.slots[name] }
  }

  it("hands a slot child to its primitive as a named region, not as a child", () => {
    const { tree } = sampleTree()

    const { children, region } = regionOf(tree, "main")

    expect(region).toBeDefined()
    expect(renderToStaticMarkup(createElement(Fragment, null, region))).toContain("Body copy")
    expect(renderToStaticMarkup(createElement(Fragment, null, children))).not.toContain("Body copy")
  })

  it("gives a node with no slot children the same empty map every time", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      children: [buildText(idFactory, "bare")],
    })

    const element = renderLoomTree(createTree(root, idFactory), {
      resolver: testPrimitiveResolver,
    }).element as ReactElement<LoomPrimitiveProps>

    expect(element.props.loom.slots).toBe(NO_SLOTS)
  })

  it("reads no region off the prototype of the map it hands over", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      children: [buildText(idFactory, "bare")],
    })

    const element = renderLoomTree(createTree(root, idFactory), {
      resolver: testPrimitiveResolver,
    }).element as ReactElement<LoomPrimitiveProps>

    expect(element.props.loom.slots["constructor"]).toBeUndefined()
  })

  it("places both of two slot children that share a name, in tree order", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      children: [
        buildSlot(idFactory, "aside", [buildText(idFactory, "first")]),
        buildSlot(idFactory, "aside", [buildText(idFactory, "second")]),
      ],
    })

    const { region } = regionOf(createTree(root, idFactory), "aside")

    expect(renderToStaticMarkup(createElement(Fragment, null, region))).toBe("firstsecond")
  })

  it("routes the host's projection through the region, not around it", () => {
    const { tree } = sampleTree()

    const element = renderLoomTree(tree, {
      resolver: testPrimitiveResolver,
      slots: { main: createElement("aside", null, "projected") },
    }).element as ReactElement<LoomPrimitiveProps>

    const region = element.props.loom.slots["main"]

    expect(renderToStaticMarkup(createElement(Fragment, null, region))).toBe(
      "<aside>projected</aside>"
    )
  })

  it("leaves a slot nested inside another slot's fallback where it sits", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      children: [
        buildSlot(idFactory, "outer", [buildSlot(idFactory, "inner", [buildText(idFactory, "deep")])]),
      ],
    })

    const { region } = regionOf(createTree(root, idFactory), "outer")

    expect(renderToStaticMarkup(createElement(Fragment, null, region))).toBe("deep")
  })

  it("drops a region its primitive does not place", () => {
    const idFactory = sequentialIdFactory()
    const root = buildElement(idFactory, {
      type: "loom.page",
      children: [buildSlot(idFactory, "aside", [buildText(idFactory, "unplaced")])],
    })

    const markup = renderToStaticMarkup(
      renderLoomTree(createTree(root, idFactory), {
        resolver: staticPrimitiveResolver({
          "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
        }),
      }).element
    )

    expect(markup).toBe("<main></main>")
  })
})

describe("unknown primitives", () => {
  const resolverWithoutCard = staticPrimitiveResolver(
    Object.fromEntries(Object.entries(testPrimitives).filter(([type]) => type !== "loom.card"))
  )

  it("omits the node and reports it instead of failing the page", () => {
    const { tree, ids } = sampleTree()

    const rendered = renderLoomTree(tree, { resolver: resolverWithoutCard })

    expect(rendered.diagnostics).toEqual([
      { code: "unknown-primitive", nodeId: ids.card, type: primitiveTypeSchema.parse("loom.card") },
    ])
    expect(renderToStaticMarkup(rendered.element)).toContain("<footer")
  })

  it("omits the whole subtree rather than promoting its children", () => {
    const { tree } = sampleTree()

    const markup = renderToStaticMarkup(
      renderLoomTree(tree, { resolver: resolverWithoutCard }).element
    )

    expect(markup).not.toContain("Body copy")
  })

  it("reports the root itself when nothing is registered at all", () => {
    const { tree, ids } = sampleTree()

    const rendered = renderLoomTree(tree, { resolver: staticPrimitiveResolver({}) })

    expect(rendered.element).toBeNull()
    expect(rendered.diagnostics).toHaveLength(1)
    expect(rendered.diagnostics[0]?.nodeId).toBe(ids.page)
  })
})
