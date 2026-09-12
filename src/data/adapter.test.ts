import { describe, expect, it } from "vitest"
import { z } from "zod"

import type { JsonObject } from "../json.js"
import { err, ok } from "../result.js"

import {
  createDataRegistry,
  defineSource,
  describeDataRegistryError,
  describeDataUnavailable,
  type DataAdapter,
  type SourceEntry,
} from "./adapter.js"
import { dataCatalogue } from "./catalogue.js"

const servicesSource = (adapter: DataAdapter<{ limit: number }, JsonObject>): SourceEntry =>
  defineSource({
    id: "catalogue.services",
    description: "The services this profile offers, newest first",
    params: z.object({ limit: z.number().int().positive() }),
    answers: z.object({ items: z.array(z.string()) }),
    adapter,
  })

const answering = (value: JsonObject): DataAdapter<{ limit: number }, JsonObject> => ({
  fetch: () => Promise.resolve(ok(value)),
})

describe("defineSource", () => {
  it("answers when the params fit and the answer fits", async () => {
    const entry = servicesSource(answering({ items: ["Coaching"] }))

    await expect(entry.answer({ limit: 6 }, undefined)).resolves.toEqual(
      ok({ items: ["Coaching"] })
    )
  })

  it("refuses params the source does not accept, without calling the adapter", async () => {
    let called = false
    const entry = servicesSource({
      fetch: () => {
        called = true
        return Promise.resolve(ok({ items: [] }))
      },
    })

    const answered = await entry.answer({ limit: -1 }, undefined)

    expect(answered.ok).toBe(false)
    if (answered.ok) return

    expect(answered.error.reason).toBe("invalid-params")
    expect(called).toBe(false)
  })

  it("keeps an adapter's two refusals apart, because a primitive shows different things for them", async () => {
    const unreachable = servicesSource({
      fetch: () => Promise.resolve(err({ code: "unavailable", detail: "timed out" })),
    })
    const notConnected = servicesSource({
      fetch: () => Promise.resolve(err({ code: "refused", detail: "not connected" })),
    })

    const first = await unreachable.answer({ limit: 6 }, undefined)
    const second = await notConnected.answer({ limit: 6 }, undefined)

    expect(first.ok === false && first.error.reason).toBe("unavailable")
    expect(second.ok === false && second.error.reason).toBe("refused")
  })

  it("catches an adapter that throws rather than letting it take the page down", async () => {
    const entry = servicesSource({
      fetch: () => {
        throw new Error("connection pool exhausted")
      },
    })

    const answered = await entry.answer({ limit: 6 }, undefined)

    expect(answered.ok).toBe(false)
    if (answered.ok) return

    expect(answered.error.reason).toBe("adapter-threw")
    expect(answered.error.detail).toContain("connection pool exhausted")
  })

  it("catches an adapter whose promise rejects", async () => {
    const entry = servicesSource({ fetch: () => Promise.reject(new Error("socket closed")) })
    const answered = await entry.answer({ limit: 6 }, undefined)

    expect(answered.ok === false && answered.error.reason).toBe("adapter-threw")
  })

  it("refuses an answer the source's own schema refuses", async () => {
    const entry = servicesSource(answering({ items: "Coaching" } as unknown as JsonObject))
    const answered = await entry.answer({ limit: 6 }, undefined)

    expect(answered.ok).toBe(false)
    if (answered.ok) return

    expect(answered.error.reason).toBe("invalid-answer")
  })

  it("passes the render request's host context through untouched", async () => {
    const seen: (JsonObject | undefined)[] = []
    const entry = servicesSource({
      fetch: (request) => {
        seen.push(request.context)
        return Promise.resolve(ok({ items: [] }))
      },
    })

    await entry.answer({ limit: 6 }, { audience: "member" })

    expect(seen).toEqual([{ audience: "member" }])
  })

  it("hands the adapter the parsed params, so a source is typed by its own schema", async () => {
    const seen: unknown[] = []
    const entry = defineSource({
      id: "profile",
      description: "The profile this page belongs to",
      params: z.object({ field: z.enum(["name", "bio"]) }),
      answers: z.string(),
      adapter: {
        fetch: (request) => {
          seen.push(request.params)
          return Promise.resolve(ok("Ada"))
        },
      },
    })

    await entry.answer({ field: "bio" }, undefined)

    expect(seen).toEqual([{ field: "bio" }])
  })

  it("describes every reason a binding can go unanswered", () => {
    const reasons = [
      "no-such-source",
      "not-resolved",
      "invalid-params",
      "invalid-answer",
      "adapter-threw",
      "unavailable",
      "refused",
    ] as const

    for (const reason of reasons) {
      expect(describeDataUnavailable({ reason, detail: "why" })).toContain("why")
    }
  })

  /**
   * The two were one code until 12 September, and the sentence it produced said
   * both things at once. Different work for different people: a registry, or a
   * composition root.
   */
  it("does not say a source is unregistered when nothing went looking for one", () => {
    const notResolved = describeDataUnavailable({ reason: "not-resolved", detail: "why" })

    expect(notResolved).not.toContain("registered")
    expect(notResolved).not.toBe(describeDataUnavailable({ reason: "no-such-source", detail: "why" }))
  })
})

describe("createDataRegistry", () => {
  it("registers sources and finds them by id", () => {
    const registry = createDataRegistry([servicesSource(answering({ items: [] }))])

    expect(registry.ok).toBe(true)
    if (!registry.ok) return

    expect(registry.value.source("catalogue.services" as never)?.description).toContain("services")
    expect(registry.value.source("nothing" as never)).toBeUndefined()
  })

  it("refuses an id that is not dot-namespaced kebab-case", () => {
    const registry = createDataRegistry([
      { ...servicesSource(answering({ items: [] })), id: "Catalogue Services" },
    ])

    expect(registry.ok).toBe(false)
    if (registry.ok) return

    expect(registry.error.code).toBe("invalid-source-id")
    expect(describeDataRegistryError(registry.error)).toContain("Catalogue Services")
  })

  it("refuses a duplicate id rather than letting one registration win silently", () => {
    const registry = createDataRegistry([
      servicesSource(answering({ items: [] })),
      servicesSource(answering({ items: ["other"] })),
    ])

    expect(registry.ok).toBe(false)
    if (registry.ok) return

    expect(registry.error.code).toBe("duplicate-source-id")
  })

  it("calls no adapter while registering, so an import cannot run someone's query", () => {
    let called = false

    createDataRegistry([
      servicesSource({
        fetch: () => {
          called = true
          return Promise.resolve(ok({ items: [] }))
        },
      }),
    ])

    expect(called).toBe(false)
  })
})

describe("dataCatalogue", () => {
  it("projects what a model may ask about, with the params each source takes", () => {
    const registry = createDataRegistry([servicesSource(answering({ items: [] }))])

    expect(registry.ok).toBe(true)
    if (!registry.ok) return

    expect(dataCatalogue(registry.value)).toEqual([
      {
        id: "catalogue.services",
        description: "The services this profile offers, newest first",
        params: [{ name: "limit", required: true }],
      },
    ])
  })

  it("says it cannot enumerate params rather than claiming there are none", () => {
    const registry = createDataRegistry([
      defineSource({
        id: "profile",
        description: "One profile field",
        params: z.union([z.object({ field: z.string() }), z.object({ id: z.string() })]),
        answers: z.string(),
        adapter: { fetch: () => Promise.resolve(ok("Ada")) },
      }),
    ])

    expect(registry.ok).toBe(true)
    if (!registry.ok) return

    expect(dataCatalogue(registry.value)[0]?.params).toBeUndefined()
  })
})
