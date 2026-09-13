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
  type DataUnavailable,
  type SourceEntry,
} from "./adapter.js"
import { dataCatalogue } from "./catalogue.js"
import {
  BINDING_NAME_EXPECTATION,
  bindingNameSchema,
  SOURCE_ID_EXPECTATION,
  sourceIdSchema,
} from "./source.js"

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

  /**
   * A record rather than a list, so a seventh reason does not compile until it
   * has a sentence. The list this replaced was hand-typed and would have gone on
   * passing while `not-resolved` went undescribed — which is the same shape of
   * hole `not-resolved` itself was, one level up.
   */
  it("describes every reason a binding can go unanswered", () => {
    const everyReason: Readonly<Record<DataUnavailable["reason"], true>> = {
      "no-such-source": true,
      "not-resolved": true,
      "invalid-params": true,
      "invalid-answer": true,
      "adapter-threw": true,
      unavailable: true,
      refused: true,
    }

    for (const reason of Object.keys(everyReason) as DataUnavailable["reason"][]) {
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

/**
 * The two seams that judge a source id said different things about the same
 * grammar: the registry gave the sentence, the render diagnostic gave Zod's
 * `Invalid`. These hold them to one string rather than to two that happen to
 * agree today.
 */
describe("the grammar a malformed name is told", () => {
  it("tells a source id what was expected, rather than that it is invalid", () => {
    const parsed = sourceIdSchema.safeParse("Catalogue Services")

    expect(parsed.success).toBe(false)
    if (parsed.success) return

    expect(parsed.error.issues[0]?.message).toBe(SOURCE_ID_EXPECTATION)
    expect(parsed.error.issues[0]?.message).not.toBe("Invalid")
  })

  it("tells a binding name what was expected", () => {
    const parsed = bindingNameSchema.safeParse("Featured Products")

    expect(parsed.success).toBe(false)
    if (parsed.success) return

    expect(parsed.error.issues[0]?.message).toBe(BINDING_NAME_EXPECTATION)
  })

  it("gives the registry and the diagnostic the same sentence about a source id", () => {
    const registered = createDataRegistry([servicesSource({ fetch: () => Promise.resolve(ok({})) })])
    expect(registered.ok).toBe(true)

    const rejected = createDataRegistry([
      { ...servicesSource({ fetch: () => Promise.resolve(ok({})) }), id: "Catalogue Services" },
    ])
    expect(rejected.ok).toBe(false)
    if (rejected.ok) return

    const fromRegistry = describeDataRegistryError(rejected.error)
    const fromSchema = sourceIdSchema.safeParse("Catalogue Services")

    expect(fromRegistry).toContain(SOURCE_ID_EXPECTATION)
    expect(fromSchema.success).toBe(false)
    if (fromSchema.success) return
    expect(fromRegistry).toContain(fromSchema.error.issues[0]?.message ?? "")
  })
})
