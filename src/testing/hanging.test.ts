import { describe, expect, it } from "vitest"
import { z } from "zod"

import { createDataRegistry, defineSource, type SourceEntry } from "../data/adapter.js"
import { resolveTreeData } from "../data/resolve.js"
import { sequentialIdFactory } from "../ids.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { ok } from "../result.js"
import { createEndpointRegistry, defineEndpoint, type EndpointEntry } from "../submit/endpoint.js"
import { resolveTreeSubmissions } from "../submit/resolve.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { hangingEndpoint, hangingSource } from "./doubles.js"
import { boundTree, formTree } from "./fixtures.js"

/**
 * The two seams 0140 bounded that had no published double, tested against the
 * real resolvers rather than against a promise.
 *
 * `hangingModelClient` has been published since the ceiling shipped and these
 * two were written out by hand wherever they were wanted — twice in this
 * package's own suite and twice more in `(docs)` — so what is asserted here is
 * the half each hand-written copy left out. Every copy proved the outcome; none
 * of them could say what the runtime sent the adapter afterwards without
 * writing a *second* double that listened, which is how one thing became five.
 *
 * Five milliseconds throughout, for the reason `(docs)` gives for the same
 * number: every other source and endpoint here answers from an already-resolved
 * promise, and a timer cannot fire before the microtasks in front of it.
 */

const CEILING_MS = 5

const registryOf = (entries: readonly SourceEntry[]) => {
  const registry = createDataRegistry(entries)
  if (!registry.ok) throw new Error(`test registry refused: ${registry.error.code}`)

  return registry.value
}

const endpointsOf = (entries: readonly EndpointEntry[]) => {
  const registry = createEndpointRegistry(entries)
  if (!registry.ok) throw new Error(`test endpoint registry refused: ${registry.error.code}`)

  return registry.value
}

const answeringSource = (id: string, answer: string): SourceEntry =>
  defineSource({
    id,
    description: `answers with ${answer}`,
    params: z.object({}).partial(),
    answers: z.string(),
    adapter: { fetch: () => Promise.resolve(ok(answer)) },
  })

const answeringEndpoint = (id: string, action: string): EndpointEntry =>
  defineEndpoint({
    id,
    description: `posts to ${action}`,
    endpoint: {
      target: () =>
        Promise.resolve(ok({ action, method: "post" as const, fields: [] as const })),
    },
  })

/**
 * One page reading from two sources, because the fixture reads from one. The
 * property is the whole reason a ceiling is per-request: a silent integration
 * must cost its own region and leave the region beside it with its answer.
 */
const twoBindings = () => {
  const idFactory = sequentialIdFactory("pair")

  const silent = buildElement(idFactory, {
    type: "loom.card",
    props: { [DATA_PROP_KEY]: { items: { source: "catalogue.services", params: {} } } } as never,
  })
  const answered = buildElement(idFactory, {
    type: "loom.card",
    props: { [DATA_PROP_KEY]: { name: { source: "profile.name", params: {} } } } as never,
  })
  const page = buildElement(idFactory, {
    type: "loom.page",
    props: { title: "Services" },
    children: [silent, answered],
  })

  return { tree: createTree(page, idFactory), ids: { silent: silent.id, answered: answered.id } }
}

describe("hangingSource", () => {
  it("is reported as unavailable rather than waited out", async () => {
    const silent = hangingSource("catalogue.services", "What this shop offers.")
    const { tree, ids } = boundTree()

    const resolution = await resolveTreeData(tree, {
      registry: registryOf([silent.entry]),
      ceilingMs: CEILING_MS,
    })

    const outcome = resolution.lookup(ids.bound)["items"]

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable).toEqual({ reason: "unavailable", detail: "no answer in 5ms" })
  })

  /**
   * The reason this is published. A hand-written double proves the outcome; only
   * the adapter can see the abort, and what it says is the runtime's own expiry
   * sentence rather than a generic one.
   */
  it("reports what the runtime's abort said", async () => {
    const silent = hangingSource("catalogue.services", "What this shop offers.")
    const { tree } = boundTree()

    expect(silent.abortedWith()).toBeUndefined()

    await resolveTreeData(tree, {
      registry: registryOf([silent.entry]),
      ceilingMs: CEILING_MS,
    })

    expect(silent.abortedWith()).toBe("no answer in 5ms")
  })

  it("costs its own region and not the page", async () => {
    const silent = hangingSource("catalogue.services", "What this shop offers.")
    const { tree, ids } = twoBindings()

    const resolution = await resolveTreeData(tree, {
      registry: registryOf([silent.entry, answeringSource("profile.name", "Ada")]),
      ceilingMs: CEILING_MS,
    })

    expect(resolution.lookup(ids.silent)["items"]?.status).toBe("unavailable")
    expect(resolution.lookup(ids.answered)["name"]).toEqual({ status: "ready", value: "Ada" })
  })

  /**
   * A double that refused the binding before reaching the adapter would report
   * `invalid-params` and never abort, which is a different state wearing the
   * same sentence. It stands in for a source that declares params, so it must
   * accept the ones that source's bindings already carry.
   */
  it("accepts the params of the source it stands in for", async () => {
    const silent = hangingSource("catalogue.services", "What this shop offers.")
    const { tree, ids } = boundTree("catalogue.services", { limit: 3 })

    const resolution = await resolveTreeData(tree, {
      registry: registryOf([silent.entry]),
      ceilingMs: CEILING_MS,
    })

    const outcome = resolution.lookup(ids.bound)["items"]

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable.reason).toBe("unavailable")
    expect(silent.abortedWith()).toBe("no answer in 5ms")
  })

  it("carries the id and description a registry and a catalogue read", () => {
    const silent = hangingSource("courier.tracking", "Where a delivery has got to.")

    expect(silent.entry.id).toBe("courier.tracking")
    expect(silent.entry.description).toBe("Where a delivery has got to.")
  })
})

describe("hangingEndpoint", () => {
  it("is reported as unavailable rather than waited out", async () => {
    const silent = hangingEndpoint("billing.checkout", "Where the basket posts.")
    const { tree, ids } = formTree("billing.checkout")

    const resolution = await resolveTreeSubmissions(tree, {
      registry: endpointsOf([silent.entry]),
      ceilingMs: CEILING_MS,
    })

    const outcome = resolution.lookup(ids.form)

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable).toEqual({ reason: "unavailable", detail: "no answer in 5ms" })
  })

  it("reports what the runtime's abort said", async () => {
    const silent = hangingEndpoint("billing.checkout", "Where the basket posts.")
    const { tree } = formTree("billing.checkout")

    expect(silent.abortedWith()).toBeUndefined()

    await resolveTreeSubmissions(tree, {
      registry: endpointsOf([silent.entry]),
      ceilingMs: CEILING_MS,
    })

    expect(silent.abortedWith()).toBe("no answer in 5ms")
  })

  it("carries the id and description a registry reads", () => {
    const silent = hangingEndpoint("billing.checkout", "Where the basket posts.")

    expect(silent.entry.id).toBe("billing.checkout")
    expect(silent.entry.description).toBe("Where the basket posts.")
  })
})

describe("both doubles, beside the one that was already published", () => {
  /**
   * The property that made three lanes write their own: an endpoint that answers
   * and one that does not, resolved together, and the page keeps the answer.
   */
  it("bounds one seam without bounding the other's answer", async () => {
    const silent = hangingEndpoint("billing.checkout", "Where the basket posts.")
    const { tree, ids } = formTree("billing.checkout")

    const resolution = await resolveTreeSubmissions(tree, {
      registry: endpointsOf([silent.entry, answeringEndpoint("newsletter.subscribe", "/api/news")]),
      ceilingMs: CEILING_MS,
    })

    expect(resolution.lookup(ids.form)?.status).toBe("unavailable")
    expect(silent.abortedWith()).toBe("no answer in 5ms")
  })
})
