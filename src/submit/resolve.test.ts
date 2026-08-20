import { beforeEach, describe, expect, it } from "vitest"

import { sequentialIdFactory, type NodeId } from "../ids.js"
import { SUBMIT_PROP_KEY } from "../reserved-props.js"
import { err, ok } from "../result.js"
import { buildElement } from "../tree/builders.js"
import { createTree } from "../tree/tree.js"

import {
  createEndpointRegistry,
  defineEndpoint,
  type EndpointId,
  type EndpointRegistry,
  type EndpointEntry,
} from "./endpoint.js"
import { planSubmissionsIn, planTreeSubmissions } from "./plan.js"
import { buildSubmissionResolution } from "./resolution.js"
import { resolveSubmissionPlan, resolveTreeSubmissions } from "./resolve.js"

const named = (id: string): EndpointId => id as EndpointId
const node = (id: string): NodeId => id as NodeId

const asks = new Map<string, number>()

beforeEach(() => {
  asks.clear()
})

const countingEndpoint = (id: string, action: string): EndpointEntry =>
  defineEndpoint({
    id,
    description: `receives ${id}`,
    endpoint: {
      target: () => {
        asks.set(id, (asks.get(id) ?? 0) + 1)

        return Promise.resolve(
          ok({ action, method: "post" as const, fields: [{ name: "csrf", value: "t0ken" }] })
        )
      },
    },
  })

const registryOf = (...entries: readonly EndpointEntry[]): EndpointRegistry => {
  const registry = createEndpointRegistry(entries)
  if (!registry.ok) throw new Error(`test registry refused: ${registry.error.code}`)

  return registry.value
}

/** A page whose root declares one submission, optionally over a child with another. */
const posting = (root: unknown, child?: unknown) => {
  const idFactory = sequentialIdFactory()

  return createTree(
    buildElement(idFactory, {
      type: "loom.page",
      props: { [SUBMIT_PROP_KEY]: root } as never,
      children:
        child === undefined
          ? []
          : [
              buildElement(idFactory, {
                type: "loom.card",
                props: { [SUBMIT_PROP_KEY]: child } as never,
              }),
            ],
    }),
    idFactory
  )
}

/** A page that names no endpoint anywhere. */
const quiet = () => {
  const idFactory = sequentialIdFactory()

  return createTree(buildElement(idFactory, { type: "loom.page" }), idFactory)
}

describe("planTreeSubmissions", () => {
  it("finds every node that names an endpoint, in tree order", () => {
    const plan = planTreeSubmissions(
      posting({ to: "contact.enquiry" }, { to: "newsletter.subscribe" })
    )

    expect(plan.submissions.map((entry) => entry.to)).toEqual([
      "contact.enquiry",
      "newsletter.subscribe",
    ])
    expect(plan.problems).toEqual([])
  })

  it("plans one endpoint once, however many forms name it", () => {
    const plan = planTreeSubmissions(posting({ to: "contact.enquiry" }, { to: "contact.enquiry" }))

    expect(plan.endpoints).toEqual(["contact.enquiry"])
    expect(plan.submissions).toHaveLength(2)
  })

  it("plans nothing for a tree that names none", () => {
    const plan = planTreeSubmissions(quiet())

    expect(plan.endpoints).toEqual([])
    expect(plan.submissions).toEqual([])
  })

  it("records a malformed declaration against its node and keeps walking", () => {
    const plan = planTreeSubmissions(posting({ to: "Contact_Enquiry" }, { to: "contact.enquiry" }))

    expect(plan.problems).toHaveLength(1)
    expect(plan.endpoints).toEqual(["contact.enquiry"])
  })

  /**
   * The runtime plans a root that no `LoomTree` wraps — the result of applying a
   * delta, which nothing has minted an id for. The two must not drift about
   * which declarations are readable.
   */
  it("plans a bare root exactly as it plans the tree around it", () => {
    const tree = posting({ to: "Contact_Enquiry" }, { to: "contact.enquiry" })

    expect(planSubmissionsIn(tree.root)).toEqual(planTreeSubmissions(tree))
  })
})

describe("resolveTreeSubmissions", () => {
  it("gives a node the target its endpoint answered with", async () => {
    const tree = posting({ to: "contact.enquiry" })
    const resolution = await resolveTreeSubmissions(tree, {
      registry: registryOf(countingEndpoint("contact.enquiry", "/api/contact")),
    })

    expect(resolution.lookup(tree.root.id)).toEqual({
      status: "ready",
      target: { action: "/api/contact", method: "post", fields: [{ name: "csrf", value: "t0ken" }] },
    })
    expect(resolution.problemsFor(tree.root.id)).toEqual([])
  })

  it("asks one endpoint once, and gives both forms the same target", async () => {
    const tree = posting({ to: "contact.enquiry" }, { to: "contact.enquiry" })
    const child = tree.root.children[0]
    if (!child) throw new Error("the fixture built no child")

    const resolution = await resolveTreeSubmissions(tree, {
      registry: registryOf(countingEndpoint("contact.enquiry", "/api/contact")),
    })

    expect(asks.get("contact.enquiry")).toBe(1)
    expect(resolution.lookup(tree.root.id)).toEqual(resolution.lookup(child.id))
  })

  it("answers a node that named nothing with nothing at all", async () => {
    const resolution = await resolveTreeSubmissions(posting({ to: "contact.enquiry" }), {
      registry: registryOf(countingEndpoint("contact.enquiry", "/api/contact")),
    })

    expect(resolution.lookup(node("n_nothing-declared-here"))).toBeUndefined()
  })

  it("reports an endpoint nobody registered, and says what is registered", async () => {
    const tree = posting({ to: "nobody.registered" })
    const resolution = await resolveTreeSubmissions(tree, {
      registry: registryOf(countingEndpoint("contact.enquiry", "/api/contact")),
    })

    const outcome = resolution.lookup(tree.root.id)

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable.reason).toBe("no-such-endpoint")
    expect(outcome.unavailable.detail).toContain("contact.enquiry")
  })

  it("carries a malformed declaration through as a problem, with no outcome", async () => {
    const tree = posting({ to: "Contact_Enquiry" })
    const resolution = await resolveTreeSubmissions(tree, {
      registry: registryOf(countingEndpoint("contact.enquiry", "/api/contact")),
    })

    expect(resolution.lookup(tree.root.id)).toBeUndefined()
    expect(resolution.problemsFor(tree.root.id)).toEqual([
      { kind: "misdeclared", error: { path: "to", message: expect.any(String) as string } },
    ])
  })

  /**
   * One endpoint having a bad afternoon costs its own form and nothing else —
   * the property that lets a page with a contact form and a newsletter form
   * still show the half that works.
   */
  it("keeps one endpoint's failure to itself", async () => {
    const failing = defineEndpoint({
      id: "newsletter.subscribe",
      description: "receives subscriptions",
      endpoint: {
        target: () => Promise.resolve(err({ code: "unavailable", detail: "list host is down" })),
      },
    })

    const tree = posting({ to: "contact.enquiry" }, { to: "newsletter.subscribe" })
    const child = tree.root.children[0]
    if (!child) throw new Error("the fixture built no child")

    const resolution = await resolveTreeSubmissions(tree, {
      registry: registryOf(countingEndpoint("contact.enquiry", "/api/contact"), failing),
    })

    expect(resolution.lookup(tree.root.id)?.status).toBe("ready")
    expect(resolution.lookup(child.id)?.status).toBe("unavailable")
    expect(resolution.problemsFor(child.id)).toEqual([
      {
        kind: "unavailable",
        to: "newsletter.subscribe",
        unavailable: { reason: "unavailable", detail: "list host is down" },
      },
    ])
  })

  it("asks every endpoint at once rather than in turn", async () => {
    const started: string[] = []
    let release: (() => void) | undefined

    const blocked = defineEndpoint({
      id: "contact.enquiry",
      description: "receives enquiries",
      endpoint: {
        target: () => {
          started.push("contact.enquiry")

          return new Promise((resolve) => {
            release = () => resolve(ok({ action: "/api/contact", method: "post", fields: [] }))
          })
        },
      },
    })

    const resolving = resolveTreeSubmissions(
      posting({ to: "contact.enquiry" }, { to: "newsletter.subscribe" }),
      { registry: registryOf(blocked, countingEndpoint("newsletter.subscribe", "/api/news")) }
    )

    await Promise.resolve()
    expect(asks.get("newsletter.subscribe")).toBe(1)
    expect(started).toEqual(["contact.enquiry"])

    release?.()
    await resolving
  })

  it("asks nothing at all when the tree names no endpoint", async () => {
    await resolveTreeSubmissions(quiet(), {
      registry: registryOf(countingEndpoint("contact.enquiry", "/api/contact")),
    })

    expect(asks.size).toBe(0)
  })

  it("hands the render request's context to every endpoint", async () => {
    const seen: unknown[] = []

    const watching = defineEndpoint({
      id: "contact.enquiry",
      description: "receives enquiries",
      endpoint: {
        target: (request) => {
          seen.push(request.context)

          return Promise.resolve(ok({ action: "/api/contact", method: "post", fields: [] }))
        },
      },
    })

    await resolveTreeSubmissions(posting({ to: "contact.enquiry" }), {
      registry: registryOf(watching),
      context: { tenant: "acme" },
    })

    expect(seen).toEqual([{ tenant: "acme" }])
  })
})

describe("buildSubmissionResolution", () => {
  /**
   * A caller that resolved one plan and rendered another. Reported rather than
   * silently absent: a form whose target went missing is exactly the failure the
   * seam is arranged to make impossible to miss.
   */
  it("reports a planned submission that was never answered", () => {
    const tree = posting({ to: "contact.enquiry" })
    const resolution = buildSubmissionResolution(planTreeSubmissions(tree), new Map())

    const outcome = resolution.lookup(tree.root.id)

    expect(outcome?.status).toBe("unavailable")
    if (outcome?.status !== "unavailable") return

    expect(outcome.unavailable.reason).toBe("no-such-endpoint")
  })

  it("is pure — the same answers build the same resolution", () => {
    const tree = posting({ to: "contact.enquiry" })
    const plan = planTreeSubmissions(tree)
    const answers = new Map([
      [named("contact.enquiry"), ok({ action: "/api/contact", method: "post" as const, fields: [] })],
    ])

    expect(buildSubmissionResolution(plan, answers).lookup(tree.root.id)).toEqual(
      buildSubmissionResolution(plan, answers).lookup(tree.root.id)
    )
  })
})

describe("resolveSubmissionPlan", () => {
  it("short-circuits an empty plan without touching the registry", async () => {
    const plan = planTreeSubmissions(quiet())

    const resolution = await resolveSubmissionPlan(plan, {
      registry: registryOf(countingEndpoint("contact.enquiry", "/api/contact")),
    })

    expect(asks.size).toBe(0)
    expect(resolution.lookup(node("n_anything"))).toBeUndefined()
  })

  /**
   * A plan holding only problems is not empty: nothing needs asking, but the
   * misdeclaration still has to reach the walk.
   */
  it("keeps a problems-only plan's problems", async () => {
    const tree = posting({ to: "Contact_Enquiry" })

    const resolution = await resolveSubmissionPlan(planTreeSubmissions(tree), {
      registry: registryOf(countingEndpoint("contact.enquiry", "/api/contact")),
    })

    expect(asks.size).toBe(0)
    expect(resolution.problemsFor(tree.root.id)).toHaveLength(1)
  })
})
