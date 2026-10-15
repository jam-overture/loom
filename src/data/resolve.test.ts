import { describe, expect, it } from "vitest"
import { z } from "zod"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import { DATA_PROP_KEY } from "../reserved-props.js"
import { err, ok } from "../result.js"
import { hangingSource } from "../testing/doubles.js"
import { walkTree } from "../tree/navigation.js"
import { buildElement } from "../tree/builders.js"
import { createTree, type LoomTree } from "../tree/tree.js"

import {
  createDataRegistry,
  defineSource,
  describeDataUnavailable,
  type DataRegistry,
  type SourceEntry,
} from "./adapter.js"
import { buildDataResolution, type DataAnswers, type DataResolution } from "./resolution.js"
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

  /**
   * The same bound that the theme seam got, for the same reason and with a
   * harder case: a source id is a dotted name rather than a word, so ten of
   * them cost more characters than twenty-one palettes did. The clause names the
   * nearest few and says how many it stands in for; the registry's own
   * `sources` is where a caller goes for all of them.
   */
  it("bounds the clause rather than printing a registry of any size", async () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      countingSource(`catalogue.part-${index}`, "a part")
    )

    const tree = boundTree({ things: { source: "catalogue.part" } })
    const resolution = await resolveTreeData(tree, { registry: registryOf(...many) })

    const outcome = resolution.lookup(tree.root.id)["things"]

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable.detail).toContain("(nearest 5 of 12)")
    expect(outcome.unavailable.detail.length).toBeLessThan(130)
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

/**
 * The ceiling (0140).
 *
 * Until it existed, the first of these tests did not finish: an adapter that
 * never settles held `Promise.all`, which held the page. The assertion that
 * matters most is the third — the page comes back with the *other* source's
 * answer in it, which is the property this file's own module comment has claimed
 * since the seam shipped.
 */
describe("a source that does not answer", () => {
  const outcomeOf = async (
    entries: readonly SourceEntry[],
    bindings: Record<string, unknown>,
    ceilingMs?: number
  ) => {
    const tree = boundTree(bindings)
    const resolution = await resolveTreeData(tree, {
      registry: registryOf(...entries),
      ...(ceilingMs === undefined ? {} : { ceilingMs }),
    })

    return resolution.lookup(tree.root.id)
  }

  it("is reported as unavailable rather than waited out", async () => {
    const answers = await outcomeOf(
      [hangingSource("slow", "never answers").entry],
      { bio: { source: "slow" } },
      5
    )
    const outcome = answers["bio"]

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable).toEqual({ reason: "unavailable", detail: "no answer in 5ms" })
    expect(describeDataUnavailable(outcome.unavailable)).toContain("no answer in 5ms")
  })

  it("is aborted, so the connection it holds is let go", async () => {
    const silent = hangingSource("slow", "never answers")

    await outcomeOf([silent.entry], { bio: { source: "slow" } }, 5)

    expect(silent.abortedWith()).toBe("no answer in 5ms")
  })

  it("costs its own region and not the page", async () => {
    const answers = await outcomeOf(
      [hangingSource("slow", "never answers").entry, countingSource("profile", "Ada")],
      { bio: { source: "slow" }, name: { source: "profile" } },
      5
    )

    expect(answers["name"]).toEqual({ status: "ready", value: "Ada" })
    expect(answers["bio"]?.status).toBe("unavailable")
  })

  it("does not bound a source that answers inside the ceiling", async () => {
    const answers = await outcomeOf([countingSource("profile", "Ada")], {
      bio: { source: "profile" },
    })

    expect(answers["bio"]).toEqual({ status: "ready", value: "Ada" })
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

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable.reason).toBe("not-resolved")
    expect(describeDataUnavailable(outcome.unavailable)).not.toContain("registered")
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

/**
 * The answers as something that can be sent (0281).
 *
 * Every case here serves one claim: a host that fetches in one place and renders
 * in another can rebuild the readings it would have had, and cannot quietly
 * rebuild thinner ones. The comparison is against a live resolution rather than
 * against literals, so a field that began to be filled from somewhere else would
 * fail these without anybody editing them.
 */
describe("the answers a resolution was built from", () => {
  /** The far side: the same tree, the answers as they arrived, nothing else. */
  const rebuilt = (tree: LoomTree, answers: DataAnswers): DataResolution =>
    buildDataResolution(planTreeData(tree), new Map(answers))

  /** What a boundary actually does to them on the way. */
  const posted = (answers: DataAnswers): DataAnswers =>
    JSON.parse(JSON.stringify(answers)) as DataAnswers

  /** Both accessors, at every node in the tree. */
  const readingsOf = (tree: LoomTree, resolution: DataResolution) =>
    [...walkTree(tree.root)].map(
      (node) => [node.id, resolution.lookup(node.id), resolution.problemsFor(node.id)] as const
    )

  it("hands back one answer per request asked, under the plan's own keys", async () => {
    const tree = boundTree(
      { bio: { source: "profile" }, again: { source: "profile" } },
      { note: { source: "other" } }
    )

    const { answers } = await resolveTreeData(tree, {
      registry: registryOf(countingSource("profile", "Ada"), countingSource("other", "Grace")),
    })

    expect(answers.map(([key]) => key)).toEqual(planTreeData(tree).requests.map((r) => r.key))
    expect(answers).toHaveLength(2)
  })

  it("rebuilds every reading the resolution gave, after a trip through JSON", async () => {
    const tree = boundTree({ bio: { source: "profile" } }, { note: { source: "other" } })

    const live = await resolveTreeData(tree, {
      registry: registryOf(countingSource("profile", "Ada"), countingSource("other", "Grace")),
    })

    const far = rebuilt(tree, posted(live.answers))

    expect(readingsOf(tree, far)).toEqual(readingsOf(tree, live))
    expect(far.lookup(tree.root.id)["bio"]).toEqual({ status: "ready", value: "Ada" })
  })

  /**
   * A request key is a source id, a NUL byte and canonical params. The byte is
   * the reason this is asserted rather than assumed: it is legal in a JSON
   * string and it is exactly the kind of character a seam loses quietly.
   */
  it("carries a request key through JSON intact, including the NUL byte it is built around", async () => {
    const tree = boundTree({ bio: { source: "profile", params: { of: "ada" } } })

    const { answers } = await resolveTreeData(tree, {
      registry: registryOf(countingSource("profile", "Ada")),
    })

    expect(answers[0]?.[0]).toContain("\u0000")
    expect(posted(answers).map(([key]) => key)).toEqual(answers.map(([key]) => key))
  })

  /**
   * The defect this field exists to make unreachable. Deriving the nodes to
   * carry from `plan.bindings` is the obvious thing to reach for and it drops
   * every node whose declaration could not be read at all — which is the one
   * class of node whose only output is a diagnostic.
   */
  it("carries a misdeclared node's problem, which deriving nodes from plan.bindings drops", async () => {
    const tree = boundTree(
      { bio: { source: "profile" } },
      "note" as unknown as Record<string, unknown>
    )

    const live = await resolveTreeData(tree, {
      registry: registryOf(countingSource("profile", "Ada")),
    })

    const plan = planTreeData(tree)
    const misdeclared = plan.problems[0]?.nodeId

    expect(misdeclared).toBeDefined()
    expect(plan.bindings.some((binding) => binding.nodeId === misdeclared)).toBe(false)

    expect(rebuilt(tree, posted(live.answers)).problemsFor(misdeclared as NodeId)[0]?.kind).toBe(
      "misdeclared"
    )
  })

  it("carries a source that never answered as unavailable, not as a region with nothing in it", async () => {
    const tree = boundTree({ bio: { source: "slow" } })

    const live = await resolveTreeData(tree, {
      registry: registryOf(hangingSource("slow", "never answers").entry),
      ceilingMs: 5,
    })

    const outcome = rebuilt(tree, posted(live.answers)).lookup(tree.root.id)["bio"]

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable.reason).toBe("unavailable")
  })

  it("asked nothing, and says so, for a tree that binds nothing", async () => {
    const tree = createTree(
      buildElement(sequentialIdFactory(), { type: "loom.page" }),
      sequentialIdFactory()
    )

    const { answers } = await resolveTreeData(tree, {
      registry: registryOf(countingSource("profile", "Ada")),
    })

    expect(answers).toEqual([])
    expect(rebuilt(tree, posted(answers)).lookup(tree.root.id)).toEqual({})
  })

  /**
   * The behaviour to preserve rather than to fix. Keys are canonicalised params,
   * so re-planning a tree whose binding was repointed produces a key the answers
   * do not hold, and the walk says `data-unresolved` instead of drawing the
   * answer to a question this tree no longer asks.
   */
  it("reports a binding the answers do not hold as not-resolved, so a repointed binding draws nothing stale", async () => {
    const before = boundTree({ bio: { source: "profile", params: { of: "ada" } } })

    const { answers } = await resolveTreeData(before, {
      registry: registryOf(countingSource("profile", "Ada")),
    })

    const after = boundTree({ bio: { source: "profile", params: { of: "grace" } } })
    const outcome = rebuilt(after, posted(answers)).lookup(after.root.id)["bio"]

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable.reason).toBe("not-resolved")
  })
})
