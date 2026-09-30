import { createElement, type ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
  createDataRegistry,
  defineSource,
  type DataRegistry,
  type SourceEntry,
} from "../data/adapter.js"
import { NO_DATA, nodeDataOf } from "../data/resolution.js"
import { resolveTreeData } from "../data/resolve.js"
import { sequentialIdFactory } from "../ids.js"
import type { JsonValue } from "../json.js"
import { primitiveTypeSchema } from "../primitive-type.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { ok } from "../result.js"
import { definePrimitive, type PrimitiveEntry } from "../sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry } from "../sdk/registry.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { describeRenderDiagnostic } from "./diagnostics.js"
import { staticPrimitiveResolver, type LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"
import {
  isUnshownReader,
  readUnshown,
  unshownRows,
  type UnshownDeclaration,
  type UnshownReading,
} from "./unshown.js"

/**
 * The shape the library primitive this exists for already has: one pure function
 * reads the answer, the component draws what it returns, and the declaration
 * hands the runtime the same reading. That the two cannot disagree is the whole
 * reason the declaration is a function and not a number somebody maintains.
 */
const rowsIn = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((row): row is string => typeof row === "string") : []

const readRows = (props: JsonProps, data: Parameters<UnshownDeclaration>[1]) => {
  const outcome = data[props.binding ?? "entries"]
  const given = outcome?.status === "ready" && Array.isArray(outcome.value) ? outcome.value.length : 0

  return { given, shown: rowsIn(outcome?.status === "ready" ? outcome.value : undefined).length }
}

type JsonProps = { readonly binding?: string | undefined }

const feed = definePrimitive({
  type: "loom.feed",
  description: "A list of entries a source answered with.",
  props: z.object({ binding: z.string().optional() }),
  reads: [{ fromProp: "binding", default: "entries" }],
  unshown: (props, data) => [
    { name: (props as JsonProps).binding ?? "entries", ...readRows(props as JsonProps, data) },
  ],
  component: ({ loom, props }: LoomPrimitiveProps<JsonProps>) => {
    const outcome = loom.data[props.binding ?? "entries"]

    return createElement(
      "ul",
      null,
      rowsIn(outcome?.status === "ready" ? outcome.value : undefined).map((row) =>
        createElement("li", { key: row }, row)
      )
    )
  },
})

const page = definePrimitive({
  type: "loom.page",
  description: "The page.",
  props: z.object({}),
  component: ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
})

/** The bargain: a primitive whose author has said nothing is reported on by nothing. */
const silentFeed = definePrimitive({
  type: "loom.listing",
  description: "A list whose author has not said what it drops.",
  props: z.object({}),
  reads: ["entries"],
  component: ({ loom }: LoomPrimitiveProps) => {
    const outcome = loom.data["entries"]

    return createElement(
      "ul",
      null,
      rowsIn(outcome?.status === "ready" ? outcome.value : undefined).map((row) =>
        createElement("li", { key: row }, row)
      )
    )
  },
})

/** A declaration that cannot be believed, one way per primitive. */
const declaring = (type: string, unshown: UnshownDeclaration): PrimitiveEntry =>
  definePrimitive({
    type,
    description: "A list whose declaration is wrong.",
    props: z.object({}),
    reads: ["entries"],
    unshown,
    component: () => createElement("ul", null, createElement("li", null, "drawn anyway")),
  })

/** A primitive that says its content twice, to hold the decorative walk to silence. */
const twice = definePrimitive({
  type: "loom.twice",
  description: "Its children, and its children again.",
  props: z.object({}),
  component: ({ loom, children }: LoomPrimitiveProps) =>
    createElement("div", null, children as ReactNode, loom.decorative()),
})

const registryOf = (...entries: readonly PrimitiveEntry[]): PrimitiveRegistry => {
  const registry = createPrimitiveRegistry(entries)
  if (!registry.ok) throw new Error(`test registry refused: ${registry.error.code}`)

  return registry.value
}

/**
 * Twelve rows, eleven of which are strings — the finding's own numbers, and the
 * one row of some other shape is what the primitive declines.
 */
const ELEVEN_OF_TWELVE: readonly JsonValue[] = [
  ...Array.from({ length: 11 }, (_row, index) => `Row ${index + 1}`),
  { renamedColumn: "Row 12" },
]

const sources = (answer: readonly JsonValue[] = ELEVEN_OF_TWELVE): DataRegistry => {
  const entry: SourceEntry = defineSource({
    id: "catalogue.entries",
    description: "The entries this profile offers",
    params: z.object({}).passthrough(),
    answers: z.array(z.union([z.string(), z.record(z.string())])),
    adapter: { fetch: () => Promise.resolve(ok([...answer])) },
  })

  const registry = createDataRegistry([entry])
  if (!registry.ok) throw new Error(`test source registry refused: ${registry.error.code}`)

  return registry.value
}

const treeBinding = (type: string, declared: unknown, props: object = {}): LoomTree => {
  const idFactory = sequentialIdFactory()

  const bound = buildElement(idFactory, {
    type,
    props: { ...props, [DATA_PROP_KEY]: declared } as never,
    children: [buildText(idFactory, "")],
  })

  return createTree(buildElement(idFactory, { type: "loom.page", children: [bound] }), idFactory)
}

const renderWith = async (
  tree: LoomTree,
  resolver: PrimitiveRegistry,
  answer?: readonly JsonValue[]
) => {
  const data = await resolveTreeData(tree, { registry: sources(answer) })

  return renderLoomTree(tree, { resolver, validator: resolver, data })
}

const typeOf = (type: string) => primitiveTypeSchema.parse(type)

const unshownIn = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.filter((diagnostic) => diagnostic.code === "data-unshown")

describe("an answer a primitive was given whole and drew part of", () => {
  /**
   * The finding's sentence, as a diagnostic: the author whose source started
   * returning a column under a new name wants to know that eleven of twelve rows
   * stopped reading. The reader is told without a count (0175) and this is the
   * count.
   */
  it("is reported with both counts, on the primitive that declared the reading", async () => {
    const tree = treeBinding("loom.feed", { entries: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, feed))

    expect(unshownIn(rendered.diagnostics)).toEqual([
      {
        code: "data-unshown",
        nodeId: "n_2",
        type: "loom.feed",
        name: "entries",
        given: 12,
        shown: 11,
      },
    ])
  })

  it("does not cost the node its rows — the eleven are still drawn", async () => {
    const tree = treeBinding("loom.feed", { entries: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, feed))
    const markup = renderToStaticMarkup(rendered.element)

    expect(markup).toContain("Row 11")
    expect(markup).not.toContain("Row 12")
  })

  it("says nothing of an answer the primitive read whole", async () => {
    const tree = treeBinding("loom.feed", { entries: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, feed), ["One", "Two"])

    expect(rendered.diagnostics).toEqual([])
  })

  /**
   * The half that decides whether this can ship before every bound primitive
   * declares one, and the same bargain `reads` makes: absence is not emptiness
   * (0181). A primitive whose author has said nothing is not a primitive
   * claiming it shows everything it is given.
   */
  it("says nothing about a primitive whose author has not declared one", async () => {
    const tree = treeBinding("loom.listing", { entries: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, silentFeed))

    expect(rendered.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain("Row 11")
  })

  it("says nothing when the resolver is not a registry and can declare nothing", async () => {
    const resolver = staticPrimitiveResolver({
      "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
      "loom.feed": ({ children }: LoomPrimitiveProps) => createElement("ul", null, children),
    })

    const tree = treeBinding("loom.feed", { entries: { source: "catalogue.entries" } })
    const data = await resolveTreeData(tree, { registry: sources() })

    expect(renderLoomTree(tree, { resolver, data }).diagnostics).toEqual([])
  })

  /**
   * The declaration is handed the node's props for the reason `reads` is handed
   * them (0184): a primitive that takes its binding name from a prop means
   * something different on every node carrying one, and the walk is the only
   * place holding both.
   */
  it("reads the name off the node's props, as the primitive does", async () => {
    const tree = treeBinding(
      "loom.feed",
      { rows: { source: "catalogue.entries" } },
      { binding: "rows" }
    )
    const rendered = await renderWith(tree, registryOf(page, feed))

    expect(unshownIn(rendered.diagnostics)).toMatchObject([{ name: "rows", given: 12, shown: 11 }])
  })

  it("is reported beside the unavailability of a second binding that failed", async () => {
    const tree = treeBinding("loom.feed", {
      entries: { source: "catalogue.entries" },
      extra: { source: "nowhere" },
    })
    const rendered = await renderWith(tree, registryOf(page, feed))

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code).sort()).toEqual([
      "data-unavailable",
      "data-unread",
      "data-unshown",
    ])
  })

  /**
   * A decorative copy carries no identity and raises no diagnostics — the walk
   * discards them, so a node inside one is reported once by the render that owns
   * it rather than twice.
   */
  it("is reported once for a node whose ancestor says its content twice", async () => {
    const idFactory = sequentialIdFactory()
    const bound = buildElement(idFactory, {
      type: "loom.feed",
      props: { [DATA_PROP_KEY]: { entries: { source: "catalogue.entries" } } } as never,
    })
    const tree = createTree(
      buildElement(idFactory, {
        type: "loom.page",
        children: [buildElement(idFactory, { type: "loom.twice", children: [bound] })],
      }),
      idFactory
    )

    const rendered = await renderWith(tree, registryOf(page, twice, feed))
    renderToStaticMarkup(rendered.element)

    expect(unshownIn(rendered.diagnostics)).toHaveLength(1)
  })

  it("names both counts in the sentence a reader of diagnostics gets", async () => {
    const tree = treeBinding("loom.feed", { entries: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, feed))
    const sentence = describeRenderDiagnostic(unshownIn(rendered.diagnostics)[0] as never)

    expect(sentence).toContain("12 rows")
    expect(sentence).toContain("showed 11")
  })
})

describe("a declaration that cannot be believed", () => {
  /**
   * Rendering is total, and a declaration is not a licence to make it otherwise.
   * A page lost to a primitive's own bookkeeping would be the worst trade in the
   * package, so the throw becomes the thing it was trying to report.
   */
  it("is reported rather than thrown, and the node renders exactly as it would have", async () => {
    const throwing = declaring("loom.thrower", () => {
      throw new Error("read the rows wrong")
    })
    const tree = treeBinding("loom.thrower", { entries: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, throwing))

    expect(rendered.diagnostics).toEqual([
      {
        code: "unshown-unreadable",
        nodeId: "n_2",
        type: "loom.thrower",
        fault: { kind: "threw", detail: "read the rows wrong" },
      },
    ])
    expect(renderToStaticMarkup(rendered.element)).toContain("drawn anyway")
  })

  it("names the fault in the sentence, against the primitive rather than the tree", async () => {
    const throwing = declaring("loom.thrower", () => {
      throw new Error("read the rows wrong")
    })
    const tree = treeBinding("loom.thrower", { entries: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, throwing))

    expect(describeRenderDiagnostic(rendered.diagnostics[0] as never)).toContain(
      "could not be believed"
    )
    expect(describeRenderDiagnostic(rendered.diagnostics[0] as never)).toContain(
      "read the rows wrong"
    )
  })

  /**
   * *Thirteen of twelve* sends the author looking for a defect that is in the
   * primitive telling them about it. Refused rather than clamped for that reason
   * and no other.
   */
  it("is refused when it shows more rows than it was given", () => {
    const fault = readUnshown(() => [{ name: "entries", given: 12, shown: 13 }], {}, NO_DATA)

    expect(fault).toEqual({
      ok: false,
      error: {
        kind: "impossible",
        detail: 'reading 0 ("entries") showed 13 of 12 rows',
      },
    })
  })

  it("is refused for a count that is not a whole number of rows", () => {
    expect(readUnshown(() => [{ name: "entries", given: 1.5, shown: 1 }], {}, NO_DATA).ok).toBe(
      false
    )
    expect(readUnshown(() => [{ name: "entries", given: 2, shown: -1 }], {}, NO_DATA).ok).toBe(
      false
    )
  })

  it("is refused for a reading that names no binding", () => {
    expect(readUnshown(() => [{ name: "", given: 2, shown: 1 }], {}, NO_DATA)).toEqual({
      ok: false,
      error: { kind: "impossible", detail: "reading 0 names no binding" },
    })
  })

  /**
   * The type says a declaration returns an array of readings and a host's
   * JavaScript need not agree with it. Both halves are checked at the seam
   * rather than trusted, because the whole point of the guard is that the code
   * on the other side of it is somebody else's.
   */
  it("is refused when it returns something that is not readings at all", () => {
    expect(
      readUnshown((() => undefined) as unknown as UnshownDeclaration, {}, NO_DATA)
    ).toEqual({
      ok: false,
      error: { kind: "impossible", detail: "the declaration returned no readings at all" },
    })
    expect(
      readUnshown((() => [undefined]) as unknown as UnshownDeclaration, {}, NO_DATA)
    ).toEqual({
      ok: false,
      error: { kind: "impossible", detail: "reading 0 is not a reading" },
    })
  })

  /**
   * The whole batch, not the bad reading alone. A declaration that miscounted one
   * answer has not earned belief about the others, and a partial report is
   * indistinguishable from a complete one once it is in a log.
   */
  it("costs the readings beside it, not only itself", () => {
    const readings = readUnshown(
      () => [
        { name: "entries", given: 12, shown: 11 },
        { name: "extra", given: 1, shown: 2 },
      ],
      {},
      NO_DATA
    )

    expect(readings.ok).toBe(false)
  })
})

describe("which readings the walk reports", () => {
  it("keeps the ones where fewer rows were shown than given", () => {
    const readings: readonly UnshownReading[] = [
      { name: "kept", given: 3, shown: 1 },
      { name: "whole", given: 3, shown: 3 },
      { name: "empty", given: 0, shown: 0 },
    ]

    expect(unshownRows(readings).map((reading) => reading.name)).toEqual(["kept"])
  })

  /**
   * Name-sorted for the reason `unreadBindings` sorts: one diagnostic per
   * reading, and a list whose order follows a declaration's own array order is
   * one a test can only assert loosely.
   */
  it("reports them name-sorted rather than in the declaration's order", () => {
    const readings: readonly UnshownReading[] = [
      { name: "second", given: 2, shown: 1 },
      { name: "first", given: 2, shown: 0 },
    ]

    expect(unshownRows(readings).map((reading) => reading.name)).toEqual(["first", "second"])
  })

  it("does not reorder the declaration's own array", () => {
    const readings: UnshownReading[] = [
      { name: "second", given: 2, shown: 1 },
      { name: "first", given: 2, shown: 0 },
    ]

    unshownRows(readings)

    expect(readings.map((reading) => reading.name)).toEqual(["second", "first"])
  })
})

describe("the seam a registry satisfies", () => {
  it("is detected on a registry and not on a plain resolver", () => {
    expect(isUnshownReader(registryOf(page, feed))).toBe(true)
    expect(
      isUnshownReader(
        staticPrimitiveResolver({
          "loom.page": ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
        })
      )
    ).toBe(false)
  })

  it("answers undefined for a type nobody registered, and for one that declared nothing", () => {
    const registry = registryOf(page, feed, silentFeed)

    expect(registry.unshownBy(typeOf("loom.feed"))).toBeTypeOf("function")
    expect(registry.unshownBy(typeOf("loom.listing"))).toBeUndefined()
    expect(registry.unshownBy(typeOf("loom.nothing"))).toBeUndefined()
  })

  it("hands the declaration the answers the component is handed", () => {
    const registry = registryOf(page, feed)
    const declaration = registry.unshownBy(typeOf("loom.feed"))

    expect(
      declaration?.({}, nodeDataOf({ entries: { status: "ready", value: [...ELEVEN_OF_TWELVE] } }))
    ).toEqual([{ name: "entries", given: 12, shown: 11 }])
  })
})
