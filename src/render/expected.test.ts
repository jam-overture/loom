import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import {
  createDataRegistry,
  defineSource,
  describeDataUnavailable,
  type DataRegistry,
  type SourceEntry,
} from "../data/adapter.js"
import { resolveTreeData } from "../data/resolve.js"
import { nodeDataOf, type DataOutcome } from "../data/resolution.js"
import { sequentialIdFactory } from "../ids.js"
import type { JsonValue } from "../json.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { ok } from "../result.js"
import { definePrimitive } from "../sdk/definition.js"
import { createPrimitiveRegistry, type PrimitiveRegistry } from "../sdk/registry.js"
import { buildElement, buildText } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import { describeRenderDiagnostic } from "./diagnostics.js"
import { checkAnswers, declaredName, isAnswerReader } from "./expected.js"
import type { LoomPrimitiveProps } from "./primitive.js"
import { renderLoomTree } from "./render.js"

/**
 * A primitive that says what it draws, and the same primitive with that one
 * declaration removed.
 *
 * The pair is the whole of what these tests are about: before an expectation
 * existed, both of these were the second one, and the only report of an answer
 * in the wrong shape was whatever the component chose to draw.
 */
const listing = definePrimitive({
  type: "loom.listing",
  description: "A list of entries a source answered with.",
  props: z.object({}),
  reads: ["entries"],
  expects: { entries: z.array(z.unknown()) },
  component: ({ loom }: LoomPrimitiveProps) => {
    const outcome = loom.data["entries"]

    return createElement(
      "section",
      null,
      outcome?.status === "ready" ? `ready:${JSON.stringify(outcome.value)}` : "no answer"
    )
  },
})

const undeclaredListing = definePrimitive({
  type: "loom.panel",
  description: "A list whose author has not said what it draws.",
  props: z.object({}),
  reads: ["entries"],
  component: ({ loom }: LoomPrimitiveProps) => {
    const outcome = loom.data["entries"]

    return createElement(
      "div",
      null,
      outcome?.status === "ready" ? `ready:${JSON.stringify(outcome.value)}` : "no answer"
    )
  },
})

/** A figure, which is the shape the mistake this exists for actually takes. */
const tally = definePrimitive({
  type: "loom.tally",
  description: "One figure a source answered with.",
  props: z.object({}),
  reads: ["value"],
  expects: { value: z.union([z.string().min(1), z.number().finite()]) },
  component: ({ loom }: LoomPrimitiveProps) => {
    const outcome = loom.data["value"]

    return createElement(
      "p",
      null,
      outcome?.status === "ready" ? `ready:${String(outcome.value)}` : "no figure"
    )
  },
})

/**
 * The shape both bound primitives in the library have: the name is a prop, so
 * the declaration is the prop and the expectation is keyed by the name a node
 * that says nothing reads.
 */
const renamable = definePrimitive({
  type: "loom.feed",
  description: "A list of entries, read under whichever name the tree gave it.",
  props: z.object({ binding: z.string().optional() }),
  reads: [{ fromProp: "binding", default: "entries" }],
  expects: { entries: z.array(z.unknown()) },
  component: ({ loom, props }: LoomPrimitiveProps<{ binding?: string | undefined }>) => {
    const outcome = loom.data[props.binding ?? "entries"]

    return createElement("section", null, outcome?.status === "ready" ? "ready" : "no answer")
  },
})

const page = definePrimitive({
  type: "loom.page",
  description: "The page.",
  props: z.object({}),
  reads: [],
  component: ({ children }: LoomPrimitiveProps) => createElement("main", null, children),
})

const registryOf = (...entries: readonly Parameters<typeof createPrimitiveRegistry>[0][number][]) => {
  const registry = createPrimitiveRegistry(entries)
  if (!registry.ok) throw new Error(`test registry refused: ${registry.error.code}`)

  return registry.value
}

const sourceAnswering = (id: string, answer: JsonValue): SourceEntry =>
  defineSource({
    id,
    description: `Answers with ${id}`,
    params: z.object({}).passthrough(),
    answers: z.unknown().transform((value) => value as JsonValue),
    adapter: { fetch: () => Promise.resolve(ok(answer)) },
  })

const sources = (...entries: readonly SourceEntry[]): DataRegistry => {
  const registry = createDataRegistry(entries)
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
  registry: DataRegistry
) => {
  const data = await resolveTreeData(tree, { registry })

  return renderLoomTree(tree, { resolver, validator: resolver, data })
}

describe("an answer the primitive says it cannot draw", () => {
  it("reaches the primitive as the named absence of an answer", async () => {
    const tree = treeBinding("loom.tally", { value: { source: "catalogue.rows" } })
    const rendered = await renderWith(
      tree,
      registryOf(page, tally),
      sources(sourceAnswering("catalogue.rows", [{ title: "A row" }]))
    )

    expect(renderToStaticMarkup(rendered.element)).toContain("no figure")
  })

  it("is reported against the source that answered it", async () => {
    const tree = treeBinding("loom.tally", { value: { source: "catalogue.rows" } })
    const rendered = await renderWith(
      tree,
      registryOf(page, tally),
      sources(sourceAnswering("catalogue.rows", [{ title: "A row" }]))
    )

    const unavailable = rendered.diagnostics.filter(
      (diagnostic) => diagnostic.code === "data-unavailable"
    )

    expect(unavailable).toHaveLength(1)
    expect(unavailable[0]).toMatchObject({
      name: "value",
      source: "catalogue.rows",
      unavailable: { reason: "unreadable-answer" },
    })
  })

  /**
   * The sentence is the half a person reads, and the one thing it has to do is
   * not read like `invalid-answer`: the source did answer, and it answered
   * something its own schema was happy with.
   */
  it("says that the source answered and the primitive refused the shape", () => {
    const sentence = describeDataUnavailable({
      reason: "unreadable-answer",
      detail: "expected string, received array",
    })

    expect(sentence).toContain("the source answered")
    expect(sentence).toContain("not a shape it can draw")
    expect(sentence).toContain("expected string, received array")
  })

  it("names the issue the primitive's own schema gave", async () => {
    const tree = treeBinding("loom.listing", { entries: { source: "catalogue.one" } })
    const rendered = await renderWith(
      tree,
      registryOf(page, listing),
      sources(sourceAnswering("catalogue.one", "not a list"))
    )

    const [diagnostic] = rendered.diagnostics
    expect(diagnostic?.code).toBe("data-unavailable")
    expect(describeRenderDiagnostic(diagnostic!)).toContain("not a shape it can draw")
  })

  /**
   * The expectation is keyed by the declared name, so a node that renames the
   * binding it draws from is still checked. A primitive's drawing does not
   * change because a tree called the answer something else (0184).
   */
  it("is checked under whichever name a prop renamed the binding to", async () => {
    const tree = treeBinding(
      "loom.feed",
      { posts: { source: "catalogue.one" } },
      { binding: "posts" }
    )
    const rendered = await renderWith(
      tree,
      registryOf(page, renamable),
      sources(sourceAnswering("catalogue.one", "not a list"))
    )

    expect(rendered.diagnostics).toHaveLength(1)
    expect(rendered.diagnostics[0]).toMatchObject({
      name: "posts",
      unavailable: { reason: "unreadable-answer" },
    })
    expect(renderToStaticMarkup(rendered.element)).toContain("no answer")
  })
})

describe("an answer the primitive can draw", () => {
  it("renders, and is reported as nothing", async () => {
    const tree = treeBinding("loom.listing", { entries: { source: "catalogue.rows" } })
    const rendered = await renderWith(
      tree,
      registryOf(page, listing),
      sources(sourceAnswering("catalogue.rows", [{ title: "A row" }]))
    )

    expect(rendered.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain("ready:")
  })

  /**
   * The property that keeps a page a function of the answer rather than of this
   * deployment's schema version, and the one 0180 asks for by name: unknown keys
   * on a row are stripped by nothing and refused by nothing. An expectation is a
   * gate, so what the primitive receives is what the source said.
   */
  it("is handed to the primitive exactly as the source gave it", async () => {
    const tree = treeBinding("loom.listing", { entries: { source: "catalogue.rows" } })
    const rendered = await renderWith(
      tree,
      registryOf(page, listing),
      sources(sourceAnswering("catalogue.rows", [{ title: "A row", id: 7 }]))
    )

    const markup = renderToStaticMarkup(rendered.element)
    expect(markup).toContain("&quot;id&quot;:7")
  })
})

describe("a primitive whose author has not declared a shape", () => {
  /**
   * The bargain that lets this ship before any primitive declares one: silence
   * is not a claim. A primitive with no expectation is handed what it was always
   * handed, in the shape it was always handed it.
   */
  it("is handed an answer of any shape, unchecked", async () => {
    const tree = treeBinding("loom.panel", { entries: { source: "catalogue.one" } })
    const rendered = await renderWith(
      tree,
      registryOf(page, undeclaredListing),
      sources(sourceAnswering("catalogue.one", "not a list"))
    )

    expect(rendered.diagnostics).toEqual([])
    expect(renderToStaticMarkup(rendered.element)).toContain("ready:")
  })
})

describe("the check itself", () => {
  const readsEntries = ["entries"] as const
  const noProps = {}
  const ready = (value: JsonValue): DataOutcome => ({ status: "ready", value })

  it("hands back the answers it was given when nothing was declared", () => {
    const data = nodeDataOf({ entries: ready("anything") })

    expect(checkAnswers(data, undefined, undefined, noProps).data).toBe(data)
    expect(checkAnswers(data, readsEntries, undefined, noProps).data).toBe(data)
  })

  /**
   * By reference, which is the point: this runs on every bound node of every
   * render, and a check that rebuilt the bag each time would allocate once per
   * binding on every page to report nothing.
   */
  it("hands back the same answers when every one of them is readable", () => {
    const data = nodeDataOf({ entries: ready(["one"]) })
    const expectations = { entries: () => ({ outcome: "readable" }) as const }

    expect(checkAnswers(data, readsEntries, expectations, noProps).data).toBe(data)
  })

  /**
   * An answer that never arrived has no value to be the wrong shape, and the
   * reason it already carries is the more specific of the two. Overwriting it
   * would report a primitive's refusal of an answer nobody gave it.
   */
  it("leaves an answer that was already unavailable alone", () => {
    const data = nodeDataOf({
      entries: {
        status: "unavailable",
        unavailable: { reason: "refused", detail: "not for you" },
      } satisfies DataOutcome,
    })
    const expectations = {
      entries: () => ({ outcome: "unreadable", detail: "never asked" }) as const,
    }

    const checked = checkAnswers(data, readsEntries, expectations, noProps)

    expect(checked.refused).toEqual([])
    expect(checked.data["entries"]).toMatchObject({ unavailable: { reason: "refused" } })
  })

  /**
   * Binding names are identifiers and `constructor` is a valid one, so a
   * declaration map with a prototype would answer an expectation for every name
   * nobody declared — and refuse every answer, since `Object` is not a verdict.
   */
  it("finds no expectation under a name off the prototype", () => {
    const data = nodeDataOf({ constructor: ready("anything") })
    const checked = checkAnswers(data, ["constructor"], {}, noProps)

    expect(checked.refused).toEqual([])
    expect(checked.data).toBe(data)
  })

  /**
   * A strange thing to declare, and the registry does not refuse it: a fixed
   * name beside a prop-named declaration that falls back to the same one. The
   * answer must be refused once rather than twice, because the copy holding the
   * refusal is not the bag the loop reads from.
   */
  it("refuses an answer once when two declarations resolve to one name", () => {
    const data = nodeDataOf({ entries: ready("not a list") })
    const expectations = {
      entries: () => ({ outcome: "unreadable", detail: "expected a list" }) as const,
    }

    const checked = checkAnswers(
      data,
      ["entries", { fromProp: "binding", default: "entries" }],
      expectations,
      noProps
    )

    expect(checked.refused).toEqual([{ name: "entries", detail: "expected a list" }])
  })

  it("keys a declaration by its name, or by the name it falls back to", () => {
    expect(declaredName("entries")).toBe("entries")
    expect(declaredName({ fromProp: "binding", default: "entries" })).toBe("entries")
  })

  it("detects a resolver that can say what a primitive expects", () => {
    expect(isAnswerReader(registryOf(page, listing))).toBe(true)
    expect(isAnswerReader({})).toBe(false)
  })
})
