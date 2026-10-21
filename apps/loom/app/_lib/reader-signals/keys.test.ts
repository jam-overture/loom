import { describe, expect, it } from "vitest"

import { applicationIdSchema } from "@jam-overture/loom/store"

import { ingestKeySchema, issueIngestKey, mintIngestKey } from "./keys"
import { memoryIngestKeyStore } from "./keys-memory"

describe("an ingest key", () => {
  it("is minted in the shape it is parsed in", () => {
    expect(ingestKeySchema.safeParse(mintIngestKey()).success).toBe(true)
  })

  it("is never minted twice", () => {
    const minted = new Set(Array.from({ length: 64 }, mintIngestKey))

    expect(minted.size).toBe(64)
  })

  /** The prefix is what tells it apart from an account key, which is a secret of the same length. */
  it("refuses an account key's bare shape", () => {
    expect(ingestKeySchema.safeParse("0123456789abcdef0123456789abcdef").success).toBe(false)
  })
})

describe("issuing a key", () => {
  const app = applicationIdSchema.parse("app_issued")

  it("writes the key it minted and answers with it", async () => {
    const keys = memoryIngestKeyStore()

    const issued = await issueIngestKey(keys)(app, 1)

    expect(issued.ok).toBe(true)
    if (!issued.ok) return
    expect(await keys.keyOf(app)).toEqual({ ok: true, value: issued.value })
  })

  it("ends the key the application held before", async () => {
    const keys = memoryIngestKeyStore()
    const first = await issueIngestKey(keys)(app, 1)
    const second = await issueIngestKey(keys)(app, 2)

    if (!first.ok || !second.ok) throw new Error("issuing failed")
    expect(second.value).not.toBe(first.value)
    expect(await keys.applicationWithKey(first.value)).toEqual({ ok: true, value: null })
  })

  /** A store that cannot write is reported, never answered with a key nobody holds. */
  it("answers with the store's refusal rather than a key", async () => {
    const refusal = { code: "unavailable", detail: "down" } as const

    expect(
      await issueIngestKey({ put: () => Promise.resolve({ ok: false, error: refusal }) })(app, 1)
    ).toEqual({ ok: false, error: refusal })
  })
})
