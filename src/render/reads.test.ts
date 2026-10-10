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
import { unreadBindingsIn } from "../runtime/vocabulary.js"
import { definePrimitive } from "../sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry } from "../sdk/registry.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { describeRenderDiagnostic } from "./diagnostics.js"
import { staticPrimitiveResolver, type LoomPrimitiveProps } from "./primitive.js"
import { namesRead, unreadBindings } from "./reads.js"
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

/**
 * The shape both bound primitives in the library actually have: the name is a
 * prop, so the declaration is the prop and the name a node that says nothing
 * reads.
 */
const boundFeed = definePrimitive({
  type: "loom.listing",
  description: "A list of entries, read under whichever name the tree gave it.",
  props: z.object({ binding: z.string().optional() }),
  reads: [{ fromProp: "binding", default: "entries" }],
  component: ({ loom, props }: LoomPrimitiveProps<{ binding?: string | undefined }>) => {
    const outcome = loom.data[props.binding ?? "entries"]

    return createElement("section", null, outcome?.status === "ready" ? "ready" : "unbound")
  },
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

const treeBinding = (type: string, declared: unknown, props: object = {}): LoomTree => {
  const idFactory = sequentialIdFactory()

  const bound = buildElement(idFactory, {
    type,
    props: { ...props, [DATA_PROP_KEY]: declared } as never,
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

/**
 * The second declaration form, on the shape that made it necessary: the name is
 * whatever the node's prop says, and the default is what a node binding one
 * thing gets without saying anything.
 */
describe("a binding on a primitive that takes its name from a prop", () => {
  it("is read under the default when the node named no prop", async () => {
    const tree = treeBinding("loom.listing", { entries: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, boundFeed))

    expect(rendered.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain("ready")
  })

  it("is read under the name the prop gives", async () => {
    const tree = treeBinding(
      "loom.listing",
      { rows: { source: "catalogue.entries" } },
      { binding: "rows" }
    )
    const rendered = await renderWith(tree, registryOf(page, boundFeed))

    expect(rendered.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain("ready")
  })

  /**
   * The direction that makes this worth building rather than shrugging at. A
   * static list would have had to declare `entries`, so this node — which reads
   * `rows` and was answered under `entries` — would have passed the check while
   * drawing an empty region.
   */
  it("reports the default as unread once the prop names something else", async () => {
    const tree = treeBinding(
      "loom.listing",
      { entries: { source: "catalogue.entries" } },
      { binding: "rows" }
    )
    const rendered = await renderWith(tree, registryOf(page, boundFeed))

    const unread = rendered.diagnostics.filter(
      (diagnostic) => diagnostic.code === "data-unread"
    )

    expect(unread).toHaveLength(1)
    expect(unread[0]).toMatchObject({ type: "loom.listing", name: "entries" })
  })

  it("reports a name nothing on the node asked for", async () => {
    const tree = treeBinding("loom.listing", { rows: { source: "catalogue.entries" } })
    const rendered = await renderWith(tree, registryOf(page, boundFeed))

    expect(rendered.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["data-unread"])
  })
})

/**
 * The claim that made `BindingReader` the write path's vocabulary too rather
 * than a second shape beside it (0208): what the walk reports as `data-unread`
 * is, on the same tree and the same registry, exactly what the write path
 * refuses. Asserted by running both over one tree rather than by reading the two
 * implementations and agreeing they look alike.
 *
 * A registry is handed to `unreadBindingsIn` directly, with nothing wrapping it,
 * because a registry already satisfies the interface — which is the other half
 * of the same claim.
 */
describe("the two seams, over one tree", () => {
  const unreadNamesRendered = (rendered: Awaited<ReturnType<typeof renderWith>>) =>
    rendered.diagnostics
      .flatMap((diagnostic) => (diagnostic.code === "data-unread" ? [diagnostic.name] : []))
      .sort()

  it("agree on a name the primitive does not read", async () => {
    const tree = treeBinding("loom.feed", { entires: { source: "catalogue.entries" } })
    const registry = registryOf(page, feed)

    expect(unreadBindingsIn(tree.root, registry).map((unread) => unread.name)).toEqual(
      unreadNamesRendered(await renderWith(tree, registry))
    )
  })

  it("agree on a prop-named declaration the node redirected", async () => {
    const tree = treeBinding(
      "loom.listing",
      { entries: { source: "catalogue.entries" } },
      { binding: "rows" }
    )
    const registry = registryOf(page, boundFeed)

    expect(unreadBindingsIn(tree.root, registry).map((unread) => unread.name)).toEqual(
      unreadNamesRendered(await renderWith(tree, registry))
    )
  })

  it("agree that there is nothing to say about a primitive whose author has not declared", async () => {
    const tree = treeBinding("loom.panel", { anything: { source: "catalogue.entries" } })
    const registry = registryOf(page, undeclared)

    expect(unreadBindingsIn(tree.root, registry)).toEqual([])
    expect(unreadNamesRendered(await renderWith(tree, registry))).toEqual([])
  })

  it("agree on a binding that is both unavailable and unread", async () => {
    const tree = treeBinding("loom.feed", { entires: { source: "nowhere" } })
    const registry = registryOf(page, feed)

    expect(unreadBindingsIn(tree.root, registry).map((unread) => unread.name)).toEqual(
      unreadNamesRendered(await renderWith(tree, registry))
    )
  })
})

describe("unreadBindings", () => {
  it("reports nothing when nobody has declared", () => {
    expect(unreadBindings(["a", "b"], undefined, {})).toEqual([])
  })

  it("reports everything when the primitive declared it reads nothing", () => {
    expect(unreadBindings(["b", "a"], [], {})).toEqual(["a", "b"])
  })

  it("is name-sorted, so a diagnostic list does not depend on key order", () => {
    expect(unreadBindings(["z", "a", "m"], ["m"], {})).toEqual(["a", "z"])
  })

  it("resolves a prop-named declaration against the node's own props", () => {
    const declared = [{ fromProp: "binding", default: "entries" }]

    expect(unreadBindings(["rows"], declared, { binding: "rows" })).toEqual([])
    expect(unreadBindings(["entries"], declared, { binding: "rows" })).toEqual(["entries"])
    expect(unreadBindings(["entries"], declared, {})).toEqual([])
  })

  /**
   * A prop the schema would refuse cannot reach a rendered node, and the
   * fallback is what makes that true of this seam as well rather than
   * something a later change has to remember.
   */
  it("falls back to the default for a prop value that is not a name", () => {
    const declared = [{ fromProp: "binding", default: "entries" }]

    expect(unreadBindings(["entries"], declared, { binding: "" })).toEqual([])
    expect(unreadBindings(["entries"], declared, { binding: 7 })).toEqual([])
    expect(unreadBindings(["entries"], declared, { binding: null })).toEqual([])
  })

  it("reads a fixed name and a prop-named one on the same primitive", () => {
    const declared = ["summary", { fromProp: "binding", default: "entries" }]

    expect(unreadBindings(["summary", "rows"], declared, { binding: "rows" })).toEqual([])
    expect(unreadBindings(["summary", "entries"], declared, { binding: "rows" })).toEqual([
      "entries",
    ])
  })
})

/**
 * The resolution on its own, because a second instrument asks it of a probe
 * state rather than of a node and the two must not drift. `unreadBindings` is
 * the same rule read the other way round, so these cases are the ones that
 * would differ if it were reimplemented.
 */
describe("namesRead", () => {
  it("answers one name per declaration, in the order declared", () => {
    expect(namesRead(["summary", "entries"], {})).toEqual(["summary", "entries"])
  })

  it("takes a prop-named declaration's name from the props", () => {
    expect(namesRead([{ fromProp: "binding", default: "entries" }], { binding: "rows" })).toEqual([
      "rows",
    ])
  })

  it("falls back to the default where the prop says nothing usable", () => {
    const declared = [{ fromProp: "binding", default: "entries" }]

    expect(namesRead(declared, {})).toEqual(["entries"])
    expect(namesRead(declared, { binding: "" })).toEqual(["entries"])
    expect(namesRead(declared, { binding: 7 })).toEqual(["entries"])
  })

  /** Neither sorted nor deduplicated — `unreadBindings` is the caller that wants a set. */
  it("keeps a name declared twice twice", () => {
    expect(namesRead(["z", "a", "z"], {})).toEqual(["z", "a", "z"])
  })

  it("answers nothing for a primitive that declared it reads nothing", () => {
    expect(namesRead([], { binding: "rows" })).toEqual([])
  })
})
