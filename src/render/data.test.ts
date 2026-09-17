import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { createDataRegistry, defineSource, type DataRegistry, type SourceEntry } from "../data/adapter.js"
import { planTreeData } from "../data/plan.js"
import { buildDataResolution, EMPTY_DATA_RESOLUTION } from "../data/resolution.js"
import { resolveTreeData } from "../data/resolve.js"
import { sequentialIdFactory } from "../ids.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { err, ok } from "../result.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { describeRenderDiagnostic, type RenderDiagnostic } from "./diagnostics.js"
import { staticPrimitiveResolver, type LoomPrimitive, type LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"
import { renderRequest, type TreeSource } from "./request.js"

/**
 * A primitive that shows what it was given, and shows the two failures apart:
 * "you have none yet" and "we could not reach them" are different sentences,
 * which is the whole reason `loom.data` carries a reason rather than a maybe.
 */
const servicesPrimitive: LoomPrimitive = ({ loom }: LoomPrimitiveProps) => {
  const outcome = loom.data["services"]

  if (!outcome) return createElement("section", null, "unbound")
  if (outcome.status === "unavailable") {
    return createElement("section", { "data-state": "unavailable" }, outcome.unavailable.reason)
  }

  const items = Array.isArray(outcome.value) ? outcome.value : []

  return createElement(
    "section",
    { "data-state": items.length === 0 ? "empty" : "ready" },
    items.map((item, index) => createElement("li", { key: index }, String(item)))
  )
}

const resolver = staticPrimitiveResolver({
  "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
  "loom.services": servicesPrimitive,
})

const treeBinding = (declared: unknown): LoomTree => {
  const idFactory = sequentialIdFactory()

  const services = buildElement(idFactory, {
    type: "loom.services",
    props: { heading: "What I do", [DATA_PROP_KEY]: declared } as never,
    children: [buildText(idFactory, "")],
  })

  return createTree(
    buildElement(idFactory, { type: "loom.page", children: [services] }),
    idFactory
  )
}

const registryOf = (...entries: readonly SourceEntry[]): DataRegistry => {
  const registry = createDataRegistry(entries)
  if (!registry.ok) throw new Error(`test registry refused: ${registry.error.code}`)

  return registry.value
}

const listSource = (items: readonly string[]): SourceEntry =>
  defineSource({
    id: "catalogue.services",
    description: "The services this profile offers",
    params: z.object({}).passthrough(),
    answers: z.array(z.string()),
    adapter: { fetch: () => Promise.resolve(ok([...items])) },
  })

const renderWith = async (tree: LoomTree, registry: DataRegistry) => {
  const data = await resolveTreeData(tree, { registry })

  return renderLoomTree(tree, { resolver, data })
}

describe("a primitive's data", () => {
  it("reaches the primitive that asked for it", async () => {
    const tree = treeBinding({ services: { source: "catalogue.services" } })
    const rendered = await renderWith(tree, registryOf(listSource(["Coaching", "Advising"])))

    const markup = renderToStaticMarkup(rendered.element)

    expect(markup).toContain("Coaching")
    expect(markup).toContain('data-state="ready"')
    expect(rendered.diagnostics).toEqual([])
  })

  it("tells a source that answered with nothing apart from one that could not answer", async () => {
    const tree = treeBinding({ services: { source: "catalogue.services" } })

    const empty = await renderWith(tree, registryOf(listSource([])))
    const down = await renderWith(
      tree,
      registryOf(
        defineSource({
          id: "catalogue.services",
          description: "is down",
          params: z.object({}).passthrough(),
          answers: z.array(z.string()),
          adapter: { fetch: () => Promise.resolve(err({ code: "unavailable", detail: "timed out" })) },
        })
      )
    )

    expect(renderToStaticMarkup(empty.element)).toContain('data-state="empty"')
    expect(renderToStaticMarkup(down.element)).toContain('data-state="unavailable"')
  })

  it("still renders the node when its data could not be answered", async () => {
    const tree = treeBinding({ services: { source: "nowhere" } })
    const rendered = await renderWith(tree, registryOf(listSource([])))

    expect(renderToStaticMarkup(rendered.element)).toContain("<section")
    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["data-unavailable"])
  })

  it("hands an empty bag to a node that binds nothing", () => {
    const idFactory = sequentialIdFactory()
    const tree = createTree(
      buildElement(idFactory, {
        type: "loom.page",
        children: [buildElement(idFactory, { type: "loom.services" })],
      }),
      idFactory
    )

    const rendered = renderLoomTree(tree, { resolver })

    expect(renderToStaticMarkup(rendered.element)).toContain("unbound")
    expect(rendered.diagnostics).toEqual([])
  })

  it("says so when the tree asks for data and the render was given no resolution", () => {
    const tree = treeBinding({ services: { source: "catalogue.services" } })
    const rendered = renderLoomTree(tree, { resolver })

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["data-unresolved"])
    expect(rendered.diagnostics[0]).toMatchObject({ resolution: "absent" })
    expect(renderToStaticMarkup(rendered.element)).toContain("unbound")
  })

  /**
   * The three ways to hand a bound tree a render with no answers, filed by
   * `Loom lessons` on 14 September as a table in which the middle row was silent.
   * It is asserted as a table because the defect was not any one row's behaviour
   * — each was defensible alone — but the fact that three routes to one mistake
   * reported three different amounts.
   */
  describe("a render with no answers for a tree that asks", () => {
    const declared = { services: { source: "catalogue.services" } }

    it("says so when the resolution was built from a different tree's plan", () => {
      const tree = treeBinding(declared)
      const rendered = renderLoomTree(tree, { resolver, data: EMPTY_DATA_RESOLUTION })

      expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["data-unresolved"])
      expect(rendered.diagnostics[0]).toMatchObject({ resolution: "unrelated" })
    })

    it("sends a reader to the composition root rather than to the registry", () => {
      const tree = treeBinding(declared)
      const { diagnostics } = renderLoomTree(tree, { resolver, data: EMPTY_DATA_RESOLUTION })
      const sentence = describeRenderDiagnostic(diagnostics[0] as RenderDiagnostic)

      expect(sentence).toContain("a different plan than this tree")
      expect(sentence).not.toContain("was given no resolution")
    })

    it("reports every route, and never none of them", () => {
      const tree = treeBinding(declared)

      const routes = {
        "nothing at all": renderLoomTree(tree, { resolver }),
        EMPTY_DATA_RESOLUTION: renderLoomTree(tree, { resolver, data: EMPTY_DATA_RESOLUTION }),
        "a resolution of this plan with no answers": renderLoomTree(tree, {
          resolver,
          data: buildDataResolution(planTreeData(tree), new Map()),
        }),
      }

      expect(
        Object.fromEntries(
          Object.entries(routes).map(([route, rendered]) => [
            route,
            rendered.diagnostics.map((diagnostic) => diagnostic.code),
          ])
        )
      ).toEqual({
        "nothing at all": ["data-unresolved"],
        EMPTY_DATA_RESOLUTION: ["data-unresolved"],
        "a resolution of this plan with no answers": ["data-unavailable"],
      })
    })

    it("stays silent for a declaration that asked for nothing", () => {
      const rendered = renderLoomTree(treeBinding({}), {
        resolver,
        data: EMPTY_DATA_RESOLUTION,
      })

      expect(rendered.diagnostics).toEqual([])
    })

    /**
     * A malformed declaration is a node that asked badly, not one that stayed
     * quiet. Against a resolution built from this tree it is `data-misdeclared`;
     * against one that never saw the node, nobody is left to say either thing,
     * so the walk says the one it can.
     */
    it("counts a declaration that is not an object at all as having asked", () => {
      for (const declared of ["catalogue.services", 7, [], { services: 1 }]) {
        const rendered = renderLoomTree(treeBinding(declared), {
          resolver,
          data: EMPTY_DATA_RESOLUTION,
        })

        expect(
          rendered.diagnostics.map((diagnostic) => diagnostic.code),
          JSON.stringify(declared)
        ).toEqual(Array.isArray(declared) ? [] : ["data-unresolved"])
      }
    })

    it("says it once for a malformed declaration a real resolution already reported", async () => {
      const tree = treeBinding({ services: { source: "NOT A SOURCE" } })
      const rendered = await renderWith(tree, registryOf(listSource([])))

      expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["data-misdeclared"])
    })

    it("stays silent when the answers are the ones this tree asked for", async () => {
      const tree = treeBinding({ services: { source: "catalogue.services" } })
      const rendered = await renderWith(tree, registryOf(listSource(["writing"])))

      expect(rendered.diagnostics).toEqual([])
      expect(renderToStaticMarkup(rendered.element)).toContain("writing")
    })
  })

  it("reports a malformed declaration and renders the node without data", async () => {
    const tree = treeBinding({ services: { source: "NOT A SOURCE" } })
    const rendered = await renderWith(tree, registryOf(listSource([])))

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["data-misdeclared"])
    expect(renderToStaticMarkup(rendered.element)).toContain("unbound")
  })

  it("never lets the binding declaration reach the primitive's own props", async () => {
    const seen: unknown[] = []
    const spy = staticPrimitiveResolver({
      "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
      "loom.services": ({ props }: LoomPrimitiveProps) => {
        seen.push(props)
        return createElement("section")
      },
    })

    const tree = treeBinding({ services: { source: "catalogue.services" } })
    const data = await resolveTreeData(tree, { registry: registryOf(listSource([])) })

    renderToStaticMarkup(renderLoomTree(tree, { resolver: spy, data }).element)

    expect(seen).toEqual([{ heading: "What I do" }])
  })

  it("does not report a binding as an unrecognised reserved prop", async () => {
    const tree = treeBinding({ services: { source: "catalogue.services" } })
    const rendered = await renderWith(tree, registryOf(listSource([])))

    expect(
      rendered.diagnostics.some((diagnostic) => diagnostic.code === "reserved-prop-unrecognised")
    ).toBe(false)
  })
})

describe("renderRequest, with sources", () => {
  const sourceOf = (tree: LoomTree): TreeSource => ({
    load: () => Promise.resolve(ok(JSON.parse(JSON.stringify(tree)) as unknown)),
  })

  it("resolves the tree's data between loading it and rendering it", async () => {
    const tree = treeBinding({ services: { source: "catalogue.services" } })

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      { source: sourceOf(tree), resolver, sources: registryOf(listSource(["Coaching"])) }
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(renderToStaticMarkup(rendered.value.element)).toContain("Coaching")
    expect(rendered.value.diagnostics).toEqual([])
  })

  it("passes the request's host context down to the adapters", async () => {
    const seen: unknown[] = []
    const tree = treeBinding({ services: { source: "catalogue.services" } })

    const recording = defineSource({
      id: "catalogue.services",
      description: "records its context",
      params: z.object({}).passthrough(),
      answers: z.array(z.string()),
      adapter: {
        fetch: (request) => {
          seen.push(request.context)
          return Promise.resolve(ok([]))
        },
      },
    })

    await renderRequest(
      { treeId: tree.treeId, editMode: false, context: { audience: "member" } },
      { source: sourceOf(tree), resolver, sources: registryOf(recording) }
    )

    expect(seen).toEqual([{ audience: "member" }])
  })

  it("renders a tree that binds nothing without a source registry at all", async () => {
    const idFactory = sequentialIdFactory()
    const tree = createTree(buildElement(idFactory, { type: "loom.page" }), idFactory)

    const rendered = await renderRequest(
      { treeId: tree.treeId, editMode: false },
      { source: sourceOf(tree), resolver }
    )

    expect(rendered.ok).toBe(true)
    if (!rendered.ok) return

    expect(rendered.value.diagnostics).toEqual([])
  })
})
