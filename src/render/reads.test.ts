import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
  createDataRegistry,
  defineSource,
  type DataRegistry,
  type SourceEntry,
} from "../data/adapter.js"
import { resolveTreeData } from "../data/resolve.js"
import { sequentialIdFactory } from "../ids.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { ok } from "../result.js"
import { definePrimitive } from "../sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry } from "../sdk/registry.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { describeRenderDiagnostic } from "./diagnostics.js"
import { staticPrimitiveResolver, type LoomPrimitiveProps } from "./primitive.js"
import { unreadBindings } from "./reads.js"
import { renderLoomTree } from "./render.js"

/**
 * A feed that reads one name and a page that reads none, declared the two
 * different ways a primitive can say something about data.
 *
 * `loom.page` declares `reads: []` rather than leaving it out, because the two
 * halves of this seam's bargain need one primitive each: the walk must report a
 * binding on the primitive that said it reads nothing, and stay silent on the
 * primitive whose author said nothing at all.
 */
const feed = definePrimitive({
  type: "loom.feed",
  description: "A list of entries a source answered with.",
  props: z.object({}),
  reads: ["entries"],
  component: ({ loom }: LoomPrimitiveProps) => {
    const outcome = loom.data["entries"]

    return createElement("section", null, outcome?.status === "ready" ? "ready" : "unbound")
  },
})

const page = definePrimitive({
  type: "loom.page",
  description: "The page.",
  props: z.object({}),
  reads: [],
  component: ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
})

const undeclared = definePrimitive({
  type: "loom.panel",
  description: "A panel whose author has not thought about data.",
  props: z.object({}),
  component: ({ children }: LoomPrimitiveProps) => createElement("div", null, children),
})

const registryOf = (...entries: readonly Parameters<typeof createPrimitiveRegistry>[0][number][]) => {
  const registry = createPrimitiveRegistry(entries)
  if (!registry.ok) throw new Error(`test registry refused: ${registry.error.code}`)

  return registry.value
}

const sources = (): DataRegistry => {
  const entry: SourceEntry = defineSource({
    id: "catalogue.entries",
    description: "The entries this profile offers",
    params: z.object({}).passthrough(),
    answers: z.array(z.string()),
    adapter: { fetch: () => Promise.resolve(ok(["One", "Two"])) },
  })

  const registry = createDataRegistry([entry])
  if (!registry.ok) throw new Error(`test source registry refused: ${registry.error.code}`)

  return registry.value
}

const treeBinding = (type: string, declared: unknown): LoomTree => {
  const idFactory = sequentialIdFactory()

  const bound = buildElement(idFactory, {
    type,
    props: { [DATA_PROP_KEY]: declared } as never,
    children: [buildText(idFactory, "")],
  })

  return createTree(buildElement(idFactory, { type: "loom.page", children: [bound] }), idFactory)
}

const renderWith = async (tree: LoomTree, resolver: PrimitiveRegistry) => {
  const data = await resolveTreeData(tree, { registry: sources() })

  return renderLoomTree(tree, { resolver, validator: resolver, data })
}

describe("a binding nobody reads", () => {
  it("is reported when the primitive declared the names it reads", async () => {
    const tree = treeBinding("loom.feed", { entires: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, feed))

    const unread = rendered.diagnostics.filter(
      (diagnostic) => diagnostic.code === "data-unread"
    )

    expect(unread).toHaveLength(1)
    expect(unread[0]).toMatchObject({ type: "loom.feed", name: "entires" })
    expect(describeRenderDiagnostic(unread[0]!)).toContain("read by nobody")
  })

  it("is not reported for a name the primitive does read", async () => {
    const tree = treeBinding("loom.feed", { entries: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, feed))

    expect(rendered.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain("ready")
  })

  /**
   * The bargain the whole declaration rests on, and the half that decides
   * whether this can ship before every primitive declares: a primitive whose
   * author has said nothing is not a primitive claiming to read nothing.
   */
  it("says nothing about a primitive whose author has not declared", async () => {
    const tree = treeBinding("loom.panel", { anything: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, undeclared))

    expect(rendered.diagnostics).toEqual([])
  })

  it("is reported for a primitive that declared it reads nothing", async () => {
    const idFactory = sequentialIdFactory()
    const tree = createTree(
      buildElement(idFactory, {
        type: "loom.page",
        props: { [DATA_PROP_KEY]: { entries: { source: "catalogue.entries" } } } as never,
      }),
      idFactory
    )

    const rendered = await renderWith(tree, registryOf(page))

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["data-unread"])
  })

  /**
   * Two true things about one mistake, in the order they would be fixed. A
   * binding whose source does not exist is already reported; measuring the
   * unread check on the answers rather than on the raw declaration is what
   * keeps the second half from going missing exactly when the first fires.
   */
  it("is reported beside the unavailability of a binding that is both", async () => {
    const tree = treeBinding("loom.feed", { entires: { source: "nowhere" } })
    const rendered = await renderWith(tree, registryOf(page, feed))

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code).sort()).toEqual([
      "data-unavailable",
      "data-unread",
    ])
  })

  it("says nothing when the resolver is not a registry and can declare nothing", async () => {
    const resolver = staticPrimitiveResolver({
      "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
      "loom.feed": ({ children }: LoomPrimitiveProps) => createElement("section", null, children),
    })

    const tree = treeBinding("loom.feed", { entires: { source: "catalogue.entries" } })
    const data = await resolveTreeData(tree, { registry: sources() })
    const rendered = renderLoomTree(tree, { resolver, data })

    expect(rendered.diagnostics).toEqual([])
  })
})

describe("unreadBindings", () => {
  it("reports nothing when nobody has declared", () => {
    expect(unreadBindings(["a", "b"], undefined)).toEqual([])
  })

  it("reports everything when the primitive declared it reads nothing", () => {
    expect(unreadBindings(["b", "a"], [])).toEqual(["a", "b"])
  })

  it("is name-sorted, so a diagnostic list does not depend on key order", () => {
    expect(unreadBindings(["z", "a", "m"], ["m"])).toEqual(["a", "z"])
  })
})
