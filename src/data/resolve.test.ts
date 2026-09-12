import { describe, expect, it } from "vitest"
import { z } from "zod"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { err, ok } from "../result.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import { createDataRegistry, defineSource, type DataRegistry, type SourceEntry } from "./adapter.js"
import { buildDataResolution } from "./resolution.js"
import { planTreeData } from "./plan.js"
import { resolveDataPlan, resolveTreeData } from "./resolve.js"
import type { BindingName, SourceId } from "./source.js"

const asks = new Map<string, number>()

const countingSource = (id: string, answer: string): SourceEntry =>
  defineSource({
    id,
    description: `answers with ${answer}`,
    params: z.object({ of: z.string() }).partial(),
    answers: z.string(),
    adapter: {
      fetch: () => {
        asks.set(id, (asks.get(id) ?? 0) + 1)
        return Promise.resolve(ok(answer))
      },
    },
  })

const registryOf = (...entries: readonly SourceEntry[]): DataRegistry => {
  const registry = createDataRegistry(entries)
  if (!registry.ok) throw new Error(`test registry refused: ${registry.error.code}`)

  return registry.value
}

const boundTree = (bindings: Record<string, unknown>, second?: Record<string, unknown>) => {
  const idFactory = sequentialIdFactory()

  const child = second
    ? [buildElement(idFactory, { type: "loom.card", props: { [DATA_PROP_KEY]: second } as never })]
    : []

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [DATA_PROP_KEY]: bindings } as never,
      children: child,
    }),
    idFactory
  )
}

describe("resolveDataPlan", () => {
  it("answers a binding and files it under the node that asked", async () => {
    const tree = boundTree({ bio: { source: "profile" } })
    const resolution = await resolveTreeData(tree, {
      registry: registryOf(countingSource("profile", "Ada")),
    })

    expect(resolution.lookup(tree.root.id)["bio"]).toEqual({ status: "ready", value: "Ada" })
    expect(resolution.problemsFor(tree.root.id)).toEqual([])
  })

  it("asks once for a question two nodes share", async () => {
    asks.clear()
    const tree = boundTree({ bio: { source: "profile" } }, { name: { source: "profile" } })

    await resolveTreeData(tree, { registry: registryOf(countingSource("profile", "Ada")) })

    expect(asks.get("profile")).toBe(1)
  })

  it("asks independent sources at the same time rather than one after another", async () => {
    let inFlight = 0
    let peak = 0

    const slow = (id: string): SourceEntry =>
      defineSource({
        id,
        description: "waits",
        params: z.object({}),
        answers: z.string(),
        adapter: {
          fetch: async () => {
            inFlight += 1
            peak = Math.max(peak, inFlight)
            await new Promise((resolve) => setTimeout(resolve, 10))
            inFlight -= 1

            return ok(id)
          },
        },
      })

    const tree = boundTree({ a: { source: "one" }, b: { source: "two" }, c: { source: "three" } })

    await resolveTreeData(tree, { registry: registryOf(slow("one"), slow("two"), slow("three")) })

    expect(peak).toBe(3)
  })

  it("names an unregistered source as such, and lists what is registered", async () => {
    const tree = boundTree({ things: { source: "nowhere" } })
    const resolution = await resolveTreeData(tree, {
      registry: registryOf(countingSource("profile", "Ada")),
    })

    const outcome = resolution.lookup(tree.root.id)["things"]

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable.reason).toBe("no-such-source")
    expect(outcome.unavailable.detail).toContain("profile")
  })

  it("costs one region of the page when one source is down, not the page", async () => {
    const tree = boundTree({
      up: { source: "profile" },
      down: { source: "integration" },
    })

    const failing = defineSource({
      id: "integration",
      description: "is having a bad afternoon",
      params: z.object({}),
      answers: z.string(),
      adapter: { fetch: () => Promise.resolve(err({ code: "unavailable", detail: "timed out" })) },
    })

    const resolution = await resolveTreeData(tree, {
      registry: registryOf(countingSource("profile", "Ada"), failing),
    })

    expect(resolution.lookup(tree.root.id)["up"]).toEqual({ status: "ready", value: "Ada" })
    expect(resolution.lookup(tree.root.id)["down"]?.status).toBe("unavailable")
  })

  it("passes the host context to every adapter", async () => {
    const seen: unknown[] = []
    const source = defineSource({
      id: "profile",
      description: "records its context",
      params: z.object({}),
      answers: z.string(),
      adapter: {
        fetch: (request) => {
          seen.push(request.context)
          return Promise.resolve(ok("Ada"))
        },
      },
    })

    await resolveTreeData(boundTree({ bio: { source: "profile" } }), {
      registry: registryOf(source),
      context: { audience: "member" },
    })

    expect(seen).toEqual([{ audience: "member" }])
  })

  it("asks nothing at all for a tree that binds nothing", async () => {
    asks.clear()
    const tree = createTree(
      buildElement(sequentialIdFactory(), { type: "loom.page" }),
      sequentialIdFactory()
    )

    const resolution = await resolveDataPlan(planTreeData(tree), {
      registry: registryOf(countingSource("profile", "Ada")),
    })

    expect(asks.size).toBe(0)
    expect(resolution.lookup(tree.root.id)).toEqual({})
  })

  it("keeps a malformed declaration as a problem on its node, with no data", async () => {
    const tree = boundTree("profile" as unknown as Record<string, unknown>)
    const resolution = await resolveTreeData(tree, {
      registry: registryOf(countingSource("profile", "Ada")),
    })

    expect(resolution.lookup(tree.root.id)).toEqual({})
    expect(resolution.problemsFor(tree.root.id)[0]?.kind).toBe("misdeclared")
  })
})

describe("buildDataResolution", () => {
  it("reports a binding whose answer is missing rather than leaving the page quietly short", () => {
    const nodeId = "n_1" as NodeId
    const resolution = buildDataResolution(
      {
        requests: [{ key: "profile {}", source: "profile" as SourceId, params: {} }],
        bindings: [{ nodeId, name: "bio" as BindingName, key: "profile {}" }],
        problems: [],
      },
      new Map()
    )

    expect(resolution.lookup(nodeId)["bio"]?.status).toBe("unavailable")
    expect(resolution.problemsFor(nodeId)).toHaveLength(1)
  })

  /**
   * The fix for this is in the composition root and the fix for an unregistered
   * source is in the registry, so they are not the same fault and must not share
   * a code — which they did until 12 September.
   */
  it("calls a binding nothing resolved unresolved, and not unregistered", () => {
    const nodeId = "n_1" as NodeId
    const resolution = buildDataResolution(
      {
        requests: [{ key: "profile {}", source: "profile" as SourceId, params: {} }],
        bindings: [{ nodeId, name: "bio" as BindingName, key: "profile {}" }],
        problems: [],
      },
      new Map()
    )

    const outcome = resolution.lookup(nodeId)["bio"]

    expect(outcome?.status === "unavailable" && outcome.unavailable.reason).toBe("not-resolved")
  })

  it("answers a binding named after something on Object.prototype", () => {
    const nodeId = "n_1" as NodeId
    const resolution = buildDataResolution(
      {
        requests: [{ key: "profile {}", source: "profile" as SourceId, params: {} }],
        bindings: [{ nodeId, name: "constructor" as BindingName, key: "profile {}" }],
        problems: [],
      },
      new Map([["profile {}", ok("Ada")]])
    )

    expect(resolution.lookup(nodeId)["constructor"]).toEqual({ status: "ready", value: "Ada" })
  })

  it("answers NO_DATA for a node nothing planned, without inheriting from a prototype", () => {
    const resolution = buildDataResolution(
      { requests: [], bindings: [], problems: [] },
      new Map()
    )

    expect(resolution.lookup("n_absent" as NodeId)["toString"]).toBeUndefined()
  })
})
